import { saveLead, findContactByUrl, getActivities, createActivity } from '../utils/api.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { buildMessage } from '../utils/template.js';

export async function renderProfile(content, data, url) {
  if (!data || !data.name) {
    content.innerText = 'Invalid profile data';
    return;
  }

  const nameParts = data.name.trim().split(/\s+/);
  const leadPayload = {
    first_name: nameParts[0] || null,
    last_name:  nameParts.slice(1).join(' ') || null,
    headline:   data.headline,
    company:    data.company,
    profileUrl: url,
  };

  content.innerHTML = `
    <div style="font-weight:700; margin-bottom:6px; font-size:20px;">${data.name}</div>
    <div style="margin-bottom:6px; font-size:16px;">${data.headline}</div>
    <div style="opacity:0.7; margin-bottom:16px; font-size:16px;">${data.company}</div>

    <button id="copyBtn" style="
      width:100%; padding:8px; border-radius:8px; border:none;
      background:#22c55e; font-weight:600; margin-bottom:8px; cursor:pointer;
    ">Copy Message</button>

    <div id="crm-actions" style="margin-bottom:16px;"></div>

    <div id="timeline-section"></div>
  `;

  document.getElementById('copyBtn').onclick = async () => {
    const message = await buildMessage(leadPayload);
    copyToClipboard(message);
    document.getElementById('copyBtn').innerText = 'Copied!';
    setTimeout(() => { document.getElementById('copyBtn').innerText = 'Copy Message'; }, 1500);
  };

  // async: check if in CRM, then fill in the action button
  loadPanelTimeline(url, leadPayload);
}

// ── Panel CRM lookup + timeline ───────────────────────────────────────
async function loadPanelTimeline(profileUrl, leadPayload) {
  const lookup   = await findContactByUrl(profileUrl);
  const contacts = lookup?.contacts ?? lookup?.items ?? [];

  // Verify client-side — backend may not filter by profile_url,
  // so confirm the returned contact actually matches this URL.
  const contact = contacts.find(c => normalizeUrl(c.profile_url) === normalizeUrl(profileUrl));

  const actionsEl = document.getElementById('crm-actions');
  if (!actionsEl) return;

  if (!contact) {
    // not in CRM — show Add to CRM
    actionsEl.innerHTML = `
      <button id="addCrmBtn" style="
        width:100%; padding:8px; border-radius:8px; border:none;
        background:#334155; color:white; font-weight:600; cursor:pointer;
      ">Add to CRM</button>
    `;
    document.getElementById('addCrmBtn').onclick = async () => {
      const btn = document.getElementById('addCrmBtn');
      try {
        const result = await saveLead(leadPayload);
        btn.innerText = result?.status || 'Saved!';
        setTimeout(() => { btn.innerText = 'Add to CRM'; }, 1500);
      } catch (err) {
        btn.innerText = 'Error';
      }
    };
    return;
  }

  // already in CRM — show Log Activity + Open in CRM
  actionsEl.innerHTML = `
    ${logActivityBtn()}
    <button id="openCrmContactBtn" style="
      width:100%; padding:8px; border-radius:8px; border:none;
      background:#1e293b; color:#94a3b8; font-weight:600; cursor:pointer;
      margin-top:6px; font-size:13px;
    ">Open in CRM ↗</button>
  `;
  bindLogActivityBtn(contact.id);
  document.getElementById('openCrmContactBtn').onclick = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('crm.html') });
  };

  await refreshPanelActivities(contact.id);
}

function normalizeUrl(url) {
  if (!url) return '';
  return url.toLowerCase().replace(/\/$/, '').split('?')[0];
}

async function refreshPanelActivities(contactId) {
  const section = document.getElementById('timeline-section');
  if (!section) return;

  const result     = await getActivities(contactId);
  const activities = Array.isArray(result) ? result : (result?.activities ?? []);

  if (!activities.length) {
    section.innerHTML = '';
    return;
  }

  section.innerHTML = `
    <div style="
      font-size:11px; text-transform:uppercase; letter-spacing:0.8px;
      opacity:0.4; margin-bottom:8px;
    ">Activity</div>
    ${activities.map(panelActivityRow).join('')}
  `;
}

