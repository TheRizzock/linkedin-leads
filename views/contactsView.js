import { query } from '../utils/api.js';

export async function renderContacts(content, navigate) {
  let page = 1;
  const page_size = 25;

  async function load() {
    content.innerHTML = `<div style="color:white;">Loading...</div>`;

    const result = await query('/contacts/', { page, page_size });

    if (!result || result.status === 'error') {
      content.innerHTML = `
        <div style="color:#fca5a5; padding:16px; font-size:13px; background:#7f1d1d; border-radius:8px;">
          Error: ${result?.message ?? 'unknown error'}
        </div>
      `;
      return;
    }

    const contacts = result.contacts ?? result.items ?? [];
    const total = result.total ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / page_size));

    content.innerHTML = `
      <div style="color:white;">
        <div style="
          font-weight:700; font-size:18px; margin-bottom:12px;
          display:flex; justify-content:space-between; align-items:center;
        ">
          <span>Contacts</span>
          <span style="font-size:12px; opacity:0.5; font-weight:400;">${total} total</span>
        </div>

        <div id="contacts-list">
          ${contacts.length === 0
            ? '<div style="opacity:0.5; text-align:center; padding:24px; font-size:14px;">No contacts found</div>'
            : contacts.map(renderRow).join('')
          }
        </div>

        ${totalPages > 1 ? `
          <div style="display:flex; justify-content:space-between; align-items:center; margin-top:12px;">
            <button id="prevBtn" style="
              padding:6px 14px; border-radius:8px; border:none;
              background:${page === 1 ? '#1e293b' : '#334155'};
              color:${page === 1 ? '#475569' : 'white'};
              cursor:${page === 1 ? 'default' : 'pointer'}; font-weight:600; font-size:13px;
            ">← Prev</button>
            <span style="font-size:12px; opacity:0.5;">${page} / ${totalPages}</span>
            <button id="nextBtn" style="
              padding:6px 14px; border-radius:8px; border:none;
              background:${page >= totalPages ? '#1e293b' : '#334155'};
              color:${page >= totalPages ? '#475569' : 'white'};
              cursor:${page >= totalPages ? 'default' : 'pointer'}; font-weight:600; font-size:13px;
            ">Next →</button>
          </div>
        ` : ''}
      </div>
    `;

    contacts.forEach(c => {
      const el = document.getElementById(`contact-${c.id}`);
      if (el) el.onclick = () => navigate('contact-detail', c);
    });

    if (page > 1) {
      document.getElementById('prevBtn')?.addEventListener('click', () => { page--; load(); });
    }
    if (page < totalPages) {
      document.getElementById('nextBtn')?.addEventListener('click', () => { page++; load(); });
    }
  }

  await load();
}

function renderRow(c) {
  const name = [c.first_name, c.last_name].filter(Boolean).join(' ') || '(no name)';
  const zb = zbBadge(c.zb_status);

  return `
    <div id="contact-${c.id}" style="
      background:#1e293b;
      border-radius:8px;
      padding:10px 12px;
      margin-bottom:8px;
      cursor:pointer;
      border:1px solid #334155;
      transition:background 0.1s;
    ">
      <div style="font-weight:600; font-size:14px;">${name}</div>
      ${c.job_title ? `<div style="font-size:12px; opacity:0.6; margin-top:2px;">${c.job_title}</div>` : ''}
      ${c.email ? `
        <div style="display:flex; align-items:center; gap:6px; margin-top:5px;">
          <span style="font-size:12px; opacity:0.75; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${c.email}</span>
          ${zb}
        </div>
      ` : ''}
    </div>
  `;
}

function zbBadge(status) {
  if (!status) return '';
  const map = {
    valid:    { bg: '#14532d', text: '#86efac' },
    invalid:  { bg: '#7f1d1d', text: '#fca5a5' },
    'catch-all': { bg: '#713f12', text: '#fde68a' },
    unknown:  { bg: '#1e293b', text: '#94a3b8' },
  };
  const c = map[status] ?? { bg: '#1e293b', text: '#94a3b8' };
  return `<span style="
    flex-shrink:0; font-size:10px; padding:1px 6px; border-radius:4px;
    background:${c.bg}; color:${c.text}; font-weight:600;
  ">${status}</span>`;
}
