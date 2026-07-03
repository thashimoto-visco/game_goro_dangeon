(function () {
  const CARDINAL_DIRECTIONS = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];

  function createComputer(options) {
    const cols = options.cols;
    const rows = options.rows;
    const viewDistance = options.viewDistance || 4;

    function inBounds(x, y) {
      return x >= 0 && y >= 0 && x < cols && y < rows;
    }

    function tileKey(x, y) {
      return `${x},${y}`;
    }

    function roomContains(room, x, y) {
      return x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h;
    }

    function roomAt(layout, x, y) {
      return layout.rooms.find((room) => roomContains(room, x, y)) || null;
    }

    function tileKindAt(layout, x, y) {
      if (!inBounds(x, y) || !layout.tileKinds[y]) return "wall";
      return layout.tileKinds[y][x] || "wall";
    }

    function corridorAt(layout, x, y) {
      return (
        layout.corridors.find((corridor) =>
          corridor.tiles.some((tile) => tile.x === x && tile.y === y)
        ) || null
      );
    }

    function doorwayById(layout, id) {
      return layout.doorways.find((doorway) => doorway.id === id) || null;
    }

    function addVisibleTile(visibleTiles, x, y) {
      if (inBounds(x, y)) {
        visibleTiles.add(tileKey(x, y));
      }
    }

    function addVisibleTileWithWalls(layout, visibleTiles, x, y) {
      addVisibleTile(visibleTiles, x, y);
      for (const direction of CARDINAL_DIRECTIONS) {
        const nx = x + direction.dx;
        const ny = y + direction.dy;
        if (inBounds(nx, ny) && layout.map[ny][nx] === "#") {
          addVisibleTile(visibleTiles, nx, ny);
        }
      }
    }

    function addRoomVisibility(layout, visibleTiles, room) {
      for (let y = room.y; y < room.y + room.h; y++) {
        for (let x = room.x; x < room.x + room.w; x++) {
          addVisibleTileWithWalls(layout, visibleTiles, x, y);
        }
      }

      for (const doorwayId of room.doorways) {
        const doorway = doorwayById(layout, doorwayId);
        if (!doorway) continue;
        addVisibleTileWithWalls(layout, visibleTiles, doorway.x, doorway.y);
        addVisibleTileWithWalls(layout, visibleTiles, doorway.outsideX, doorway.outsideY);
      }
    }

    function corridorTileIndex(corridor, x, y) {
      return corridor.tiles.findIndex((tile) => tile.x === x && tile.y === y);
    }

    function addCorridorVisibility(layout, visibleTiles, corridor, x, y) {
      const index = corridorTileIndex(corridor, x, y);
      if (index < 0) return;

      const start = Math.max(0, index - viewDistance);
      const end = Math.min(corridor.tiles.length - 1, index + viewDistance);
      const corridorDoorwayTileKeys = new Set(
        layout.doorways
          .filter((entry) => entry.corridorId === corridor.id)
          .map((entry) => tileKey(entry.x, entry.y))
      );

      for (let i = start; i <= end; i++) {
        const tile = corridor.tiles[i];
        const isForeignDoorway =
          tileKindAt(layout, tile.x, tile.y) === "doorway" &&
          !corridorDoorwayTileKeys.has(tileKey(tile.x, tile.y));
        if (isForeignDoorway) continue;
        addVisibleTileWithWalls(layout, visibleTiles, tile.x, tile.y);
      }

      for (const doorway of layout.doorways.filter((entry) => entry.corridorId === corridor.id)) {
        if (Math.abs(doorway.outsideX - x) + Math.abs(doorway.outsideY - y) <= 1) {
          addVisibleTileWithWalls(layout, visibleTiles, doorway.outsideX, doorway.outsideY);
        }
      }
    }

    function compute(layout, player) {
      const visibleTiles = new Set();
      const playerRoom = roomAt(layout, player.x, player.y);
      const playerCorridor = corridorAt(layout, player.x, player.y);

      if (playerRoom) {
        addRoomVisibility(layout, visibleTiles, playerRoom);
      } else if (playerCorridor) {
        addCorridorVisibility(layout, visibleTiles, playerCorridor, player.x, player.y);
      } else {
        addVisibleTileWithWalls(layout, visibleTiles, player.x, player.y);
      }

      return visibleTiles;
    }

    return { compute };
  }

  window.GORO_DUNGEON_VISIBILITY = {
    createComputer,
  };
})();
