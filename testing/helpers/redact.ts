/**
 * Data Sanitization & Secret Redaction Helper
 * Ensures tokens, passwords, keys, and PII are never logged, printed, or sent to Gemini.
 */

const SECRET_PATTERNS = [
  // JWT Tokens
  /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/g,
  // Bearer tokens
  /Bearer\s+[a-zA-Z0-9_\-\.]+/gi,
  // Razorpay Keys
  /rzp_(test|live)_[a-zA-Z0-9]+/gi,
  // Generic API Keys (AIza, etc.)
  /AIza[0-9A-Za-z-_]{35}/g,
  // Firebase private keys
  /-----BEGIN PRIVATE KEY-----[^]+?-----END PRIVATE KEY-----/g,
  // Passwords in JSON / query strings
  /"password"\s*:\s*"[^"]+"/gi,
  /password=[^&]+/gi,
  // MongoDB URIs with credentials
  /mongodb(\+srv)?:\/\/[^:]+:[^@]+@[^/]+/gi
];

export function redactString(str: string): string {
  if (!str || typeof str !== 'string') return str;
  let sanitized = str;

  for (const pattern of SECRET_PATTERNS) {
    sanitized = sanitized.replace(pattern, '[REDACTED_SECRET]');
  }

  return sanitized;
}

export function redactObject<T>(obj: T): T {
  if (!obj || typeof obj !== 'object') {
    return typeof obj === 'string' ? (redactString(obj) as unknown as T) : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactObject(item)) as unknown as T;
  }

  const result: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes('password') ||
      lowerKey.includes('secret') ||
      lowerKey.includes('token') ||
      lowerKey.includes('apikey') ||
      lowerKey.includes('authorization') ||
      lowerKey.includes('privatekey')
    ) {
      result[key] = '[REDACTED]';
    } else if (typeof val === 'object') {
      result[key] = redactObject(val);
    } else if (typeof val === 'string') {
      result[key] = redactString(val);
    } else {
      result[key] = val;
    }
  }

  return result as T;
}
