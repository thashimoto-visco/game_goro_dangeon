(function () {
  window.GORO_DUNGEON_ENEMY_SPAWN_TABLES = [
    { minFloor: 1, maxFloor: 1, count: [3, 4], entries: [{ type: "slime", weight: 100 }] },
    { minFloor: 2, maxFloor: 2, count: [4, 5], entries: [{ type: "slime", weight: 75 }, { type: "bat", weight: 25 }] },
    {
      minFloor: 3,
      maxFloor: 3,
      count: [4, 5],
      entries: [
        { type: "slime", weight: 40 },
        { type: "bat", weight: 30 },
        { type: "golem", weight: 10 },
        { type: "poisonLizard", weight: 20 },
      ],
    },
    {
      minFloor: 4,
      maxFloor: 4,
      count: [5, 6],
      entries: [
        { type: "slime", weight: 25 },
        { type: "bat", weight: 30 },
        { type: "golem", weight: 15 },
        { type: "poisonLizard", weight: 20 },
        { type: "puffMushroom", weight: 10 },
      ],
    },
    {
      minFloor: 5,
      maxFloor: 99,
      count: [5, 7],
      entries: [
        { type: "slime", weight: 15 },
        { type: "bat", weight: 25 },
        { type: "golem", weight: 25 },
        { type: "poisonLizard", weight: 20 },
        { type: "puffMushroom", weight: 15 },
      ],
    },
  ];
})();
