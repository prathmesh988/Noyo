import fs from 'fs';
import path from 'path';
import { redactString, redactObject } from './redact.js';

export interface InteractionLog {
  id: string;
  timestamp: string;
  role: 'customer' | 'vendorA' | 'vendorB' | 'worker' | 'admin' | 'public';
  portal: 'user' | 'vendor' | 'worker' | 'admin' | 'public';
  route: string;
  pageTitle: string;
  action: string;
  locatorDescription: string;
  input?: any;
  expected: string;
  actual: string;
  result: 'PASS' | 'FAIL' | 'BLOCKED' | 'NEEDS_REVIEW' | 'NOT_TESTED';
  durationMs: number;
  screenshotBefore?: string;
  screenshotAfter?: string;
  consoleErrors: string[];
  pageErrors: string[];
  failedRequests: string[];
  socketEventsObserved: string[];
  tracePath?: string;
  notes?: string;
}

const REPORTS_DIR = path.resolve(process.cwd(), 'reports');
const INTERACTIONS_FILE = path.join(REPORTS_DIR, 'interactions.json');
const RUN_LOG_FILE = path.join(REPORTS_DIR, 'run-log.md');

let interactionBuffer: InteractionLog[] = [];

export function logInteraction(log: InteractionLog): void {
  // Ensure reports dir exists
  if (!fs.existsSync(REPORTS_DIR)) {
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
  }

  // Redact inputs and notes
  const sanitizedLog: InteractionLog = {
    ...log,
    input: log.input ? redactObject(log.input) : undefined,
    expected: redactString(log.expected),
    actual: redactString(log.actual),
    notes: log.notes ? redactString(log.notes) : undefined,
    consoleErrors: log.consoleErrors.map(e => redactString(e)),
    pageErrors: log.pageErrors.map(e => redactString(e))
  };

  if (interactionBuffer.length === 0 && fs.existsSync(INTERACTIONS_FILE)) {
    try {
      interactionBuffer = JSON.parse(fs.readFileSync(INTERACTIONS_FILE, 'utf8'));
    } catch {
      interactionBuffer = [];
    }
  }

  interactionBuffer.push(sanitizedLog);

  // Write to disk
  fs.writeFileSync(INTERACTIONS_FILE, JSON.stringify(interactionBuffer, null, 2), 'utf8');

  // Append human-readable entry to run-log.md
  const statusEmoji = {
    PASS: '✅',
    FAIL: '❌',
    BLOCKED: '🚫',
    NEEDS_REVIEW: '⚠️',
    NOT_TESTED: '⚪'
  }[sanitizedLog.result];

  const logEntry = `[${sanitizedLog.timestamp}] ${statusEmoji} [${sanitizedLog.role.toUpperCase()}] ${sanitizedLog.action} on ${sanitizedLog.route} -> ${sanitizedLog.result} (${sanitizedLog.durationMs}ms)\n`;
  fs.appendFileSync(RUN_LOG_FILE, logEntry, 'utf8');
}

export function getAllInteractions(): InteractionLog[] {
  if (interactionBuffer.length > 0) return interactionBuffer;
  if (fs.existsSync(INTERACTIONS_FILE)) {
    try {
      interactionBuffer = JSON.parse(fs.readFileSync(INTERACTIONS_FILE, 'utf8'));
      return interactionBuffer;
    } catch {
      return [];
    }
  }
  return [];
}

export function clearInteractions(): void {
  interactionBuffer = [];
  if (fs.existsSync(INTERACTIONS_FILE)) {
    fs.unlinkSync(INTERACTIONS_FILE);
  }
}
