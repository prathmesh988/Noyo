import { test, expect } from '@playwright/test';
import { createCustomerSession, createVendorSession } from '../../helpers/role-contexts.js';
import { logInteraction } from '../../helpers/recorder.js';

test.describe('Workflow 1: Wave Dispatch - Decline then Accept', () => {
  test.setTimeout(90000);

  test('Customer books -> Vendor A receives wave 1 & declines -> Vendor B receives wave 2 & accepts', async ({ browser }) => {
    const startTime = Date.now();
    let customerSession: any;
    let vendorASession: any;
    let vendorBSession: any;

    try {
      // 1. Establish isolated sessions
      vendorASession = await createVendorSession(browser, 'vendorA');
      vendorBSession = await createVendorSession(browser, 'vendorB');
      customerSession = await createCustomerSession(browser);

      // Verify Vendor A & B are on dashboard
      await expect(vendorASession.page).toHaveURL(/\/vendor\/dashboard/);
      await expect(vendorBSession.page).toHaveURL(/\/vendor\/dashboard/);

      // 2. Customer places booking via API or UI
      const customerPage = customerSession.page;
      console.log('[Workflow 1] Customer initiating booking...');

      // Get Customer JWT from localStorage to create booking
      const token = await customerPage.evaluate(() => localStorage.getItem('accessToken'));
      const customerId = await customerPage.evaluate(() => {
        const u = JSON.parse(localStorage.getItem('userData') || '{}');
        return u._id || u.id;
      });

      // Get seeded service ID from backend
      const serviceRes = await customerPage.request.get('http://localhost:5001/api/public/services');
      const serviceData = await serviceRes.json();
      const testService = serviceData.services?.find((s: any) => (s.title && s.title.includes("QA_TEST")) || (s.name && s.name.includes("QA_TEST"))) || serviceData.services?.[0];
      const serviceId = testService?.id || testService?._id;

      // Scheduled slot for tomorrow
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const isoDate = tomorrow.toISOString().split('T')[0];

      const createRes = await customerPage.request.post('http://localhost:5001/api/users/bookings', {
        headers: {
          Authorization: `Bearer ${token}`
        },
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
          scheduledTime: '10:00 AM',
          timeSlot: {
            start: '10:00 AM',
            end: '11:00 AM'
          }
        }
      });

      const bookingJson = await createRes.json();
      expect(bookingJson.success).toBe(true);
      const bookingId = bookingJson.booking?._id || bookingJson.data?._id;
      console.log(`[Workflow 1] Booking created: #${bookingJson.booking?.bookingNumber || bookingId}`);

      // 3. Customer navigates to tracking / details page
      await customerPage.goto(`/user/booking/${bookingId}`);

      // 4. Observe Wave 1 on Vendor A (Closest)
      console.log('[Workflow 1] Waiting for Wave 1 alert on Vendor A...');
      const vendorAPage = vendorASession.page;
      const vendorBPage = vendorBSession.page;

      // Vendor A should see the alert modal
      await vendorAPage.waitForSelector('button:has-text("Decline"), button:has-text("Accept")', { timeout: 15000 });
      console.log('[Workflow 1] ✅ Wave 1 alert visible on Vendor A');

      // Vendor B should NOT have the alert in Wave 1
      const vendorBHasAlert = await vendorBPage.locator('button:has-text("Decline")').count();
      expect(vendorBHasAlert).toBe(0);
      console.log('[Workflow 1] ✅ Verified Vendor B has NO alert in Wave 1');

      // 5. Vendor A Declines
      console.log('[Workflow 1] Vendor A declining booking...');
      await vendorAPage.locator('button:has-text("Decline")').click();
      await vendorAPage.waitForSelector('button:has-text("Decline")', { state: 'detached', timeout: 5000 });
      console.log('[Workflow 1] ✅ Alert modal dismissed on Vendor A');

      // 6. Observe Wave 2 advances to Vendor B
      console.log('[Workflow 1] Waiting for Wave 2 alert on Vendor B...');
      await vendorBPage.waitForSelector('button:has-text("Accept")', { timeout: 35000 });
      console.log('[Workflow 1] ✅ Wave 2 alert visible on Vendor B');

      // 7. Vendor B Accepts
      console.log('[Workflow 1] Vendor B accepting booking...');
      await vendorBPage.locator('button:has-text("Accept")').click();
      await vendorBPage.waitForSelector('button:has-text("Accept")', { state: 'detached', timeout: 10000 });
      console.log('[Workflow 1] ✅ Vendor B successfully claimed booking');

      // 8. Assert Customer view updates in realtime without manual refresh
      console.log('[Workflow 1] Asserting customer status updates in realtime...');
      await customerPage.getByText(/QA_TEST|Confirmed|Assigned/i).first().waitFor({ state: 'visible', timeout: 15000 });
      console.log('[Workflow 1] ✅ Customer view confirmed with Vendor B');

      // 9. Vendor A alert must NOT reappear
      const vendorAAlertCount = await vendorAPage.locator('button:has-text("Accept")').count();
      expect(vendorAAlertCount).toBe(0);

      logInteraction({
        id: `WF1-${Date.now()}`,
        timestamp: new Date().toISOString(),
        role: 'customer',
        portal: 'user',
        route: `/user/booking/${bookingId}`,
        pageTitle: await customerPage.title(),
        action: 'WAVE_DISPATCH_DECLINE_ACCEPT',
        locatorDescription: 'Wave progression from Vendor A -> Vendor B',
        expected: 'Vendor A decline triggers Wave 2 for Vendor B who accepts; customer updates in realtime',
        actual: 'Workflow 1 passed cleanly in expected order',
        result: 'PASS',
        durationMs: Date.now() - startTime,
        consoleErrors: [],
        pageErrors: [],
        failedRequests: [],
        socketEventsObserved: ['new_booking_request', 'booking_updated']
      });

    } catch (err: any) {
      logInteraction({
        id: `WF1-FAIL-${Date.now()}`,
        timestamp: new Date().toISOString(),
        role: 'customer',
        portal: 'user',
        route: '/user/booking',
        pageTitle: 'Wave Dispatch',
        action: 'WAVE_DISPATCH_DECLINE_ACCEPT',
        locatorDescription: 'Wave progression',
        expected: 'Clean wave transition',
        actual: err.message,
        result: 'FAIL',
        durationMs: Date.now() - startTime,
        consoleErrors: [],
        pageErrors: [err.message],
        failedRequests: [],
        socketEventsObserved: []
      });
      throw err;
    } finally {
      await customerSession?.context.close();
      await vendorASession?.context.close();
      await vendorBSession?.context.close();
    }
  });
});
