(function () {
  window.GORO_DUNGEON_FLOOR_THEME_TABLES = [
    {
      minFloor: 1,
      maxFloor: 2,
      entries: [{ theme: "standard", weight: 100 }],
    },
    {
      minFloor: 3,
      maxFloor: 5,
      entries: [
        { theme: "standard", weight: 70 },
        { theme: "warren", weight: 30 },
      ],
    },
    {
      minFloor: 6,
      maxFloor: 99,
      entries: [
        { theme: "standard", weight: 55 },
        { theme: "greatHall", weight: 25 },
        { theme: "warren", weight: 20 },
      ],
    },
  ];
})();

