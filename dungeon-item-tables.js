(function () {
  window.GORO_DUNGEON_ITEM_SPAWN_TABLES = [
    {
      minFloor: 1,
      maxFloor: 1,
      count: [3, 5],
      entries: [
        { type: "riceBall", weight: 30 },
        { type: "herb", weight: 34 },
        { type: "woodenSword", weight: 16 },
        { type: "woodenShield", weight: 16 },
        { type: "ironSword", weight: 4 },
      ],
    },
    {
      minFloor: 2,
      maxFloor: 3,
      count: [3, 5],
      entries: [
        { type: "riceBall", weight: 26 },
        { type: "herb", weight: 28 },
        { type: "woodenSword", weight: 14 },
        { type: "woodenShield", weight: 14 },
        { type: "ironSword", weight: 8 },
        { type: "ironShield", weight: 6 },
        { type: "enhanceScroll", weight: 2 },
        { type: "thunderScroll", weight: 2 },
      ],
    },
    {
      minFloor: 4,
      maxFloor: 99,
      count: [3, 6],
      entries: [
        { type: "riceBall", weight: 20 },
        { type: "herb", weight: 22 },
        { type: "woodenSword", weight: 8 },
        { type: "woodenShield", weight: 8 },
        { type: "ironSword", weight: 14 },
        { type: "ironShield", weight: 12 },
        { type: "bigRiceBall", weight: 6 },
        { type: "enhanceScroll", weight: 5 },
        { type: "thunderScroll", weight: 4 },
        { type: "demonSlayer", weight: 1 },
      ],
    },
  ];

  window.GORO_DUNGEON_TREASURE_REWARD_TABLES = [
    {
      minFloor: 1,
      maxFloor: 3,
      count: [2, 2],
      entries: [
        { type: "riceBall", weight: 22 },
        { type: "herb", weight: 26 },
        { type: "woodenSword", weight: 14 },
        { type: "woodenShield", weight: 14 },
        { type: "ironSword", weight: 10 },
        { type: "ironShield", weight: 8 },
        { type: "enhanceScroll", weight: 6 },
      ],
    },
    {
      minFloor: 4,
      maxFloor: 99,
      count: [2, 2],
      entries: [
        { type: "riceBall", weight: 16 },
        { type: "herb", weight: 20 },
        { type: "ironSword", weight: 16 },
        { type: "ironShield", weight: 14 },
        { type: "bigRiceBall", weight: 8 },
        { type: "enhanceScroll", weight: 12 },
        { type: "thunderScroll", weight: 8 },
        { type: "demonSlayer", weight: 6 },
      ],
    },
  ];
})();
