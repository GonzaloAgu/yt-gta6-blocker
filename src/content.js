(function () {
  "use strict";

  const keywords = globalThis.GTA6_KEYWORDS;
  const matcher = globalThis.GTA6Matcher;
  if (!keywords || !matcher) return;

  const DEFAULTS = keywords.DEFAULTS;
  const HIDDEN_CLASS = "gta6-hidden";
  const CHECKED_ATTR = "data-gta6-checked";
  const OVERLAY_ID = "gta6-block-overlay";
  const MAX_TEXT = 12000;

  let ROOT = document.documentElement;

  const CARD_SELECTOR = [
    "ytd-rich-item-renderer",
    "ytd-video-renderer",
    "ytd-grid-video-renderer",
    "ytd-compact-video-renderer",
    "ytd-playlist-video-renderer",
    "ytd-playlist-panel-video-renderer",
    "ytd-playlist-renderer",
    "ytd-grid-playlist-renderer",
    "ytd-playlist-header-renderer",
    "ytd-playlist-sidebar-primary-info-renderer",
    "ytd-playlist-panel-renderer",
    "ytd-channel-renderer",
    "ytd-c4-tabbed-header-renderer",
    "ytd-channel-header-renderer",
    "page-header-view-model",
    "yt-page-header-view-model",
    "ytd-search-header-renderer",
    "ytd-engagement-panel-section-list-renderer",
    "ytd-info-panel-content-renderer",
    "ytd-info-panel-container-renderer",
    "ytd-knowledge-panel-renderer",
    "ytd-factoid-renderer",
    "ytd-factoid-multiline-renderer",
    "ytd-rich-metadata-renderer",
    "ytd-clarification-renderer",
    "ytd-grid-channel-renderer",
    "ytd-reel-item-renderer",
    "ytd-shorts-lockup-view-model",
    "ytm-shorts-lockup-view-model",
    "ytd-reel-video-renderer",
    "ytd-notification-renderer",
    "ytd-comment-view-model",
    "ytd-comment-renderer",
    "ytd-post-renderer",
    "ytd-backstage-post-thread-renderer",
    "ytd-live-chat-text-message-renderer",
    "yt-live-chat-text-message-renderer",
    "yt-live-chat-paid-message-renderer",
    "ytd-ad-slot-renderer",
    "ytd-in-feed-ad-layout-renderer",
    "ytd-promoted-sparkles-web-renderer",
    "ytd-promoted-video-renderer",
    "ytd-compact-promoted-video-renderer",
    "ytd-display-ad-renderer",
    "ytd-banner-promo-renderer",
    "ytd-statement-banner-renderer",
    "ytd-brand-video-shelf-renderer",
    "ytd-brand-video-singleton-renderer",
    "ytd-primetime-promo-renderer",
    "ytd-search-pyv-renderer",
    "ytd-movie-renderer",
    "ytd-grid-movie-renderer",
    "ytd-radio-renderer",
    "ytd-compact-playlist-renderer",
    "ytd-compact-radio-renderer",
    "yt-lockup-view-model",
    "ytd-miniplayer",
    "ytd-search-suggestion-renderer",
    "ytd-suggestion-renderer",
    "yt-chip-cloud-chip-renderer",
    "ytd-guide-entry-renderer"
  ].join(",");

  const SHELF_SELECTOR = [
    "ytd-shelf-renderer",
    "ytd-rich-section-renderer",
    "ytd-reel-shelf-renderer",
    "ytd-rich-shelf-renderer",
    "grid-shelf-view-model"
  ].join(",");

  const SHORTS_CONTEXT = [
    "ytd-reel-shelf-renderer",
    "ytd-rich-shelf-renderer[is-shorts]",
    "ytd-shorts",
    "ytd-shorts-lockup-view-model",
    "ytm-shorts-lockup-view-model",
    "ytd-reel-item-renderer",
    "ytd-reel-video-renderer"
  ].join(",");

  const COMMENT_CONTEXT = "ytd-comment-view-model,ytd-comment-renderer,ytd-comment-thread-renderer";
  const NOTIFICATION_CONTEXT = "ytd-notification-renderer";
  const SUGGESTION_CONTEXT = "ytd-search-suggestion-renderer,ytd-suggestion-renderer";
  const CHIP_CONTEXT = "yt-chip-cloud-chip-renderer";
  const SKIP_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);
  const TEXT_ATTRS = ["aria-label", "title", "alt", "data-tooltip-text", "data-title"];

  const state = {
    settings: Object.assign({}, DEFAULTS),
    terms: [],
    ready: false,
    observer: null,
    shadowObserver: null,
    observedRoots: new WeakSet(),
    pendingCards: new Set(),
    pendingShelves: new Set(),
    fullScan: false,
    scanTimer: null,
    pageTimer: null,
    pendingPageTimer: null,
    sweepTimer: null,
    navTimer: null,
    textCache: new WeakMap(),
    lastKey: "",
    allowedKey: null,
    blockedKey: null,
    blockedMedia: false,
    wasPlaying: false,
    savedTitle: "",
    overlay: null,
    playGuard: null,
    titleGuard: null
  };

  function boot() {
    ROOT = document.documentElement;
    if (!ROOT) {
      setTimeout(boot, 0);
      return;
    }

    ROOT.setAttribute("data-gta6", "on");
    if (isMediaKey(getContentKey())) {
      ROOT.setAttribute("data-gta6-scanning", "1");
    }

    setTimeout(function () {
      if (!state.ready) {
        ROOT.removeAttribute("data-gta6-scanning");
        markAllChecked();
      }
    }, 3000);

    loadSettings().then(function (settings) {
      state.ready = true;
      state.lastKey = getContentKey();
      applySettings(settings, false);
      setupObservers();
      setupStorageListener();
      setupMessageListener();
      setupNavigation();
      evaluateCurrentPage();
      scheduleFullScan();
      state.sweepTimer = setInterval(sweep, 6000);
      setTimeout(markAllChecked, 2500);
    });

    if (document.readyState === "loading") {
      document.addEventListener(
        "DOMContentLoaded",
        function () {
          scheduleFullScan();
          evaluateCurrentPage();
        },
        { once: true }
      );
    }

    window.addEventListener(
      "load",
      function () {
        scheduleFullScan();
        evaluateCurrentPage();
      },
      { once: true }
    );
  }

  function loadSettings() {
    return new Promise(function (resolve) {
      try {
        chrome.storage.sync.get(DEFAULTS, function (stored) {
          void chrome.runtime.lastError;
          resolve(Object.assign({}, DEFAULTS, stored || {}));
        });
      } catch (error) {
        resolve(Object.assign({}, DEFAULTS));
      }
    });
  }

  function applySettings(settings, changed) {
    state.settings = Object.assign({}, DEFAULTS, settings || {});
    if (["all", "six", "online"].indexOf(state.settings.mode) === -1) {
      state.settings.mode = "all";
    }
    if (!Array.isArray(state.settings.customKeywords)) {
      state.settings.customKeywords = [];
    }

    state.terms = matcher.compileTerms(keywords.buildTerms(state.settings));

    if (state.settings.enabled) {
      ROOT.setAttribute("data-gta6", "on");
    } else {
      ROOT.setAttribute("data-gta6", "off");
      clearPageScanning();
    }

    if (changed && !state.settings.enabled) {
      clearBlock(false);
      clearAllHidden();
    }
  }

  function setupStorageListener() {
    chrome.storage.onChanged.addListener(function (changes, area) {
      if (area !== "sync" || !state.ready) return;
      loadSettings().then(function (settings) {
        clearBlock(true);
        clearAllHidden();
        state.textCache = new WeakMap();
        applySettings(settings, true);
        if (settings.enabled) {
          scheduleFullScan();
          evaluateCurrentPage();
        }
      });
    });
  }

  function setupMessageListener() {
    chrome.runtime.onMessage.addListener(function (message, sender, sendResponse) {
      if (window.top !== window) return false;
      if (!message || typeof message.type !== "string") return false;

      if (message.type === "gta6:status") {
        sendResponse({
          enabled: state.settings.enabled,
          hidden: countHidden(),
          blocked: Boolean(state.blockedKey),
          canReveal: Boolean(state.blockedKey) && state.settings.offerViewAnyway,
          key: state.blockedKey || getContentKey()
        });
        return false;
      }

      if (message.type === "gta6:rescan") {
        state.textCache = new WeakMap();
        scheduleFullScan();
        evaluateCurrentPage();
        sendResponse({ ok: true, hidden: countHidden() });
        return false;
      }

      if (message.type === "gta6:reveal") {
        sendResponse({ ok: revealCurrent() });
        return false;
      }

      return false;
    });
  }

  function setupObservers() {
    state.observer = new MutationObserver(handleMutations);
    state.observer.observe(ROOT, { childList: true, subtree: true, characterData: true });
    state.shadowObserver = new MutationObserver(handleMutations);
  }

  function handleMutations(mutations) {
    if (!state.ready || !state.settings.enabled) return;

    const cards = new Set();
    const shelves = new Set();

    for (const mutation of mutations) {
      if (mutation.type === "childList") {
        if (mutation.addedNodes && mutation.addedNodes.length) {
          for (const node of mutation.addedNodes) {
            collectNode(node, cards, shelves);
          }
        }

        if (mutation.target && mutation.target.nodeType === 1) {
          const card = closestCard(mutation.target);
          if (card) cards.add(card);

          const shelf = closestShelf(mutation.target);
          if (shelf) shelves.add(shelf);
        }
      } else if (mutation.type === "characterData") {
        const parent = mutation.target.parentElement;
        if (parent) {
          const card = closestCard(parent);
          if (card) cards.add(card);

          const shelf = closestShelf(parent);
          if (shelf) shelves.add(shelf);
        }
      }
    }

    if (cards.size || shelves.size) scheduleScan(cards, shelves);
    schedulePageEvaluation();
  }

  function collectNode(node, cards, shelves) {
    if (!node) return;

    if (node.nodeType === 3) {
      const card = closestCard(node);
      if (card) cards.add(card);
      return;
    }

    if (node.nodeType === 11) {
      for (let child = node.firstChild; child; child = child.nextSibling) {
        collectNode(child, cards, shelves);
      }
      return;
    }

    if (node.nodeType !== 1) return;
    if (node.id === OVERLAY_ID) return;
    if (node.closest && node.closest("#" + OVERLAY_ID)) return;

    const card = closestCard(node);
    if (card) cards.add(card);

    const shelf = closestShelf(node);
    if (shelf) shelves.add(shelf);

    if (node.querySelectorAll) {
      const innerCards = node.querySelectorAll(CARD_SELECTOR);
      for (const element of innerCards) cards.add(outermostCard(element));

      const innerShelves = node.querySelectorAll(SHELF_SELECTOR);
      for (const element of innerShelves) shelves.add(element);
    }
  }

  function closestCard(node) {
    if (!node) return null;

    let element = node.nodeType === 1 ? node : node.parentElement;
    if (!element) return null;

    const rootNode = element.getRootNode ? element.getRootNode() : null;
    if (rootNode && rootNode.host) element = rootNode.host;
    if (!element.closest) return null;

    const card = element.closest(CARD_SELECTOR);
    return card ? outermostCard(card) : null;
  }

  function closestShelf(node) {
    if (!node) return null;

    let element = node.nodeType === 1 ? node : node.parentElement;
    if (!element) return null;

    const rootNode = element.getRootNode ? element.getRootNode() : null;
    if (rootNode && rootNode.host) element = rootNode.host;
    if (!element.closest) return null;

    return element.closest(SHELF_SELECTOR);
  }

  function outermostCard(element) {
    let current = element;
    let parent = element.parentElement;

    while (parent) {
      if (parent.matches && parent.matches(CARD_SELECTOR)) current = parent;
      parent = parent.parentElement;
    }

    return current;
  }

  function scheduleScan(cards, shelves) {
    for (const card of cards) state.pendingCards.add(card);
    for (const shelf of shelves) state.pendingShelves.add(shelf);

    if (state.scanTimer) return;
    state.scanTimer = setTimeout(flushScan, 140);
  }

  function scheduleFullScan() {
    state.fullScan = true;
    if (state.scanTimer) return;
    state.scanTimer = setTimeout(flushScan, 140);
  }

  function flushScan() {
    state.scanTimer = null;

    if (!state.settings.enabled) {
      state.pendingCards.clear();
      state.pendingShelves.clear();
      state.fullScan = false;
      return;
    }

    const full = state.fullScan;
    state.fullScan = false;

    if (full) {
      state.pendingCards.clear();
      state.pendingShelves.clear();
      scanWholeDocument();
      return;
    }

    const cards = Array.from(state.pendingCards);
    const shelves = Array.from(state.pendingShelves);
    state.pendingCards.clear();
    state.pendingShelves.clear();

    for (const card of cards) {
      if (card.isConnected) scanCard(card);
    }

    for (const shelf of shelves) {
      if (shelf.isConnected) scanShelf(shelf);
    }
  }

  function scanWholeDocument() {
    const cards = document.querySelectorAll(CARD_SELECTOR);

    for (const card of cards) {
      card.setAttribute(CHECKED_ATTR, "1");

      if (card.parentElement && card.parentElement.closest(CARD_SELECTOR)) continue;
      scanCard(card);
    }

    const shelves = document.querySelectorAll(SHELF_SELECTOR);
    for (const shelf of shelves) {
      if (shouldScanShelf(shelf)) scanShelf(shelf);
      else markChecked(shelf);
    }
  }

  function scanCard(element) {
    if (!element || !element.isConnected) return;
    if (element.id === OVERLAY_ID || element.closest("#" + OVERLAY_ID)) return;

    if (!shouldScanCard(element)) {
      markChecked(element);
      return;
    }

    if (
      state.allowedKey &&
      state.allowedKey === getContentKey() &&
      element.matches("ytd-reel-video-renderer") &&
      isActiveReel(element)
    ) {
      showElement(element);
      markChecked(element);
      return;
    }

    const text = extractText(element);
    const signature = makeSignature(text);
    const previous = state.textCache.get(element);

    markChecked(element);

    if (previous === signature) return;
    state.textCache.set(element, signature);

    const match = matcher.findMatch(text, state.terms);

    if (match) {
      hideElement(element);

      if (element.matches("ytd-miniplayer,ytd-reel-video-renderer")) {
        pauseVideos(element);
      }
    } else {
      showElement(element);
    }
  }

  function scanShelf(shelf) {
    if (!shelf || !shelf.isConnected) return;

    markChecked(shelf);

    if (!shouldScanShelf(shelf)) return;

    const text = getShelfHeaderText(shelf);
    const signature = makeSignature(text);
    const previous = state.textCache.get(shelf);

    if (previous === signature) return;
    state.textCache.set(shelf, signature);

    if (matcher.findMatch(text, state.terms)) {
      hideElement(shelf);
    } else {
      showElement(shelf);
    }
  }

  function shouldScanCard(element) {
    const settings = state.settings;

    if (!settings.hideShorts && isShortsElement(element)) return false;
    if (!settings.hideComments && element.matches(COMMENT_CONTEXT)) return false;
    if (!settings.hideNotifications && element.matches(NOTIFICATION_CONTEXT)) return false;
    if (!settings.hideSuggestions && element.matches(SUGGESTION_CONTEXT)) return false;
    if (!settings.hideChips && element.matches(CHIP_CONTEXT)) return false;

    return true;
  }

  function shouldScanShelf(shelf) {
    if (!state.settings.hideShorts && isShortsElement(shelf)) return false;
    return true;
  }

  function isShortsElement(element) {
    if (element.matches(SHORTS_CONTEXT)) return true;
    return Boolean(element.querySelector(SHORTS_CONTEXT));
  }

  function getShelfHeaderText(shelf) {
    const parts = [];
    const seen = new Set();
    const selectors = [
      "#title",
      "#title-text",
      "#header",
      "#rich-shelf-header",
      "ytd-rich-shelf-renderer #title",
      "h2"
    ];

    const label = shelf.getAttribute("aria-label");
    if (label) parts.push(label);

    for (const selector of selectors) {
      const element = shelf.querySelector(selector);
      if (!element || seen.has(element)) continue;
      seen.add(element);
      parts.push(extractText(element));
    }

    return parts.join(" ").slice(0, 4000);
  }

  function extractText(root) {
    const parts = [];
    let length = 0;

    function walk(node, depth) {
      if (!node || length >= MAX_TEXT || depth > 24) return;

      if (node.nodeType === 3) {
        const value = node.nodeValue;
        if (value) {
          parts.push(value);
          length += value.length;
        }
        return;
      }

      if (node.nodeType === 1) {
        if (node.id === OVERLAY_ID) return;
        if (SKIP_TAGS.has(node.tagName)) return;

        for (const attribute of TEXT_ATTRS) {
          const value = node.getAttribute(attribute);
          if (value) {
            parts.push(value);
            length += value.length;
          }
        }

        if (node.tagName === "A") {
          const href = node.getAttribute("href");
          const isHashtag = href && href.indexOf("/hashtag/") !== -1;
          const isHandle = href && href.charAt(0) === "/" && href.charAt(1) === "@";

          if (isHashtag || isHandle) {
            let decoded = href;

            try {
              decoded = decodeURIComponent(href);
            } catch (error) {
              decoded = href;
            }

            parts.push(decoded);
            length += decoded.length;
          }
        }

        if (node.shadowRoot) {
          observeShadowRoot(node.shadowRoot);
          walk(node.shadowRoot, depth + 1);
        }

        for (let child = node.firstChild; child; child = child.nextSibling) {
          walk(child, depth + 1);
          if (length >= MAX_TEXT) break;
        }
        return;
      }

      if (node.nodeType === 11) {
        for (let child = node.firstChild; child; child = child.nextSibling) {
          walk(child, depth + 1);
        }
      }
    }

    walk(root, 0);
    return parts.join(" ").slice(0, MAX_TEXT);
  }

  function observeShadowRoot(shadowRoot) {
    if (!shadowRoot || !state.shadowObserver || state.observedRoots.has(shadowRoot)) {
      return;
    }

    state.observedRoots.add(shadowRoot);

    try {
      state.shadowObserver.observe(shadowRoot, {
        childList: true,
        subtree: true,
        characterData: true
      });
    } catch (error) {
      void error;
    }
  }

  function makeSignature(text) {
    let hash = 2166136261;

    for (let index = 0; index < text.length; index += 1) {
      hash ^= text.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }

    return text.length + ":" + (hash >>> 0);
  }

  function hideElement(element) {
    if (!element || !element.classList || element.classList.contains(HIDDEN_CLASS)) {
      return;
    }

    element.classList.add(HIDDEN_CLASS);
    element.setAttribute("data-gta6-hidden", "1");
  }

  function showElement(element) {
    if (!element || !element.classList) return;

    element.classList.remove(HIDDEN_CLASS);
    element.removeAttribute("data-gta6-hidden");
  }

  function clearAllHidden() {
    const hidden = document.querySelectorAll("." + HIDDEN_CLASS);

    for (const element of hidden) {
      element.classList.remove(HIDDEN_CLASS);
      element.removeAttribute("data-gta6-hidden");
    }
  }

  function countHidden() {
    return document.querySelectorAll("." + HIDDEN_CLASS).length;
  }

  function markChecked(element) {
    if (!element || element.nodeType !== 1) return;

    element.setAttribute(CHECKED_ATTR, "1");

    if (element.querySelectorAll) {
      const children = element.querySelectorAll(CARD_SELECTOR + "," + SHELF_SELECTOR);
      for (const child of children) {
        child.setAttribute(CHECKED_ATTR, "1");
      }
    }
  }

  function markAllChecked() {
    if (!ROOT) return;

    const cards = document.querySelectorAll(CARD_SELECTOR);
    for (const card of cards) markChecked(card);

    const shelves = document.querySelectorAll(SHELF_SELECTOR);
    for (const shelf of shelves) markChecked(shelf);
  }

  function sweep() {
    if (!state.ready || !state.settings.enabled) return;
    scheduleFullScan();
    evaluateCurrentPage();
  }

  function getContentKey() {
    const path = location.pathname;
    const params = new URLSearchParams(location.search);

    if (path === "/watch") {
      const videoId = params.get("v");
      return videoId ? "video:" + videoId : "other:/watch";
    }

    if (path.indexOf("/shorts/") === 0) {
      const shortId = path.split("/")[2];
      return shortId ? "short:" + shortId : "other:/shorts";
    }

    if (path === "/results") {
      return "search:" + (params.get("search_query") || "");
    }

    if (path === "/") return "home";

    if (
      path.indexOf("/hashtag/") === 0 ||
      path.indexOf("/@") === 0 ||
      path.indexOf("/channel/") === 0 ||
      path.indexOf("/c/") === 0 ||
      path.indexOf("/user/") === 0
    ) {
      return "page:" + path;
    }

    return "other:" + path;
  }

  function isMediaKey(key) {
    return key.indexOf("video:") === 0 || key.indexOf("short:") === 0;
  }

  function setupNavigation() {
    function onNavigate() {
      handleKeyChange(true);
    }

    window.addEventListener("yt-navigate-start", onNavigate);
    window.addEventListener("yt-navigate-finish", onNavigate);
    document.addEventListener("yt-navigate-start", onNavigate);
    document.addEventListener("yt-navigate-finish", onNavigate);
    document.addEventListener("yt-page-data-updated", onNavigate);
    window.addEventListener("popstate", onNavigate);

    state.navTimer = setInterval(function () {
      handleKeyChange(false);
    }, 500);
  }

  function handleKeyChange(force) {
    if (!state.ready) return;

    const key = getContentKey();

    if (key === state.lastKey) {
      if (force) evaluateCurrentPage();
      return;
    }

    state.lastKey = key;

    if (state.allowedKey && state.allowedKey !== key) state.allowedKey = null;

    clearBlock(false);
    clearPageScanning();
    state.textCache = new WeakMap();

    if (isMediaKey(key)) ROOT.setAttribute("data-gta6-scanning", "1");

    scheduleFullScan();
    evaluateCurrentPage();
    setTimeout(markAllChecked, 1500);
  }

  function schedulePageEvaluation() {
    if (state.pageTimer) return;

    state.pageTimer = setTimeout(function () {
      state.pageTimer = null;
      evaluateCurrentPage();
    }, 250);
  }

  function evaluateCurrentPage(final) {
    if (!state.ready) return;

    if (!state.settings.enabled) {
      clearBlock(false);
      clearPageScanning();
      return;
    }

    const key = getContentKey();

    if (state.allowedKey && state.allowedKey === key) {
      clearBlock(false);
      clearPageScanning();
      return;
    }

    if (key.indexOf("video:") === 0 || key.indexOf("short:") === 0) {
      const isShort = key.indexOf("short:") === 0;

      if (
        !state.settings.blockWatchPage ||
        (isShort && !state.settings.hideShorts)
      ) {
        clearBlock(false);
        clearPageScanning();
        return;
      }

      let match = matcher.findMatch(getMediaText(key), state.terms);

      if (!match && !hasMediaMetadata(key)) {
        match = matcher.findMatch(document.title, state.terms);
      }

      if (match) {
        blockPage(key, true);
        return;
      }

      if (hasMediaMetadata(key) || final) {
        clearBlock(false);
        clearPageScanning();
        return;
      }

      ROOT.setAttribute("data-gta6-scanning", "1");
      schedulePendingEvaluation();
      return;
    }

    if (key.indexOf("page:") === 0) {
      const decoded = safeDecode(location.pathname);

      if (matcher.findMatch(decoded, state.terms)) blockPage(key, false);
      else clearBlock(false);

      clearPageScanning();
      return;
    }

    clearBlock(false);
    clearPageScanning();
  }

  function getMediaText(key) {
    const parts = [document.title || ""];
    const seen = new Set();
    const selectors =
      key.indexOf("short:") === 0
        ? [
            "ytd-reel-player-header-renderer",
            "ytd-shorts #title",
            "ytd-reel-video-renderer[is-active]",
            "ytd-shorts ytd-reel-video-renderer[is-active]"
          ]
        : [
            "ytd-watch-metadata",
            "ytd-video-primary-info-renderer",
            "ytd-watch-flexy #above-the-fold #title",
            "ytd-watch-flexy #description-inline-expander",
            "#description-inline-expander"
          ];

    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);

      for (const element of elements) {
        if (seen.has(element)) continue;
        seen.add(element);
        parts.push(extractText(element));
      }
    }

    return parts.join(" ").slice(0, 20000);
  }

  function hasMediaMetadata(key) {
    if (key.indexOf("short:") === 0) {
      return Boolean(
        document.querySelector(
          "ytd-reel-player-header-renderer,ytd-shorts #title,ytd-reel-video-renderer[is-active]"
        )
      );
    }

    return Boolean(
      document.querySelector(
        "ytd-watch-metadata,ytd-watch-flexy #above-the-fold,ytd-video-primary-info-renderer"
      )
    );
  }

  function safeDecode(value) {
    try {
      return decodeURIComponent(value);
    } catch (error) {
      return value;
    }
  }

  function schedulePendingEvaluation() {
    if (state.pendingPageTimer) return;

    state.pendingPageTimer = setTimeout(function () {
      state.pendingPageTimer = null;
      evaluateCurrentPage(true);
    }, 2000);
  }

  function clearPageScanning() {
    if (ROOT) ROOT.removeAttribute("data-gta6-scanning");

    if (state.pendingPageTimer) {
      clearTimeout(state.pendingPageTimer);
      state.pendingPageTimer = null;
    }
  }

  function blockPage(key, media) {
    if (!state.settings.enabled) return;

    if (state.blockedKey === key) {
      ROOT.classList.add("gta6-blocked");
      showOverlay();
      return;
    }

    clearBlock(false);
    clearPageScanning();

    state.blockedKey = key;
    state.blockedMedia = media;
    state.savedTitle = document.title || "";

    ROOT.classList.add("gta6-blocked");

    if (media) {
      const mainVideo = getMainVideo();
      state.wasPlaying = Boolean(mainVideo && !mainVideo.paused);
      pauseAllVideos();
      installPlayGuard();
    }

    startTitleGuard();
    if (document.title !== "YouTube") document.title = "YouTube";

    showOverlay();
  }

  function clearBlock(restoreTitle) {
    if (state.blockedKey && restoreTitle && state.savedTitle) {
      document.title = state.savedTitle;
    }

    stopTitleGuard();
    removePlayGuard();
    removeOverlay();

    if (ROOT) ROOT.classList.remove("gta6-blocked");

    state.blockedKey = null;
    state.blockedMedia = false;
    state.wasPlaying = false;
    state.savedTitle = "";
  }

  function revealCurrent() {
    if (!state.blockedKey) return false;

    const key = state.blockedKey;
    const wasPlaying = state.wasPlaying;

    state.allowedKey = key;
    clearBlock(true);
    unhideAllowedContent(key);

    if (wasPlaying) {
      const video = getMainVideo();
      if (video) {
        const playAttempt = video.play();
        if (playAttempt && typeof playAttempt.catch === "function") {
          playAttempt.catch(function () {});
        }
      }
    }

    scheduleFullScan();
    return true;
  }

  function unhideAllowedContent(key) {
    if (key.indexOf("short:") !== 0) return;

    const reels = document.querySelectorAll("ytd-reel-video-renderer." + HIDDEN_CLASS);
    for (const reel of reels) {
      reel.classList.remove(HIDDEN_CLASS);
      reel.removeAttribute("data-gta6-hidden");
    }
  }

  function isActiveReel(element) {
    if (element.hasAttribute("is-active")) return true;
    if (element.getAttribute("aria-hidden") === "true") return false;

    const rect = element.getBoundingClientRect();
    return rect.bottom > 0 && rect.top < window.innerHeight;
  }

  function getMainVideo() {
    return (
      document.querySelector("ytd-reel-video-renderer[is-active] video") ||
      document.querySelector("#movie_player video") ||
      document.querySelector("video.html5-main-video") ||
      document.querySelector("ytd-shorts video") ||
      document.querySelector("video")
    );
  }

  function pauseAllVideos() {
    const videos = document.querySelectorAll("video");

    for (const video of videos) {
      try {
        video.pause();
      } catch (error) {
        void error;
      }
    }
  }

  function pauseVideos(root) {
    if (!root) return;

    const videos = root.querySelectorAll("video");
    for (const video of videos) {
      try {
        video.pause();
      } catch (error) {
        void error;
      }
    }
  }

  function installPlayGuard() {
    if (state.playGuard) return;

    state.playGuard = function (event) {
      if (!state.blockedKey) return;

      const target = event.target;
      if (target && target.tagName === "VIDEO") {
        try {
          target.pause();
        } catch (error) {
          void error;
        }
      }
    };

    document.addEventListener("play", state.playGuard, true);
  }

  function removePlayGuard() {
    if (!state.playGuard) return;
    document.removeEventListener("play", state.playGuard, true);
    state.playGuard = null;
  }

  function startTitleGuard() {
    stopTitleGuard();

    state.titleGuard = setInterval(function () {
      if (!state.blockedKey) {
        stopTitleGuard();
        return;
      }

      if (document.title !== "YouTube") {
        if (document.title) state.savedTitle = document.title;
        document.title = "YouTube";
      }
    }, 250);
  }

  function stopTitleGuard() {
    if (!state.titleGuard) return;
    clearInterval(state.titleGuard);
    state.titleGuard = null;
  }

  function showOverlay() {
    let overlay = document.getElementById(OVERLAY_ID);

    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = OVERLAY_ID;
      overlay.setAttribute("role", "dialog");
      overlay.setAttribute("aria-modal", "true");
      overlay.setAttribute("aria-label", "Content blocked");

      const card = document.createElement("div");
      card.className = "gta6-card";

      const mark = document.createElement("div");
      mark.className = "gta6-mark";
      mark.textContent = "!";

      const title = document.createElement("h1");
      title.className = "gta6-title";
      title.textContent = "Content blocked";

      const text = document.createElement("p");
      text.className = "gta6-text";
      text.textContent =
        "This content appears to be related to GTA, so your spoiler filter hid it.";

      const actions = document.createElement("div");
      actions.className = "gta6-actions";

      if (state.settings.offerViewAnyway) {
        const revealButton = document.createElement("button");
        revealButton.type = "button";
        revealButton.className = "gta6-button gta6-button-primary";
        revealButton.textContent = "View anyway";
        revealButton.addEventListener("click", revealCurrent);
        actions.appendChild(revealButton);
      }

      const homeButton = document.createElement("button");
      homeButton.type = "button";
      homeButton.className = "gta6-button";
      homeButton.textContent = "Back to YouTube home";
      homeButton.addEventListener("click", function () {
        location.assign("/");
      });
      actions.appendChild(homeButton);

      const note = document.createElement("p");
      note.className = "gta6-note";
      note.textContent = "Spoiler filter active.";

      card.appendChild(mark);
      card.appendChild(title);
      card.appendChild(text);
      card.appendChild(actions);
      card.appendChild(note);
      overlay.appendChild(card);
    }

    const parent = document.body || document.documentElement;
    if (overlay.parentElement !== parent) parent.appendChild(overlay);

    state.overlay = overlay;
  }

  function removeOverlay() {
    const overlay = document.getElementById(OVERLAY_ID);
    if (overlay) overlay.remove();
    state.overlay = null;
  }

  if (!ROOT) {
    setTimeout(boot, 0);
  } else {
    boot();
  }
})();
