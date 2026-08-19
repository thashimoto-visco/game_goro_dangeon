(function () {
  window.GORO_DUNGEON_ENCOUNTER_DATA = {
    rankProfiles: {
      normal: {
        statMultiplier: { hp: 1, atk: 1, exp: 1 },
        guaranteedReward: null,
        countsAsStrongDefeat: false,
        messages: {
          encounter: "{name}が現れた！",
        },
      },
      strong: {
        statMultiplier: { hp: 1.45, atk: 1.15, exp: 1.8 },
        guaranteedReward: "strongDefault",
        countsAsStrongDefeat: true,
        messages: {
          floorPresence: "この階には、ただならぬ気配が満ちている……。",
          roomPresence: "危険な気配がすぐ近くにある。",
          strongEncounter: "強敵の{name}が現れた！",
        },
      },
    },
    specialEncounterTables: [
      {
        id: "topic4-validation-5f",
        minFloor: 5,
        maxFloor: 5,
        chance: 100,
        roomType: "stronghold",
        minRoomW: 5,
        minRoomH: 4,
        entries: [{ monster: "miniDevil", rank: "strong", weight: 100 }],
      },
    ],
    rewardProfiles: {
      strongDefault: {
        count: 1,
        entries: [
          { type: "herb", weight: 30 },
          { type: "ironSword", weight: 20 },
          { type: "ironShield", weight: 20 },
          { type: "enhanceScroll", weight: 12 },
          { type: "riceBall", weight: 12 },
          { type: "demonSlayer", weight: 6 },
        ],
      },
    },
  };
})();
