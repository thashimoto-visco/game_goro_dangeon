const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const context = { console, Math, Array, Object, Number, String, Boolean, Error, window: {} };
vm.createContext(context);
for (const file of [
  "monster-catalog.js",
  "monster-system.js",
  "dungeon-encounter-tables.js",
  "dungeon-special-encounters.js",
]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const monsterSystem = context.window.GORO_DUNGEON_MONSTERS.createSystem(
  context.window.GORO_DUNGEON_MONSTER_CATALOG
);
const encounterData = context.window.GORO_DUNGEON_ENCOUNTER_DATA;
const resolver = context.window.GORO_DUNGEON_SPECIAL_ENCOUNTERS;

const golem = monsterSystem.typeByKey("golem");
const normalGolem = monsterSystem.createEnemy(golem, 3, 4, 5);
assert.strictEqual(normalGolem.maxHp, 15, "existing normal golem HP should stay unchanged");
assert.strictEqual(normalGolem.atk, 6, "existing normal golem attack should stay unchanged");
assert.strictEqual(normalGolem.exp, 9, "existing normal golem experience should stay unchanged");
assert.strictEqual(normalGolem.encounterRank, "normal", "omitted rank should default to normal");
assert.strictEqual(normalGolem.rewardProfile, null, "normal enemies should not gain a reward profile");

const miniDevil = monsterSystem.typeByKey("miniDevil");
const strongProfile = encounterData.rankProfiles.strong;
const strongMiniDevil = monsterSystem.createEnemy(miniDevil, 5, 6, 5, {
  encounterRank: "strong",
  encounterId: "test-5f",
  rankProfile: strongProfile,
});
assert.strictEqual(strongMiniDevil.maxHp, 21, "5F strong mini devil should receive the strong HP multiplier");
assert.strictEqual(strongMiniDevil.atk, 8, "5F strong mini devil should receive the strong attack multiplier");
assert.strictEqual(strongMiniDevil.exp, 18, "strong experience multiplier should be applied once");
assert.strictEqual(strongMiniDevil.rewardProfile, "strongDefault");
assert.strictEqual(strongMiniDevil.countsAsStrongDefeat, true);

const normalMiniDevil = monsterSystem.createEnemy(miniDevil, 5, 6, 10, {
  encounterRank: "normal",
  rankProfile: encounterData.rankProfiles.normal,
});
assert.strictEqual(normalMiniDevil.maxHp, 20, "10F normal mini devil should use normal rank stats");
assert.strictEqual(normalMiniDevil.atk, 10);
assert.strictEqual(normalMiniDevil.exp, 10);
assert.strictEqual(normalMiniDevil.rewardProfile, null);
assert.strictEqual(normalMiniDevil.countsAsStrongDefeat, false);

const monsterDefinition = monsterSystem.definitionByKey("miniDevil");
const catalogMessage = resolver.resolveMessage({
  encounter: { rank: "strong", messages: {} },
  monster: monsterDefinition,
  rankProfile: strongProfile,
  kind: "roomPresence",
  name: monsterDefinition.name,
});
assert.strictEqual(catalogMessage, "羽音と小さな笑い声が聞こえる。");

const overrideMessage = resolver.resolveMessage({
  encounter: { rank: "strong", messages: { roomPresence: "別の笑い声が近づいてくる。" } },
  monster: monsterDefinition,
  rankProfile: strongProfile,
  kind: "roomPresence",
  name: monsterDefinition.name,
});
assert.strictEqual(overrideMessage, "別の笑い声が近づいてくる。", "encounter message should override catalog");

const rankFallback = resolver.resolveMessage({
  encounter: { rank: "strong", messages: {} },
  monster: { name: "テスト敵", messages: {} },
  rankProfile: strongProfile,
  kind: "encounter",
  name: "テスト敵",
});
assert.strictEqual(rankFallback, "強敵のテスト敵が現れた！");

const genericCatalogMustNotHideStrongRank = resolver.resolveMessage({
  encounter: { rank: "strong", messages: {} },
  monster: { name: "テスト敵", messages: { encounter: "テスト敵が現れた！" } },
  rankProfile: strongProfile,
  kind: "encounter",
  name: "テスト敵",
});
assert.strictEqual(
  genericCatalogMustNotHideStrongRank,
  "強敵のテスト敵が現れた！",
  "rank-specific strong message should win over a generic catalog encounter message"
);

const normalFallback = resolver.resolveMessage({
  encounter: { rank: "normal", messages: {} },
  monster: { name: "テスト敵", messages: {} },
  rankProfile: { messages: {} },
  kind: "encounter",
  name: "テスト敵",
});
assert.strictEqual(normalFallback, "テスト敵が現れた！");
assert.notStrictEqual(normalFallback.includes("undefined"), true);

console.log("monster system tests passed");
