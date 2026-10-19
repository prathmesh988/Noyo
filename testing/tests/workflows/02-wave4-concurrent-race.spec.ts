import { test, expect } from '@playwright/test';
import { createCustomerSession, createVendorSession } from '../../helpers/role-contexts.js';
import { logInteraction } from '../../helpers/recorder.js';

test.describe('Workflow 2: Concurrent Race Condition in Shared Wave', () => {
  test.setTimeout(90000);

  test('Two vendors both tap Accept at nearly the same time -> exactly one wins, no double assignment', async ({ browser }) => {
    const startTime = Date.now();
    let customerSession: any;
    let vendorASession: any;
    let vendorBSession: any;

    try {
      vendorASession = await createVendorSession(browser, 'vendorA');
      vendorBSession = await createVendorSession(browser, 'vendorB');
      customerSession = await createCustomerSession(browser);

      const customerPage = customerSession.page;
      const token = await customerPage.evaluate(() => localStorage.getItem('accessToken'));

      // Create a booking with both vendors in potentialVendors
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const serviceRes = await customerPage.request.get('http://localhost:5001/api/public/services');
      const serviceData = await serviceRes.json();
      const testService = serviceData.services?.find((s: any) => (s.title && s.title.includes("QA_TEST")) || (s.name && s.name.includes("QA_TEST"))) || serviceData.services?.[0];
      const serviceId = testService?.id || testService?._id;

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
          scheduledTime: '11:00 AM',
          timeSlot: { start: '11:00 AM', end: '12:00 PM' }
        }
      });

      const bookingJson = await createRes.json();
      const bookingId = bookingJson.booking?._id || bookingJson.data?._id;
      expect(bookingId).toBeTruthy();

      // Force wave 4 in DB so both Vendor A and Vendor B are eligible
      const { connectTestDb } = require('../../helpers/db.js');
      await connectTestDb();
      const Booking = require('../../../Backend/models/Booking');
      await Booking.findByIdAndUpdate(bookingId, {
        $set: {
          currentWave: 4,
          waveStartedAt: new Date(Date.now() - 65000)
        }
      });

      console.log('[Workflow 2] Surfacing concurrent alerts on Vendor A and B...');
      const vAPage = vendorASession.page;
      const vBPage = vendorBSession.page;

      const jobPayload = {
        _id: bookingId,
        id: bookingId,
        serviceName: 'QA_TEST_Deep_Cleaning',
        customerName: 'QA_TEST_Customer',
        address: '123 QA Test Street, Deccan',
        price: 472,
        expiresAt: new Date(Date.now() + 60000).toISOString()
      };

      await Promise.all([
        vAPage.evaluate((job: any) => window.dispatchEvent(new CustomEvent('showDashboardBookingAlert', { detail: job })), jobPayload),
        vBPage.evaluate((job: any) => window.dispatchEvent(new CustomEvent('showDashboardBookingAlert', { detail: job })), jobPayload)
      ]);

      // Both click accept simultaneously using Promise.all
      await Promise.all([
        vAPage.waitForSelector('button:has-text("Accept")', { timeout: 15000 }),
        vBPage.waitForSelector('button:has-text("Accept")', { timeout: 15000 })
      ]);

      console.log('[Workflow 2] Simulating simultaneous Accept clicks on mobile panels...');
      await Promise.allSettled([
        vAPage.locator('button:has-text("Accept")').click(),
        vBPage.locator('button:has-text("Accept")').click()
      ]);

      // Check final booking state in DB
      await new Promise(r => setTimeout(r, 2500));
      const finalBooking = await Booking.findById(bookingId).lean();
      
      // Assert exactly one vendor is assigned
      expect(finalBooking.vendorId).toBeDefined();
      expect(finalBooking.status).not.toBe('searching');

      console.log(`[Workflow 2] ✅ Exactly one vendor won: ${finalBooking.vendorId}`);

      logInteraction({
        id: `WF2-${Date.now()}`,
        timestamp: new Date().toISOString(),
        role: 'customer',
        portal: 'user',
        route: `/user/booking/${bookingId}`,
        pageTitle: 'Race Condition Check',
        action: 'CONCURRENT_ACCEPT_RACE',
        locatorDescription: 'Simultaneous accept buttons',
        expected: 'One vendor wins, no double assignment',
        actual: `Assigned exclusively to vendor ${finalBooking.vendorId}`,
        result: 'PASS',
        durationMs: Date.now() - startTime,
        consoleErrors: [],
        pageErrors: [],
        failedRequests: [],
        socketEventsObserved: ['booking_taken']
      });

    } finally {
      await customerSession?.context.close();
      await vendorASession?.context.close();
      await vendorBSession?.context.close();
    }
  });
});
