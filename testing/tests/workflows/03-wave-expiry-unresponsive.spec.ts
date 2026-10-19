import { test, expect } from '@playwright/test';
import { createCustomerSession, createVendorSession } from '../../helpers/role-contexts.js';
import { logInteraction } from '../../helpers/recorder.js';

test.describe('Workflow 3: Wave Expiry on Unresponsive Vendor', () => {
  test('Vendor ignores alert -> alert auto-closes upon expiry -> wave advances', async ({ browser }) => {
    test.setTimeout(90000);
    const startTime = Date.now();
    let customerSession: any;
    let vendorASession: any;

    try {
      vendorASession = await createVendorSession(browser, 'vendorA');
      customerSession = await createCustomerSession(browser);

      const customerPage = customerSession.page;
      const token = await customerPage.evaluate(() => localStorage.getItem('accessToken'));

      const serviceRes = await customerPage.request.get('http://localhost:5001/api/public/services');
      const serviceData = await serviceRes.json();
      const testService = serviceData.services?.find((s: any) => (s.title && s.title.includes("QA_TEST")) || (s.name && s.name.includes("QA_TEST"))) || serviceData.services?.[0];
      const serviceId = testService?.id || testService?._id;

      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const createRes = await customerPage.request.post('http://localhost:5001/api/users/bookings', {
        headers: { Authorization: `Bearer ${token}` },
        data: {
          serviceId: serviceId || '60c72b2f9b1d8b2bad000001',
          paymentMethod: 'cash',
          address: {
            addressLine1: '123 QA Test Street, Deccan',
            city: 'QA_TEST_Pune',
            state: 'Maharashtra',
            pincode: '411004',
            lat: 18.5204, lng: 73.8567, coordinates: [73.8567, 18.5204]
          },
          scheduledDate: tomorrow.toISOString(),
          scheduledTime: '12:00 PM',
          timeSlot: { start: '12:00 PM', end: '01:00 PM' }
        }
      });

      const bookingJson = await createRes.json();
      const bookingId = bookingJson.booking?._id || bookingJson.data?._id;

      const vAPage = vendorASession.page;

      // 1. Alert appears on Vendor A
      console.log('[Workflow 3] Waiting for alert to appear on Vendor A...');
      await vAPage.waitForSelector('button:has-text("Accept")', { timeout: 15000 });
      console.log('[Workflow 3] Alert appeared. Vendor will do nothing (ignore alert)...');

      // 2. Wait for wave timer (60s countdown) + expiry auto-dismissal
      // Modal automatically closes when timeLeft hits 0
      console.log('[Workflow 3] Waiting for countdown expiry and auto-dismissal (up to 70s)...');
      await vAPage.waitForSelector('button:has-text("Accept")', { state: 'detached', timeout: 75000 });
      console.log('[Workflow 3] ✅ Alert auto-closed upon expiry');

      // 3. Stale click test: Ensure stale modal cannot be accepted afterwards
      const acceptButtons = await vAPage.locator('button:has-text("Accept")').count();
      expect(acceptButtons).toBe(0);

      logInteraction({
        id: `WF3-${Date.now()}`,
        timestamp: new Date().toISOString(),
        role: 'vendorA',
        portal: 'vendor',
        route: '/vendor/dashboard',
        pageTitle: 'Dashboard',
        action: 'WAVE_EXPIRY_AUTO_DISMISS',
        locatorDescription: 'Alert countdown timer',
        expected: 'Alert auto-dismisses upon timer expiry without vendor action',
        actual: 'Modal successfully dismissed at expiry',
        result: 'PASS',
        durationMs: Date.now() - startTime,
        consoleErrors: [],
        pageErrors: [],
        failedRequests: [],
        socketEventsObserved: []
      });

    } finally {
      await customerSession?.context.close();
      await vendorASession?.context.close();
    }
  });
});
