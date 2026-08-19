(function () {
  const DEFAULT_DRAW = { offsetX: -24, offsetY: -58, w: 48, h: 58 };
  const DEFAULT_MOTION = {
    cycle: 760,
    bob: 1,
    floatOffset: 0,
    scaleX: 1.02,
    scaleY: 0.98,
    flapScaleX: 0,
    flapScaleY: 0,
    anchor: 0.92,
    shadowX: 16,
    shadowY: 5,
    shadowOffsetY: 0,
    shadowBase: 1,
    shadowPulse: -0.08,
    wobble: 0.035,
    hitScaleX: 1.08,
    hitScaleY: 0.92,
    hitRotation: 0.09,
    hitKnockback: 5,
    attackScaleX: 1.04,
    attackScaleY: 1.02,
    attackRotation: 0.07,
    attackShadowPulse: 0.06,
  };
  const DEFAULT_SHAPE = {
    kind: "block",
    fill: "#f59e0b",
    shade: "rgba(180,83,9,0.65)",
    eye: "#111827",
  };
  const DEFAULT_BURST = {
    kind: "chunks",
    hitColor: "#b45309",
    attackColor: "#fbbf24",
    count: 6,
    size: 3,
    hitSpread: 16,
    attackSpread: 11,
  };
  const DEFAULT_STATS = {
    baseHp: 5,
    baseAtk: 2,
    hpScale: 1,
    atkScale: 0.4,
    exp: 4,
  };

  function mergeProfile(base, override) {
    return { ...base, ...(override || {}) };
  }

  function buildDefinitions(catalog) {
    const entries = Array.isArray(catalog) ? catalog : [];
    return Object.fromEntries(
      entries
        .filter((entry) => entry && entry.key)
        .map((entry) => [
          entry.key,
          {
            ...entry,
            stats: mergeProfile(DEFAULT_STATS, entry.stats),
            draw: mergeProfile(DEFAULT_DRAW, entry.draw),
            motion: mergeProfile(DEFAULT_MOTION, entry.motion),
            fallbackShape: mergeProfile(DEFAULT_SHAPE, entry.fallbackShape),
            burst: mergeProfile(DEFAULT_BURST, entry.burst),
          },
        ])
    );
  }

  function createSystem(catalogSource) {
    const definitions = buildDefinitions(catalogSource);
    const catalog = Object.values(definitions);
    const fallbackDefinition = {
      key: "fallback",
      name: "名もなき魔物",
      stats: DEFAULT_STATS,
      draw: DEFAULT_DRAW,
      motion: DEFAULT_MOTION,
      fallbackShape: DEFAULT_SHAPE,
      burst: DEFAULT_BURST,
    };
    const types = catalog.map((monster) => ({
      key: monster.key,
      name: monster.name,
      tags: Array.isArray(monster.tags) ? monster.tags.slice() : [],
      ...monster.stats,
    }));

    function definitionByKey(key) {
      return definitions[key] || fallbackDefinition;
    }

    function typeByKey(key) {
      const fallbackStats = fallbackDefinition.stats;
      return (
        types.find((type) => type.key === key) ||
        types[0] || {
          key: fallbackDefinition.key,
          name: fallbackDefinition.name,
          ...fallbackStats,
        }
      );
    }

    function createEnemy(type, x, y, floor, options = {}) {
      const floorBonus = Math.max(0, floor - 1);
      const rankProfile = options.rankProfile || {};
      const multiplier = rankProfile.statMultiplier || {};
      const hp = Math.max(1, Math.round((type.baseHp + floorBonus * type.hpScale) * (multiplier.hp || 1)));
      return {
        x,
        y,
        hp,
        maxHp: hp,
        atk: Math.max(1, Math.round((type.baseAtk + floorBonus * type.atkScale) * (multiplier.atk || 1))),
        exp: Math.max(1, Math.round(type.exp * (multiplier.exp || 1))),
        name: type.name,
        sprite: type.key,
        tags: Array.isArray(type.tags) ? type.tags.slice() : [],
        encounterRank: options.encounterRank || "normal",
        encounterId: options.encounterId || null,
        encounterMessages: { ...(options.encounterMessages || {}) },
        rewardProfile: options.rewardProfile || rankProfile.guaranteedReward || null,
        countsAsStrongDefeat: Boolean(rankProfile.countsAsStrongDefeat),
      };
    }

    return {
      catalog,
      definitions,
      types,
      defaults: {
        draw: DEFAULT_DRAW,
        motion: DEFAULT_MOTION,
        shape: DEFAULT_SHAPE,
        burst: DEFAULT_BURST,
        stats: DEFAULT_STATS,
      },
      definitionByKey,
      typeByKey,
      createEnemy,
    };
  }

  window.GORO_DUNGEON_MONSTERS = {
    createSystem,
  };
})();
