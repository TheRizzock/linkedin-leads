document.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('openPanel');

  btn.onclick = async () => {
    const [tab] = await chrome.tabs.query({
      active: true,
      currentWindow: true,
    });

    await chrome.sidePanel.open({ tabId: tab.id });
  };
});