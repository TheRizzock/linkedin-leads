import { query, getActivities, createActivity, deleteActivity } from './utils/api.js';
import { getCompanies, getCompany } from './utils/api.js';

// ── State ────────────────────────────────────────────────────────────
const state = {
  route:     'contacts',
  prevRoute: null,
  contact:   null,
  company:   null,

  // contacts list
  page: 1, pageSize: 25,
  zb_status: '', industry: '', seniority_level: '',
  never_contacted: false,
  sort_by: 'created_at', sort_dir: 'desc',

  // companies list
  co_page: 1, co_pageSize: 25,
  co_search: '', co_city: '', co_state: '',
  co_sort_by: 'name', co_sort_dir: 'asc',
};

// ── Bootstrap ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', render);

// ── Navigation ───────────────────────────────────────────────────────
function navigate(route, data = null) {
  state.prevRoute = state.route;
  state.route     = route;
  if (route === 'contact-detail') state.contact = data;
  if (route === 'company-detail') state.company = data;
  render();
}

async function render() {
  const app = document.getElementById('app');
  switch (state.route) {
    case 'contact-detail': return await renderContactDetail(app, state.contact);
    case 'company-detail': return await renderCompanyDetail(app, state.company);
    case 'companies':      return await renderCompanies(app);
    default:               return await renderContacts(app);
  }
}

// ── Page header (with nav tabs or back button) ────────────────────────
function pageHeader(title, backLabel = null) {
  if (backLabel) {
    return `
      <div class="page-header">
        <button id="back-btn" class="btn-back">← ${backLabel}</button>
        <h1 style="margin-left:12px;">${title}</h1>
      </div>
    `;
  }
  return `
    <div class="page-header">
      <div style="display:flex; gap:6px;">
        <button class="crm-tab ${state.route === 'contacts'  ? 'crm-tab-active' : ''}" id="nav-contacts">Contacts</button>
        <button class="crm-tab ${state.route === 'companies' ? 'crm-tab-active' : ''}" id="nav-companies">Companies</button>
      </div>
      <span class="subtitle">${title}</span>
    </div>
  `;
}

function bindNav() {
  document.getElementById('nav-contacts')?.addEventListener('click', () => {
    state.route = 'contacts'; state.page = 1; render();
  });
  document.getElementById('nav-companies')?.addEventListener('click', () => {
    state.route = 'companies'; state.co_page = 1; render();
  });
}

