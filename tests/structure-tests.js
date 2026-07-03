const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const root = path.resolve(__dirname, "..");

function loadDungeonModules() {
  const context = {
    console,
    Math,
    Set,
    Map,
    Array,
    Object,
    Number,
    String,
    Boolean,
    Error,
    window: {},
  };
  vm.createContext(context);

  for (const file of ["dungeon-layout.js", "dungeon-visibility.js"]) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  }

  return context.window;
}

function createSeededRng(seed) {
  let state = seed >>> 0;
  return function rng(min, max) {
    state = (state * 1664525 + 1013904223) >>> 0;
    return min + (state % (max - min + 1));
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function tileKey(x, y) {
  return `${x},${y}`;
}

function roomContains(room, x, y) {
  return x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h;
}

function visibleRoomInteriorTiles(visibleTiles, room, tileKinds) {
  const result = [];
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (tileKinds[y][x] === "doorway") continue;
      if (visibleTiles.has(tileKey(x, y))) result.push({ x, y });
    }
  }
  return result;
}

const modules = loadDungeonModules();
const layoutBuilder = modules.GORO_DUNGEON_LAYOUT.createBuilder({
  cols: 40,
  rows: 30,
  rng: createSeededRng(12345),
  clamp,
});
const visibility = modules.GORO_DUNGEON_VISIBILITY.createComputer({
  cols: 40,
  rows: 30,
});

for (let i = 0; i < 50; i++) {
  const layout = layoutBuilder.buildFloorLayout();
  assert(layoutBuilder.floorLayoutIsValid(layout), `layout ${i} should be valid`);
  assert(layout.rooms.length >= 2, `layout ${i} should have multiple rooms`);
  assert(layout.rooms.every((room) => room.doorways.length > 0), `layout ${i} should give every room a doorway`);
  assert(layout.corridors.every((corridor) => corridor.tiles.length > 0), `layout ${i} should not have empty corridors`);

  const startRoom = layout.rooms[0];
  const roomVisible = visibility.compute(layout, { x: startRoom.cx, y: startRoom.cy });
  for (const otherRoom of layout.rooms.slice(1)) {
    const visibleInterior = visibleRoomInteriorTiles(roomVisible, otherRoom, layout.tileKinds);
    assert.strictEqual(
      visibleInterior.length,
      0,
      `layout ${i} should not reveal room ${otherRoom.id} from room ${startRoom.id}`
    );
  }

  const corridor = layout.corridors.find((entry) => entry.tiles.length >= 3) || layout.corridors[0];
  const corridorTile = corridor.tiles[Math.floor(corridor.tiles.length / 2)];
  const corridorVisible = visibility.compute(layout, corridorTile);
  for (const room of layout.rooms) {
    const visibleInterior = visibleRoomInteriorTiles(corridorVisible, room, layout.tileKinds);
    assert.strictEqual(
      visibleInterior.length,
      0,
      `layout ${i} should not reveal room ${room.id} interior from corridor ${corridor.id}`
    );
  }
}

const fallbackLayout = layoutBuilder.buildFloorLayout(0);
assert(layoutBuilder.floorLayoutIsValid(fallbackLayout), "fallback layout should be valid");
assert.strictEqual(fallbackLayout.rooms.length, 2, "fallback layout should contain two rooms");
assert.strictEqual(fallbackLayout.corridors.length, 1, "fallback layout should contain one corridor");

console.log("structure tests passed");
