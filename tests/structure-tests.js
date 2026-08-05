const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { clamp, createSeededRng } = require("./test-helpers");

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

function roomGraphDistance(layout, startRoomId, stairRoomId) {
  const adjacency = new Map(layout.rooms.map((room) => [room.id, []]));
  for (const corridor of layout.corridors) {
    adjacency.get(corridor.fromRoomId).push(corridor.toRoomId);
    adjacency.get(corridor.toRoomId).push(corridor.fromRoomId);
  }
  const distances = new Map([[startRoomId, 0]]);
  const queue = [startRoomId];
  while (queue.length) {
    const roomId = queue.shift();
    if (roomId === stairRoomId) return distances.get(roomId);
    for (const nextId of adjacency.get(roomId)) {
      if (distances.has(nextId)) continue;
      distances.set(nextId, distances.get(roomId) + 1);
      queue.push(nextId);
    }
  }
  return Infinity;
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

let layoutsWithExtraConnection = 0;
let layoutsWhoseShortestRouteSkipsRooms = 0;
let layoutsWithNonExtremeEndpoints = 0;
for (let i = 0; i < 50; i++) {
  const layout = layoutBuilder.buildFloorLayout();
  assert(layoutBuilder.floorLayoutIsValid(layout), `layout ${i} should be valid`);
  assert(layout.rooms.length >= 2, `layout ${i} should have multiple rooms`);
  assert(layout.rooms.every((room) => room.doorways.length > 0), `layout ${i} should give every room a doorway`);
  assert(layout.corridors.every((corridor) => corridor.tiles.length > 0), `layout ${i} should not have empty corridors`);

  if (layout.corridors.length >= layout.rooms.length) layoutsWithExtraConnection += 1;
  const stairRoom = layout.rooms[layout.rooms.length - 1];
  const shortestRoute = roomGraphDistance(layout, layout.rooms[0].id, stairRoom.id);
  if (shortestRoute < layout.rooms.length - 1) layoutsWhoseShortestRouteSkipsRooms += 1;
  const minCenterX = Math.min(...layout.rooms.map((room) => room.cx));
  const maxCenterX = Math.max(...layout.rooms.map((room) => room.cx));
  if (layout.rooms[0].cx !== minCenterX || stairRoom.cx !== maxCenterX) layoutsWithNonExtremeEndpoints += 1;

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

assert(layoutsWithExtraConnection > 0, "generated layouts should sometimes contain a loop connection");
assert(
  layoutsWhoseShortestRouteSkipsRooms > 0,
  "the start-to-stair route should not be forced through every room on every generated layout"
);
assert(layoutsWithNonExtremeEndpoints > 0, "start and stairs should not always be fixed to the horizontal extremes");

const fallbackLayout = layoutBuilder.buildFloorLayout(0);
assert(layoutBuilder.floorLayoutIsValid(fallbackLayout), "fallback layout should be valid");
assert.strictEqual(fallbackLayout.rooms.length, 2, "fallback layout should contain two rooms");
assert.strictEqual(fallbackLayout.corridors.length, 1, "fallback layout should contain one corridor");

console.log("structure tests passed");