// ── Log activity form (panel) ─────────────────────────────────────────
function logActivityBtn() {
  return `
    <button id="logActivityBtn" style="
      width:100%; padding:8px; border-radius:8px; border:none;
      background:#3b82f6; color:white; font-weight:600; cursor:pointer;
    ">+ Log Activity</button>
  `;
}

function bindLogActivityBtn(contactId) {
  document.getElementById('logActivityBtn').onclick = () => showPanelForm(contactId);
}

function showPanelForm(contactId) {
  const actionsEl = document.getElementById('crm-actions');
  if (!actionsEl) return;

  const inputStyle = `
    width:100%; background:#0f172a; border:1px solid #334155; border-radius:6px;
    color:white; padding:6px 10px; font-size:13px; margin-bottom:8px;
    font-family:inherit; box-sizing:border-box;
  `;

  actionsEl.innerHTML = `
    <div style="background:#1e293b; border-radius:8px; padding:10px; margin-bottom:4px;">
      <select id="act-type" style="${inputStyle}">
        <option value="linkedin" selected>LinkedIn</option>
        <option value="email">Email</option>
        <option value="phone">Phone</option>
      </select>
      <input id="act-subject" type="text" placeholder="Subject (optional)" style="${inputStyle}">
      <div style="display:flex; gap:6px;">
        <button id="act-cancel" style="
          flex:1; padding:7px; border-radius:6px; border:none;
          background:#334155; color:#e2e8f0; font-weight:600; cursor:pointer; font-size:13px;
        ">Cancel</button>
        <button id="act-submit" style="
          flex:1; padding:7px; border-radius:6px; border:none;
          background:#22c55e; color:white; font-weight:600; cursor:pointer; font-size:13px;
        ">Log</button>
      </div>
    </div>
  `;

  document.getElementById('act-cancel').onclick = () => {
    actionsEl.innerHTML = logActivityBtn();
    bindLogActivityBtn(contactId);
  };

  document.getElementById('act-submit').onclick = async () => {
    const btn     = document.getElementById('act-submit');
    const type    = document.getElementById('act-type').value;
    const subject = document.getElementById('act-subject').value.trim();

    btn.innerText = 'Saving…';
    btn.disabled  = true;

    const created = await createActivity(contactId, {
      type,
      status:  'sent',
      subject: subject || undefined,
    });

    if (created?.status === 'error') {
      btn.innerText = 'Error';
      btn.disabled  = false;
      return;
    }

    actionsEl.innerHTML = logActivityBtn();
    bindLogActivityBtn(contactId);

    // use the returned activity for an instant update — no extra GET needed
    prependPanelActivity(created);
  };
}

function prependPanelActivity(activity) {
  const section = document.getElementById('timeline-section');
  if (!section) return;

  if (!section.innerHTML.trim()) {
    section.innerHTML = `
      <div style="
        font-size:11px; text-transform:uppercase; letter-spacing:0.8px;
        opacity:0.4; margin-bottom:8px;
      ">Activity</div>
    `;
  }

  section.insertAdjacentHTML('beforeend', panelActivityRow(activity));
}

// ── Panel activity row ────────────────────────────────────────────────
function panelActivityRow(a) {
  const icon  = { email: '✉', linkedin: '💬', phone: '📞' }[a.type] ?? '•';
  const date  = a.created_at
    ? new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : '';
  const statusColor = {
    opened: '#86efac', clicked: '#86efac',
    delivered: '#94a3b8', sent: '#94a3b8',
    bounced: '#fca5a5',
  }[a.status] ?? '#94a3b8';

  return `
    <div style="
      display:flex; align-items:flex-start; gap:8px;
      padding:8px 0; border-bottom:1px solid #1e293b;
    ">
      <span style="flex-shrink:0; font-size:13px; margin-top:1px;">${icon}</span>
      <div style="flex:1; min-width:0;">
        <div style="display:flex; justify-content:space-between; align-items:center; gap:4px;">
          <span style="
            font-size:12px; font-weight:600;
            overflow:hidden; text-overflow:ellipsis; white-space:nowrap;
          ">${a.subject || a.type}</span>
          <span style="font-size:11px; color:#64748b; flex-shrink:0;">${date}</span>
        </div>
        ${a.status ? `<div style="font-size:11px; color:${statusColor}; margin-top:1px;">${a.status}</div>` : ''}
      </div>
    </div>
  `;
}
