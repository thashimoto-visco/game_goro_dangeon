(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.GORO_DUNGEON_RUN_RECORD = api;
})(typeof window !== "undefined" ? window : globalThis, function () {
  "use strict";

  const VERSION = 1;
  const DEFAULT_KEY = "goro-dungeon:run-record";
  const BEST_FIELDS = [
    ["bestScore", "score"],
    ["bestFloor", "deepestFloor"],
    ["bestDefeated", "defeated"],
    ["bestStrongDefeated", "strongDefeated"],
    ["bestLevel", "level"],
  ];

  function initialRecord() {
    return {
      version: VERSION,
      bestScore: 0,
      bestFloor: 0,
      bestDefeated: 0,
      bestStrongDefeated: 0,
      bestLevel: 0,
      bestAt: "",
      runCount: 0,
    };
  }

  function nonNegativeInteger(value) {
    return Number.isFinite(value) && value >= 0 ? Math.floor(value) : 0;
  }

  function scoreOf(summary = {}) {
    return (
      nonNegativeInteger(summary.deepestFloor) * 100 +
      nonNegativeInteger(summary.defeated) * 10 +
      nonNegativeInteger(summary.strongDefeated) * 50 +
      nonNegativeInteger(summary.level) * 20 +
      nonNegativeInteger(summary.exp)
    );
  }

  function parseRecord(raw) {
    if (typeof raw !== "string" || raw.length === 0) return initialRecord();
    let value;
    try {
      value = JSON.parse(raw);
    } catch {
      return initialRecord();
    }

    const numericFields = [
      "bestScore",
      "bestFloor",
      "bestDefeated",
      "bestStrongDefeated",
      "bestLevel",
      "runCount",
    ];
    if (
      !value ||
      typeof value !== "object" ||
      value.version !== VERSION ||
      typeof value.bestAt !== "string" ||
      numericFields.some((field) => !Number.isFinite(value[field]) || value[field] < 0)
    ) {
      return initialRecord();
    }

    const record = initialRecord();
    for (const field of numericFields) record[field] = Math.floor(value[field]);
    record.bestAt = value.bestAt;
    return record;
  }

  function mergeRecord(current, summary = {}, now = () => new Date().toISOString()) {
    const base = parseRecord(JSON.stringify(current));
    const run = {
      ...summary,
      score: scoreOf(summary),
    };
    const firstRun = base.runCount === 0;
    const updatedFields = [];
    for (const [recordField, summaryField] of BEST_FIELDS) {
      const value = nonNegativeInteger(run[summaryField]);
      if (firstRun || value > base[recordField]) {
        base[recordField] = value;
        updatedFields.push(recordField);
      }
    }
    base.runCount += 1;
    if (updatedFields.length > 0) base.bestAt = now();
    return { record: base, updatedFields };
  }

  function createSystem({ storage, key = DEFAULT_KEY, now } = {}) {
    let record = initialRecord();

    function load() {
      try {
        record = parseRecord(storage?.read?.(key));
      } catch {
        record = initialRecord();
      }
      return { ...record };
    }

    function merge(summary) {
      const merged = mergeRecord(record, summary, now);
      record = merged.record;
      let saved = false;
      try {
        saved = storage?.write?.(key, JSON.stringify(record)) === true;
      } catch {
        saved = false;
      }
      return {
        record: { ...record },
        updatedFields: merged.updatedFields.slice(),
        saved,
      };
    }

    return { scoreOf, load, merge };
  }

  return {
    VERSION,
    DEFAULT_KEY,
    initialRecord,
    parseRecord,
    scoreOf,
    mergeRecord,
    createSystem,
  };
});
