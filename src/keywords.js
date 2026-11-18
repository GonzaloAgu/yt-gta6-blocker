(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.GTA6_KEYWORDS = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const GROUPS = {
    base: [
      "gta",
      "grand theft auto",
      "vice city",
      "leonida",
      "gta online",
      "gta v",
      "gta 5",
      "gta iv",
      "gta 4",
      "gta iii",
      "gta 3",
      "gta san andreas",
      "gta vice city",
      "rockstar games",
      "take-two",
      "take two",
      "take2",
      "гта"
    ],
    six: [
      "gta 6",
      "gta6",
      "gta vi",
      "gtavi",
      "grand theft auto 6",
      "grand theft auto vi",
      "lucia caminos",
      "jason duval",
      "cal hampton",
      "raul bautista",
      "brian heder",
      "real dimez",
      "wyman",
      "lucia y jason",
      "jason y lucia",
      "jason and lucia",
      "lucia and jason",
      "vice beach",
      "port gellhorn",
      "ambrosia",
      "grassrivers",
      "mount kalaga",
      "leonida",
      "vice city"
    ],
    online: [
      "gta online",
      "gtao",
      "gta v",
      "gta 5",
      "los santos",
      "shark card"
    ],
    rockstar: ["rockstar"],
    looseNames: ["lucia", "jason"]
  };

  const DEFAULTS = {
    enabled: true,
    mode: "all",
    hideShorts: true,
    hideComments: true,
    hideNotifications: true,
    hideSuggestions: true,
    hideChips: true,
    blockWatchPage: true,
    offerViewAnyway: true,
    includeRockstar: true,
    includeLooseNames: true,
    customKeywords: []
  };

  function buildTerms(settings) {
    const options = Object.assign({}, DEFAULTS, settings || {});
    const groups = [];

    if (options.mode === "six") {
      groups.push(GROUPS.six);
    } else if (options.mode === "online") {
      groups.push(GROUPS.six, GROUPS.online);
    } else {
      groups.push(GROUPS.base, GROUPS.six, GROUPS.online);
    }

    if (options.includeRockstar) groups.push(GROUPS.rockstar);
    if (options.includeLooseNames) groups.push(GROUPS.looseNames);
    if (Array.isArray(options.customKeywords)) groups.push(options.customKeywords);

    return Array.from(
      new Set(
        groups
          .flat()
          .map((term) => String(term).trim())
          .filter(Boolean)
      )
    );
  }

  return {
    GROUPS: GROUPS,
    DEFAULTS: DEFAULTS,
    buildTerms: buildTerms
  };
});
