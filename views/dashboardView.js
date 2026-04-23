import { query } from '../utils/api.js';

const TYPES = [
  { key: '',         label: 'All' },
  { key: 'email',    label: 'Email' },
  { key: 'linkedin', label: 'LinkedIn' },
  { key: 'phone',    label: 'Phone' },
];

export async function renderDashboard(content) {
  content.innerHTML = `<div style="color:white;">Loading…</div>`;

  try {
    // fetch all counts in parallel
    const results = await Promise.all(
      TYPES.map(t =>
        query('/contacts/count/today', t.key ? { activity_type: t.key } : {})
      )
    );

    const counts = Object.fromEntries(
      TYPES.map((t, i) => [t.key, results[i]?.count ?? 0])
    );

    content.innerHTML = `
      <div style="font-weight:700; font-size:18px; margin-bottom:12px; color:white;">
        Dashboard
      </div>
      ${activityCard(counts)}
    `;

    bindToggles(counts);

  } catch (err) {
    console.error(err);
    content.innerHTML = `<div style="color:#fca5a5;">Error loading dashboard</div>`;
  }
}

function activityCard(counts) {
  return `
    <div style="background:#1e293b; border-radius:12px; padding:16px;">
      <div style="font-size:12px; text-transform:uppercase; letter-spacing:0.6px; color:#64748b; margin-bottom:10px;">
        Activities Today
      </div>

      <div style="display:flex; gap:6px; margin-bottom:16px;">
        ${TYPES.map((t, i) => `
          <button
            data-type="${t.key}"
            style="
              flex:1; padding:6px 4px; border-radius:7px; border:none;
              font-weight:600; font-size:12px; cursor:pointer;
              background:${i === 0 ? '#22c55e' : '#334155'};
              color:${i === 0 ? 'white' : '#94a3b8'};
            "
          >${t.label}</button>
        `).join('')}
      </div>

      <div id="activity-count" style="text-align:center;">
        <div style="font-size:42px; font-weight:700; color:white; line-height:1;">
          ${counts['']}
        </div>
        <div id="count-label" style="font-size:13px; color:#64748b; margin-top:4px;">
          all types
        </div>
      </div>
    </div>
  `;
}

function bindToggles(counts) {
  const buttons = document.querySelectorAll('[data-type]');

  buttons.forEach(btn => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const t    = TYPES.find(t => t.key === type);

      // update active styles
      buttons.forEach(b => {
        b.style.background = '#334155';
        b.style.color      = '#94a3b8';
      });
      btn.style.background = '#22c55e';
      btn.style.color      = 'white';

      // update count
      document.getElementById('activity-count').querySelector('div').innerText = counts[type];
      document.getElementById('count-label').innerText = t.key ? t.label.toLowerCase() : 'all types';
    });
  });
}
