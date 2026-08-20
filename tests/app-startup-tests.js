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
  "run-record.js",
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

function startApp({ search, protocol = "file:", hostname = "", seed = 12345, testMode = false, storage }) {
  const elements = new Map();
  const eventHandlers = new Map();
  const storageValues = new Map();
  const drawCalls = [];
  const drawingContext = {
    clearRect() {},
    fillRect() {},
    strokeRect() {},
    save() {},
    restore() {},
    drawImage(image) {
      drawCalls.push({ type: "image", src: image.currentSrc });
    },
    fillText(text) {
      drawCalls.push({ type: "text", text });
    },
  };
  let animationFrame = null;
  const document = {
    baseURI: "file:///E:/Current_Dev/Git_practice/etc/goro_dangeon/game_goro_dangeon/index.html",
    getElementById(id) {
      if (!elements.has(id)) {
        const element = createElement(id);
        if (id === "game") element.getContext = () => drawingContext;
        elements.set(id, element);
      }
      return elements.get(id);
    },
    createElement: () => createElement(),
    addEventListener() {},
  };
  class ImageStub {
    constructor() {
      this.complete = true;
      this.naturalWidth = 1280;
    }
    addEventListener() {}
    set src(value) {
      this.currentSrc = value;
    }
  }
  const window = {
    location: { search, protocol, hostname },
    GORO_DUNGEON_CONFIG: { assetBaseUrl: document.baseURI, testMode },
    localStorage:
      storage ||
      {
        getItem: (key) => storageValues.get(key) ?? null,
        setItem(key, value) {
          storageValues.set(key, value);
        },
        removeItem(key) {
          storageValues.delete(key);
        },
      },
    addEventListener(type, handler) {
      eventHandlers.set(type, handler);
    },
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
    requestAnimationFrame(callback) {
      animationFrame = callback;
    },
    performance: { now: () => 0 },
  };
  vm.createContext(context);
  for (const file of scripts) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  }
  if (testMode) {
    return {
      snapshot: () => window.GORO_DUNGEON_TEST_API.snapshot(),
      defeat: (reason) => window.GORO_DUNGEON_TEST_API.defeat(reason),
      press(key, options = {}) {
        eventHandlers.get("keydown")?.({
          key,
          repeat: Boolean(options.repeat),
          shiftKey: Boolean(options.shiftKey),
          preventDefault() {},
        });
      },
      render() {
        const callback = animationFrame;
        if (callback) callback(0);
        return drawCalls.slice();
      },
    };
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
  assert.strictEqual(snapshot.scene, "playing");
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

const titleApp = startApp({ search: "", testMode: true });
assert.strictEqual(titleApp.snapshot().scene, "title");
assert.strictEqual(titleApp.snapshot().mapRows, 0, "title should not generate a dungeon floor");
const titleDrawCalls = titleApp.render();
assert(
  titleDrawCalls.some((call) => call.type === "image" && call.src.endsWith("/assets/ui/title_bg.webp")),
  "the first title frame should draw the loaded title background"
);
assert(
  titleDrawCalls.some((call) => call.type === "text" && call.text === "吾郎の"),
  "the first title frame should draw the title text"
);
titleApp.press("h");
assert.strictEqual(titleApp.snapshot().scene, "help");
titleApp.press("Escape");
assert.strictEqual(titleApp.snapshot().scene, "title");
titleApp.press("s");
assert.strictEqual(titleApp.snapshot().muted, false);
titleApp.press("ArrowRight");
assert.strictEqual(titleApp.snapshot().scene, "playing");
assert.strictEqual(titleApp.snapshot().mapRows, 30);
assert.strictEqual(titleApp.snapshot().stats.deepestFloor, 1);
assert.deepStrictEqual(titleApp.snapshot().stats.themesSeen, ["standard"]);

titleApp.defeat("毒に倒れた");
assert.strictEqual(titleApp.snapshot().result.record.runCount, 1);
titleApp.press("Enter");
assert.strictEqual(titleApp.snapshot().scene, "result");
assert.strictEqual(titleApp.snapshot().result.summary.reason, "毒に倒れた");
assert.deepStrictEqual(titleApp.snapshot().result.summary.themesSeen, ["石造りの回廊"]);
assert.strictEqual(titleApp.snapshot().result.storageAvailable, true);
titleApp.press("r");
assert.strictEqual(titleApp.snapshot().scene, "playing");
assert.strictEqual(titleApp.snapshot().stats.deepestFloor, 1);
assert.strictEqual(titleApp.snapshot().stats.itemsUsed, 0);
assert.strictEqual(titleApp.snapshot().player.statuses.length, 0);
assert.strictEqual(titleApp.snapshot().player.equipment.weapon, null);
assert.strictEqual(titleApp.snapshot().player.equipment.shield, null);

titleApp.defeat();
titleApp.press("r");
assert.strictEqual(titleApp.snapshot().scene, "playing", "game over R should retry immediately");
assert.strictEqual(titleApp.snapshot().result.record.runCount, 2, "immediate retries should still save the run");
titleApp.defeat();
titleApp.press("Enter");
titleApp.press("Escape");
assert.strictEqual(titleApp.snapshot().scene, "title");

const deniedStorage = {
  getItem() {
    throw new Error("storage denied");
  },
  setItem() {
    throw new Error("storage denied");
  },
  removeItem() {
    throw new Error("storage denied");
  },
};
const noStorageApp = startApp({ search: "", testMode: true, storage: deniedStorage });
noStorageApp.press("x");
noStorageApp.defeat();
assert.doesNotThrow(() => noStorageApp.press("Enter"));
assert.strictEqual(noStorageApp.snapshot().scene, "result");
assert.strictEqual(noStorageApp.snapshot().result.storageAvailable, false);

console.log("app startup tests passed");