// ── Contacts list ────────────────────────────────────────────────────
async function renderContacts(app) {
  app.innerHTML = `
    ${pageHeader('Contacts')}
    ${contactFilterBar()}
    <div id="table-area" class="empty">Loading contacts…</div>
  `;
  bindNav();
  bindContactFilters();

  const params = {
    page: state.page, page_size: state.pageSize,
    sort_by: state.sort_by, sort_dir: state.sort_dir,
  };
  if (state.zb_status)       params.zb_status       = state.zb_status;
  if (state.industry)        params.industry        = state.industry;
  if (state.seniority_level) params.seniority_level = state.seniority_level;
  if (state.never_contacted) params.never_contacted  = true;

  const result = await query('/contacts/', params);
  const area   = document.getElementById('table-area');
  if (!area) return;

  if (!result || result.status === 'error') {
    area.outerHTML = `<div class="error-box">Error: ${result?.message ?? 'Failed to load contacts'}</div>`;
    return;
  }

  const contacts = result.contacts ?? result.items ?? [];
  const total    = result.total ?? 0;
  const pages    = Math.max(1, Math.ceil(total / state.pageSize));

  area.outerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th>Name</th>
          <th>Company</th>
          <th>Email</th>
          <th>Seniority</th>
          <th class="sortable ${state.sort_by === 'created_at'    ? 'sort-active' : ''}" data-col="created_at">Added ${sortArrow('created_at')}</th>
          <th class="sortable ${state.sort_by === 'last_contacted' ? 'sort-active' : ''}" data-col="last_contacted">Last contacted ${sortArrow('last_contacted')}</th>
          <th></th>
        </tr></thead>
        <tbody>
          ${contacts.length
            ? contacts.map(contactRow).join('')
            : `<tr><td colspan="7" class="empty">No contacts found</td></tr>`}
        </tbody>
      </table>
    </div>
    ${paginationHTML(state.page, pages, total, 'contacts')}
  `;

  contacts.forEach(c => {
    document.querySelector(`[data-id="${c.id}"]`)
      ?.addEventListener('click', () => navigate('contact-detail', c));
  });

  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (state.sort_by === col) state.sort_dir = state.sort_dir === 'desc' ? 'asc' : 'desc';
      else { state.sort_by = col; state.sort_dir = 'desc'; }
      state.page = 1; render();
    });
  });

  bindPagination(pages, 'contacts');
}

// ── Contact detail ───────────────────────────────────────────────────
async function renderContactDetail(app, c) {
  const name          = [c.first_name, c.last_name].filter(Boolean).join(' ') || '(no name)';
  const added         = c.created_at        ? new Date(c.created_at).toLocaleDateString()        : null;
  const lastContacted = c.last_contacted_at  ? new Date(c.last_contacted_at).toLocaleDateString() : null;

  app.innerHTML = `
    ${pageHeader(name, 'Contacts')}
    <div class="detail-grid">
      <div class="detail-card full">
        ${c.headline ? `<div style="font-size:15px; opacity:0.7; margin-bottom:4px;">${c.headline}</div>` : ''}
        ${c.job_title && c.job_title !== c.headline
          ? `<div style="font-size:13px; color:#64748b; margin-bottom:4px;">${c.job_title}</div>` : ''}
        ${c.company_name ? `
          <div id="company-link" style="
            font-size:13px; color:#3b82f6; cursor:pointer; display:inline-block;
          ">${c.company_name} ↗</div>` : ''}
      </div>

      ${detailCard('Contact', [
        c.email         && detailRow('Email',  emailCell(c)),
        c.mobile_number && detailRow('Mobile', c.mobile_number),
      ])}

      ${detailCard('Professional', [
        c.industry        && detailRow('Industry',  c.industry),
        c.seniority_level && detailRow('Seniority', c.seniority_level),
      ])}

      ${detailCard('Location', [
        (c.city || c.state || c.country) && detailRow(
          'Location', [c.city, c.state, c.country].filter(Boolean).join(', ')
        ),
      ])}

      ${c.zb_status ? detailCard('Email Validation', [
        detailRow('Status', zbBadge(c.zb_status)),
      ]) : ''}

      ${detailCard('Timeline', [
        added         && detailRow('Added',          added),
        lastContacted  && detailRow('Last contacted', lastContacted),
        !lastContacted && detailRow('Last contacted', '<span style="color:#475569;">Never</span>'),
      ])}

      ${c.profile_url ? `
        <div class="detail-card full" style="text-align:center;">
          <a href="${c.profile_url}" target="_blank" class="btn-linkedin">View LinkedIn Profile ↗</a>
        </div>` : ''}

      <div id="activities-section" class="detail-card full"></div>
    </div>
  `;

  document.getElementById('back-btn')?.addEventListener('click', () => {
    state.route = 'contacts'; state.contact = null; render();
  });

  document.getElementById('company-link')?.addEventListener('click', async () => {
    const el = document.getElementById('company-link');
    el.textContent = 'Loading…';
    if (c.company_id) {
      const co = await getCompany(c.company_id);
      if (co && !co.detail) { navigate('company-detail', co); return; }
    }
    if (c.company_name) {
      const res   = await getCompanies({ search: c.company_name, page_size: 1 });
      const items = res?.items ?? [];
      if (items.length) { navigate('company-detail', items[0]); return; }
    }
    el.textContent = c.company_name + ' (not found)';
  });

  await loadCrmActivities(c.id);
}

// ── Companies list ───────────────────────────────────────────────────
async function renderCompanies(app) {
  app.innerHTML = `
    ${pageHeader('Companies')}
    ${companyFilterBar()}
    <div id="table-area" class="empty">Loading companies…</div>
  `;
  bindNav();
  bindCompanyFilters();

  const params = {
    page: state.co_page, page_size: state.co_pageSize,
    sort_by: state.co_sort_by, sort_dir: state.co_sort_dir,
  };
  if (state.co_search) params.search = state.co_search;
  if (state.co_city)   params.city   = state.co_city;
  if (state.co_state)  params.state  = state.co_state;

  const result = await getCompanies(params);
  const area   = document.getElementById('table-area');
  if (!area) return;

  if (!result || result.status === 'error') {
    area.outerHTML = `<div class="error-box">Error: ${result?.message ?? 'Failed to load companies'}</div>`;
    return;
  }

  const companies = result.items ?? [];
  const total     = result.total ?? 0;
  const pages     = Math.max(1, Math.ceil(total / state.co_pageSize));

  area.outerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr>
          <th class="sortable ${state.co_sort_by === 'name' ? 'sort-active' : ''}" data-col="name">Company ${coSortArrow('name')}</th>
          <th>Location</th>
          <th>Size</th>
          <th>Revenue</th>
          <th class="sortable ${state.co_sort_by === 'contact_count' ? 'sort-active' : ''}" data-col="contact_count">Contacts ${coSortArrow('contact_count')}</th>
          <th class="sortable ${state.co_sort_by === 'created_at' ? 'sort-active' : ''}" data-col="created_at">Added ${coSortArrow('created_at')}</th>
        </tr></thead>
        <tbody>
          ${companies.length
            ? companies.map(companyRow).join('')
            : `<tr><td colspan="6" class="empty">No companies found</td></tr>`}
        </tbody>
      </table>
    </div>
    ${paginationHTML(state.co_page, pages, total, 'companies')}
  `;

  companies.forEach(co => {
    document.querySelector(`[data-co-id="${co.id}"]`)
      ?.addEventListener('click', () => navigate('company-detail', co));
  });

  document.querySelectorAll('th.sortable').forEach(th => {
    th.addEventListener('click', () => {
      const col = th.dataset.col;
      if (state.co_sort_by === col) state.co_sort_dir = state.co_sort_dir === 'desc' ? 'asc' : 'desc';
      else { state.co_sort_by = col; state.co_sort_dir = 'desc'; }
      state.co_page = 1; render();
    });
  });

  bindPagination(pages, 'companies');
}

