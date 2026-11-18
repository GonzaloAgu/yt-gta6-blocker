const test = require("node:test");
const assert = require("node:assert/strict");

const matcher = require("../src/matcher.js");
const keywords = require("../src/keywords.js");

function termsFor(overrides) {
  return matcher.compileTerms(
    keywords.buildTerms(Object.assign({}, keywords.DEFAULTS, overrides || {}))
  );
}

test("normalizes separators, roman numerals, and casing", () => {
  assert.equal(matcher.normalize("G.T.A. Ⅵ").compact, "gtavi");
  assert.equal(matcher.normalize("G T A 6").compact, "gta6");
  assert.equal(matcher.normalize("ＧＴＡ 6").compact, "gta6");
});

test("normalizes leet, invisible characters, and accents", () => {
  assert.equal(matcher.normalize("G7A 6").compact, "gta6");
  assert.equal(matcher.normalize("G\u200bTA 6").compact, "gta6");
  assert.equal(matcher.normalize("Leónida").compact, "leonida");
});

test("All GTA mode catches direct references", () => {
  const terms = termsFor();
  const positives = [
    "GTA 6 Trailer 3",
    "GTA VI",
    "GTAVI",
    "Grand Theft Auto VI",
    "Vice City",
    "Rockstar Games",
    "GTA Online",
    "GTA V",
    "Lucia Caminos",
    "Jason Duval",
    "Leonida",
    "ГТА 6"
  ];

  for (const value of positives) {
    assert.ok(matcher.findMatch(value, terms), value);
  }
});

test("All GTA mode includes standalone names by default", () => {
  const terms = termsFor();
  assert.ok(matcher.findMatch("Lucia", terms));
  assert.ok(matcher.findMatch("Jason Bourne", terms));
  assert.ok(matcher.findMatch("Rockstar Energy", terms));
});

test("does not match unrelated content", () => {
  const terms = termsFor();
  const negatives = [
    "Minecraft",
    "Regata",
    "Digital",
    "Learn JavaScript",
    "Pasta recipe"
  ];

  for (const value of negatives) {
    assert.equal(matcher.findMatch(value, terms), null, value);
  }
});

test("GTA 6 only mode does not block GTA V or standalone Rockstar", () => {
  const terms = termsFor({
    mode: "six",
    includeRockstar: false,
    includeLooseNames: false
  });

  assert.ok(matcher.findMatch("GTA 6", terms));
  assert.ok(matcher.findMatch("Grand Theft Auto VI", terms));
  assert.ok(matcher.findMatch("Lucia Caminos", terms));
  assert.equal(matcher.findMatch("GTA V", terms), null);
  assert.equal(matcher.findMatch("Rockstar Energy", terms), null);
  assert.equal(matcher.findMatch("Lucia", terms), null);
});

test("GTA 6 + Online mode blocks GTA Online but not GTA III", () => {
  const terms = termsFor({
    mode: "online",
    includeRockstar: false,
    includeLooseNames: false
  });

  assert.ok(matcher.findMatch("GTA Online", terms));
  assert.ok(matcher.findMatch("GTA V", terms));
  assert.ok(matcher.findMatch("GTA 6", terms));
  assert.equal(matcher.findMatch("GTA III", terms), null);
});

test("respects custom terms", () => {
  const terms = termsFor({ customKeywords: ["proyecto américa", "spoiler total"] });
  assert.ok(matcher.findMatch("Proyecto America", terms));
  assert.ok(matcher.findMatch("This is a SPOILER TOTAL", terms));
});

test("ignores terms that are too short", () => {
  const terms = matcher.compileTerms(["vi", "6", "gta"]);
  assert.deepEqual(terms, ["gta"]);
});

test("tolerates dots, spaces, and leet evasions", () => {
  const terms = termsFor({ mode: "six", includeRockstar: false, includeLooseNames: false });
  const positives = ["G.T.A. 6", "G T A VI", "G7A 6", "GTAⅥ", "ＧＴＡ Ⅵ"];
  for (const value of positives) {
    assert.ok(matcher.findMatch(value, terms), value);
  }
});
