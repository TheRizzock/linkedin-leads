// utils/api.js
import { BASE_URL } from './config.js';

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