import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { BookingAlertModal } from '../bookings';
import { acceptBooking, rejectBooking, assignWorker } from '../../services/bookingService';
import { playAlertRing, stopAlertRing } from '../../../../utils/notificationSound';

export default function GlobalBookingAlert() {
  const [activeAlertBookings, setActiveAlertBookings] = useState([]);
  const ignoredBookingIds = useRef(new Set());
  const navigate = useNavigate();
  const location = useLocation();

  const [maxSearchTime, setMaxSearchTime] = useState(1);

  useEffect(() => {
    // 1. Logic to sync with localStorage and optionally Server
    const syncAlerts = async (forceServerSync = false) => {
      try {
        const now = Date.now();
        let pendingJobs = JSON.parse(localStorage.getItem('vendorPendingJobs') || '[]');

        // Every few heartbeats or if forced, sync with Server API for missed sockets
        const token = localStorage.getItem('vendorAccessToken') || sessionStorage.getItem('vendorAccessToken');
        if (token && (forceServerSync || (Math.random() > 0.8))) {
          try {
            const { getBookings } = await import('../../services/bookingService');
            const response = await getBookings();
            if (response.success && response.data) {
              const vendorData = JSON.parse(localStorage.getItem('vendorData') || '{}');
              const vId = String(vendorData._id || vendorData.id);
              
              const serverJobs = response.data
                .filter(b => {
                  const status = b.status?.toLowerCase();
                  const isRelevant = status === 'searching' || status === 'requested';
                  const isMine = !b.vendorId || String(b.vendorId?._id || b.vendorId) === vId;
                  return isRelevant && isMine;
                })
                .map(b => ({
                  ...b,
                  id: b._id || b.id,
                  serviceType: b.serviceName || b.serviceId?.title,
                  customerName: b.userId?.name || 'Customer'
                }));

              const existingIds = new Set(pendingJobs.map(j => String(j.id || j._id)));
              let updated = false;
              serverJobs.forEach(sj => {
                const sjId = String(sj.id);
                // Never re-add jobs that were dismissed/accepted this session
                if (!existingIds.has(sjId) && !ignoredBookingIds.current.has(sjId)) {
                  pendingJobs.unshift(sj);
                  updated = true;
                }
              });
              if (updated) localStorage.setItem('vendorPendingJobs', JSON.stringify(pendingJobs));
            }
          } catch (e) { console.error("Server sync error:", e); }
        }

        const validJobs = pendingJobs.filter(job => {
          const jobId = String(job.id || job._id);
          // Skip jobs dismissed/accepted in this session
          if (ignoredBookingIds.current.has(jobId)) return false;
          // Skip expired jobs; jobs with no expiresAt are treated as valid (missed alerts)
          if (job.expiresAt && new Date(job.expiresAt).getTime() <= now) return false;
          return true;
        });

        // Clean up localStorage - remove expired/ignored entries to prevent stale re-population
        const validIds = new Set(validJobs.map(j => String(j.id || j._id)));
        const cleanedJobs = pendingJobs.filter(j => validIds.has(String(j.id || j._id)));
        if (cleanedJobs.length !== pendingJobs.length) {
          localStorage.setItem('vendorPendingJobs', JSON.stringify(cleanedJobs));
        }

        if (validJobs.length > 0) {
          setActiveAlertBookings(prev => {
            const currentIds = new Set(prev.map(b => String(b.id || b._id)));
            const newJobsToAdd = validJobs.filter(v => !currentIds.has(String(v.id || v._id)));
            if (newJobsToAdd.length === 0) return prev;
            return [...newJobsToAdd, ...prev];
          });
        }
      } catch (err) {
        console.error('[GlobalAlert] Sync error:', err);
      }
    };

    // 2. Foreground Sync: Sync immediately when vendor resumes app
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncAlerts(true);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Fetch global config for accurate timer
    const fetchConfig = async () => {
      const token = localStorage.getItem('vendorAccessToken') || sessionStorage.getItem('vendorAccessToken');
      if (!token) return;

      try {
        const { vendorDashboardService } = await import('../../services/dashboardService');
        const response = await vendorDashboardService.getDashboardStats();
        if (response.success && response.data.config) {
          setMaxSearchTime(response.data.config.maxSearchTime || 1);
        }
      } catch (error) {
        console.error('Failed to fetch config for GlobalAlert:', error);
      }
    };

    syncAlerts(true);
    fetchConfig();

    // 3. Heartbeat: Periodic sync
    const heartbeat = setInterval(() => syncAlerts(false), 5000);

    // Listen for custom dashboard events from SocketContext
    const handleShowAlert = (e) => {
      if (e.detail) {
        setActiveAlertBookings(prev => {
          const bId = String(e.detail.id || e.detail._id);
          if (prev.find(b => String(b.id || b._id) === bId)) return prev;
          return [e.detail, ...prev];
        });
      }
    };

    const handleRemoveBooking = (e) => {
      if (e.detail?.id) {
        const idToRemove = String(e.detail.id);
        ignoredBookingIds.current.add(idToRemove);
        setActiveAlertBookings(prev => prev.filter(b => String(b.id || b._id) !== idToRemove));
        // Also remove from localStorage immediately so heartbeat doesn't re-add it
        const pendingJobs = JSON.parse(localStorage.getItem('vendorPendingJobs') || '[]');
        const filtered = pendingJobs.filter(j => String(j.id || j._id) !== idToRemove);
        localStorage.setItem('vendorPendingJobs', JSON.stringify(filtered));
      }
    };

    window.addEventListener('showDashboardBookingAlert', handleShowAlert);
    window.addEventListener('removeVendorBooking', handleRemoveBooking);

    return () => {
      window.removeEventListener('showDashboardBookingAlert', handleShowAlert);
      window.removeEventListener('removeVendorBooking', handleRemoveBooking);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      clearInterval(heartbeat);
    };
  }, []);

  // Effect to manage sound based on pending bookings
  useEffect(() => {
    if (activeAlertBookings.length > 0) {
      playAlertRing(true); // Always loop for vendor until actioned
    } else {
      stopAlertRing();
    }
    return () => stopAlertRing();
  }, [activeAlertBookings.length]);

  if (activeAlertBookings.length === 0) return null;

  return (
    <BookingAlertModal
      isOpen={activeAlertBookings.length > 0}
      bookings={activeAlertBookings}
      maxSearchTimeMins={maxSearchTime}
      onAccept={async (id, price, note) => {
        try {
          if (price) {
            const { submitBid } = await import('../../services/bookingService');
            await submitBid(id, price, note);
            toast.success('Quote sent successfully!');
          } else {
            const bookingItem = activeAlertBookings.find(b => String(b.id || b._id) === String(id));
            const acceptRes = await acceptBooking(id);
            const updatedBooking = acceptRes?.data || {};

            const isScheduled =
              updatedBooking.bookingType === 'scheduled' ||
              bookingItem?.bookingType === 'scheduled' ||
              (updatedBooking.scheduledTime && updatedBooking.scheduledTime !== 'ASAP') ||
              (bookingItem?.scheduledTime && bookingItem?.scheduledTime !== 'ASAP');

            if (!isScheduled) {
              try {
                await assignWorker(id, 'SELF');
                toast.success('Job claimed successfully! Assigned to you.');
              } catch (assignErr) {
                console.warn('[GlobalBookingAlert] Worker assignment skipped or failed:', assignErr?.response?.data?.message || assignErr.message);
                toast.success('Job claimed successfully!');
              }
            } else {
              toast.success('Scheduled job accepted! You can assign yourself or a worker 30 minutes before the start time.');
            }
          }

          // Remove from local storage
          const pendingJobs = JSON.parse(localStorage.getItem('vendorPendingJobs') || '[]');
          const updated = pendingJobs.filter(b => String(b.id || b._id) !== String(id));
          localStorage.setItem('vendorPendingJobs', JSON.stringify(updated));

          // Dispatch remove event
          window.dispatchEvent(new CustomEvent('removeVendorBooking', { detail: { id } }));
          setActiveAlertBookings(prev => prev.filter(b => String(b.id || b._id) !== String(id)));

          window.dispatchEvent(new Event('vendorJobsUpdated'));
          window.dispatchEvent(new Event('vendorStatsUpdated'));
        } catch (e) {
          console.error('[GlobalBookingAlert] Failed to claim job:', e);
          const errorMsg = e.response?.data?.message || 'Failed to claim job';
          toast.error(errorMsg);

          // If booking was already taken or expired, dismiss from local view so user is not trapped
          if (e.response?.status === 409 || e.response?.status === 404 || errorMsg.includes('already') || errorMsg.includes('no longer available')) {
            const pendingJobs = JSON.parse(localStorage.getItem('vendorPendingJobs') || '[]');
            const updated = pendingJobs.filter(b => String(b.id || b._id) !== String(id));
            localStorage.setItem('vendorPendingJobs', JSON.stringify(updated));
            window.dispatchEvent(new CustomEvent('removeVendorBooking', { detail: { id } }));
            setActiveAlertBookings(prev => prev.filter(b => String(b.id || b._id) !== String(id)));
          }
        }
      }}
      onAssign={async (id) => {
        try {
          await acceptBooking(id);

          // Remove from local storage
          const pendingJobs = JSON.parse(localStorage.getItem('vendorPendingJobs') || '[]');
          const updated = pendingJobs.filter(b => String(b.id || b._id) !== String(id));
          localStorage.setItem('vendorPendingJobs', JSON.stringify(updated));

          // Dispatch remove event
          window.dispatchEvent(new CustomEvent('removeVendorBooking', { detail: { id } }));
          setActiveAlertBookings(prev => prev.filter(b => String(b.id || b._id) !== String(id)));

          window.dispatchEvent(new Event('vendorJobsUpdated'));
          window.dispatchEvent(new Event('vendorStatsUpdated'));
          toast.success('Job claimed! Redirecting to assign...');
          navigate(`/vendor/booking/${id}/assign-worker`);
        } catch (e) {
          console.error('[GlobalBookingAlert] Failed to claim job:', e);
          const errorMsg = e.response?.data?.message || 'Failed to claim job';
          toast.error(errorMsg);
        }
      }}
      onReject={async (id) => {
        try {
          // Reject is often silent or via reject api
          await rejectBooking(id);
        } catch (error) {
          console.error("Failed to reject job via API, removing locally");
        } finally {
          const pendingJobs = JSON.parse(localStorage.getItem('vendorPendingJobs') || '[]');
          const updated = pendingJobs.filter(b => String(b.id || b._id) !== String(id));
          localStorage.setItem('vendorPendingJobs', JSON.stringify(updated));

          window.dispatchEvent(new CustomEvent('removeVendorBooking', { detail: { id } }));
          setActiveAlertBookings(prev => prev.filter(b => String(b.id || b._id) !== String(id)));

          toast.success('Booking application rejected');
          window.dispatchEvent(new Event('vendorJobsUpdated'));
        }
      }}
      onMinimize={() => {
        setActiveAlertBookings([]); // simply minimizes current visible ones. We can fetch them later from pending.
      }}
    />
  );
}
