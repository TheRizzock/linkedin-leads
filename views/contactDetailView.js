export function renderContactDetail(content, contact, back) {
  const name = [contact.first_name, contact.last_name].filter(Boolean).join(' ') || '(no name)';

  content.innerHTML = `
    <div style="color:white;">
      <button id="backBtn" style="
        background:none; border:none; color:#64748b;
        cursor:pointer; padding:0; margin-bottom:14px;
        font-size:13px; display:flex; align-items:center; gap:4px;
      ">← Contacts</button>

      <div style="font-weight:700; font-size:20px; margin-bottom:4px;">${name}</div>
      ${contact.headline ? `<div style="font-size:14px; opacity:0.65; margin-bottom:2px;">${contact.headline}</div>` : ''}
      ${contact.job_title && contact.job_title !== contact.headline
        ? `<div style="font-size:13px; opacity:0.5; margin-bottom:14px;">${contact.job_title}</div>`
        : '<div style="margin-bottom:14px;"></div>'
      }

      ${section('Contact', [
        contact.email      && row('Email',    emailRow(contact)),
        contact.personal_email && row('Personal', contact.personal_email),
        contact.mobile_number  && row('Mobile',   contact.mobile_number),
      ])}

      ${section('Professional', [
        contact.industry       && row('Industry',  contact.industry),
        contact.seniority_level && row('Seniority', contact.seniority_level),
        contact.functional_level && row('Function', contact.functional_level),
      ])}

      ${section('Location', [
        (contact.city || contact.state || contact.country) && row(
          'Location',
          [contact.city, contact.state, contact.country].filter(Boolean).join(', ')
        ),
      ])}

      ${contact.profile_url ? `
        <a href="${contact.profile_url}" target="_blank" style="
          display:block; text-align:center; margin-top:4px;
          padding:8px; border-radius:8px; background:#3b82f6;
          color:white; text-decoration:none; font-weight:600; font-size:13px;
        ">View LinkedIn Profile</a>
      ` : ''}
    </div>
  `;

  document.getElementById('backBtn').onclick = back;
}

function emailRow(contact) {
  const zb = contact.zb_status;
  if (!zb) return contact.email;
  const map = {
    valid:       { bg: '#14532d', text: '#86efac' },
    invalid:     { bg: '#7f1d1d', text: '#fca5a5' },
    'catch-all': { bg: '#713f12', text: '#fde68a' },
  };
  const c = map[zb] ?? { bg: '#1e293b', text: '#94a3b8' };
  return `${contact.email} <span style="
    font-size:10px; padding:1px 6px; border-radius:4px;
    background:${c.bg}; color:${c.text}; font-weight:600;
  ">${zb}</span>`;
}

function section(title, fields) {
  const valid = fields.filter(Boolean);
  if (!valid.length) return '';
  return `
    <div style="margin-bottom:12px;">
      <div style="font-size:10px; text-transform:uppercase; letter-spacing:0.8px; opacity:0.4; margin-bottom:6px;">${title}</div>
      <div style="background:#1e293b; border-radius:8px; padding:10px 12px;">
        ${valid.join('')}
      </div>
    </div>
  `;
}

function row(label, value) {
  return `
    <div style="display:flex; gap:10px; font-size:13px; margin-bottom:5px; line-height:1.4;">
      <span style="opacity:0.45; min-width:64px; flex-shrink:0;">${label}</span>
      <span>${value}</span>
    </div>
  `;
}
