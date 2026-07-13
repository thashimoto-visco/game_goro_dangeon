(function () {
  function messageKeys(kind, rank) {
    if (kind === "encounter" && rank === "strong") return [["strongEncounter"], ["encounter"]];
    return [[kind]];
  }

  function formatMessage(message, name) {
    if (typeof message !== "string" || message.trim() === "") return "";
    return message.replaceAll("{name}", name || "魔物");
  }

  function resolveMessage({ encounter, monster, rankProfile, kind, name }) {
    const sources = [encounter?.messages, monster?.messages, rankProfile?.messages];
    const keyGroups = messageKeys(kind, encounter?.rank || "normal");

    for (const keys of keyGroups) {
      for (const source of sources) {
        if (!source) continue;
        for (const key of keys) {
          const resolved = formatMessage(source[key], name || monster?.name);
          if (resolved) return resolved;
        }
      }
    }

    if (kind === "encounter") {
      return `${name || monster?.name || "魔物"}が現れた！`;
    }
    return "";
  }

  function createSystem(options) {
    const rng = options.rng;
    const weightedPickEntry = options.weightedPickEntry;
    const findTableForFloor = options.findTableForFloor;
    const isRoomEligible = options.isRoomEligible;

    function selectEncounter({ tables, floor, rooms, startRoom, stairRoom, nextId }) {
      const table = findTableForFloor(tables, floor);
      if (!table || rng(1, 100) > table.chance) {
        return { encounter: null, eventRoom: null, nextId };
      }

      const candidates = rooms.filter((room) => isRoomEligible(room, { startRoom, stairRoom, table }));
      const entry = weightedPickEntry(table.entries);
      if (!entry || candidates.length === 0) {
        return { encounter: null, eventRoom: null, nextId };
      }

      const room = candidates[rng(0, candidates.length - 1)];
      const encounterId = `special-${nextId}`;
      const encounter = {
        id: encounterId,
        definitionId: table.id,
        monsterKey: entry.monster,
        rank: entry.rank || "normal",
        room,
        roomType: entry.roomType || table.roomType || "stronghold",
        rewardProfile: entry.rewardProfile || table.rewardProfile || null,
        messages: { ...(table.messages || {}), ...(entry.messages || {}) },
      };

      return {
        encounter,
        eventRoom: {
          id: nextId,
          type: encounter.roomType,
          room,
          discovered: false,
          encounterId,
        },
        nextId: nextId + 1,
      };
    }

    function placementPositions(room) {
      const positions = [
        { x: room.cx, y: room.cy },
        { x: room.cx - 1, y: room.cy },
        { x: room.cx + 1, y: room.cy },
        { x: room.cx, y: room.cy - 1 },
        { x: room.cx, y: room.cy + 1 },
      ];
      for (let y = room.y; y < room.y + room.h; y++) {
        for (let x = room.x; x < room.x + room.w; x++) {
          if (!positions.some((position) => position.x === x && position.y === y)) {
            positions.push({ x, y });
          }
        }
      }
      return positions;
    }

    function findPlacement(encounter, isBlocked) {
      if (!encounter?.room) return null;
      return placementPositions(encounter.room).find((position) => !isBlocked(position.x, position.y)) || null;
    }

    return {
      selectEncounter,
      findPlacement,
      resolveMessage,
    };
  }

  window.GORO_DUNGEON_SPECIAL_ENCOUNTERS = {
    createSystem,
    resolveMessage,
  };
})();
