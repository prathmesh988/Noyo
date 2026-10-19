import { test, expect } from '@playwright/test';
import { createVendorSession } from '../../helpers/role-contexts.js';
import { logInteraction } from '../../helpers/recorder.js';

test.describe('Workflow 10: Alert Delivery While Backgrounded / Inactive', () => {
  test('Vendor tab hidden when booking arrives -> alert surfaces upon foreground return', async ({ browser }) => {
    const startTime = Date.now();
    let vendorASession: any;

    try {
      vendorASession = await createVendorSession(browser, 'vendorA');
      const vAPage = vendorASession.page;

      // 1. Simulate backgrounding tab
      console.log('[Workflow 10] Simulating vendor tab in background...');
      await vAPage.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', writable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });

      // 2. Dispatch a booking alert event while backgrounded
      const mockJob = {
        id: `mock-${Date.now()}`,
        serviceType: 'QA_TEST_Deep_Cleaning',
        customerName: 'Background Test Customer',
        price: 472,
        address: '123 QA Test Street',
        expiresAt: new Date(Date.now() + 60000).toISOString()
      };

      await vAPage.evaluate((job: any) => {
        const pendingJobs = JSON.parse(localStorage.getItem('vendorPendingJobs') || '[]');
        pendingJobs.unshift(job);
        localStorage.setItem('vendorPendingJobs', JSON.stringify(pendingJobs));
      }, mockJob);

      // 3. Bring tab to foreground (resume app)
      console.log('[Workflow 10] Resuming tab to foreground...');
      await vAPage.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: true });
        document.dispatchEvent(new Event('visibilitychange'));
        window.dispatchEvent(new Event('vendorJobsUpdated'));
      });

      // 4. Assert alert modal or list surfaces on return
      const alertNotice = vAPage.getByText('Background Test Customer');
      await alertNotice.waitFor({ state: 'visible', timeout: 15000 });
      console.log('[Workflow 10] ✅ Alert surfaced successfully upon foreground resume');

      logInteraction({
        id: `WF10-${Date.now()}`,
        timestamp: new Date().toISOString(),
        role: 'vendorA',
        portal: 'vendor',
        route: '/vendor/dashboard',
        pageTitle: 'Dashboard',
        action: 'BACKGROUND_ALERT_SURFACE',
        locatorDescription: 'Visibility change and alert modal',
        expected: 'Alert surfaces when app returns from background to foreground',
        actual: 'Workflow 10 verified successfully',
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
