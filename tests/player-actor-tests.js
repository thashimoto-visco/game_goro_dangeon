const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const context = { console, window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(root, "player-actor.js"), "utf8"), context, {
  filename: "player-actor.js",
});

const api = context.window.GORO_DUNGEON_PLAYER_ACTOR;
assert(api, "player actor API should be exposed");
const system = api.createSystem();
const definition = system.definition;

assert.deepStrictEqual(
  Array.from(Object.keys(definition.clips.walk)),
  ["down", "up", "right", "left"],
  "walk clips should define all four directions"
);
assert.strictEqual(definition.clips.walk.down.length, 2);
assert.strictEqual(definition.clips.walk.up.length, 2);
assert.strictEqual(definition.clips.walk.right.length, 4);
assert.strictEqual(definition.clips.walk.left.length, 4);
assert.strictEqual(definition.clips.attack.down[0].asset, "attackDown");
assert.strictEqual(definition.clips.attack.up[0].asset, "attackUp");
assert.strictEqual(definition.clips.attack.right[0].asset, "attackRight");
assert.strictEqual(definition.clips.attack.left[0].asset, "attackLeft");
assert.strictEqual(definition.clips.attack.down[0].drawW, 75);
assert.strictEqual(definition.clips.attack.up[0].drawW, 55);
assert.strictEqual(definition.clips.attack.right[0].drawW, 90);
assert.strictEqual(definition.clips.attack.left[0].drawW, 90);
assert(!Object.hasOwn(definition.assets, "legacy"), "Prototype 3 attack art should remove the legacy fallback");

for (const [direction, frames] of Object.entries(definition.clips.walk)) {
  const cycleDuration = frames.reduce((total, frame) => total + frame.duration, 0);
  assert.strictEqual(cycleDuration, 360, `${direction} walk cycle should last 360ms`);
}

for (const [assetKey, assetPath] of system.assetEntries()) {
  assert(!assetPath.startsWith("/"), `${assetKey} should use a subpath-safe relative URL`);
  assert(fs.existsSync(path.join(root, assetPath)), `${assetKey} should exist at ${assetPath}`);
}

const images = Object.fromEntries(system.assetEntries().map(([key]) => [key, { key }]));
const clips = system.createClips(images);
assert.strictEqual(system.clipFor(clips, "walk", "right").length, 4);
assert.strictEqual(system.clipFor(clips, "walk", "unknown").length, 2, "unknown direction should fall back down");
assert.strictEqual(system.clipFor(clips, "attack", "right")[0].sprite.drawW, 90);

const rightWalk = system.clipFor(clips, "walk", "right");
assert.strictEqual(system.frameAtProgress(rightWalk, 0).asset, "walkRightRightContact");
assert.strictEqual(system.frameAtProgress(rightWalk, 0.25).asset, "walkRightLeftPassing");
assert.strictEqual(system.frameAtProgress(rightWalk, 0.5).asset, "walkRightLeftContact");
assert.strictEqual(system.frameAtProgress(rightWalk, 0.75).asset, "walkRightRightPassing");
assert.strictEqual(system.frameAtProgress(rightWalk, 1).asset, "walkRightRightPassing");

const downWalk = system.clipFor(clips, "walk", "down");
assert.strictEqual(system.frameAtProgress(downWalk, 0.49).asset, "walkDownRightContact");
assert.strictEqual(system.frameAtProgress(downWalk, 0.5).asset, "walkDownLeftContact");

assert.strictEqual(system.frameAtElapsed(rightWalk, 0).asset, "walkRightRightContact");
assert.strictEqual(system.frameAtElapsed(rightWalk, 90).asset, "walkRightLeftPassing");
assert.strictEqual(system.frameAtElapsed(rightWalk, 180).asset, "walkRightLeftContact");
assert.strictEqual(system.frameAtElapsed(rightWalk, 270).asset, "walkRightRightPassing");
assert.strictEqual(system.frameAtElapsed(rightWalk, 360).asset, "walkRightRightContact");
assert.strictEqual(system.frameAtElapsed(downWalk, 179).asset, "walkDownRightContact");
assert.strictEqual(system.frameAtElapsed(downWalk, 180).asset, "walkDownLeftContact");

console.log("player actor tests passed");
