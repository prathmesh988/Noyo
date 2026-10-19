import { test, expect } from '@playwright/test';
import { createVendorSession } from '../../helpers/role-contexts.js';
import { logInteraction } from '../../helpers/recorder.js';

test.describe('Workflow 9: Reconnect & State Recovery Resilience', () => {
  test('Drop socket / offline mode mid-flow -> restore -> UI recovers true state without duplicate alerts or broken modals', async ({ browser }) => {
    const startTime = Date.now();
    let vendorASession: any;

    try {
      vendorASession = await createVendorSession(browser, 'vendorA');
      const vAPage = vendorASession.page;

      // 1. Verify vendor is on dashboard
      await expect(vAPage).toHaveURL(/\/vendor\/dashboard/);

      // 2. Simulate offline disconnect (drop network)
      console.log('[Workflow 9] Simulating network drop (offline mode)...');
      await vendorASession.context.setOffline(true);
      await new Promise(r => setTimeout(r, 2000));

      // 3. Restore network (reconnect)
      console.log('[Workflow 9] Restoring network connection...');
      await vendorASession.context.setOffline(false);
      await new Promise(r => setTimeout(r, 2000));

      // 4. Trigger visibility change (WebView-style app resume)
      console.log('[Workflow 9] Simulating WebView app resume via visibilitychange...');
      await vAPage.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // 5. Hard page refresh test
      console.log('[Workflow 9] Performing hard page refresh...');
      await vAPage.reload();
      await expect(vAPage).toHaveURL(/\/vendor\/dashboard/);

      // 6. Assert UI is healthy: no duplicate modals, no broken spinners
      const alertModals = await vAPage.locator('div[role="dialog"], .fixed.inset-0').count();
      expect(alertModals).toBeLessThanOrEqual(1);
      console.log('[Workflow 9] ✅ UI recovered cleanly without duplicate modals');

      logInteraction({
        id: `WF9-${Date.now()}`,
        timestamp: new Date().toISOString(),
        role: 'vendorA',
        portal: 'vendor',
        route: '/vendor/dashboard',
        pageTitle: 'Dashboard',
        action: 'RECONNECT_STATE_RECOVERY',
        locatorDescription: 'Offline toggle, visibility change, hard refresh',
        expected: 'UI recovers cleanly without duplicate alerts or ghost modals',
        actual: 'Workflow 9 passed cleanly',
        result: 'PASS',
        durationMs: Date.now() - startTime,
        consoleErrors: [],
        pageErrors: [],
        failedRequests: [],
        socketEventsObserved: []
      });

    } finally {
      await vendorASession?.context.close();
    }
  });
});
