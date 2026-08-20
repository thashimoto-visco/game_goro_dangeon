const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");
const scripts = [
  "monster-catalog.js",
  "monster-system.js",
  "status-catalog.js",
  "status-system.js",
  "monster-ai.js",
  "item-catalog.js",
  "item-system.js",
  "dungeon-spawn-tables.js",
  "dungeon-item-tables.js",
  "dungeon-encounter-tables.js",
  "floor-theme-catalog.js",
  "dungeon-theme-tables.js",
  "dungeon-layout.js",
  "dungeon-visibility.js",
  "dungeon-tile-renderer.js",
  "dungeon-debug-overlay.js",
  "dungeon-events.js",
  "dungeon-special-encounters.js",
  "main.js",
];

function createElement(id = "") {
  return {
    id,
    width: id === "game" ? 640 : 0,
    height: id === "game" ? 480 : 0,
    textContent: "",
    innerHTML: "",
    className: "",
    style: {},
    children: [],
    lastChild: null,
    getContext: () => ({}),
    addEventListener() {},
    setAttribute() {},
    appendChild(child) {
      this.children.push(child);
      this.lastChild = this.children[this.children.length - 1] || null;
      return child;
    },
    prepend(child) {
      this.children.unshift(child);
      this.lastChild = this.children[this.children.length - 1] || null;
    },
    removeChild(child) {
      const index = this.children.indexOf(child);
      if (index >= 0) this.children.splice(index, 1);
      this.lastChild = this.children[this.children.length - 1] || null;
    },
    replaceChildren(...children) {
      this.children = children;
      this.lastChild = this.children[this.children.length - 1] || null;
    },
  };
}

function createSeededMath(seed) {
  let state = seed >>> 0;
  const seededMath = Object.create(Math);
  seededMath.random = () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0x100000000;
  };
  return seededMath;
}

function startApp({ search, protocol = "file:", hostname = "", seed = 12345 }) {
  const elements = new Map();
  const document = {
    baseURI: "file:///E:/Current_Dev/Git_practice/etc/goro_dangeon/game_goro_dangeon/index.html",
    getElementById(id) {
      if (!elements.has(id)) elements.set(id, createElement(id));
      return elements.get(id);
    },
    createElement: () => createElement(),
    addEventListener() {},
  };
  class ImageStub {
    addEventListener() {}
    set src(value) {
      this.currentSrc = value;
    }
  }
  const window = {
    location: { search, protocol, hostname },
    GORO_DUNGEON_CONFIG: { assetBaseUrl: document.baseURI },
    addEventListener() {},
    setInterval: () => 1,
    clearInterval() {},
  };
  const context = {
    console,
    Math: createSeededMath(seed),
    Set,
    Map,
    Array,
    Object,
    Number,
    String,
    Boolean,
    Error,
    Date,
    URL,
    URLSearchParams,
    Image: ImageStub,
    document,
    window,
    requestAnimationFrame() {},
    performance: { now: () => 0 },
  };
  vm.createContext(context);
  for (const file of scripts) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  }
  return window.GORO_DUNGEON_DEBUG_SNAPSHOT?.();
}

function assertPlacements(snapshot, label) {
  assert.strictEqual(snapshot.map.length, 30, `${label} should have 30 map rows`);
  assert(snapshot.map.every((row) => row.length === 40), `${label} should have 40 map columns`);
  const occupied = new Set([`${snapshot.player.x},${snapshot.player.y}`, `${snapshot.stairs.x},${snapshot.stairs.y}`]);
  for (const entry of [...snapshot.enemies, ...snapshot.items, ...snapshot.eventObjects]) {
    const key = `${entry.x},${entry.y}`;
    assert(!occupied.has(key), `${label} should not overlap an entity at ${key}`);
    occupied.add(key);
    assert.strictEqual(snapshot.map[entry.y][entry.x], ".", `${label} entity ${key} should be on a floor tile`);
  }
}

for (const key of ["standard", "greatHall", "warren"]) {
  const snapshot = startApp({ search: `?debug=1&floor=8&theme=${key}`, seed: 800 + key.length });
  assert(snapshot, `${key} should expose a local debug snapshot`);
  assert.strictEqual(snapshot.floor, 8);
  assert.strictEqual(snapshot.floorTheme.key, key);
  assertPlacements(snapshot, key);
  if (key === "greatHall") {
    assert(snapshot.rooms.some((room) => room.feature), "greatHall startup should contain a feature room");
    assert(!snapshot.rooms[0].feature, "greatHall startup should not place the player in the feature room");
  }
  if (key === "warren") {
    assert(snapshot.rooms.every((room) => room.w <= 6 && room.h <= 5), "warren startup should use small rooms");
  }
}

const unknownTheme = startApp({ search: "?debug=1&floor=8&theme=does-not-exist" });
assert.strictEqual(unknownTheme.floorTheme.key, "standard", "unknown debug themes should fall back to standard");

const publicHost = startApp({
  search: "?debug=1&floor=8&theme=greatHall",
  protocol: "https:",
  hostname: "example.github.io",
});
assert.strictEqual(publicHost, undefined, "public hosts should not expose the debug snapshot");

console.log("app startup tests passed");
