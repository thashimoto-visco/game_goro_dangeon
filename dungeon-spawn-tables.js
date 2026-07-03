(function () {
  window.GORO_DUNGEON_ENEMY_SPAWN_TABLES = [
    { minFloor: 1, maxFloor: 1, count: [3, 4], entries: [{ type: "slime", weight: 100 }] },
    { minFloor: 2, maxFloor: 2, count: [4, 5], entries: [{ type: "slime", weight: 75 }, { type: "bat", weight: 25 }] },
    {
      minFloor: 3,
      maxFloor: 3,
      count: [4, 5],
      entries: [
        { type: "slime", weight: 50 },
        { type: "bat", weight: 40 },
        { type: "golem", weight: 10 },
      ],
    },
    {
      minFloor: 4,
      maxFloor: 4,
      count: [5, 6],
      entries: [
        { type: "slime", weight: 35 },
        { type: "bat", weight: 45 },
        { type: "golem", weight: 20 },
      ],
    },
    {
      minFloor: 5,
      maxFloor: 99,
      count: [5, 7],
      entries: [
        { type: "slime", weight: 20 },
        { type: "bat", weight: 45 },
        { type: "golem", weight: 35 },
      ],
    },
  ];
})();