// ── Company detail ───────────────────────────────────────────────────
async function renderCompanyDetail(app, co) {
  const backLabel = state.prevRoute === 'contact-detail' ? 'Contact' : 'Companies';

  // start with summary data, then fetch full detail
  app.innerHTML = `
    ${pageHeader(co.name, backLabel)}
    <div class="detail-grid" id="co-detail-grid">
      <div class="detail-card full" style="color:#64748b; font-size:13px;">Loading…</div>
    </div>
  `;

  document.getElementById('back-btn')?.addEventListener('click', () => {
    state.company = null;
    if (state.prevRoute === 'contact-detail') {
      state.route = 'contact-detail'; render();
    } else {
      state.route = 'companies'; render();
    }
  });

  const full = await getCompany(co.id);
  // full.id present = valid company; otherwise fall back to list-level data
  const c    = full?.id ? full : co;
  const grid = document.getElementById('co-detail-grid');
  if (!grid) return;

  const techs    = Array.isArray(c.technologies) ? c.technologies : [];
  const keywords = Array.isArray(c.keywords)     ? c.keywords     : [];

  grid.innerHTML = `
    <div class="detail-card full">
      <div style="display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:8px;">
        <div>
          <div style="font-size:20px; font-weight:700; margin-bottom:4px;">${c.name}</div>
          ${c.description ? `<div style="font-size:13px; color:#64748b; max-width:700px;">${c.description}</div>` : ''}
        </div>
        ${c.website ? `<a href="${c.website}" target="_blank" class="btn-linkedin" style="white-space:nowrap;">Website ↗</a>` : ''}
      </div>
    </div>

    ${detailCard('Company', [
      c.company_size   && detailRow('Size',     c.company_size + ' employees'),
      c.founded_year   && detailRow('Founded',  c.founded_year),
      c.domain         && detailRow('Domain',   c.domain),
      c.contact_count != null && detailRow('Contacts', String(c.contact_count)),
    ])}

    ${detailCard('Financials', [
      c.annual_revenue_clean && detailRow('Revenue', c.annual_revenue_clean),
      c.total_funding_clean  && detailRow('Funding', c.total_funding_clean),
    ])}

    ${detailCard('Location', [
      c.full_address && detailRow('Address', c.full_address),
      (!c.full_address && (c.city || c.state || c.country)) && detailRow(
        'Location', [c.city, c.state, c.country].filter(Boolean).join(', ')
      ),
      c.postal_code && detailRow('Postal', c.postal_code),
    ])}

    ${(techs.length || keywords.length) ? detailCard('Tech & Keywords', [
      techs.length    && detailRow('Technologies', techs.join(', ')),
      keywords.length && detailRow('Keywords',     keywords.join(', ')),
    ]) : ''}

    <div id="company-contacts" class="detail-card full">
      <h3>Contacts</h3>
      <div style="color:#64748b; font-size:13px;">Loading…</div>
    </div>
  `;

  loadCompanyContacts(c.id);
}

