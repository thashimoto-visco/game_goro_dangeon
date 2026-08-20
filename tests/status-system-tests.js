const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const context = { console, Math, Array, Object, Number, String, Boolean, Error, window: {} };
vm.createContext(context);
for (const file of ["status-catalog.js", "status-system.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const statusSystem = context.window.GORO_DUNGEON_STATUSES.createSystem(
  context.window.GORO_DUNGEON_STATUS_CATALOG
);

const actor = { name: "テスト役", tags: [], statuses: [] };
let result = statusSystem.apply(actor, "poison");
assert.strictEqual(result.applied, true);
assert.strictEqual(result.refreshed, false);
assert.strictEqual(actor.statuses[0].remaining, 8, "付与時にカタログの残りターンを設定する");

actor.statuses[0].remaining = 6;
result = statusSystem.apply(actor, "poison", { duration: 3 });
assert.strictEqual(result.refreshed, true);
assert.strictEqual(actor.statuses[0].remaining, 6, "短い再付与で残りターンを縮めない");
statusSystem.apply(actor, "poison");
assert.strictEqual(actor.statuses[0].remaining, 8, "長い再付与は残りターンだけを延長する");
assert.strictEqual(actor.statuses.length, 1, "再付与で状態を重複させない");

const golem = { tags: ["stone"], statuses: [] };
result = statusSystem.apply(golem, "poison");
assert.strictEqual(result.applied, false);
assert.strictEqual(result.reason, "resist");
assert.strictEqual(golem.statuses.length, 0, "stoneタグは毒を完全に防ぐ");

actor.statuses = [{ key: "poison", remaining: 2 }];
let ticks = statusSystem.tick(actor);
assert.strictEqual(ticks[0].damage, 1, "tickはダメージ量を返す");
assert.strictEqual(ticks[0].expired, false);
assert.strictEqual(actor.statuses[0].remaining, 1);
assert.strictEqual(actor.hp, undefined, "状態異常システムはHPへ触らない");
ticks = statusSystem.tick(actor);
assert.strictEqual(ticks[0].expired, true, "残り0で失効を返す");
assert.strictEqual(actor.statuses.length, 0);

actor.statuses = [];
statusSystem.apply(actor, "poison");
assert.strictEqual(statusSystem.blocksAction(actor), false);
assert.strictEqual(statusSystem.blocksNaturalRecovery(actor), true);
statusSystem.apply(actor, "sleep");
assert.strictEqual(statusSystem.blocksAction(actor), true);
assert.strictEqual(statusSystem.has(actor, "sleep"), true);
assert(statusSystem.marks(actor).some((mark) => mark.key === "sleep" && mark.remaining === 5));

const cleared = statusSystem.onDamage(actor);
assert.deepStrictEqual(Array.from(cleared, (entry) => entry.key), ["sleep"], "ダメージでは眠りだけが解除される");
assert.strictEqual(statusSystem.has(actor, "poison"), true, "毒はダメージで消えない");
assert.strictEqual(statusSystem.has(actor, "sleep"), false);

statusSystem.clearAll(actor);
assert.strictEqual(actor.statuses.length, 0);
assert.strictEqual(statusSystem.blocksNaturalRecovery(actor), false);

const emptyActor = {};
assert.strictEqual(statusSystem.has(emptyActor, "poison"), false);
assert.strictEqual(statusSystem.blocksAction(emptyActor), false);
assert.strictEqual(statusSystem.blocksNaturalRecovery(emptyActor), false);
assert.deepStrictEqual(Array.from(statusSystem.tick(emptyActor)), []);
assert.deepStrictEqual(Array.from(statusSystem.onDamage(emptyActor)), []);
assert.deepStrictEqual(Array.from(statusSystem.marks(emptyActor)), []);
assert.deepStrictEqual(Array.from(statusSystem.clearAll(emptyActor)), []);

console.log("status system tests passed");
