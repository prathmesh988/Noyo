import { test, expect } from '@playwright/test';
import fs from 'fs';
import path from 'path';
import { logInteraction } from '../helpers/recorder.js';
import { RoutePlan } from '../helpers/planner-cli.js';

const PLANS_DIR = path.resolve(process.cwd(), 'plans');

test.describe('Generated Plan Deterministic Runner', () => {
  let cachedTokens: Record<string, { accessToken: string; refreshToken?: string; data: any }> = {};

  test.beforeAll(async () => {
    try {
      const [u, v, w, a] = await Promise.all([
        fetch('http://localhost:5001/api/users/auth/verify-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: '9800000001', otp: '123456' })
        }).then(r => r.json()).catch(() => ({})),
        fetch('http://localhost:5001/api/vendors/auth/verify-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: '9800000002', otp: '123456' })
        }).then(r => r.json()).catch(() => ({})),
        fetch('http://localhost:5001/api/workers/auth/verify-login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: '9800000004', otp: '123456' })
        }).then(r => r.json()).catch(() => ({})),
        fetch('http://localhost:5001/api/admin/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: 'admin.qa@test.com', password: 'AdminPassword123!' })
        }).then(r => r.json()).catch(() => ({}))
      ]);

      if (u.accessToken) cachedTokens['user'] = { accessToken: u.accessToken, refreshToken: u.refreshToken, data: u.user };
      if (v.accessToken) cachedTokens['vendor'] = { accessToken: v.accessToken, refreshToken: v.refreshToken, data: v.vendor };
      if (w.accessToken) cachedTokens['worker'] = { accessToken: w.accessToken, refreshToken: w.refreshToken, data: w.worker };
      if (a.accessToken) cachedTokens['admin'] = { accessToken: a.accessToken, refreshToken: a.refreshToken, data: a.admin };
    } catch (e) {
      console.warn('[Plan Runner] Auth pre-fetch warning:', e);
    }
  });

  // Collect all plan files
  const planFiles: string[] = [];
  if (fs.existsSync(PLANS_DIR)) {
    const portals = fs.readdirSync(PLANS_DIR);
    for (const portal of portals) {
      const portalPath = path.join(PLANS_DIR, portal);
      if (fs.statSync(portalPath).isDirectory()) {
        const files = fs.readdirSync(portalPath).filter(f => f.endsWith('.json'));
        for (const file of files) {
          planFiles.push(path.join(portalPath, file));
        }
      }
    }
  }

  for (const planFile of planFiles) {
    const plan: RoutePlan = JSON.parse(fs.readFileSync(planFile, 'utf8'));

    test(`Route Plan: [${plan.portal.toUpperCase()}] ${plan.routeId} (${plan.path})`, async ({ page }) => {
      const startTime = Date.now();
      const consoleErrors: string[] = [];
      const pageErrors: string[] = [];

      page.on('console', msg => {
        if (msg.type() === 'error') consoleErrors.push(msg.text());
      });
      page.on('pageerror', err => {
        pageErrors.push(err.message);
      });

      try {
        const resolvedPath = plan.path
          .replace(':id', '6ad218a1ea7657c9c3ebac18')
          .replace(':slug', 'qa-test-home-cleaning');

        // Inject authentication credentials if protected route
        if (plan.requiredRole !== 'public' && cachedTokens[plan.portal]) {
          await page.addInitScript(({ portal, auth }) => {
            if (portal === 'admin') {
              localStorage.setItem('adminAccessToken', auth.accessToken);
              localStorage.setItem('adminRefreshToken', auth.refreshToken || auth.accessToken);
              localStorage.setItem('adminData', JSON.stringify(auth.data));
            } else if (portal === 'vendor') {
              localStorage.setItem('vendorAccessToken', auth.accessToken);
              localStorage.setItem('vendorRefreshToken', auth.refreshToken || auth.accessToken);
              localStorage.setItem('vendorData', JSON.stringify(auth.data));
            } else if (portal === 'worker') {
              localStorage.setItem('workerAccessToken', auth.accessToken);
              localStorage.setItem('workerRefreshToken', auth.refreshToken || auth.accessToken);
              localStorage.setItem('workerData', JSON.stringify(auth.data));
            } else if (portal === 'user') {
              localStorage.setItem('accessToken', auth.accessToken);
              localStorage.setItem('refreshToken', auth.refreshToken || auth.accessToken);
              localStorage.setItem('userData', JSON.stringify(auth.data));
            }
          }, { portal: plan.portal, auth: cachedTokens[plan.portal] });
        }

        console.log(`[Plan Runner] Executing plan for ${plan.routeId} at ${resolvedPath}...`);
        await page.goto(resolvedPath, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);

        // Mobile Inspection 1: Check Horizontal Overflow
        const hasHorizontalOverflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        if (hasHorizontalOverflow) {
          console.warn(`[Mobile Warning] ${plan.routeId} has horizontal scroll overflow!`);
        }

        // Mobile Inspection 2: Check Tap Targets under 44x44
        const smallTapTargets = await page.evaluate(() => {
          const buttons = Array.from(document.querySelectorAll('button, a'));
          return buttons.filter(b => {
            const rect = b.getBoundingClientRect();
            return rect.width > 0 && rect.height > 0 && (rect.width < 44 || rect.height < 44);
          }).length;
        });

        // Execute non-risky steps
        for (const step of plan.steps) {
          if (step.riskFlags && step.riskFlags.length > 0) {
            console.log(`[Plan Runner] Skipping step ${step.order} due to risk flags: ${step.riskFlags.join(', ')}`);
            continue;
          }

          if (step.action === 'click' && step.locatorHint.startsWith('button')) {
            const loc = page.locator(step.locatorHint).first();
            if (await loc.isVisible()) {
              await loc.click({ timeout: 5000 }).catch(() => {});
            }
          }
        }

        logInteraction({
          id: `PLAN-${plan.routeId}-${Date.now()}`,
          timestamp: new Date().toISOString(),
          role: 'public',
          portal: plan.portal as any,
          route: plan.path,
          pageTitle: await page.title().catch(() => ''),
          action: 'EXECUTE_GENERATED_PLAN',
          locatorDescription: `Plan execution with ${plan.steps.length} steps`,
          expected: `Clean render and interaction at ${plan.path}`,
          actual: `Rendered successfully (small tap targets: ${smallTapTargets}, overflow: ${hasHorizontalOverflow})`,
          result: pageErrors.length > 0 ? 'FAIL' : 'PASS',
          durationMs: Date.now() - startTime,
          consoleErrors,
          pageErrors,
          failedRequests: [],
          socketEventsObserved: []
        });

      } catch (err: any) {
        logInteraction({
          id: `PLAN-ERR-${plan.routeId}-${Date.now()}`,
          timestamp: new Date().toISOString(),
          role: 'public',
          portal: plan.portal as any,
          route: plan.path,
          pageTitle: '',
          action: 'EXECUTE_GENERATED_PLAN',
          locatorDescription: plan.path,
          expected: 'Clean navigation',
          actual: err.message,
          result: 'FAIL',
          durationMs: Date.now() - startTime,
          consoleErrors,
          pageErrors: [err.message],
          failedRequests: [],
          socketEventsObserved: []
        });
      }
    });
  }
});
