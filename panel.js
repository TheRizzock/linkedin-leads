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
    "></div>

    <div id="view"></div>
  `;
}

// ---------- HEADER ----------
function renderHeader() {
  const header = document.getElementById('header');
  if (!header) return;

  const buttonStyle = (active) => `
    flex:1;
    padding:8px;
    border-radius:8px;
    border:none;
    font-weight:600;
    cursor:pointer;
    background:${active ? '#22c55e' : '#e2e8f0'};
    color:${active ? 'white' : '#0f172a'};
  `;

  header.innerHTML = `
    <button id="profileTab" style="${buttonStyle(activeView === 'profile')}">
      Profile
    </button>
    <button id="dashboardTab" style="${buttonStyle(activeView === 'dashboard')}">
      Dashboard
    </button>
  `;

  document.getElementById('profileTab').onclick = () => {
    activeView = 'profile';
    reloadCurrentTab();
  };

  document.getElementById('dashboardTab').onclick = () => {
    activeView = 'dashboard';
    reloadCurrentTab();
  };
}

// ---------- LOAD ----------
async function load(tab) {
  const url = tab.url;

  const viewEl = document.getElementById('view');
  if (!viewEl) {
    console.error('❌ #view not found');
    return;
  }

  viewEl.innerHTML = "<div>Loading...</div>";

  renderHeader();

  // DASHBOARD
  if (activeView === 'dashboard') {
    return renderDashboard(viewEl);
  }

  // PROFILE
  if (url.includes('/in/')) {
    const data = await getProfileData(tab.id);

    if (!data) {
      viewEl.innerText = "Failed to load profile";
      return;
    }

    return renderProfile(viewEl, data, url);
  }

  viewEl.innerText = "Unsupported page";
}

// ---------- RELOAD ----------
async function reloadCurrentTab() {
  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  if (tab) {
    load(tab);
  }
}

// ---------- WATCH ----------
function watch() {
  setInterval(async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    if (tab.url !== currentUrl) {
      currentUrl = tab.url;
      load(tab);
    }
  }, 1000);
}

// ---------- INIT ----------
document.addEventListener('DOMContentLoaded', async () => {
  const content = document.getElementById('content');

  renderLayout(content); // 🔥 THIS MUST RUN FIRST

  const [tab] = await chrome.tabs.query({
    active: true,
    currentWindow: true,
  });

  currentUrl = tab.url;

  await load(tab);
  watch();
});