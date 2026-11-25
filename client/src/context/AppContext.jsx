import React, { createContext, useContext, useState, useEffect } from 'react';
import { io } from 'socket.io-client';
import { playEmergencyAlert, playSuccessChime, playWarningBeep } from '../utils/soundEffects';

const AppContext = createContext();

export function AppProvider({ children }) {
  // Current logged in user (defaults to Demo Customer: Jane Doe)
  const [currentUser, setCurrentUser] = useState({
    id: 'u_cust_1',
    name: 'Jane Doe',
    email: 'customer@example.com',
    role: 'customer',
    phone: '+1 (555) 234-5678',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    address: '452 Broadway, SoHo, New York, NY 10013',
    coordinates: { lat: 40.7208, lng: -74.0007 }
  });

  const [availableUsers, setAvailableUsers] = useState([]);
  const [technicians, setTechnicians] = useState([]);
  const [requests, setRequests] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeRequestId, setActiveRequestId] = useState(null);
  const [activeTab, setActiveTab] = useState('request'); // 'request' | 'tracking' | 'tech_console' | 'admin_tower' | 'history' | 'profile'
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isHeatmapActive, setIsHeatmapActive] = useState(false);
  const [dispatchMode, setDispatchMode] = useState('direct'); // 'direct' | 'broadcast'
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [incomingOffer, setIncomingOffer] = useState(null); // Alert modal for technician
  const [toastNotification, setToastNotification] = useState(null);
  const [adminNotifications, setAdminNotifications] = useState([]);
  const [adminUnreadAlertsCount, setAdminUnreadAlertsCount] = useState(0);

  const showToast = (message, type = 'info') => {
    setToastNotification({ message, type, id: Date.now() });
    setTimeout(() => {
      setToastNotification((prev) => (prev?.message === message ? null : prev));
    }, 4500);
  };

  // Socket.io initialization
  useEffect(() => {
    const socketServerUrl = window.location.hostname === 'localhost' ? 'http://localhost:5000' : '/';
    const s = io(socketServerUrl, {
      transports: ['websocket', 'polling']
    });

    s.on('connect', () => {
      console.log('Connected to Auto-Dispatch Socket Server');
      setIsConnected(true);
    });

    s.on('disconnect', () => {
      console.log('Disconnected from server');
      setIsConnected(false);
    });

    s.on('initial_state', (data) => {
      if (data.technicians) setTechnicians(data.technicians);
      if (data.requests) setRequests(data.requests);
      if (data.categories) setCategories(data.categories);
    });

    s.on('request_created', (newReq) => {
      setRequests((prev) => [newReq, ...prev.filter((r) => r.id !== newReq.id)]);
      showToast(`Emergency request ${newReq.id} created (${newReq.categoryName})`, 'warning');
    });

    s.on('dispatch_assigned', (data) => {
      const { requestId, technician, distanceKm, etaMinutes, timeoutSeconds } = data;
      console.log(`Dispatch assigned: ${requestId} -> ${technician.name}`);

      // If current user is this assigned technician, trigger the alarm & modal!
      setCurrentUser((curr) => {
        if (curr && curr.id === technician.id) {
          playEmergencyAlert();
          setIncomingOffer({
            requestId,
            technician,
            distanceKm,
            etaMinutes,
            timeoutSeconds: timeoutSeconds || 30
          });
        }
        return curr;
      });

      playSuccessChime();
    });

    s.on('dispatch_countdown', (data) => {
      const { requestId, remainingSeconds } = data;
      setRequests((prev) =>
        prev.map((r) => (r.id === requestId ? { ...r, timeoutRemaining: remainingSeconds } : r))
      );
      setIncomingOffer((prev) =>
        prev && prev.requestId === requestId ? { ...prev, timeoutSeconds: remainingSeconds } : prev
      );
    });

    s.on('dispatch_timeout', (data) => {
      playWarningBeep();
      showToast(
        `Timeout on ${data.requestId}: Technician did not accept within 30s. Auto-reassigning to next candidate!`,
        'error'
      );
      setIncomingOffer(null);
    });

    s.on('location_updated', (data) => {
      const { requestId, technicianId, coordinates, remainingDistanceKm, etaMinutes } = data;
      // Update technician location in list
      setTechnicians((prev) =>
        prev.map((t) =>
          t.id === technicianId ? { ...t, currentLocation: { ...t.currentLocation, ...coordinates } } : t
        )
      );
      // Update request distance & ETA
      setRequests((prev) =>
        prev.map((r) =>
          r.id === requestId
            ? { ...r, distanceKm: remainingDistanceKm, etaMinutes: etaMinutes }
            : r
        )
      );
    });

    s.on('technician_location_update', (data) => {
      const { technicianId, location, heading } = data;
      setTechnicians((prev) =>
        prev.map((t) =>
          t.id === technicianId ? { ...t, currentLocation: location || t.currentLocation, heading: heading !== undefined ? heading : t.heading } : t
        )
      );
    });

    s.on('customer_otp_issued', (data) => {
      if (data && data.requestId && data.otp) {
        setRequests((prev) =>
          prev.map((r) => (r.id === data.requestId ? { ...r, otp: data.otp } : r))
        );
      }
    });

    s.on('prompt_customer_otp', (data) => {
      if (data && data.requestId && data.otp) {
        setRequests((prev) =>
          prev.map((r) => (r.id === data.requestId ? { ...r, otp: data.otp } : r))
        );
      }
    });

    s.on('request_updated', (updatedReq) => {
      setRequests((prev) =>
        prev.map((r) => (r.id === updatedReq.id ? { ...r, ...updatedReq } : r))
      );
    });

    s.on('technicians_updated', (techList) => {
      setTechnicians(techList);
    });

    s.on('request_escalated', (data) => {
      playWarningBeep();
      showToast(`⚠️ Request ${data.requestId} escalated: ${data.reason}`, 'error');
    });

    s.on('admin_notification', (notif) => {
      setAdminNotifications((prev) => [notif, ...prev]);
      setAdminUnreadAlertsCount((prev) => prev + 1);
      if (notif.severity === 'critical') {
        playEmergencyAlert();
      } else {
        playWarningBeep();
      }
      showToast(`[Alert] ${notif.title}: ${notif.message}`, notif.severity === 'critical' ? 'error' : 'warning');
    });

    setSocket(s);

    // Fetch initial list of users
    fetch('/api/auth/users')
      .then((res) => res.json())
      .then((data) => {
        setAvailableUsers([...data.users, ...data.technicians]);
      })
      .catch((err) => console.error('Error fetching users:', err));

    return () => {
      s.disconnect();
    };
  }, []);

  // Administrator Authentication & Clearance Verification
  const authenticateAdmin = (email, password) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    const cleanPassword = (password || '').trim();

    if (
      (cleanEmail === 'admin@resqdispatch.com' || cleanEmail === 'admin@example.com' || cleanEmail === 'admin') &&
      cleanPassword === 'admin123'
    ) {
      const adminUser = availableUsers.find((u) => u.role === 'admin') || {
        id: 'u_admin_1',
        name: 'Sarah Connor',
        email: 'admin@resqdispatch.com',
        role: 'admin',
        phone: '+1 (555) 999-0000',
        avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
        title: 'Operations & Dispatch Director'
      };
      setCurrentUser(adminUser);
      setIsAdminAuthenticated(true);
      setActiveTab('admin_tower');
      return { success: true, user: adminUser };
    }

    return {
      success: false,
      error: 'Invalid administrator credentials. Access restricted.'
    };
  };

  const exitAdminMode = () => {
    setIsAdminAuthenticated(false);
    const fallbackCustomer = availableUsers.find((u) => u.role === 'customer') || {
      id: 'u_cust_1',
      name: 'Jane Doe',
      email: 'customer@resqdispatch.com',
      role: 'customer',
      phone: '+1 (555) 234-5678',
      avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
      address: '452 Broadway, SoHo, New York, NY 10013',
      coordinates: { lat: 40.7208, lng: -74.0007 }
    };
    setCurrentUser(fallbackCustomer);
    setActiveTab('request');
    showToast('Exited Admin Mode. Returned to Customer session.', 'info');
  };

  // Quick switch user account / role
  const switchUser = (user) => {
    if (user.role === 'admin') {
      setIsAdminAuthenticated(true);
    } else {
      setIsAdminAuthenticated(false);
    }

    setCurrentUser(user);
    setIncomingOffer(null);
    showToast(`Switched active persona to ${user.name} (${user.role.toUpperCase()})`, 'info');

    // Automatically navigate to the persona's primary page
    if (user.role === 'customer') {
      setActiveTab('request');
    } else if (user.role === 'technician') {
      setActiveTab('tech_console');
    } else if (user.role === 'admin') {
      setActiveTab('admin_tower');
    }
  };

  // Find active request for customer or technician
  const activeRequest =
    requests.find((r) => r.id === activeRequestId) ||
    (currentUser.role === 'customer'
      ? requests.find((r) => r.customerId === currentUser.id && r.status !== 'cancelled')
      : currentUser.role === 'technician'
      ? requests.find((r) => r.assignedTechnicianId === currentUser.id && r.status !== 'completed')
      : requests[0]);

  // API Actions
  const createEmergencyRequest = async (payload) => {
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...payload,
          customerId: currentUser.id,
          customerName: currentUser.name,
          customerPhone: currentUser.phone
        })
      });
      const data = await res.json();
      if (data.success) {
        setActiveRequestId(data.request.id);
        setActiveTab('tracking');
        showToast(`🚨 Emergency request dispatched! Auto-matching nearest technician...`, 'warning');
        return data.request;
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to create request', 'error');
    }
  };

  const acceptJob = async (requestId) => {
    try {
      const res = await fetch(`/api/requests/${requestId}/accept`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technicianId: currentUser.id })
      });
      const data = await res.json();
      if (data.success) {
        setIncomingOffer(null);
        showToast('Job Accepted! Please navigate to customer.', 'success');
        playSuccessChime();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const rejectJob = async (requestId, reason) => {
    try {
      await fetch(`/api/requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technicianId: currentUser.id, reason })
      });
      setIncomingOffer(null);
      showToast('Job declined. Cascading to next technician.', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const startNavigation = async (requestId) => {
    try {
      await fetch(`/api/requests/${requestId}/navigate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technicianId: currentUser.id })
      });
      showToast('Navigation started! Real-time telemetry broadcasting.', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  const startWork = async (requestId) => {
    try {
      await fetch(`/api/requests/${requestId}/work`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ technicianId: currentUser.id })
      });
      showToast('Repair work marked in progress.', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const completeJob = async (requestId, notes, partsUsed, beforePhoto, afterPhoto, customerSignature) => {
    try {
      const res = await fetch(`/api/requests/${requestId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          technicianId: currentUser.id,
          notes,
          partsUsed,
          beforePhoto,
          afterPhoto,
          customerSignature
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Job completed successfully! Invoice generated & payout credited.', 'success');
        playSuccessChime();
        return data;
      } else {
        showToast(data.reason || 'Failed to complete job', 'error');
      }
    } catch (err) {
      console.error(err);
      showToast('Error completing job', 'error');
    }
  };

  const rateJob = async (requestId, rating, feedback) => {
    try {
      await fetch(`/api/requests/${requestId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, feedback })
      });
      showToast('Thank you for rating your service!', 'success');
    } catch (err) {
      console.error(err);
    }
  };

  // Pay and settle service invoice
  const payInvoice = async (requestId, paymentMethod = 'Apple Pay') => {
    try {
      const res = await fetch(`/api/requests/${requestId}/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentMethod })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Payment of $149.00 processed via ${paymentMethod}! Receipt issued.`, 'success');
        playSuccessChime();
        return data.request;
      }
    } catch (err) {
      console.error(err);
      showToast('Payment processing failed', 'error');
    }
  };

  // Demo Fast-Forward to Next Milestone
  const advanceDemoStep = async (requestId) => {
    try {
      const res = await fetch(`/api/requests/${requestId}/advance`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        showToast('Advancing to next lifecycle milestone...', 'info');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Re-cluster technicians to be nearby customer location
  const reclusterTechnicians = async (location) => {
    try {
      await fetch('/api/technicians/recluster', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location })
      });
    } catch (err) {
      console.error(err);
    }
  };

  // Custom Profile & Avatar Update
  const updateUserProfile = (updates) => {
    setCurrentUser((prev) => {
      const updated = { ...prev, ...updates };
      setAvailableUsers((users) =>
        users.map((u) => (u.id === prev.id ? { ...u, ...updates } : u))
      );
      return updated;
    });
    showToast('Profile & custom avatar updated successfully!', 'success');
  };

  // Verify 4-Digit Security OTP (Phase 1)
  const verifyServiceOTP = async (requestId, otp) => {
    try {
      const res = await fetch(`/api/requests/${requestId}/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp })
      });
      const data = await res.json();
      if (data.success) {
        showToast('4-Digit Security OTP Verified! Service initiated.', 'success');
        playSuccessChime();
        return true;
      } else {
        showToast(data.reason || data.error || 'Invalid OTP code. Please ask customer.', 'error');
        playWarningBeep();
        return false;
      }
    } catch (err) {
      console.error(err);
      showToast('OTP verification failed', 'error');
      return false;
    }
  };

  // Upload Before & After Photo Proof (Phase 3)
  const uploadJobPhotos = async (requestId, beforePhoto, afterPhoto) => {
    try {
      const res = await fetch(`/api/requests/${requestId}/photos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beforePhoto, afterPhoto })
      });
      const data = await res.json();
      if (data.success) {
        showToast('Before & After photo proof synchronized!', 'success');
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Technician Instant Bank Payout (Phase 3)
  const requestTechnicianPayout = async (techId) => {
    try {
      const res = await fetch(`/api/technicians/${techId}/payout`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message, 'success');
        playSuccessChime();
        return data;
      }
    } catch (err) {
      console.error(err);
      showToast('Payout transfer failed', 'error');
    }
  };

  const cancelRequest = async (requestId, reason) => {
    try {
      await fetch(`/api/requests/${requestId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      showToast('Emergency request cancelled.', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  const toggleTechnicianOnline = async (techId) => {
    try {
      const res = await fetch(`/api/technicians/${techId}/toggle-online`, {
        method: 'PUT'
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Technician availability: ${data.technician.isOnline ? 'ONLINE' : 'OFFLINE'}`, 'info');
        // Update current user if this is the technician
        if (currentUser.id === techId) {
          setCurrentUser((prev) => ({ ...prev, isOnline: data.technician.isOnline }));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const updateTechnicianProfile = async (techId, profileData) => {
    try {
      const res = await fetch(`/api/technicians/${techId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(profileData)
      });
      const data = await res.json();
      if (data.success) {
        showToast('Technician profile & vehicle fleet settings saved!', 'success');
        if (currentUser.id === techId) {
          setCurrentUser((prev) => ({ ...prev, ...data.technician }));
        }
        return data.technician;
      }
    } catch (err) {
      console.error(err);
      showToast('Failed to update technician profile', 'error');
    }
  };

  const fetchTechnicianEarnings = async (techId) => {
    try {
      const res = await fetch(`/api/technicians/${techId}/earnings`);
      const data = await res.json();
      if (data.success) {
        return data.earnings;
      }
    } catch (err) {
      console.error(err);
    }
    return null;
  };

  const adminManualOverride = async (requestId, technicianId) => {
    try {
      const res = await fetch('/api/admin/override', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, technicianId })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Admin Override: Reassigned ${requestId} to ${data.targetTech.name}`, 'warning');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const adminSimulateEmergency = async () => {
    try {
      const res = await fetch('/api/admin/simulate-emergency', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        showToast(`Injected simulated emergency ${data.request.id} into dispatch engine!`, 'warning');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const adminResetState = async () => {
    try {
      await fetch('/api/admin/reset', { method: 'POST' });
      showToast('System state reset to baseline seed data', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  // Phase 4: Administrative Command Tower APIs
  const adminHeaders = {
    'Content-Type': 'application/json',
    'x-admin-key': 'admin123',
    'x-user-role': 'admin'
  };

  const adminFetchDashboardStats = async () => {
    try {
      const res = await fetch('/api/admin/dashboard-stats', { headers: adminHeaders });
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const adminFetchRequests = async (params = {}) => {
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`/api/admin/requests?${qs}`, { headers: adminHeaders });
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const adminCancelRequest = async (requestId, reason) => {
    try {
      const res = await fetch(`/api/admin/requests/${requestId}/cancel`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          reason,
          adminId: currentUser?.id || 'u_admin_1',
          adminName: currentUser?.name || 'Sarah Connor'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Request ${requestId} cancelled`, 'info');
      } else {
        showToast(data.error || 'Failed to cancel request', 'error');
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const adminReassignRequest = async (requestId, technicianId, reason) => {
    try {
      const res = await fetch(`/api/admin/requests/${requestId}/reassign`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          technicianId,
          reason,
          adminId: currentUser?.id || 'u_admin_1',
          adminName: currentUser?.name || 'Sarah Connor'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Request ${requestId} reassigned`, 'info');
      } else {
        showToast(data.error || 'Failed to reassign', 'error');
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const adminEscalateRequest = async (requestId, reason) => {
    try {
      const res = await fetch(`/api/admin/requests/${requestId}/escalate`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          reason,
          adminId: currentUser?.id || 'u_admin_1',
          adminName: currentUser?.name || 'Sarah Connor'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Request ${requestId} escalated to supervisor`, 'warning');
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const adminUpdateTechStatus = async (techId, updatePayload) => {
    try {
      const res = await fetch(`/api/admin/technicians/${techId}/status`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({
          ...updatePayload,
          adminId: currentUser?.id || 'u_admin_1',
          adminName: currentUser?.name || 'Sarah Connor'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Technician updated`, 'info');
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const adminFetchCustomers = async (params = {}) => {
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`/api/admin/customers?${qs}`, { headers: adminHeaders });
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const adminUpdateCustomerStatus = async (customerId, status, reason) => {
    try {
      const res = await fetch(`/api/admin/customers/${customerId}/status`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({
          status,
          reason,
          adminId: currentUser?.id || 'u_admin_1',
          adminName: currentUser?.name || 'Sarah Connor'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Customer account updated to ${status}`, 'info');
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const adminFetchFinancials = async (range = 'all') => {
    try {
      const res = await fetch(`/api/admin/financials?range=${range}`, { headers: adminHeaders });
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const adminFetchAnalytics = async (range = '7d') => {
    try {
      const res = await fetch(`/api/admin/analytics?range=${range}`, { headers: adminHeaders });
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const adminFetchAuditLogs = async (params = {}) => {
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`/api/admin/audit-logs?${qs}`, { headers: adminHeaders });
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const adminFetchNotifications = async (unreadOnly = false) => {
    try {
      const res = await fetch(`/api/admin/notifications?unreadOnly=${unreadOnly}`, { headers: adminHeaders });
      const data = await res.json();
      if (data.success) {
        setAdminNotifications(data.notifications || []);
        setAdminUnreadAlertsCount(data.unreadCount || 0);
      }
      return data;
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const adminMarkNotificationRead = async (id) => {
    try {
      await fetch(`/api/admin/notifications/${id}/read`, { method: 'PUT', headers: adminHeaders });
      setAdminNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
      setAdminUnreadAlertsCount((prev) => Math.max(0, prev - 1));
    } catch (err) {
      console.error(err);
    }
  };

  const adminClearNotifications = async () => {
    try {
      await fetch('/api/admin/notifications/clear', { method: 'POST', headers: adminHeaders });
      setAdminNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setAdminUnreadAlertsCount(0);
      showToast('All administrative alerts marked as read', 'info');
    } catch (err) {
      console.error(err);
    }
  };

  // Phase 5: AI Intelligence & Predictive APIs
  const aiFetchOverview = async () => {
    try {
      const res = await fetch('/api/admin/ai/overview', { headers: adminHeaders });
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const aiFetchDemandForecast = async (params = {}) => {
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`/api/admin/ai/demand-forecast?${qs}`, { headers: adminHeaders });
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const aiPredictEta = async (payload) => {
    try {
      const res = await fetch('/api/admin/ai/predict-eta', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify(payload)
      });
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const aiFetchEtaEvaluation = async () => {
    try {
      const res = await fetch('/api/admin/ai/eta-evaluation', { headers: adminHeaders });
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const aiFetchCandidateRecommendations = async (requestId) => {
    try {
      const res = await fetch(`/api/admin/ai/recommendations/technicians/${requestId}`, { headers: adminHeaders });
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const aiFetchAnomalies = async (params = {}) => {
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`/api/admin/ai/anomalies?${qs}`, { headers: adminHeaders });
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const aiUpdateAnomaly = async (id, status, notes = '') => {
    try {
      const res = await fetch(`/api/admin/ai/anomalies/${id}`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({
          status,
          notes,
          adminId: currentUser?.id || 'u_admin_1'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Anomaly marked as ${status}`, 'info');
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const aiFetchRecommendations = async (params = {}) => {
    try {
      const qs = new URLSearchParams(params).toString();
      const res = await fetch(`/api/admin/ai/recommendations?${qs}`, { headers: adminHeaders });
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const aiUpdateRecommendation = async (id, status) => {
    try {
      const res = await fetch(`/api/admin/ai/recommendations/${id}`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({
          status,
          adminId: currentUser?.id || 'u_admin_1'
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Recommendation marked as ${status}`, 'info');
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const aiQueryAssistant = async (query) => {
    try {
      const res = await fetch('/api/admin/ai/assistant/query', {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ query })
      });
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const aiFetchAutomations = async () => {
    try {
      const res = await fetch('/api/admin/ai/automations', { headers: adminHeaders });
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  const aiUpdateAutomation = async (id, updates) => {
    try {
      const res = await fetch(`/api/admin/ai/automations/${id}`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify(updates)
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Automation rule updated`, 'info');
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const aiRunAutomations = async () => {
    try {
      const res = await fetch('/api/admin/ai/automations/run', {
        method: 'POST',
        headers: adminHeaders
      });
      const data = await res.json();
      if (data.success) {
        showToast(data.message || 'Automation checks executed', 'info');
      }
      return data;
    } catch (err) {
      console.error(err);
      return { success: false, error: err.message };
    }
  };

  const aiFetchModels = async () => {
    try {
      const res = await fetch('/api/admin/ai/models', { headers: adminHeaders });
      return await res.json();
    } catch (err) {
      console.error(err);
      return null;
    }
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        availableUsers,
        switchUser,
        technicians,
        requests,
        categories,
        activeRequest,
        setActiveRequestId,
        activeTab,
        setActiveTab,
        isAdminAuthenticated,
        authenticateAdmin,
        exitAdminMode,
        isConnected,
        incomingOffer,
        setIncomingOffer,
        toastNotification,
        showToast,
        createEmergencyRequest,
        acceptJob,
        rejectJob,
        startNavigation,
        startWork,
        completeJob,
        rateJob,
        payInvoice,
        advanceDemoStep,
        reclusterTechnicians,
        updateUserProfile,
        verifyServiceOTP,
        uploadJobPhotos,
        updateTechnicianProfile,
        fetchTechnicianEarnings,
        requestTechnicianPayout,
        isHeatmapActive,
        setIsHeatmapActive,
        dispatchMode,
        setDispatchMode,
        cancelRequest,
        toggleTechnicianOnline,
        adminManualOverride,
        adminSimulateEmergency,
        adminResetState,
        adminNotifications,
        adminUnreadAlertsCount,
        adminFetchDashboardStats,
        adminFetchRequests,
        adminCancelRequest,
        adminReassignRequest,
        adminEscalateRequest,
        adminUpdateTechStatus,
        adminFetchCustomers,
        adminUpdateCustomerStatus,
        adminFetchFinancials,
        adminFetchAnalytics,
        adminFetchAuditLogs,
        adminFetchNotifications,
        adminMarkNotificationRead,
        adminClearNotifications,
        aiFetchOverview,
        aiFetchDemandForecast,
        aiPredictEta,
        aiFetchEtaEvaluation,
        aiFetchCandidateRecommendations,
        aiFetchAnomalies,
        aiUpdateAnomaly,
        aiFetchRecommendations,
        aiUpdateRecommendation,
        aiQueryAssistant,
        aiFetchAutomations,
        aiUpdateAutomation,
        aiRunAutomations,
        aiFetchModels
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
