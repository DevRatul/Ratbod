/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

async function handleResponse(res: Response) {
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch (e) {
    data = null;
  }

  if (!res.ok) {
    throw new Error(data?.error || text || `Error: ${res.status} ${res.statusText}`);
  }
  return data;
}

export const api = {
  async register(data: any) {
    const res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async login(data: any) {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async logout() {
    const res = await fetch('/api/logout', { method: 'POST' });
    return handleResponse(res);
  },

  async getMe() {
    const res = await fetch('/api/me');
    if (!res.ok) return null;
    return handleResponse(res);
  },

  async updateProfile(formData: FormData) {
    const res = await fetch('/api/profile', {
      method: 'POST',
      body: formData,
    });
    return handleResponse(res);
  },

  async saveMetrics(data: any) {
    const res = await fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return handleResponse(res);
  },

  async getMetricsHistory() {
    const res = await fetch('/api/metrics');
    if (!res.ok) return [];
    return handleResponse(res);
  },
};
