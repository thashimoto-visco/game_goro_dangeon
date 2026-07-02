(function () {
  function createSystem(options) {
    const rng = options.rng;
    const weightedPick = options.weightedPick;
    const isSameRoom = options.isSameRoom;
    const roomsOverlap = options.roomsOverlap;

    function selectRooms({ rooms, startRoom, stairRoom, table, nextId }) {
      if (rng(1, 100) > table.chance) {
        return { eventRooms: [], nextId };
      }

      const candidates = rooms.filter((room) => {
        if (isSameRoom(room, startRoom) || isSameRoom(room, stairRoom)) return false;
        if (roomsOverlap(room, startRoom) || roomsOverlap(room, stairRoom)) return false;
        return room.w >= 6 && room.h >= 5;
      });
      if (candidates.length === 0) {
        return { eventRooms: [], nextId };
      }

      const room = candidates[rng(0, candidates.length - 1)];
      return {
        eventRooms: [
          {
            id: nextId,
            type: weightedPick(table.entries),
            room,
            discovered: false,
          },
        ],
        nextId: nextId + 1,
      };
    }

    function springObjectPositions(eventRoom) {
      return [
        { x: eventRoom.room.cx, y: eventRoom.room.cy },
        { x: eventRoom.room.cx - 1, y: eventRoom.room.cy },
        { x: eventRoom.room.cx + 1, y: eventRoom.room.cy },
        { x: eventRoom.room.cx, y: eventRoom.room.cy - 1 },
        { x: eventRoom.room.cx, y: eventRoom.room.cy + 1 },
      ];
    }

    function createSpringObject(eventRoom, isBlocked, nextId) {
      const position = springObjectPositions(eventRoom).find((entry) => !isBlocked(entry.x, entry.y));
      if (!position) return { object: null, nextId };

      return {
        object: {
          id: nextId,
          type: "spring",
          x: position.x,
          y: position.y,
          used: false,
        },
        nextId: nextId + 1,
      };
    }

    function placeObjects({ eventRooms, isBlocked, nextId }) {
      const eventObjects = [];
      let id = nextId;

      for (const eventRoom of eventRooms) {
        if (eventRoom.type !== "spring") continue;
        const result = createSpringObject(eventRoom, isBlocked, id);
        id = result.nextId;
        if (result.object) eventObjects.push(result.object);
      }

      return { eventObjects, nextId: id };
    }

    return {
      selectRooms,
      placeObjects,
    };
  }

  window.GORO_DUNGEON_EVENTS = {
    createSystem,
  };
})();
