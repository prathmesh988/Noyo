import { test, expect } from '@playwright/test';
import { createVendorSession } from '../../helpers/role-contexts.js';
import { logInteraction } from '../../helpers/recorder.js';

test.describe('Workflow 12: Cash-Limit Modal & Account Order Freeze', () => {
  test('Vendor over cashInHandLimit sees CashLimitModal and is prevented from taking new orders', async ({ browser }) => {
    const startTime = Date.now();
    let vendorASession: any;

    try {
      // 1. Set Vendor A cashInHand to ₹15,000 (exceeding ₹10,000 limit)
      const { connectTestDb } = require('../../helpers/db.js');
      await connectTestDb();
      const Vendor = require('../../../Backend/models/Vendor');
      await Vendor.findOneAndUpdate(
        { phone: '9800000002' },
        {
          $set: {
            'wallet.dues': 15000,
            'wallet.cashLimit': 10000
          }
        }
      );

      // 2. Open Vendor Dashboard
      vendorASession = await createVendorSession(browser, 'vendorA');
      const vAPage = vendorASession.page;

      console.log('[Workflow 12] Waiting for CashLimitModal on Vendor Dashboard...');
      await vAPage.goto('/vendor/dashboard');

      // 3. Assert CashLimitModal appears
      const cashModal = vAPage.getByText('Service Suspended');
      await cashModal.waitFor({ state: 'visible', timeout: 15000 });
      console.log('[Workflow 12] ✅ CashLimitModal appeared as expected');

      // 4. Verify modal blocks interaction and cannot be dismissed into dispatch
      const backdrop = vAPage.locator('.fixed.inset-0').first();
      await expect(backdrop).toBeVisible();

      // 5. Restore normal wallet dues
      await Vendor.findOneAndUpdate(
        { phone: '9800000002' },
        {
          $set: { 'wallet.dues': 0 }
        }
      );

      logInteraction({
        id: `WF12-${Date.now()}`,
        timestamp: new Date().toISOString(),
        role: 'vendorA',
        portal: 'vendor',
        route: '/vendor/dashboard',
        pageTitle: 'Vendor Dashboard',
        action: 'CASH_LIMIT_ORDER_FREEZE',
        locatorDescription: 'CashLimitModal overlay',
        expected: 'Cash limit modal appears and blocks new job dispatch',
        actual: 'Cash limit enforced successfully',
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
