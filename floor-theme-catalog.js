(function () {
  window.GORO_DUNGEON_FLOOR_THEME_CATALOG = [
    {
      key: "standard",
      name: "石造りの回廊",
      arrivalText: "さらに深く潜っていく……",
      generation: {
        rooms: { count: [6, 7], width: [5, 9], height: [4, 7], padding: 3 },
        extraConnectionChance: 65,
        stairDistanceRatio: 0.6,
      },
      eventRoom: { minRoomW: 6, minRoomH: 5 },
      enemyCountScale: 1,
      itemCountScale: 1,
      darkness: null,
    },
    {
      key: "greatHall",
      name: "大広間",
      arrivalText: "天井の高い、広い空間に出た。",
      generation: {
        rooms: { count: [3, 4], width: [5, 8], height: [4, 6], padding: 3 },
        featureRooms: { count: 1, width: [15, 19], height: [9, 12] },
        extraConnectionChance: 45,
        stairDistanceRatio: 0.5,
      },
      eventRoom: { minRoomW: 6, minRoomH: 5 },
      enemyCountScale: 1.15,
      itemCountScale: 1.2,
      darkness: { r: 18, g: 10, b: 3 },
    },
    {
      key: "warren",
      name: "小部屋群",
      arrivalText: "細い通路の先に、小部屋が連なっている。",
      generation: {
        rooms: { count: [9, 11], width: [4, 6], height: [3, 5], padding: 3 },
        extraConnectionChance: 85,
        stairDistanceRatio: 0.7,
      },
      eventRoom: { minRoomW: 5, minRoomH: 4 },
      enemyCountScale: 1,
      itemCountScale: 1,
      darkness: { r: 3, g: 14, b: 16 },
    },
  ];
})();

