const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const context = { console, Math, Array, Object, Number, String, Boolean, Error, window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "monster-ai.js"), "utf8"), context, {
  filename: "monster-ai.js",
});
const monsterAi = context.window.GORO_DUNGEON_MONSTER_AI;

function makeContext(overrides = {}) {
  const rolls = (overrides.rolls || [0.1, 0.1]).slice();
  return {
    player: overrides.player || { x: 4, y: 4 },
    isBlockedForEnemy: overrides.isBlockedForEnemy || (() => false),
    straightPathTo: overrides.straightPathTo || (() => null),
    rng: () => (rolls.length ? rolls.shift() : 0.1),
  };
}

let intent = monsterAi.decide({ x: 1, y: 1, ai: "chase" }, makeContext({ player: { x: 2, y: 1 } }));
assert.strictEqual(intent.type, "melee", "追跡AIは進行先がプレイヤーなら近接攻撃する");

intent = monsterAi.decide({ x: 1, y: 1, ai: "chase" }, makeContext());
assert.deepStrictEqual({ ...intent }, { type: "move", x: 2, y: 2 }, "追跡AIは従来通りX/Yを個別判定する");

intent = monsterAi.decide(
  { x: 1, y: 1, ai: "chase" },
  makeContext({ isBlockedForEnemy: (x, y) => x === 2 && y === 2 })
);
assert.strictEqual(intent.type, "wait", "壁や他の敵がいる進行先を避ける");

intent = monsterAi.decide(
  { x: 1, y: 1, ai: "chase" },
  makeContext({ isBlockedForEnemy: (x) => x > 1 })
);
assert.strictEqual(intent.type, "wait", "特殊遭遇の部屋制限も共通の遮断判定で守る");

intent = monsterAi.decide(
  { x: 1, y: 1, ai: "chase" },
  makeContext({ player: { x: 2, y: 1 }, isBlockedForEnemy: (x) => x > 1 })
);
assert.strictEqual(intent.type, "wait", "部屋境界の外にいるプレイヤーへ近接攻撃しない");

const rangedEnemy = { x: 1, y: 1, ai: "ranged", rangedRange: 4 };
intent = monsterAi.decide(
  rangedEnemy,
  makeContext({ player: { x: 1, y: 4 }, straightPathTo: () => [{ x: 1, y: 2 }, { x: 1, y: 3 }, { x: 1, y: 4 }] })
);
assert.strictEqual(intent.type, "ranged", "直線上かつ射程内なら遠距離攻撃する");
assert.strictEqual(intent.path.length, 3);

intent = monsterAi.decide(rangedEnemy, makeContext({ player: { x: 1, y: 4 }, straightPathTo: () => null }));
assert.notStrictEqual(intent.type, "ranged", "壁などで射線が切れていれば撃たない");

intent = monsterAi.decide(
  { x: 2, y: 2, ai: "ranged", rangedRange: 4 },
  makeContext({ player: { x: 2, y: 3 } })
);
assert.strictEqual(intent.type, "move", "隣接時は距離を取る");
assert(intent.y < 2, "プレイヤーと反対方向を優先する");

intent = monsterAi.decide(
  rangedEnemy,
  makeContext({ player: { x: 8, y: 1 }, straightPathTo: () => null })
);
assert.notStrictEqual(intent.type, "ranged", "射程外なら追跡へ戻る");

const fallback = monsterAi.decide({ x: 1, y: 1, ai: "unknown" }, makeContext());
assert.deepStrictEqual({ ...fallback }, { type: "move", x: 2, y: 2 }, "未知のAIキーは追跡へフォールバックする");

console.log("monster AI tests passed");
