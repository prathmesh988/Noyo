import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { z } from 'zod';
import { getCachedPlan, setCachedPlan, computeCacheKey } from './cache.js';
import { redactString } from './redact.js';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const configPath = path.resolve(process.cwd(), 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));

let aiClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY is not defined in testing/.env. Required for LLM test planning.');
    }
    aiClient = new GoogleGenAI({ apiKey });
  }
  return aiClient;
}

export interface GenerationOptions<T> {
  prompt: string;
  schema: z.ZodSchema<T>;
  promptVersion?: string;
  dryRun?: boolean;
}

export async function generateStructuredPlan<T>(options: GenerationOptions<T>): Promise<{ data: T; fromCache: boolean; dryRun?: boolean }> {
  const { prompt, schema, promptVersion = 'v1.0', dryRun = false } = options;

  // 1. Sanitize prompt
  const cleanPrompt = redactString(prompt);

  // 2. Compute Cache Key
  const cacheKey = computeCacheKey(promptVersion, cleanPrompt);
  const cached = getCachedPlan<T>(cacheKey);
  if (cached) {
    console.log(`[Gemini Cache] Hit for ${cacheKey.slice(0, 10)}...`);
    return { data: cached, fromCache: true };
  }

  // 3. Handle Dry Run
  if (dryRun) {
    const estimatedChars = cleanPrompt.length;
    const estimatedTokens = Math.ceil(estimatedChars / 4);
    console.log(`[Gemini Dry-Run] Prompt length: ${estimatedChars} chars (~${estimatedTokens} tokens). Network call bypassed.`);
    return { data: {} as T, fromCache: false, dryRun: true };
  }

  // 4. Call Gemini with Exponential Backoff
  const client = getClient();
  const modelName = config.modelName || 'gemini-2.5-flash';

  let attempts = 0;
  const maxAttempts = 3;
  let delay = 2000;

  while (attempts < maxAttempts) {
    try {
      attempts++;
      console.log(`[Gemini API] Requesting ${modelName} (attempt ${attempts}/${maxAttempts})...`);

      const response = await client.models.generateContent({
        model: modelName,
        contents: [cleanPrompt],
        config: {
          responseMimeType: 'application/json'
        }
      });

      const text = response.text || '{}';
      let parsedJson: any;

      try {
        parsedJson = JSON.parse(text);
      } catch (e: any) {
        console.warn(`[Gemini Warning] Non-JSON output received: ${e.message}. Retrying once with correction...`);
        // Retry with explicit format instruction
        const retryResponse = await client.models.generateContent({
          model: modelName,
          contents: [`${cleanPrompt}\n\nCRITICAL ERROR: Previous output was not valid JSON. You MUST output ONLY valid JSON without markdown fences.`],
          config: { responseMimeType: 'application/json' }
        });
        parsedJson = JSON.parse(retryResponse.text || '{}');
      }

      // 5. Validate with Zod
      const validation = schema.safeParse(parsedJson);
      if (validation.success) {
        // Cache and return
        setCachedPlan(cacheKey, validation.data);
        return { data: validation.data, fromCache: false };
      } else {
        console.error(`[Gemini Zod Validation Error]:`, validation.error.format());
        // If validation fails, return with tagged source
        throw new Error(`Schema validation failed: ${validation.error.message}`);
      }
    } catch (err: any) {
      console.error(`[Gemini Error on attempt ${attempts}]:`, err.message);
      if (attempts >= maxAttempts) {
        throw err;
      }
      // Wait with jitter
      const jitter = Math.random() * 500;
      await new Promise(r => setTimeout(r, delay + jitter));
      delay *= 2;
    }
  }

  throw new Error('Gemini API max attempts exceeded');
}
