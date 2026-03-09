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
      credentials: 'include',
    });
    return handleResponse(res);
  },

  async login(data: any) {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  async logout() {
    const res = await fetch('/api/logout', { 
      method: 'POST',
      credentials: 'include',
    });
    return handleResponse(res);
  },

  async getMe() {
    const res = await fetch('/api/me', {
      credentials: 'include',
    });
    if (!res.ok) return null;
    return handleResponse(res);
  },

  async updateProfile(formData: FormData) {
    const res = await fetch('/api/profile', {
      method: 'POST',
      body: formData,
      credentials: 'include',
    });
    return handleResponse(res);
  },

  async saveMetrics(data: any) {
    const res = await fetch('/api/metrics', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  async getMetricsHistory() {
    const res = await fetch('/api/metrics', {
      credentials: 'include',
    });
    if (!res.ok) return [];
    return handleResponse(res);
  },

  async deleteMetric(id: number) {
    const res = await fetch(`/api/metrics/${id}`, {
      method: 'DELETE',
      credentials: 'include',
    });
    return handleResponse(res);
  },
  
  async getGoals() {
    const res = await fetch('/api/goals', {
      credentials: 'include',
    });
    if (!res.ok) return null;
    return handleResponse(res);
  },

  async saveGoal(data: any) {
    const res = await fetch('/api/goals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  async getUsers() {
    const res = await fetch('/api/users', {
      credentials: 'include',
    });
    if (!res.ok) return [];
    return handleResponse(res);
  },

  async switchUser(id: number) {
    const res = await fetch('/api/users/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  async createProfile(name: string) {
    const res = await fetch('/api/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name }),
      credentials: 'include',
    });
    return handleResponse(res);
  },

  async deleteUser(id: number) {
    const res = await fetch('/api/users/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
      credentials: 'include',
    });
    return handleResponse(res);
  },
};
