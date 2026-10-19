import { Browser, BrowserContext, Page } from '@playwright/test';
import { logInteraction } from './recorder.js';
import fs from 'fs';
import path from 'path';

export interface RoleSession {
  role: 'customer' | 'vendorA' | 'vendorB' | 'worker' | 'admin';
  context: BrowserContext;
  page: Page;
  token?: string;
  userEntity?: any;
}

const configPath = path.resolve(process.cwd(), 'config.json');
const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const BACKEND_URL = config.backendUrl || 'http://localhost:5001';

export async function setupPageLogging(page: Page, role: any, portal: any) {
  page.on('console', msg => {
    if (msg.type() === 'error') {
      logInteraction({
        id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        timestamp: new Date().toISOString(),
        role,
        portal,
        route: page.url(),
        pageTitle: '',
        action: 'CONSOLE_ERROR',
        locatorDescription: 'Browser Console',
        expected: 'No console errors',
        actual: msg.text(),
        result: 'NEEDS_REVIEW',
        durationMs: 0,
        consoleErrors: [msg.text()],
        pageErrors: [],
        failedRequests: [],
        socketEventsObserved: []
      });
    }
  });

  page.on('pageerror', err => {
    logInteraction({
      id: `pageerr-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      timestamp: new Date().toISOString(),
      role,
      portal,
      route: page.url(),
      pageTitle: '',
      action: 'UNCAUGHT_PAGE_EXCEPTION',
      locatorDescription: 'Window onerror',
      expected: 'No uncaught exceptions',
      actual: err.message,
      result: 'FAIL',
      durationMs: 0,
      consoleErrors: [],
      pageErrors: [err.message],
      failedRequests: [],
      socketEventsObserved: []
    });
  });
}

export async function createCustomerSession(browser: Browser): Promise<RoleSession> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await setupPageLogging(page, 'customer', 'user');

  console.log('[RoleContext] Authenticating Customer (9800000001)...');

  // Direct backend verification for reliable & instant token provisioning
  const res = await fetch(`${BACKEND_URL}/api/users/auth/verify-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9800000001', otp: '123456' })
  });
  const data = await res.json();
  if (!data.accessToken) {
    throw new Error(`Customer auth failed: ${JSON.stringify(data)}`);
  }

  // Pre-seed storage before navigation
  await page.addInitScript(({ token, refresh, user }) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('refreshToken', refresh || token);
    localStorage.setItem('userData', JSON.stringify(user));
  }, { token: data.accessToken, refresh: data.refreshToken, user: data.user });

  await page.goto('/user/home', { waitUntil: 'domcontentloaded' });
  return { role: 'customer', context, page, token: data.accessToken, userEntity: data.user };
}

export async function createVendorSession(browser: Browser, which: 'vendorA' | 'vendorB' = 'vendorA'): Promise<RoleSession> {
  const context = await browser.newContext();
  const page = await context.newPage();
  const phone = which === 'vendorA' ? '9800000002' : '9800000003';
  await setupPageLogging(page, which, 'vendor');

  console.log(`[RoleContext] Authenticating Vendor ${which} (${phone})...`);

  const res = await fetch(`${BACKEND_URL}/api/vendors/auth/verify-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone, otp: '123456' })
  });
  const data = await res.json();
  if (!data.accessToken) {
    throw new Error(`Vendor auth failed: ${JSON.stringify(data)}`);
  }

  await page.addInitScript(({ token, refresh, vendor }) => {
    localStorage.setItem('vendorAccessToken', token);
    localStorage.setItem('vendorRefreshToken', refresh || token);
    localStorage.setItem('vendorData', JSON.stringify(vendor));
  }, { token: data.accessToken, refresh: data.refreshToken, vendor: data.vendor });

  await page.goto('/vendor/dashboard', { waitUntil: 'domcontentloaded' });
  return { role: which, context, page, token: data.accessToken, userEntity: data.vendor };
}

export async function createWorkerSession(browser: Browser): Promise<RoleSession> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await setupPageLogging(page, 'worker', 'worker');

  console.log('[RoleContext] Authenticating Worker (9800000004)...');

  const res = await fetch(`${BACKEND_URL}/api/workers/auth/verify-login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone: '9800000004', otp: '123456' })
  });
  const data = await res.json();
  if (!data.accessToken) {
    throw new Error(`Worker auth failed: ${JSON.stringify(data)}`);
  }

  await page.addInitScript(({ token, refresh, worker }) => {
    localStorage.setItem('workerAccessToken', token);
    localStorage.setItem('workerRefreshToken', refresh || token);
    localStorage.setItem('workerData', JSON.stringify(worker));
  }, { token: data.accessToken, refresh: data.refreshToken, worker: data.worker });

  await page.goto('/worker/dashboard', { waitUntil: 'domcontentloaded' });
  return { role: 'worker', context, page, token: data.accessToken, userEntity: data.worker };
}

export async function createAdminSession(browser: Browser): Promise<RoleSession> {
  const context = await browser.newContext();
  const page = await context.newPage();
  await setupPageLogging(page, 'admin', 'admin');

  console.log('[RoleContext] Authenticating Admin (admin.qa@test.com)...');

  const res = await fetch(`${BACKEND_URL}/api/admin/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin.qa@test.com', password: 'AdminPassword123!' })
  });
  const data = await res.json();
  if (!data.accessToken) {
    throw new Error(`Admin auth failed: ${JSON.stringify(data)}`);
  }

  await page.addInitScript(({ token, refresh, admin }) => {
    localStorage.setItem('adminAccessToken', token);
    localStorage.setItem('adminRefreshToken', refresh || token);
    localStorage.setItem('adminData', JSON.stringify(admin));
  }, { token: data.accessToken, refresh: data.refreshToken, admin: data.admin });

  await page.goto('/admin/dashboard', { waitUntil: 'domcontentloaded' });
  return { role: 'admin', context, page, token: data.accessToken, userEntity: data.admin };
}
