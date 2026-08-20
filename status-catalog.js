(function () {
  window.GORO_DUNGEON_STATUS_CATALOG = [
    {
      key: "poison",
      name: "毒",
      mark: "毒",
      color: "#a3e635",
      duration: 8,
      tickDamage: 1,
      blocksAction: false,
      blocksNaturalRecovery: true,
      clearedByDamage: false,
      resistTags: ["stone"],
      messages: {
        apply: "{name}は毒を受けた！",
        expire: "{name}の毒が消えた。",
      },
    },
    {
      key: "sleep",
      name: "眠り",
      mark: "Zzz",
      color: "#c4b5fd",
      duration: 5,
      tickDamage: 0,
      blocksAction: true,
      blocksNaturalRecovery: false,
      clearedByDamage: true,
      resistTags: [],
      messages: {
        apply: "{name}は眠ってしまった。",
        expire: "{name}が目を覚ました。",
        cleared: "{name}は衝撃で目を覚ました！",
      },
    },
  ];
})();
