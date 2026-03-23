import { query } from '../utils/api.js';

export async function renderDashboard(content) {
  content.innerHTML = `<div>Loading...</div>`;

  try {
    const result = await query('/contacts/count/today');

    content.innerHTML = `
      <div style="font-weight:700; font-size:18px; margin-bottom:12px;">
        Dashboard
      </div>

      <div style="
        background:#0f172a;
        color:white;
        padding:16px;
        border-radius:12px;
        text-align:center;
      ">
        <div style="font-size:14px; opacity:0.7;">
          Contacts Today
        </div>
        <div style="font-size:28px; font-weight:700;">
          ${result?.count ?? 0}
        </div>
      </div>
    `;

  } catch (err) {
    console.error(err);
    content.innerHTML = `<div>Error loading dashboard</div>`;
  }
}