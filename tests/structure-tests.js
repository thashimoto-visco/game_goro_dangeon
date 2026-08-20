const assert = require("assert");
const crypto = require("crypto");
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

  for (const file of ["floor-theme-catalog.js", "dungeon-layout.js", "dungeon-visibility.js"]) {
    vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
  }

  return context.window;
}

function tileKey(x, y) {
  return `${x},${y}`;
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
const visibility = modules.GORO_DUNGEON_VISIBILITY.createComputer({ cols: 40, rows: 30 });
const themes = modules.GORO_DUNGEON_FLOOR_THEME_CATALOG;

const compatibilityBuilder = modules.GORO_DUNGEON_LAYOUT.createBuilder({
  cols: 40,
  rows: 30,
  rng: createSeededRng(12345),
  clamp,
});
const compatibilityLayouts = Array.from({ length: 20 }, () => compatibilityBuilder.buildFloorLayout());
const compatibilityHash = crypto.createHash("sha256").update(JSON.stringify(compatibilityLayouts)).digest("hex");
assert.strictEqual(
  compatibilityHash,
  "3a14e250d57686803d20123b20e4686957789a8066cff59ccb89afd71e190567",
  "theme-free generation should remain byte-for-byte compatible with the pre-Topic 7 layout sequence"
);

for (const theme of themes) {
  let fallbackCount = 0;
  let strongRoomCandidateCount = 0;
  let eventRoomCandidateCount = 0;
  let layoutsWithExtraConnection = 0;
  let layoutsWhoseShortestRouteSkipsRooms = 0;
  let layoutsWithNonExtremeEndpoints = 0;

  for (let seed = 1; seed <= 200; seed++) {
    const layoutBuilder = modules.GORO_DUNGEON_LAYOUT.createBuilder({
      cols: 40,
      rows: 30,
      rng: createSeededRng(seed),
      clamp,
    });
    const layout = layoutBuilder.buildFloorLayout({ generation: theme.generation });
    assert(layoutBuilder.floorLayoutIsValid(layout), `${theme.key} seed ${seed} should be valid`);
    assert(layout.rooms.length >= 2, `${theme.key} seed ${seed} should have multiple rooms`);
    assert(layout.rooms.every((room) => room.doorways.length > 0), `${theme.key} seed ${seed} should give every room a doorway`);
    assert(
      layout.corridors.every((corridor) => corridor.tiles.length > 0),
      `${theme.key} seed ${seed} should not have empty corridors`
    );

    if (layout.rooms.length === 2 && layout.corridors.length === 1) fallbackCount += 1;
    const eligibleRooms = layout.rooms.slice(1, -1);
    if (eligibleRooms.some((room) => room.w >= 5 && room.h >= 4)) strongRoomCandidateCount += 1;
    if (
      eligibleRooms.some(
        (room) => room.w >= theme.eventRoom.minRoomW && room.h >= theme.eventRoom.minRoomH
      )
    ) {
      eventRoomCandidateCount += 1;
    }

    if (theme.key === "greatHall") {
      assert(layout.rooms.some((room) => room.feature), `greatHall seed ${seed} should contain a feature room`);
      assert(!layout.rooms[0].feature, `greatHall seed ${seed} should not use the feature room as its start room`);
      assert(
        layout.rooms.slice(1).some((room) => room.feature),
        `greatHall seed ${seed} should keep the feature room in the enemy and item placement pool`
      );
    }

    if (theme.key === "standard") {
      if (layout.corridors.length >= layout.rooms.length) layoutsWithExtraConnection += 1;
      const stairRoom = layout.rooms[layout.rooms.length - 1];
      const shortestRoute = roomGraphDistance(layout, layout.rooms[0].id, stairRoom.id);
      if (shortestRoute < layout.rooms.length - 1) layoutsWhoseShortestRouteSkipsRooms += 1;
      const minCenterX = Math.min(...layout.rooms.map((room) => room.cx));
      const maxCenterX = Math.max(...layout.rooms.map((room) => room.cx));
      if (layout.rooms[0].cx !== minCenterX || stairRoom.cx !== maxCenterX) layoutsWithNonExtremeEndpoints += 1;
    }

    const startRoom = layout.rooms[0];
    const roomVisible = visibility.compute(layout, { x: startRoom.cx, y: startRoom.cy });
    for (const otherRoom of layout.rooms.slice(1)) {
      assert.strictEqual(
        visibleRoomInteriorTiles(roomVisible, otherRoom, layout.tileKinds).length,
        0,
        `${theme.key} seed ${seed} should not reveal room ${otherRoom.id} from the start room`
      );
    }

    const corridor = layout.corridors.find((entry) => entry.tiles.length >= 3) || layout.corridors[0];
    const corridorTile = corridor.tiles[Math.floor(corridor.tiles.length / 2)];
    const corridorVisible = visibility.compute(layout, corridorTile);
    for (const room of layout.rooms) {
      assert.strictEqual(
        visibleRoomInteriorTiles(corridorVisible, room, layout.tileKinds).length,
        0,
        `${theme.key} seed ${seed} should not reveal room ${room.id} from corridor ${corridor.id}`
      );
    }
  }

  assert.strictEqual(fallbackCount, 0, `${theme.key} should have no fallback layouts in 200 seeds`);
  assert(
    strongRoomCandidateCount >= 150,
    `${theme.key} should support strong encounters in at least 150/200 layouts; got ${strongRoomCandidateCount}`
  );
  assert(
    eventRoomCandidateCount >= 100,
    `${theme.key} should support event rooms in at least 100/200 layouts; got ${eventRoomCandidateCount}`
  );

  if (theme.key === "standard") {
    assert(layoutsWithExtraConnection > 0, "standard layouts should sometimes contain a loop connection");
    assert(
      layoutsWhoseShortestRouteSkipsRooms > 0,
      "the standard start-to-stair route should not be forced through every room"
    );
    assert(layoutsWithNonExtremeEndpoints > 0, "standard endpoints should not always be horizontal extremes");
  }

  console.log(
    `${theme.key}: fallback ${fallbackCount}/200, strong ${strongRoomCandidateCount}/200, event ${eventRoomCandidateCount}/200`
  );
}

const fallbackBuilder = modules.GORO_DUNGEON_LAYOUT.createBuilder({
  cols: 40,
  rows: 30,
  rng: createSeededRng(12345),
  clamp,
});
const fallbackLayout = fallbackBuilder.buildFloorLayout(0);
assert(fallbackBuilder.floorLayoutIsValid(fallbackLayout), "fallback layout should be valid");
assert.strictEqual(fallbackLayout.rooms.length, 2, "fallback layout should contain two rooms");
assert.strictEqual(fallbackLayout.corridors.length, 1, "fallback layout should contain one corridor");

console.log("structure tests passed");
