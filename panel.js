import { getProfileData } from './scrapers/profile.js';
import { renderProfile } from './views/profileView.js';
import { renderDashboard } from './views/dashboardView.js';

let currentUrl = null;
let activeView = 'profile';

// ---------- LAYOUT ----------
function renderLayout(content) {
  content.innerHTML = `
    <div id="header" style="
      display:flex;
      gap:8px;
      margin-bottom:12px;
      align-items:center;
    "></div>

    <div id="view"></div>
  `;
}

// ---------- HEADER ----------
function renderHeader() {
  const header = document.getElementById('header');
  if (!header) return;

  const tabStyle = (active) => `
    flex:1;
    padding:8px;
    border-radius:8px;
    border:none;
    font-weight:600;
    font-size:13px;
    cursor:pointer;
    background:${active ? '#22c55e' : '#e2e8f0'};
    color:${active ? 'white' : '#0f172a'};
  `;

  header.innerHTML = `
    <button id="profileTab" style="${tabStyle(activeView === 'profile')}">
      Profile
    </button>
    <button id="dashboardTab" style="${tabStyle(activeView === 'dashboard')}">
      Dashboard
    </button>
    <button id="openCrmBtn" style="
      flex-shrink:0;
      padding:8px 10px;
      border-radius:8px;
      border:none;
      font-weight:600;
      font-size:12px;
      cursor:pointer;
      background:#334155;
      color:#e2e8f0;
    ">CRM ↗</button>
  `;

  document.getElementById('profileTab').onclick = () => {
    activeView = 'profile';
    reloadCurrentTab();
  };

  document.getElementById('dashboardTab').onclick = () => {
    activeView = 'dashboard';
    reloadCurrentTab();
  };

  document.getElementById('openCrmBtn').onclick = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('crm.html') });
  };
}

// ---------- LOAD ----------
async function load(tab) {
  const viewEl = document.getElementById('view');
  if (!viewEl) {
    console.error('❌ #view not found');
    return;
  }

  renderHeader();

  if (activeView === 'dashboard') {
    return renderDashboard(viewEl);
  }

  // PROFILE
  viewEl.innerHTML = '<div style="color:white;">Loading...</div>';

  if (tab.url.includes('/in/')) {
    const data = await getProfileData(tab.id);
    if (!data) { viewEl.innerText = 'Failed to load profile'; return; }
    return await renderProfile(viewEl, data, tab.url);
  }

  viewEl.innerText = 'Unsupported page';
}

// ---------- RELOAD ----------
async function reloadCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab) load(tab);
}

// ---------- WATCH ----------
function watch() {
  setInterval(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });

    if (tab.url !== currentUrl) {
      currentUrl = tab.url;
      if (activeView === 'profile') load(tab);
    }
  }, 1000);
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', async () => {
  const content = document.getElementById('content');

  renderLayout(content);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentUrl = tab.url;

  await load(tab);
  watch();
});