// ── Company contacts section ──────────────────────────────────────────
async function loadCompanyContacts(companyId) {
  const section = document.getElementById('company-contacts');
  if (!section) return;

  const result   = await query('/contacts/', { company_id: companyId, page_size: 50, sort_by: 'last_contacted', sort_dir: 'desc' });
  const contacts = result?.contacts ?? result?.items ?? [];

  if (!contacts.length) {
    section.innerHTML = `<h3>Contacts</h3><div style="color:#475569; font-size:13px;">No contacts</div>`;
    return;
  }

  section.innerHTML = `
    <h3 style="margin-bottom:12px;">Contacts <span style="font-weight:400; color:#64748b;">(${contacts.length})</span></h3>
    ${contacts.map(c => {
      const name          = [c.first_name, c.last_name].filter(Boolean).join(' ') || '(no name)';
      const lastContacted = c.last_contacted_at
        ? new Date(c.last_contacted_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : 'Never contacted';
      return `
        <div data-contact-id="${c.id}" style="
          display:flex; align-items:center; justify-content:space-between;
          padding:10px 0; border-bottom:1px solid #334155; cursor:pointer;
        ">
          <div>
            <div style="font-weight:600; font-size:14px; margin-bottom:2px;">${name}</div>
            <div style="font-size:12px; color:#64748b;">${c.job_title ?? ''}${c.job_title && c.seniority_level ? ' · ' : ''}${c.seniority_level ?? ''}</div>
          </div>
          <div style="text-align:right; flex-shrink:0; margin-left:16px;">
            ${c.email ? `<div style="font-size:12px; color:#94a3b8; margin-bottom:2px;">${emailCell(c)}</div>` : ''}
            <div style="font-size:11px; color:#475569;">${lastContacted}</div>
          </div>
        </div>
      `;
    }).join('')}
  `;

  contacts.forEach(c => {
    section.querySelector(`[data-contact-id="${c.id}"]`)
      ?.addEventListener('click', () => navigate('contact-detail', c));
  });
}

