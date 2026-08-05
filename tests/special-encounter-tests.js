const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const { clamp, createSeededRng, isSameRoom, roomsOverlap } = require("./test-helpers");

const root = path.resolve(__dirname, "..");

const context = { console, Math, Array, Object, Number, String, Boolean, Error, window: {} };
vm.createContext(context);
for (const file of ["dungeon-layout.js", "dungeon-encounter-tables.js", "dungeon-special-encounters.js"]) {
  vm.runInContext(fs.readFileSync(path.join(root, file), "utf8"), context, { filename: file });
}

const tables = context.window.GORO_DUNGEON_ENCOUNTER_DATA.specialEncounterTables;
const rooms = [
  { id: 1, x: 2, y: 2, w: 7, h: 6, cx: 5, cy: 4 },
  { id: 2, x: 12, y: 2, w: 7, h: 6, cx: 15, cy: 4 },
  { id: 3, x: 22, y: 2, w: 7, h: 6, cx: 25, cy: 4 },
  { id: 4, x: 32, y: 2, w: 7, h: 6, cx: 35, cy: 4 },
];

function createSpecialEncounterSystem(rng) {
  return context.window.GORO_DUNGEON_SPECIAL_ENCOUNTERS.createSystem({
    rng,
    weightedPickEntry(entries) {
      const candidates = (entries || []).filter((entry) => entry && entry.weight > 0);
      const pool = candidates.length > 0 ? candidates : (entries || []).filter(Boolean);
      if (pool.length === 0) return null;
      const total = candidates.reduce((sum, entry) => sum + entry.weight, 0);
      if (total <= 0) return pool[0];
      let roll = rng(1, total);
      for (const entry of candidates) {
        roll -= entry.weight;
        if (roll <= 0) return entry;
      }
      return candidates[0];
    },
    findTableForFloor(sourceTables, floor) {
      return sourceTables.find((table) => floor >= table.minFloor && floor <= table.maxFloor) || null;
    },
    isRoomEligible(room, { startRoom, stairRoom, table }) {
      if (isSameRoom(room, startRoom) || isSameRoom(room, stairRoom)) return false;
      if (roomsOverlap(room, startRoom) || roomsOverlap(room, stairRoom)) return false;
      return room.w >= (table.minRoomW || 1) && room.h >= (table.minRoomH || 1);
    },
  });
}

function makeSystem(seed) {
  return createSpecialEncounterSystem(createSeededRng(seed));
}

for (let floor = 1; floor <= 4; floor++) {
  const result = makeSystem(100 + floor).selectEncounter({
    tables,
    floor,
    rooms,
    startRoom: rooms[0],
    stairRoom: rooms[3],
    nextId: 1,
  });
  assert.strictEqual(result.encounter, null, `${floor}F should have no configured special encounter`);
}

const result5F = makeSystem(123).selectEncounter({
  tables,
  floor: 5,
  rooms,
  startRoom: rooms[0],
  stairRoom: rooms[3],
  nextId: 7,
});
assert(result5F.encounter, "5F validation table should select an encounter");
assert.strictEqual(result5F.encounter.monsterKey, "miniDevil");
assert.strictEqual(result5F.encounter.rank, "strong");
assert.strictEqual(result5F.eventRoom.encounterId, result5F.encounter.id);
assert(!isSameRoom(result5F.encounter.room, rooms[0]), "encounter must avoid the start room");
assert(!isSameRoom(result5F.encounter.room, rooms[3]), "encounter must avoid the stair room");

const movedTable = [
  {
    id: "moved-to-7f",
    minFloor: 7,
    maxFloor: 7,
    chance: 100,
    roomType: "stronghold",
    entries: [{ monster: "bat", rank: "strong", weight: 100 }],
  },
];
const result7F = makeSystem(123).selectEncounter({
  tables: movedTable,
  floor: 7,
  rooms,
  startRoom: rooms[0],
  stairRoom: rooms[3],
  nextId: 1,
});
assert.strictEqual(result7F.encounter.monsterKey, "bat", "monster and floor should be data-driven");
assert.strictEqual(result7F.encounter.rank, "strong");

const oversizedRoomTable = [
  {
    id: "needs-large-room",
    minFloor: 5,
    maxFloor: 5,
    chance: 100,
    minRoomW: 8,
    minRoomH: 6,
    entries: [{ monster: "miniDevil", rank: "strong", weight: 100 }],
  },
];
const noLargeRoom = makeSystem(123).selectEncounter({
  tables: oversizedRoomTable,
  floor: 5,
  rooms,
  startRoom: rooms[0],
  stairRoom: rooms[3],
  nextId: 1,
});
assert.strictEqual(noLargeRoom.encounter, null, "minimum room size should be controlled by encounter data");

const blockedCenter = makeSystem(123).findPlacement(result5F.encounter, (x, y) => {
  return x === result5F.encounter.room.cx && y === result5F.encounter.room.cy;
});
assert(blockedCenter, "placement should try another tile when the center is blocked");
assert.notStrictEqual(
  `${blockedCenter.x},${blockedCenter.y}`,
  `${result5F.encounter.room.cx},${result5F.encounter.room.cy}`
);

assert.strictEqual(
  makeSystem(123).containsPosition(result5F.encounter, result5F.encounter.room.x, result5F.encounter.room.y),
  true,
  "special encounter enemy should be allowed inside its assigned room"
);
assert.strictEqual(
  makeSystem(123).containsPosition(result5F.encounter, result5F.encounter.room.x - 1, result5F.encounter.room.y),
  false,
  "special encounter enemy should not leave its assigned room"
);

const noPosition = makeSystem(123).findPlacement(result5F.encounter, () => true);
assert.strictEqual(noPosition, null, "fully blocked rooms should fail safely");

let generatedEncounterCount = 0;
for (let seed = 1; seed <= 200; seed++) {
  const layoutRng = createSeededRng(seed);
  const layoutBuilder = context.window.GORO_DUNGEON_LAYOUT.createBuilder({
    cols: 40,
    rows: 30,
    rng: layoutRng,
    clamp,
  });
  const layout = layoutBuilder.buildFloorLayout();
  const system = createSpecialEncounterSystem(layoutRng);
  const generated = system.selectEncounter({
    tables,
    floor: 5,
    rooms: layout.rooms,
    startRoom: layout.rooms[0],
    stairRoom: layout.rooms[layout.rooms.length - 1],
    nextId: 1,
  });
  if (!generated.encounter) continue;
  generatedEncounterCount += 1;
  const position = system.findPlacement(generated.encounter, (x, y) => {
    if (layout.map[y]?.[x] !== ".") return true;
    if (x === layout.rooms[0].cx && y === layout.rooms[0].cy) return true;
    const stairs = layout.rooms[layout.rooms.length - 1];
    return x === stairs.cx && y === stairs.cy;
  });
  assert(position, `generated 5F layout ${seed} should place the encounter enemy`);
  assert(!isSameRoom(generated.encounter.room, layout.rooms[0]));
  assert(!isSameRoom(generated.encounter.room, layout.rooms[layout.rooms.length - 1]));
}
assert(
  generatedEncounterCount >= 150,
  `at least 75% of generated layouts should support the optional encounter; got ${generatedEncounterCount}/200`
);

console.log(`special encounter tests passed (${generatedEncounterCount}/200 generated layouts placed)`);
