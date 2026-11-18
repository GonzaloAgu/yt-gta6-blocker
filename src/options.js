(function () {
  "use strict";

  const DEFAULTS = globalThis.GTA6_KEYWORDS.DEFAULTS;
  const form = document.getElementById("form");
  const statusElement = document.getElementById("status");
  const enabledInput = document.getElementById("enabled");
  const modeInput = document.getElementById("mode");
  const blockWatchPageInput = document.getElementById("blockWatchPage");
  const hideShortsInput = document.getElementById("hideShorts");
  const hideCommentsInput = document.getElementById("hideComments");
  const hideNotificationsInput = document.getElementById("hideNotifications");
  const hideSuggestionsInput = document.getElementById("hideSuggestions");
  const hideChipsInput = document.getElementById("hideChips");
  const includeRockstarInput = document.getElementById("includeRockstar");
  const includeLooseNamesInput = document.getElementById("includeLooseNames");
  const offerViewAnywayInput = document.getElementById("offerViewAnyway");
  const customKeywordsInput = document.getElementById("customKeywords");
  const resetButton = document.getElementById("reset");
  let saveTimer = null;
  let statusTimer = null;

  function writeSettings(settings) {
    enabledInput.checked = Boolean(settings.enabled);
    modeInput.value = settings.mode;
    blockWatchPageInput.checked = Boolean(settings.blockWatchPage);
    hideShortsInput.checked = Boolean(settings.hideShorts);
    hideCommentsInput.checked = Boolean(settings.hideComments);
    hideNotificationsInput.checked = Boolean(settings.hideNotifications);
    hideSuggestionsInput.checked = Boolean(settings.hideSuggestions);
    hideChipsInput.checked = Boolean(settings.hideChips);
    includeRockstarInput.checked = Boolean(settings.includeRockstar);
    includeLooseNamesInput.checked = Boolean(settings.includeLooseNames);
    offerViewAnywayInput.checked = Boolean(settings.offerViewAnyway);
    customKeywordsInput.value = (settings.customKeywords || []).join("\n");
  }

  function readSettings() {
    return {
      enabled: enabledInput.checked,
      mode: modeInput.value,
      blockWatchPage: blockWatchPageInput.checked,
      hideShorts: hideShortsInput.checked,
      hideComments: hideCommentsInput.checked,
      hideNotifications: hideNotificationsInput.checked,
      hideSuggestions: hideSuggestionsInput.checked,
      hideChips: hideChipsInput.checked,
      includeRockstar: includeRockstarInput.checked,
      includeLooseNames: includeLooseNamesInput.checked,
      offerViewAnyway: offerViewAnywayInput.checked,
      customKeywords: customKeywordsInput.value
        .split(/\r?\n/)
        .map(function (line) {
          return line.trim();
        })
        .filter(Boolean)
    };
  }

  function showSaved() {
    statusElement.textContent = "Saved.";

    if (statusTimer) clearTimeout(statusTimer);
    statusTimer = setTimeout(function () {
      statusElement.textContent = "Changes are saved automatically.";
    }, 1500);
  }

  function saveNow() {
    const settings = readSettings();

    chrome.storage.sync.set(settings, function () {
      if (chrome.runtime.lastError) {
        statusElement.textContent = "Could not save changes.";
        return;
      }
      showSaved();
    });
  }

  function scheduleSave() {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(function () {
      saveTimer = null;
      saveNow();
    }, 350);
  }

  function loadSettings() {
    chrome.storage.sync.get(DEFAULTS, function (stored) {
      writeSettings(Object.assign({}, DEFAULTS, stored || {}));
    });
  }

  form.addEventListener("change", scheduleSave);
  customKeywordsInput.addEventListener("input", scheduleSave);

  resetButton.addEventListener("click", function () {
    if (!window.confirm("Restore all default settings?")) return;
    writeSettings(Object.assign({}, DEFAULTS, { customKeywords: [] }));
    saveNow();
  });

  loadSettings();
})();
