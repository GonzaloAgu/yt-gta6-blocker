(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.GTA6Matcher = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const LEET = {
    "0": "o",
    "1": "i",
    "3": "e",
    "4": "a",
    "5": "s",
    "7": "t",
    "9": "g",
    "@": "a",
    $: "s"
  };

  const ROMAN = {
    "ⅰ": "i",
    "ⅱ": "ii",
    "ⅲ": "iii",
    "ⅳ": "iv",
    "ⅴ": "v",
    "ⅵ": "vi",
    "ⅶ": "vii",
    "ⅷ": "viii",
    "ⅸ": "ix",
    "ⅹ": "x",
    "ⅺ": "xi",
    "ⅻ": "xii"
  };

  const ROMAN_RE = /[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩⅪⅫⅰⅱⅲⅳⅴⅵⅶⅷⅸⅹⅺⅻ]/g;
  const ZERO_WIDTH_RE = /[\u200b-\u200d\u2060\ufeff]/g;
  const MARKS_RE = /[\u0300-\u036f]/g;
  const LEET_RE = /[01345790@$]/g;
  const SEPARATOR_RE = /[^a-z0-9\u0400-\u04ff]+/g;
  const SPACE_RE = /\s+/g;

  function normalize(value) {
    if (value === null || value === undefined) {
      return { text: " ", compact: "" };
    }

    let text = String(value);
    text = text.replace(ZERO_WIDTH_RE, "");
    text = text.normalize("NFKC").toLowerCase();
    text = text.normalize("NFD").replace(MARKS_RE, "");
    text = text.replace(ROMAN_RE, function (character) {
      return ROMAN[character] || character;
    });
    text = text.replace(LEET_RE, function (character) {
      return LEET[character] || character;
    });
    text = text.replace(SEPARATOR_RE, " ").replace(SPACE_RE, " ").trim();

    return {
      text: " " + text + " ",
      compact: text.replace(SPACE_RE, "")
    };
  }

  function compileTerms(terms) {
    const compiled = [];
    const seen = new Set();

    for (const term of terms || []) {
      const normalized = normalize(term).compact;
      if (normalized.length < 3 || seen.has(normalized)) continue;
      seen.add(normalized);
      compiled.push(normalized);
    }

    return compiled;
  }

  function findMatch(value, compiledTerms) {
    const normalized = normalize(value);
    if (!normalized.compact) return null;

    for (const term of compiledTerms || []) {
      if (normalized.compact.includes(term)) return term;
    }

    return null;
  }

  return {
    normalize: normalize,
    compileTerms: compileTerms,
    findMatch: findMatch
  };
});
