// utils/api.js
import { BASE_URL } from '../config.js';

export async function saveLead(payload) {
  try {
    const res = await fetch(`${BASE_URL}/lead/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(JSON.stringify(data));
    }

    return data;

  } catch (err) {
    console.error("API ERROR:", err);
    return { status: "error", message: err.message };
  }
}

export async function getActivities(contactId) {
  return query(`/contacts/${contactId}/activities`);
}

export async function createActivity(contactId, payload) {
  try {
    const res = await fetch(`${BASE_URL}/contacts/${contactId}/activities`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    return data;
  } catch (err) {
    console.error('CREATE ACTIVITY ERROR:', err);
    return { status: 'error', message: err.message };
  }
}

export async function deleteActivity(contactId, activityId) {
  try {
    const res = await fetch(`${BASE_URL}/contacts/${contactId}/activities/${activityId}`, {
      method: 'DELETE',
    });
    if (res.status === 204) return { status: 'ok' };
    const data = await res.json();
    if (!res.ok) throw new Error(JSON.stringify(data));
    return { status: 'ok' };
  } catch (err) {
    console.error('DELETE ACTIVITY ERROR:', err);
    return { status: 'error', message: err.message };
  }
}

export async function getCompanies(params = {}) {
  return query('/companies/', params);
}

export async function getCompany(companyId) {
  return query(`/companies/${companyId}`);
}

export async function findContactByUrl(profileUrl) {
  return query('/contacts/', { profile_url: profileUrl, page_size: 1 });
}

export async function query(path, params = {}) {
  try {
    const url = new URL(`${BASE_URL}${path}`);

    // append query params
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });

    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(JSON.stringify(data));
    }

    return data;

  } catch (err) {
    console.error("QUERY ERROR:", err);
    return { status: "error", message: err.message };
  }
}