import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const CACHE_DIR = path.resolve(process.cwd(), 'cache/gemini');

export function getCachedPlan<T>(cacheKey: string): T | null {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
    return null;
  }
  const filePath = path.join(CACHE_DIR, `${cacheKey}.json`);
  if (fs.existsSync(filePath)) {
    try {
      return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T;
    } catch {
      return null;
    }
  }
  return null;
}

export function setCachedPlan<T>(cacheKey: string, data: T): void {
  if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  }
  const filePath = path.join(CACHE_DIR, `${cacheKey}.json`);
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
}

export function computeCacheKey(promptVersion: string, content: string): string {
  return crypto.createHash('sha256').update(`${promptVersion}:${content}`).digest('hex');
}
