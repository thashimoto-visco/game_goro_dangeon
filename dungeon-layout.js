(function () {
  const WALL = "#";
  const FLOOR = ".";
  const CARDINAL_DIRECTIONS = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  function createBuilder(options) {
    const cols = options.cols;
    const rows = options.rows;
    const rng = options.rng;
    const clamp = options.clamp;

    function inBounds(x, y) {
      return x >= 0 && y >= 0 && x < cols && y < rows;
    }

    function key(x, y) {
      return `${x},${y}`;
    }

    function createEmptyMap() {
      return Array.from({ length: rows }, () => Array(cols).fill(WALL));
    }

    function createEmptyTileKinds() {
      return Array.from({ length: rows }, () => Array(cols).fill("wall"));
    }

    function carveRoom(map, tileKinds, room) {
      for (let yy = room.y; yy < room.y + room.h; yy++) {
        for (let xx = room.x; xx < room.x + room.w; xx++) {
          map[yy][xx] = FLOOR;
          tileKinds[yy][xx] = "room";
        }
      }
    }

    function roomsOverlapWithPadding(a, b, padding = 1) {
      if (!a || !b) return false;
      return (
        a.x - padding < b.x + b.w &&
        a.x + a.w + padding > b.x &&
        a.y - padding < b.y + b.h &&
        a.y + a.h + padding > b.y
      );
    }

    function createRoom(id) {
      const w = rng(5, 9);
      const h = rng(4, 7);
      const x = rng(2, cols - w - 3);
      const y = rng(2, rows - h - 3);
      return { id, x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2), doorways: [] };
    }

    function buildRooms() {
      const rooms = [];
      const targetCount = rng(6, 7);
      let attempts = 0;

      while (rooms.length < targetCount && attempts < 260) {
        attempts += 1;
        const room = createRoom(rooms.length + 1);
        if (rooms.some((entry) => roomsOverlapWithPadding(room, entry, 3))) continue;
        rooms.push(room);
      }

      if (rooms.length < 2) {
        return [
          { id: 1, x: 3, y: 4, w: 8, h: 6, cx: 7, cy: 7, doorways: [] },
          { id: 2, x: cols - 13, y: rows - 11, w: 8, h: 6, cx: cols - 9, cy: rows - 8, doorways: [] },
        ];
      }

      return rooms;
    }

    function doorwayForRoomToward(room, target) {
      const dx = target.cx - room.cx;
      const dy = target.cy - room.cy;

      if (Math.abs(dx) >= Math.abs(dy)) {
        const x = dx >= 0 ? room.x + room.w - 1 : room.x;
        const outsideX = dx >= 0 ? x + 1 : x - 1;
        const y = clamp(target.cy, room.y + 1, room.y + room.h - 2);
        return { x, y, outsideX, outsideY: y };
      }

      const y = dy >= 0 ? room.y + room.h - 1 : room.y;
      const outsideY = dy >= 0 ? y + 1 : y - 1;
      const x = clamp(target.cx, room.x + 1, room.x + room.w - 2);
      return { x, y, outsideX: x, outsideY };
    }

    function shuffledDirections() {
      const directions = CARDINAL_DIRECTIONS.map((direction) => ({ ...direction }));

      for (let i = directions.length - 1; i > 0; i--) {
        const j = rng(0, i);
        [directions[i], directions[j]] = [directions[j], directions[i]];
      }

      return directions;
    }

    function touchesRoomTile(x, y, tileKinds) {
      for (const direction of CARDINAL_DIRECTIONS) {
        const nx = x + direction.dx;
        const ny = y + direction.dy;
        if (inBounds(nx, ny) && tileKinds[ny][nx] === "room") return true;
      }

      return false;
    }

    function canUseCorridorTile(x, y, tileKinds, allowedRoomTouchKeys) {
      if (!inBounds(x, y)) return false;
      if (tileKinds[y][x] === "room") return false;
      if (!touchesRoomTile(x, y, tileKinds)) return true;
      return allowedRoomTouchKeys.has(key(x, y));
    }

    function corridorTilesBetween(from, to, tileKinds, allowedRoomTouchKeys) {
      const queue = [from];
      const visited = new Set([key(from.x, from.y)]);
      const cameFrom = new Map();

      while (queue.length) {
        const current = queue.shift();
        if (current.x === to.x && current.y === to.y) {
          const path = [current];
          let currentKey = key(current.x, current.y);

          while (cameFrom.has(currentKey)) {
            const previous = cameFrom.get(currentKey);
            path.push(previous);
            currentKey = key(previous.x, previous.y);
          }

          return path.reverse();
        }

        const previous = cameFrom.get(key(current.x, current.y));
        const directions = shuffledDirections();
        if (previous) {
          const straightDx = current.x - previous.x;
          const straightDy = current.y - previous.y;
          directions.sort(
            (a, b) =>
              Number(b.dx === straightDx && b.dy === straightDy) -
              Number(a.dx === straightDx && a.dy === straightDy)
          );
        }

        for (const direction of directions) {
          const next = { x: current.x + direction.dx, y: current.y + direction.dy };
          const nextKey = key(next.x, next.y);
          if (visited.has(nextKey)) continue;
          if (!canUseCorridorTile(next.x, next.y, tileKinds, allowedRoomTouchKeys)) continue;

          visited.add(nextKey);
          cameFrom.set(nextKey, current);
          queue.push(next);
        }
      }

      return [];
    }

    function carveCorridor(map, tileKinds, corridor) {
      for (const tile of corridor.tiles) {
        if (!inBounds(tile.x, tile.y)) continue;
        map[tile.y][tile.x] = FLOOR;
        if (tileKinds[tile.y][tile.x] === "wall") {
          tileKinds[tile.y][tile.x] = "corridor";
        }
      }
    }

    function connectRoomPair(map, tileKinds, corridors, doorways, fromRoom, toRoom) {
      const fromDoor = doorwayForRoomToward(fromRoom, toRoom);
      const toDoor = doorwayForRoomToward(toRoom, fromRoom);
      const corridorId = corridors.length + 1;
      const allowedRoomTouchKeys = new Set([
        key(fromDoor.outsideX, fromDoor.outsideY),
        key(toDoor.outsideX, toDoor.outsideY),
      ]);
      const corridor = {
        id: corridorId,
        fromRoomId: fromRoom.id,
        toRoomId: toRoom.id,
        tiles: corridorTilesBetween(
          { x: fromDoor.outsideX, y: fromDoor.outsideY },
          { x: toDoor.outsideX, y: toDoor.outsideY },
          tileKinds,
          allowedRoomTouchKeys
        ),
      };

      const fromDoorway = {
        id: doorways.length + 1,
        roomId: fromRoom.id,
        corridorId,
        x: fromDoor.x,
        y: fromDoor.y,
        outsideX: fromDoor.outsideX,
        outsideY: fromDoor.outsideY,
      };
      const toDoorway = {
        id: doorways.length + 2,
        roomId: toRoom.id,
        corridorId,
        x: toDoor.x,
        y: toDoor.y,
        outsideX: toDoor.outsideX,
        outsideY: toDoor.outsideY,
      };

      corridors.push(corridor);
      doorways.push(fromDoorway, toDoorway);
      fromRoom.doorways.push(fromDoorway.id);
      toRoom.doorways.push(toDoorway.id);

      carveCorridor(map, tileKinds, corridor);
      tileKinds[fromDoor.y][fromDoor.x] = "doorway";
      tileKinds[toDoor.y][toDoor.x] = "doorway";
    }

    function addOptionalConnections(map, tileKinds, rooms, corridors, doorways) {
      if (rooms.length < 4 || rng(1, 100) > 65) return;

      const pairs = [];
      for (let fromIndex = 0; fromIndex < rooms.length; fromIndex++) {
        for (let toIndex = fromIndex + 2; toIndex < rooms.length; toIndex++) {
          pairs.push([rooms[fromIndex], rooms[toIndex]]);
        }
      }
      if (pairs.length === 0) return;

      const [fromRoom, toRoom] = pairs[rng(0, pairs.length - 1)];
      connectRoomPair(map, tileKinds, corridors, doorways, fromRoom, toRoom);
    }

    function roomDistances(startRoom, rooms, corridors) {
      const adjacency = new Map(rooms.map((room) => [room.id, []]));
      for (const corridor of corridors) {
        adjacency.get(corridor.fromRoomId)?.push(corridor.toRoomId);
        adjacency.get(corridor.toRoomId)?.push(corridor.fromRoomId);
      }

      const distances = new Map([[startRoom.id, 0]]);
      const queue = [startRoom.id];
      while (queue.length) {
        const roomId = queue.shift();
        for (const nextId of adjacency.get(roomId) || []) {
          if (distances.has(nextId)) continue;
          distances.set(nextId, distances.get(roomId) + 1);
          queue.push(nextId);
        }
      }
      return distances;
    }

    function chooseStartAndStairRooms(rooms, corridors) {
      if (rooms.length <= 2) return rooms;

      const startRoom = rooms[rng(0, rooms.length - 1)];
      const distances = roomDistances(startRoom, rooms, corridors);
      const maxDistance = Math.max(...distances.values());
      const minimumDistance = Math.max(2, Math.ceil(maxDistance * 0.6));
      const stairCandidates = rooms.filter((room) => (distances.get(room.id) || 0) >= minimumDistance);
      const stairPool = stairCandidates.length > 0 ? stairCandidates : rooms.filter((room) => room !== startRoom);
      const stairRoom = stairPool[rng(0, stairPool.length - 1)];
      const middleRooms = rooms.filter((room) => room !== startRoom && room !== stairRoom);
      return [startRoom, ...middleRooms, stairRoom];
    }

    function connectRooms(map, tileKinds, rooms) {
      const corridors = [];
      const doorways = [];
      rooms.sort((a, b) => a.cx - b.cx || a.cy - b.cy);

      for (let index = 1; index < rooms.length; index++) {
        const fromRoom = rooms[index - 1];
        const toRoom = rooms[index];
        connectRoomPair(map, tileKinds, corridors, doorways, fromRoom, toRoom);
      }

      addOptionalConnections(map, tileKinds, rooms, corridors, doorways);

      return { corridors, doorways };
    }

    function reachableWalkableCount(map, start) {
      if (!start || !inBounds(start.x, start.y) || map[start.y][start.x] !== FLOOR) return 0;

      const visited = new Set([key(start.x, start.y)]);
      const queue = [start];

      while (queue.length) {
        const current = queue.shift();
        for (const direction of CARDINAL_DIRECTIONS) {
          const x = current.x + direction.dx;
          const y = current.y + direction.dy;
          const entryKey = key(x, y);
          if (!inBounds(x, y) || visited.has(entryKey) || map[y][x] !== FLOOR) continue;
          visited.add(entryKey);
          queue.push({ x, y });
        }
      }

      return visited.size;
    }

    function floorLayoutIsValid(layout) {
      if (!layout || layout.rooms.length < 2) return false;
      if (layout.rooms.some((room) => room.doorways.length === 0)) return false;
      if (layout.corridors.some((corridor) => corridor.tiles.length === 0)) return false;

      const walkableCount = layout.map.flat().filter((tile) => tile === FLOOR).length;
      const startRoom = layout.rooms[0];
      const reachableCount = reachableWalkableCount(layout.map, { x: startRoom.cx, y: startRoom.cy });
      return walkableCount === reachableCount;
    }

    function buildCandidateLayout() {
      const map = createEmptyMap();
      const tileKinds = createEmptyTileKinds();
      const rooms = buildRooms();

      for (const room of rooms) {
        carveRoom(map, tileKinds, room);
      }

      const { corridors, doorways } = connectRooms(map, tileKinds, rooms);
      const orderedRooms = chooseStartAndStairRooms(rooms, corridors);
      return { map, tileKinds, rooms: orderedRooms, corridors, doorways };
    }

    function buildFallbackLayout() {
      const map = createEmptyMap();
      const tileKinds = createEmptyTileKinds();
      const rooms = [
        { id: 1, x: 3, y: 4, w: 8, h: 6, cx: 7, cy: 7, doorways: [] },
        { id: 2, x: cols - 13, y: rows - 11, w: 8, h: 6, cx: cols - 9, cy: rows - 8, doorways: [] },
      ];

      for (const room of rooms) {
        carveRoom(map, tileKinds, room);
      }

      const { corridors, doorways } = connectRooms(map, tileKinds, rooms);
      const layout = { map, tileKinds, rooms, corridors, doorways };
      if (!floorLayoutIsValid(layout)) {
        throw new Error("fallback dungeon layout is invalid");
      }
      return layout;
    }

    function buildFloorLayout(maxAttempts = 12) {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const candidate = buildCandidateLayout();
        if (floorLayoutIsValid(candidate)) return candidate;
      }
      return buildFallbackLayout();
    }

    return {
      buildFloorLayout,
      floorLayoutIsValid,
    };
  }

  window.GORO_DUNGEON_LAYOUT = {
    createBuilder,
  };
})();
