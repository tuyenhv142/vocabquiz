import { API_BASE } from '../config';

/**
 * Centralized API Service for VocabQuiz Application
 */
export const api = {
  // --- Auth APIs ---
  async login(email, password) {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed.');
    return data;
  },

  async sendOtp(email, password) {
    const res = await fetch(`${API_BASE}/api/auth/send-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send OTP.');
    return data;
  },

  async verifyOtp(email, code) {
    const res = await fetch(`${API_BASE}/api/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'OTP verification failed.');
    return data;
  },

  async forgotPassword(email) {
    const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Forgot password request failed.');
    return data;
  },

  async resetPassword(email, code, newPassword) {
    const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, code, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Reset password failed.');
    return data;
  },

  async deleteAccount(userId) {
    const res = await fetch(`${API_BASE}/api/users/${userId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Delete account failed.');
    return data;
  },

  // --- Sets APIs ---
  async getSets(userId) {
    const url = userId ? `${API_BASE}/api/sets?userId=${userId}` : `${API_BASE}/api/sets`;
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch sets.');
    return data;
  },

  async getSetById(setId) {
    const res = await fetch(`${API_BASE}/api/sets/${setId}`);
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch set details.');
    return data;
  },

  async createSet(userId, title, description, isPublic = true) {
    const res = await fetch(`${API_BASE}/api/sets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, title, description, isPublic }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to create set.');
    return data;
  },

  async updateSet(setId, title, description, isPublic = true) {
    const res = await fetch(`${API_BASE}/api/sets/${setId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, description, isPublic }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update set.');
    return data;
  },

  async deleteSet(setId) {
    const res = await fetch(`${API_BASE}/api/sets/${setId}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to delete set.');
    return data;
  },

  async savePracticeResult(setId, percentage) {
    const res = await fetch(`${API_BASE}/api/sets/${setId}/practice`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ percentage }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to save practice result.');
    return data;
  },

  async cloneSet(setId, userId) {
    const res = await fetch(`${API_BASE}/api/sets/${setId}/clone`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to clone set.');
    return data;
  },

  async shareEmail(setId, recipientEmail, senderEmail, shareUrl) {
    const res = await fetch(`${API_BASE}/api/sets/${setId}/share-email`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientEmail, senderEmail, shareUrl }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to send share email.');
    return data;
  },

  async seedDefaults(userId, levels) {
    const res = await fetch(`${API_BASE}/api/sets/seed-defaults`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, levels }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to seed default sets.');
    return data;
  },

  // --- Cards APIs ---
  async batchCreateCards(setId, cards) {
    const res = await fetch(`${API_BASE}/api/sets/${setId}/cards/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cards }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to import cards.');
    return data;
  },

  // --- Admin APIs ---
  async getAdminStats(adminEmail) {
    const res = await fetch(`${API_BASE}/api/admin/stats`, {
      headers: { 'x-user-email': adminEmail || '' },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch admin stats.');
    return data;
  },
};
