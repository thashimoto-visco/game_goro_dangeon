const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { isSameRoom, roomsOverlap } = require("./test-helpers");

const root = path.resolve(__dirname, "..");
const context = {
  console,
  Math,
  Array,
  Object,
  Number,
  String,
  Boolean,
  Error,
  window: {},
};
vm.createContext(context);
for (const file of ["floor-theme-catalog.js", "dungeon-theme-tables.js", "dungeon-events.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const catalog = context.window.GORO_DUNGEON_FLOOR_THEME_CATALOG;
const tables = context.window.GORO_DUNGEON_FLOOR_THEME_TABLES;
const catalogKeys = new Set(catalog.map((theme) => theme.key));
const standard = catalog.find((theme) => theme.key === "standard");

assert(standard, "catalog should contain the standard fallback theme");
assert.strictEqual(new Set(catalog.map((theme) => theme.key)).size, catalog.length, "theme keys should be unique");

for (const table of tables) {
  assert(table.minFloor <= table.maxFloor, "theme table floor ranges should be ordered");
  assert(table.entries.length > 0, "every theme table should contain entries");
  for (const entry of table.entries) {
    assert(catalogKeys.has(entry.theme), `theme table should reference an existing theme: ${entry.theme}`);
    assert(entry.weight > 0, `theme weight should be positive: ${entry.theme}`);
  }
}

for (const floor of [1, 2]) {
  const table = tables.find((entry) => floor >= entry.minFloor && floor <= entry.maxFloor);
  assert(table, `${floor}F should have a theme table`);
  assert.deepStrictEqual(
    Array.from(table.entries, (entry) => entry.theme),
    ["standard"],
    `${floor}F should be fixed to standard`
  );
}

for (const theme of catalog) {
  const roomSets = [theme.generation.rooms, theme.generation.featureRooms].filter(Boolean);
  for (const rooms of roomSets) {
    assert(rooms.width[0] >= 3, `${theme.key} room width minimum should be at least 3`);
    assert(rooms.height[0] >= 3, `${theme.key} room height minimum should be at least 3`);
  }
  assert(theme.generation.rooms.padding >= 3, `${theme.key} room padding should be at least 3`);
  assert(theme.eventRoom.minRoomW >= 3 && theme.eventRoom.minRoomH >= 3);
  assert(theme.enemyCountScale > 0 && theme.itemCountScale > 0);
}

function themeByKey(key) {
  return catalog.find((theme) => theme.key === key) || standard;
}

assert.strictEqual(themeByKey("unknown-theme").key, "standard", "unknown theme keys should fall back to standard");
assert(
  fs.readFileSync(path.join(root, "main.js"), "utf8").includes("floorThemeByKey(debug.themeKey)"),
  "the debug theme query should use the same fallback-aware resolver"
);

const eventSystem = context.window.GORO_DUNGEON_EVENTS.createSystem({
  rng: (min) => min,
  weightedPick: (entries) => entries[0].type,
  isSameRoom,
  roomsOverlap,
});
const rooms = [
  { id: 1, x: 1, y: 1, w: 5, h: 4 },
  { id: 2, x: 10, y: 1, w: 5, h: 4 },
  { id: 3, x: 20, y: 1, w: 5, h: 4 },
];
const eventTable = { chance: 100, entries: [{ type: "treasure", weight: 100 }] };
const defaultRequirementResult = eventSystem.selectRooms({
  rooms,
  startRoom: rooms[0],
  stairRoom: rooms[2],
  table: eventTable,
  nextId: 1,
});
assert.strictEqual(defaultRequirementResult.eventRooms.length, 0, "the default event requirement should remain 6x5");
const warrenRequirementResult = eventSystem.selectRooms({
  rooms,
  startRoom: rooms[0],
  stairRoom: rooms[2],
  table: eventTable,
  nextId: 1,
  roomRequirements: themeByKey("warren").eventRoom,
});
assert.strictEqual(warrenRequirementResult.eventRooms.length, 1, "warren should accept a 5x4 event room");

console.log("floor theme tests passed");
