const assert = require("assert");
const runRecord = require("../run-record.js");

assert.strictEqual(
  runRecord.scoreOf({ deepestFloor: 5, defeated: 15, strongDefeated: 1, level: 3, exp: 40 }),
  800
);
assert.strictEqual(runRecord.scoreOf({ deepestFloor: 0, defeated: 0 }), 0);
assert.strictEqual(runRecord.scoreOf({ deepestFloor: -2, defeated: NaN }), 0);
assert.doesNotThrow(() => runRecord.scoreOf({ level: 2 }));

const first = runRecord.mergeRecord(
  runRecord.initialRecord(),
  { deepestFloor: 2, defeated: 30, strongDefeated: 0, level: 2, exp: 5 },
  () => "2026-08-20T00:00:00.000Z"
);
assert.deepStrictEqual(first.updatedFields, [
  "bestScore",
  "bestFloor",
  "bestDefeated",
  "bestStrongDefeated",
  "bestLevel",
]);
assert.strictEqual(first.record.runCount, 1);
assert.strictEqual(first.record.bestAt, "2026-08-20T00:00:00.000Z");

const floorOnly = runRecord.mergeRecord(
  first.record,
  { deepestFloor: 4, defeated: 0, strongDefeated: 0, level: 1, exp: 0 },
  () => "2026-08-21T00:00:00.000Z"
);
assert.deepStrictEqual(floorOnly.updatedFields, ["bestFloor"]);
assert.strictEqual(floorOnly.record.bestScore, first.record.bestScore);
assert.strictEqual(floorOnly.record.bestFloor, 4);
assert.strictEqual(floorOnly.record.runCount, 2);

const unchanged = runRecord.mergeRecord(first.record, {
  deepestFloor: 1,
  defeated: 0,
  strongDefeated: 0,
  level: 1,
  exp: 0,
});
assert.deepStrictEqual(unchanged.updatedFields, []);

for (const badValue of [
  "not json",
  JSON.stringify({ ...runRecord.initialRecord(), version: 2 }),
  JSON.stringify({ ...runRecord.initialRecord(), bestScore: "100" }),
  JSON.stringify({ ...runRecord.initialRecord(), bestFloor: -1 }),
]) {
  assert.deepStrictEqual(runRecord.parseRecord(badValue), runRecord.initialRecord());
}

const withExtra = runRecord.parseRecord(
  JSON.stringify({ ...first.record, unexpected: { anything: true } })
);
assert.strictEqual(withExtra.bestScore, first.record.bestScore);
assert.strictEqual("unexpected" in withExtra, false);

const throwingReadSystem = runRecord.createSystem({
  storage: {
    read() {
      throw new Error("read denied");
    },
    write() {
      return true;
    },
  },
});
assert.deepStrictEqual(throwingReadSystem.load(), runRecord.initialRecord());

const throwingWriteSystem = runRecord.createSystem({
  storage: {
    read: () => null,
    write() {
      throw new Error("quota exceeded");
    },
  },
});
throwingWriteSystem.load();
assert.doesNotThrow(() => throwingWriteSystem.merge({ deepestFloor: 1, level: 1 }));
assert.strictEqual(throwingWriteSystem.merge({ deepestFloor: 1, level: 1 }).saved, false);

const failedWriteSystem = runRecord.createSystem({
  storage: { read: () => null, write: () => false },
});
failedWriteSystem.load();
assert.strictEqual(failedWriteSystem.merge({ deepestFloor: 1, level: 1 }).saved, false);

console.log("run record tests passed");