// ── Activity section ─────────────────────────────────────────────────
async function loadCrmActivities(contactId) {
  const section = document.getElementById('activities-section');
  if (!section) return;

  section.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
      <h3 style="margin-bottom:0;">Activity</h3>
      <button id="show-log-form" style="
        padding:5px 12px; border-radius:6px; border:none;
        background:#22c55e; color:white; font-weight:600; font-size:12px; cursor:pointer;
      ">+ Log</button>
    </div>

    <div id="log-form" style="display:none; background:#0f172a; border-radius:8px; padding:14px; margin-bottom:16px;">
      <div style="display:flex; gap:8px; margin-bottom:10px;">
        <select id="f-type" style="flex:1; background:#1e293b; border:1px solid #334155; border-radius:6px; color:#e2e8f0; padding:6px 10px; font-size:13px;">
          <option value="email">Email</option>
          <option value="linkedin">LinkedIn</option>
          <option value="phone">Phone</option>
        </select>
        <select id="f-status" style="flex:1; background:#1e293b; border:1px solid #334155; border-radius:6px; color:#e2e8f0; padding:6px 10px; font-size:13px;">
          <option value="sent">Sent</option>
          <option value="delivered">Delivered</option>
          <option value="opened">Opened</option>
          <option value="clicked">Clicked</option>
          <option value="bounced">Bounced</option>
        </select>
      </div>
      <input id="f-subject" type="text" placeholder="Subject (optional)" style="
        width:100%; background:#1e293b; border:1px solid #334155; border-radius:6px;
        color:#e2e8f0; padding:7px 10px; font-size:13px; margin-bottom:8px;
      ">
      <textarea id="f-body" placeholder="Body / notes (optional)" rows="3" style="
        width:100%; background:#1e293b; border:1px solid #334155; border-radius:6px;
        color:#e2e8f0; padding:7px 10px; font-size:13px; resize:vertical;
        margin-bottom:10px; font-family:inherit;
      "></textarea>
      <div style="display:flex; gap:8px; justify-content:flex-end;">
        <button id="cancel-log" style="padding:6px 14px; border-radius:6px; border:none; background:#334155; color:#e2e8f0; font-weight:600; font-size:13px; cursor:pointer;">Cancel</button>
        <button id="submit-log" style="padding:6px 14px; border-radius:6px; border:none; background:#22c55e; color:white; font-weight:600; font-size:13px; cursor:pointer;">Log Activity</button>
      </div>
    </div>

    <div id="act-list"><div style="color:#64748b; font-size:13px;">Loading…</div></div>
  `;

  document.getElementById('show-log-form').onclick = () => {
    document.getElementById('log-form').style.display = 'block';
    document.getElementById('show-log-form').style.display = 'none';
  };
  document.getElementById('cancel-log').onclick = () => {
    document.getElementById('log-form').style.display = 'none';
    document.getElementById('show-log-form').style.display = 'inline-block';
  };
  document.getElementById('submit-log').onclick = async () => {
    const btn = document.getElementById('submit-log');
    btn.innerText = 'Saving…'; btn.disabled = true;
    const result = await createActivity(contactId, {
      type:    document.getElementById('f-type').value,
      status:  document.getElementById('f-status').value,
      subject: document.getElementById('f-subject').value.trim() || undefined,
      body:    document.getElementById('f-body').value.trim()    || undefined,
    });
    if (result?.status === 'error') { btn.innerText = 'Error — try again'; btn.disabled = false; return; }
    await loadCrmActivities(contactId);
  };

  const result     = await getActivities(contactId);
  const activities = Array.isArray(result) ? result : (result?.activities ?? []);
  const list       = document.getElementById('act-list');
  if (!list) return;

  list.innerHTML = activities.length
    ? activities.map(activityRow).join('')
    : `<div style="color:#475569; font-size:13px;">No activity yet</div>`;

  list.querySelectorAll('.delete-activity').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Delete this activity?')) return;
      btn.innerText = '…'; btn.disabled = true;
      await deleteActivity(contactId, btn.dataset.id);
      await loadCrmActivities(contactId);
    };
  });
}

// ── Filter bars ──────────────────────────────────────────────────────
function contactFilterBar() {
  return `
    <div class="filter-bar">
      <select id="f-zb">
        <option value="">All statuses</option>
        ${['valid','invalid','catch-all','unknown'].map(s =>
          `<option value="${s}" ${state.zb_status === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
      <input id="f-industry" type="text" placeholder="Industry…" value="${state.industry}" style="width:130px;">
      <select id="f-seniority">
        <option value="">All seniorities</option>
        ${['C-Level','VP','Director','Manager','Individual Contributor','Entry Level'].map(s =>
          `<option value="${s}" ${state.seniority_level === s ? 'selected' : ''}>${s}</option>`).join('')}
      </select>
      <div class="filter-sep"></div>
      <label><input id="f-never" type="checkbox" ${state.never_contacted ? 'checked' : ''}> Never contacted</label>
    </div>
  `;
}

function bindContactFilters() {
  let t;
  document.getElementById('f-zb')?.addEventListener('change', e => { state.zb_status = e.target.value; state.page = 1; render(); });
  document.getElementById('f-industry')?.addEventListener('input', e => { clearTimeout(t); t = setTimeout(() => { state.industry = e.target.value.trim(); state.page = 1; render(); }, 400); });
  document.getElementById('f-seniority')?.addEventListener('change', e => { state.seniority_level = e.target.value; state.page = 1; render(); });
  document.getElementById('f-never')?.addEventListener('change', e => { state.never_contacted = e.target.checked; state.page = 1; render(); });
}

function companyFilterBar() {
  return `
    <div class="filter-bar">
      <input id="co-search" type="text" placeholder="Search companies…" value="${state.co_search}" style="width:200px;">
      <input id="co-city"   type="text" placeholder="City…"    value="${state.co_city}"   style="width:120px;">
      <input id="co-state"  type="text" placeholder="State…"   value="${state.co_state}"  style="width:100px;">
    </div>
  `;
}

function bindCompanyFilters() {
  let t;
  const debounce = (key, val) => { clearTimeout(t); t = setTimeout(() => { state[key] = val; state.co_page = 1; render(); }, 400); };
  document.getElementById('co-search')?.addEventListener('input', e => debounce('co_search', e.target.value.trim()));
  document.getElementById('co-city')?.addEventListener('input',   e => debounce('co_city',   e.target.value.trim()));
  document.getElementById('co-state')?.addEventListener('input',  e => debounce('co_state',  e.target.value.trim()));
}

// ── Row renderers ────────────────────────────────────────────────────
function contactRow(c) {
  const name          = [c.first_name, c.last_name].filter(Boolean).join(' ') || '(no name)';
  const added         = c.created_at        ? new Date(c.created_at).toLocaleDateString()        : '—';
  const lastContacted = c.last_contacted_at ? new Date(c.last_contacted_at).toLocaleDateString() : '—';
  return `
    <tr data-id="${c.id}">
      <td style="font-weight:600;">${name}</td>
      <td style="color:#94a3b8;">${c.company_name ?? '—'}</td>
      <td>${emailCell(c)}</td>
      <td style="color:#94a3b8;">${c.seniority_level ?? '—'}</td>
      <td style="color:#64748b; font-size:12px;">${added}</td>
      <td style="color:#64748b; font-size:12px;">${lastContacted}</td>
      <td>${c.profile_url
        ? `<a href="${c.profile_url}" target="_blank" onclick="event.stopPropagation()"
             style="font-size:12px; color:#3b82f6; text-decoration:none; white-space:nowrap;">LinkedIn ↗</a>`
        : ''}</td>
    </tr>`;
}

function companyRow(co) {
  const location = [co.city, co.state, co.country].filter(Boolean).join(', ') || '—';
  const added    = co.created_at ? new Date(co.created_at).toLocaleDateString() : '—';
  return `
    <tr data-co-id="${co.id}">
      <td style="font-weight:600;">${co.name}</td>
      <td style="color:#94a3b8; font-size:13px;">${location}</td>
      <td style="color:#94a3b8;">${co.company_size ?? '—'}</td>
      <td style="color:#94a3b8;">${co.annual_revenue_clean ?? '—'}</td>
      <td style="color:#94a3b8; text-align:center;">${co.contact_count ?? 0}</td>
      <td style="color:#64748b; font-size:12px;">${added}</td>
    </tr>`;
}

// ── HTML helpers ─────────────────────────────────────────────────────
function emailCell(c) {
  if (!c.email) return '<span style="color:#475569;">—</span>';
  return c.zb_status ? `${c.email} ${zbBadge(c.zb_status)}` : c.email;
}

function zbBadge(status) {
  if (!status) return '';
  const cls = { valid: 'badge-valid', invalid: 'badge-invalid', 'catch-all': 'badge-catch-all' }[status] ?? 'badge-unknown';
  return `<span class="badge ${cls}">${status}</span>`;
}

function paginationHTML(page, pages, total, ns) {
  const pageSize = ns === 'companies' ? state.co_pageSize : state.pageSize;
  const from = Math.min((page - 1) * pageSize + 1, total);
  const to   = Math.min(page * pageSize, total);
  return `
    <div class="pagination">
      <button id="prev-btn" ${page <= 1 ? 'disabled' : ''}>← Prev</button>
      <span>${from}–${to} of ${total}</span>
      <button id="next-btn" ${page >= pages ? 'disabled' : ''}>Next →</button>
    </div>`;
}

function bindPagination(pages, ns) {
  const isCompanies = ns === 'companies';
  document.getElementById('prev-btn')?.addEventListener('click', () => {
    if (isCompanies) state.co_page = Math.max(1, state.co_page - 1);
    else state.page = Math.max(1, state.page - 1);
    render();
  });
  document.getElementById('next-btn')?.addEventListener('click', () => {
    if (isCompanies) state.co_page = Math.min(pages, state.co_page + 1);
    else state.page = Math.min(pages, state.page + 1);
    render();
  });
}

function sortArrow(col) {
  if (state.sort_by !== col) return '';
  return state.sort_dir === 'desc' ? '↓' : '↑';
}

function coSortArrow(col) {
  if (state.co_sort_by !== col) return '';
  return state.co_sort_dir === 'desc' ? '↓' : '↑';
}

function detailCard(title, rows) {
  const valid = rows.filter(Boolean);
  if (!valid.length) return '';
  return `<div class="detail-card"><h3>${title}</h3>${valid.join('')}</div>`;
}

function detailRow(label, value) {
  return `
    <div class="detail-row">
      <span class="detail-label">${label}</span>
      <span>${value}</span>
    </div>`;
}

function activityRow(a) {
  const icon = { email: '✉', linkedin: '💬', phone: '📞' }[a.type] ?? '•';
  const date = a.created_at
    ? new Date(a.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : '';
  const statusCls = { opened: 'badge-valid', clicked: 'badge-valid', delivered: 'badge-unknown', sent: 'badge-unknown', bounced: 'badge-invalid' }[a.status] ?? 'badge-unknown';
  return `
    <div style="display:flex; gap:14px; padding:14px 0; border-bottom:1px solid #334155;">
      <div style="flex-shrink:0; width:34px; height:34px; border-radius:50%; background:#0f172a; display:flex; align-items:center; justify-content:center; font-size:16px; margin-top:2px;">${icon}</div>
      <div style="flex:1; min-width:0;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:4px;">
          <div style="display:flex; align-items:center; gap:8px;">
            <span style="font-weight:600; text-transform:capitalize;">${a.type ?? 'Activity'}</span>
            ${a.status ? `<span class="badge ${statusCls}">${a.status}</span>` : ''}
          </div>
          <div style="display:flex; align-items:center; gap:10px; flex-shrink:0;">
            <span style="font-size:12px; color:#64748b;">${date}</span>
            <button class="delete-activity" data-id="${a.id}" style="background:none; border:none; color:#475569; cursor:pointer; font-size:14px; padding:2px 4px; line-height:1;" title="Delete">🗑</button>
          </div>
        </div>
        ${a.subject ? `<div style="font-size:13px; color:#94a3b8; margin-bottom:3px;">${a.subject}</div>` : ''}
        ${a.body    ? `<div style="font-size:12px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:700px;">${a.body}</div>` : ''}
      </div>
    </div>`;
}
