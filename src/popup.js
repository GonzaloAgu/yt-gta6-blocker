(function () {
  "use strict";

  const DEFAULTS = globalThis.GTA6_KEYWORDS.DEFAULTS;
  const enabledInput = document.getElementById("enabled");
  const statusElement = document.getElementById("status");
  const countElement = document.getElementById("count");
  const rescanButton = document.getElementById("rescan");
  const revealButton = document.getElementById("reveal");
  const optionsButton = document.getElementById("options");
  let refreshTimer = null;

  function getActiveTab() {
    return new Promise(function (resolve) {
      chrome.tabs.query({ active: true, currentWindow: true }, function (tabs) {
        resolve(tabs && tabs[0] ? tabs[0] : null);
      });
    });
  }

  function sendMessage(tabId, message) {
    return new Promise(function (resolve) {
      chrome.tabs.sendMessage(tabId, message, function (response) {
        if (chrome.runtime.lastError) {
          resolve(null);
          return;
        }
        resolve(response || null);
      });
    });
  }

  function loadSettings() {
    return new Promise(function (resolve) {
      chrome.storage.sync.get(DEFAULTS, function (stored) {
        resolve(Object.assign({}, DEFAULTS, stored || {}));
      });
    });
  }

  async function refresh() {
    const settings = await loadSettings();
    enabledInput.checked = Boolean(settings.enabled);

    const tab = await getActiveTab();
    if (!tab || tab.id === undefined) {
      statusElement.textContent = "No active tab.";
      countElement.textContent = "—";
      revealButton.hidden = true;
      return;
    }

    const response = await sendMessage(tab.id, { type: "gta6:status" });

    if (!response) {
      statusElement.textContent = "Open a YouTube tab and reload the page.";
      countElement.textContent = "—";
      revealButton.hidden = true;
      return;
    }

    if (!response.enabled) {
      statusElement.textContent = "Filter is off.";
    } else if (response.blocked) {
      statusElement.textContent = "Content blocked on this page.";
    } else {
      statusElement.textContent = "Filter is active and watching this page.";
    }

    countElement.textContent = String(response.hidden || 0);
    revealButton.hidden = !(response.blocked && response.canReveal);
  }

  function scheduleRefresh() {
    if (refreshTimer) return;
    refreshTimer = setTimeout(function () {
      refreshTimer = null;
      refresh();
    }, 150);
  }

  enabledInput.addEventListener("change", function () {
    chrome.storage.sync.set({ enabled: enabledInput.checked }, function () {
      scheduleRefresh();
    });
  });

  rescanButton.addEventListener("click", async function () {
    const tab = await getActiveTab();
    if (!tab || tab.id === undefined) return;
    await sendMessage(tab.id, { type: "gta6:rescan" });
    await refresh();
  });

  revealButton.addEventListener("click", async function () {
    const tab = await getActiveTab();
    if (!tab || tab.id === undefined) return;
    const response = await sendMessage(tab.id, { type: "gta6:reveal" });
    if (response && response.ok) window.close();
  });

  optionsButton.addEventListener("click", function () {
    chrome.runtime.openOptionsPage();
  });

  refresh();
  setInterval(refresh, 1200);
})();
