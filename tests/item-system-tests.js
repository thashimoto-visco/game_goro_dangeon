const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const context = { console, Math, Array, Object, Number, String, Boolean, RegExp, Error, Set, window: {} };
vm.createContext(context);
for (const file of [
  "item-catalog.js",
  "item-system.js",
  "dungeon-item-tables.js",
  "dungeon-encounter-tables.js",
  "monster-catalog.js",
  "monster-system.js",
]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const itemSystem = context.window.GORO_DUNGEON_ITEMS.createSystem(context.window.GORO_DUNGEON_ITEM_CATALOG);
const monsterSystem = context.window.GORO_DUNGEON_MONSTERS.createSystem(context.window.GORO_DUNGEON_MONSTER_CATALOG);
const encounterData = context.window.GORO_DUNGEON_ENCOUNTER_DATA;

function instance(type, upgrade = 0) {
  return { id: 1, type, upgrade };
}

// --- 種別プロファイル -------------------------------------------------------

assert.strictEqual(itemSystem.kindOf("ironSword"), "weapon");
assert.strictEqual(itemSystem.kindOf("ironShield"), "shield");
assert.strictEqual(itemSystem.kindOf("enhanceScroll"), "scroll");
assert.strictEqual(itemSystem.kindOf("sleepWand"), "wand");

assert.strictEqual(itemSystem.equipSlotOf("ironSword"), "weapon");
assert.strictEqual(itemSystem.equipSlotOf("ironShield"), "shield");
assert.strictEqual(itemSystem.equipSlotOf("herb"), null, "薬は装備スロットを持たない");
assert.strictEqual(itemSystem.equipSlotOf("enhanceScroll"), null, "巻物は装備スロットを持たない");

assert.strictEqual(itemSystem.actionLabel("ironSword"), "装備");
assert.strictEqual(itemSystem.actionLabel("riceBall"), "食べる");
assert.strictEqual(itemSystem.actionLabel("herb"), "飲む");
assert.strictEqual(itemSystem.actionLabel("enhanceScroll"), "読む");
assert.strictEqual(itemSystem.actionLabel("sleepWand"), "振る");
assert.strictEqual(itemSystem.kindLabel("ironShield"), "盾");

const unknown = itemSystem.definitionByKey("存在しないキー");
assert.strictEqual(unknown.key, "unknown", "未知のキーはフォールバック定義へ落ちる");
assert.strictEqual(itemSystem.equipSlotOf("存在しないキー"), null);

// --- 既存アイテムの数値が変わっていないこと ---------------------------------

assert.strictEqual(itemSystem.attackBonus(instance("woodenSword")), 1);
assert.strictEqual(itemSystem.attackBonus(instance("ironSword")), 3);
assert.strictEqual(itemSystem.effectText(instance("riceBall")), "満腹度+35");
assert.strictEqual(itemSystem.effectText(instance("herb")), "HP+10");

// --- 表示名と強化値 ---------------------------------------------------------

assert.strictEqual(itemSystem.displayName(instance("ironSword", 0)), "鉄の剣", "+0では強化表記を出さない");
assert.strictEqual(itemSystem.displayName(instance("ironSword", 2)), "鉄の剣+2");
assert.strictEqual(itemSystem.displayName(instance("ironShield", 1)), "鉄の盾+1");

assert.strictEqual(itemSystem.attackBonus(instance("ironSword", 2)), 5, "強化値は攻撃補正に加算される");
assert.strictEqual(itemSystem.defenseBonus(instance("ironShield", 2)), 5, "強化値は守備補正に加算される");
assert.strictEqual(itemSystem.defenseBonus(instance("ironSword", 2)), 0, "武器は守備補正を持たない");
assert.strictEqual(itemSystem.attackBonus(instance("ironShield", 2)), 0, "盾は攻撃補正を持たない");

assert.strictEqual(itemSystem.clampUpgrade("ironSword", 99), 3, "強化値はmaxUpgradeで頭打ちになる");
assert.strictEqual(itemSystem.clampUpgrade("ironSword", -5), 0, "強化値は負にならない");
assert.strictEqual(itemSystem.clampUpgrade("herb", 2), 0, "強化できない種別は常に0");
assert.strictEqual(itemSystem.canUpgrade(instance("ironSword", 2)), true);
assert.strictEqual(itemSystem.canUpgrade(instance("ironSword", 3)), false, "上限に達した装備は強化できない");
assert.strictEqual(itemSystem.canUpgrade(instance("herb", 0)), false);

// --- 効果文が強化後の実数値を出すこと ---------------------------------------

assert.strictEqual(itemSystem.effectText(instance("ironSword", 2)), "攻撃+5");
assert.strictEqual(itemSystem.effectText(instance("woodenShield", 1)), "守備+2");
assert.strictEqual(itemSystem.effectText(instance("bigRiceBall")), "満腹度+60 / 最大+5");
assert.strictEqual(
  itemSystem.effectText(instance("thunderScroll")),
  "同じ部屋の敵に8ダメージ",
  "巻物の説明文はカタログの数値で埋められる"
);
assert.strictEqual(itemSystem.effectText(instance("enhanceScroll")), "装備を1段階強化する");
assert.strictEqual(itemSystem.effectText(instance("demonSlayer")), "攻撃+2 / 悪魔に+6");
assert.strictEqual(itemSystem.effectText(instance("cureHerb")), "状態異常をすべて治す");
assert.strictEqual(itemSystem.displayName({ type: "sleepWand", uses: 2 }), "眠りの杖[2]");
assert(itemSystem.effectText({ type: "sleepWand", uses: 2 }).includes("残り2回"));
assert(itemSystem.flavorText("herb").length > 0, "全アイテムにフレーバー文がある");

// --- 敵特効 -----------------------------------------------------------------

const miniDevil = monsterSystem.createEnemy(monsterSystem.typeByKey("miniDevil"), 1, 1, 5);
const golem = monsterSystem.createEnemy(monsterSystem.typeByKey("golem"), 1, 1, 5);
// vm内で生成された配列はプロトタイプが異なるため、ホスト側の配列へ移してから比較する。
assert.deepStrictEqual(Array.from(miniDevil.tags), ["demon"], "生成した敵はタグを引き継ぐ");
assert.deepStrictEqual(Array.from(golem.tags), ["stone"]);

const slayer = instance("demonSlayer");
assert.strictEqual(itemSystem.slayerBonusFor(slayer, miniDevil.tags), 6, "タグ一致時だけ特効が乗る");
assert.strictEqual(itemSystem.slayerBonusFor(slayer, golem.tags), 0, "タグ不一致では特効が乗らない");
assert.strictEqual(itemSystem.slayerBonusFor(instance("ironSword"), miniDevil.tags), 0, "通常武器には特効がない");
assert.strictEqual(itemSystem.slayerBonusFor(slayer, undefined), 0, "タグ未定義の敵でも落ちない");
assert.strictEqual(itemSystem.slayerLabelFor(slayer), "悪魔");

// --- 投げる威力 -------------------------------------------------------------

assert.strictEqual(itemSystem.throwPowerOf(instance("ironSword")), 6);
assert.strictEqual(itemSystem.throwPowerOf(instance("ironSword", 2)), 8, "強化値は投擲威力にも乗る");
assert.strictEqual(itemSystem.throwPowerOf(instance("herb", 2)), 2, "強化できない種別は投擲威力が変わらない");
assert(itemSystem.throwPowerOf(instance("enhanceScroll")) >= 1, "投擲威力は最低1");

// --- テーブルとカタログの整合 -----------------------------------------------

const catalogKeys = new Set(itemSystem.keys);
assert.strictEqual(catalogKeys.size, 12, "カタログは12種のアイテムを持つ");

function assertTableEntries(label, tables) {
  assert(Array.isArray(tables) && tables.length > 0, `${label} が空`);
  for (const table of tables) {
    assert(Array.isArray(table.entries) && table.entries.length > 0, `${label} のentriesが空`);
    for (const entry of table.entries) {
      assert(catalogKeys.has(entry.type), `${label} の ${entry.type} がカタログに存在しない`);
      assert(entry.weight > 0, `${label} の ${entry.type} の重みが0以下`);
    }
  }
}

assertTableEntries("階層別アイテム表", context.window.GORO_DUNGEON_ITEM_SPAWN_TABLES);
assertTableEntries("宝物部屋表", context.window.GORO_DUNGEON_TREASURE_REWARD_TABLES);
assertTableEntries("強敵報酬表", Object.values(encounterData.rewardProfiles));

for (const table of context.window.GORO_DUNGEON_ITEM_SPAWN_TABLES) {
  assert(Array.isArray(table.count) && table.count.length === 2, "階層別アイテム表はcountの範囲を持つ");
  assert(table.count[0] <= table.count[1], "countの下限は上限以下");
  assert.strictEqual(
    table.entries.reduce((sum, entry) => sum + entry.weight, 0),
    100,
    "階層別アイテム表の重み合計は100"
  );
}

for (const table of context.window.GORO_DUNGEON_TREASURE_REWARD_TABLES) {
  assert.strictEqual(table.entries.reduce((sum, entry) => sum + entry.weight, 0), 100, "宝物部屋表の重み合計は100");
}

// 盾と巻物が実際に取得経路へ入っているか。装備判断を増やす前提が崩れていないことを見る。
const spawnableKeys = new Set();
for (const table of context.window.GORO_DUNGEON_ITEM_SPAWN_TABLES) {
  for (const entry of table.entries) spawnableKeys.add(entry.type);
}
assert(spawnableKeys.has("woodenShield"), "盾が階層別アイテム表に入っている");
assert(spawnableKeys.has("enhanceScroll"), "強化の巻物が階層別アイテム表に入っている");
assert(spawnableKeys.has("demonSlayer"), "レア武器が階層別アイテム表に入っている");
assert(spawnableKeys.has("cureHerb"), "なおし草が階層別アイテム表に入っている");
assert(spawnableKeys.has("sleepWand"), "眠りの杖が階層別アイテム表に入っている");

const firstFloorTable = context.window.GORO_DUNGEON_ITEM_SPAWN_TABLES.find((table) => table.minFloor === 1);
const firstFloorKeys = firstFloorTable.entries.map((entry) => entry.type);
assert(!firstFloorKeys.includes("demonSlayer"), "レア武器は1Fでは出さない");
assert(!firstFloorKeys.includes("enhanceScroll"), "巻物は1Fでは出さない");

console.log("item system tests passed");
