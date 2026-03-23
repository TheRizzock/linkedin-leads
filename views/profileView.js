import { saveLead } from '../utils/api.js';
import { copyToClipboard } from '../utils/clipboard.js';
import { buildMessage } from '../utils/template.js';

export function renderProfile(content, data, url) {
  if (!data || !data.name) {
    content.innerText = "Invalid profile data";
    return;
  }
  content.innerHTML = `
       <div style="font-weight:700; margin-bottom:6px; font-size: 20px;">
         ${data.name}
       </div>

       <div style="margin-bottom:6px; font-size: 16px;"">
         ${data.headline}
       </div>

       <div style="opacity:0.7; margin-bottom:16px; font-size: 16px;"">
         ${data.company}
       </div>

       <button id="copyBtn" style="
         width:100%;
         padding:8px;
         border-radius:8px;
         border:none;
         background:#22c55e;
         font-weight:600;
         margin-bottom:8px;
         cursor:pointer;
       ">
         Copy Message
       </button>
       <button id="crmBtn" style="
         width:100%;
         padding:8px;
         border-radius:8px;
         border:none;
         background:#334155;
         color:white;
         font-weight:600;
         cursor:pointer;
       ">
         Add to CRM
       </button>
  `;

  document.getElementById('copyBtn').onclick = async () => {
    const nameParts = data.name.trim().split(/\s+/);

    const payload = {
      first_name: nameParts[0] || null,
      last_name: nameParts.slice(1).join(' ') || null,
      headline: data.headline,
      company: data.company,
      profileUrl: url,
    };

    const message = await buildMessage(payload); // 🔥 THIS was missing

    copyToClipboard(message);

    document.getElementById('copyBtn').innerText = 'Copied!';

    setTimeout(() => {
      document.getElementById('copyBtn').innerText = 'Copy Message';
    }, 1500);
  };

  document.getElementById('crmBtn').onclick = async () => {
    console.log('crmBtn');

    const nameParts = data.name.trim().split(/\s+/);

    const payload = {
      first_name: nameParts[0] || null,
      last_name: nameParts.slice(1).join(' ') || null,
      headline: data.headline,
      company: data.company,
      profileUrl: url,
    };

    try {
      const result = await saveLead(payload);

      document.getElementById('crmBtn').innerText =
        result?.status || 'Saved!';

      setTimeout(() => {
        document.getElementById('crmBtn').innerText = 'Add to CRM';
      }, 1500);

    } catch (err) {
      console.error(err);
      document.getElementById('crmBtn').innerText = 'Error';
    }
  };
}

