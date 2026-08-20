(function () {
  const KIND_PROFILES = {
    weapon: {
      label: "武器",
      actionLabel: "装備",
      equipSlot: "weapon",
      upgradable: true,
      consumable: false,
      throwPower: 5,
    },
    shield: {
      label: "盾",
      actionLabel: "装備",
      equipSlot: "shield",
      upgradable: true,
      consumable: false,
      throwPower: 4,
    },
    food: {
      label: "食料",
      actionLabel: "食べる",
      equipSlot: null,
      upgradable: false,
      consumable: true,
      throwPower: 2,
    },
    potion: {
      label: "薬",
      actionLabel: "飲む",
      equipSlot: null,
      upgradable: false,
      consumable: true,
      throwPower: 2,
    },
    scroll: {
      label: "巻物",
      actionLabel: "読む",
      equipSlot: null,
      upgradable: false,
      consumable: true,
      throwPower: 1,
    },
    wand: {
      label: "杖",
      actionLabel: "振る",
      equipSlot: null,
      upgradable: false,
      consumable: false,
      throwPower: 3,
    },
  };

  const DEFAULT_KIND_PROFILE = {
    label: "道具",
    actionLabel: "使う",
    equipSlot: null,
    upgradable: false,
    consumable: true,
    throwPower: 2,
  };

  const DEFAULT_MAX_UPGRADE = 3;

  const FALLBACK_DEFINITION = {
    key: "unknown",
    name: "なぞの道具",
    kind: "potion",
    icon: "potion",
    heal: 0,
    flavor: "何に使うのか分からない。",
  };

  function kindProfile(kind) {
    return KIND_PROFILES[kind] || DEFAULT_KIND_PROFILE;
  }

  function fillTemplate(text, definition) {
    return String(text).replace(/\{(\w+)\}/g, (match, field) => {
      const value = definition[field];
      return value === undefined || value === null ? match : String(value);
    });
  }

  function buildDefinition(entry) {
    const profile = kindProfile(entry.kind);
    return {
      ...entry,
      kind: entry.kind,
      kindLabel: profile.label,
      actionLabel: profile.actionLabel,
      equipSlot: profile.equipSlot,
      upgradable: Boolean(profile.upgradable),
      consumable: Boolean(profile.consumable),
      maxUpgrade: profile.upgradable ? entry.maxUpgrade ?? DEFAULT_MAX_UPGRADE : 0,
      throwPower: entry.throwPower ?? profile.throwPower,
      icon: entry.icon || entry.kind,
      flavor: entry.flavor || "",
    };
  }

  function buildDefinitions(catalog) {
    const entries = Array.isArray(catalog) ? catalog : [];
    return Object.fromEntries(
      entries.filter((entry) => entry && entry.key && entry.kind).map((entry) => [entry.key, buildDefinition(entry)])
    );
  }

  function createSystem(catalogSource) {
    const definitions = buildDefinitions(catalogSource);
    const catalog = Object.values(definitions);
    const fallbackDefinition = buildDefinition(FALLBACK_DEFINITION);

    function definitionByKey(key) {
      return definitions[key] || fallbackDefinition;
    }

    // Accepts either an item instance ({ type, upgrade, uses }) or a bare catalog key.
    function resolve(itemOrKey) {
      if (itemOrKey && typeof itemOrKey === "object") {
        const definition = definitionByKey(itemOrKey.type);
        const uses = Number.isFinite(itemOrKey.uses) ? Math.max(0, Math.floor(itemOrKey.uses)) : definition.uses;
        return { definition, upgrade: clampUpgrade(itemOrKey.type, itemOrKey.upgrade || 0), uses };
      }
      const definition = definitionByKey(itemOrKey);
      return { definition, upgrade: 0, uses: definition.uses };
    }

    function clampUpgrade(key, value) {
      const definition = definitionByKey(key);
      if (!definition.upgradable) return 0;
      const numeric = Number.isFinite(value) ? Math.floor(value) : 0;
      return Math.max(0, Math.min(definition.maxUpgrade, numeric));
    }

    function kindOf(itemOrKey) {
      return resolve(itemOrKey).definition.kind;
    }

    function isKind(itemOrKey, kind) {
      return kindOf(itemOrKey) === kind;
    }

    function equipSlotOf(itemOrKey) {
      return resolve(itemOrKey).definition.equipSlot;
    }

    function actionLabel(itemOrKey) {
      return resolve(itemOrKey).definition.actionLabel;
    }

    function kindLabel(itemOrKey) {
      return resolve(itemOrKey).definition.kindLabel;
    }

    function displayName(itemOrKey) {
      const { definition, upgrade, uses } = resolve(itemOrKey);
      const upgradedName = upgrade > 0 ? `${definition.name}+${upgrade}` : definition.name;
      return definition.kind === "wand" ? `${upgradedName}[${uses ?? 0}]` : upgradedName;
    }

    function attackBonus(itemOrKey) {
      const { definition, upgrade } = resolve(itemOrKey);
      if (definition.kind !== "weapon") return 0;
      return (definition.atk || 0) + upgrade;
    }

    function defenseBonus(itemOrKey) {
      const { definition, upgrade } = resolve(itemOrKey);
      if (definition.kind !== "shield") return 0;
      return (definition.def || 0) + upgrade;
    }

    function slayerBonusFor(itemOrKey, tags) {
      const { definition } = resolve(itemOrKey);
      const slayer = definition.slayer;
      if (!slayer || !Array.isArray(tags)) return 0;
      return tags.includes(slayer.tag) ? slayer.bonus || 0 : 0;
    }

    function slayerLabelFor(itemOrKey) {
      const { definition } = resolve(itemOrKey);
      return definition.slayer ? definition.slayer.label || definition.slayer.tag : "";
    }

    function throwPowerOf(itemOrKey) {
      const { definition, upgrade } = resolve(itemOrKey);
      return Math.max(1, (definition.throwPower || 1) + (definition.upgradable ? upgrade : 0));
    }

    function canUpgrade(itemOrKey) {
      const { definition, upgrade } = resolve(itemOrKey);
      return definition.upgradable && upgrade < definition.maxUpgrade;
    }

    function effectText(itemOrKey) {
      const { definition, uses } = resolve(itemOrKey);
      if (definition.kind === "wand") {
        const effect = definition.description ? fillTemplate(definition.description, definition) : "不思議な力を放つ";
        return `${effect} / 残り${uses ?? 0}回`;
      }
      if (definition.description) return fillTemplate(definition.description, definition);

      if (definition.kind === "weapon") {
        const base = `攻撃+${attackBonus(itemOrKey)}`;
        return definition.slayer ? `${base} / ${slayerLabelFor(itemOrKey)}に+${definition.slayer.bonus}` : base;
      }
      if (definition.kind === "shield") {
        return `守備+${defenseBonus(itemOrKey)}`;
      }
      if (definition.kind === "food") {
        const base = `満腹度+${definition.hunger || 0}`;
        return definition.hungerMax ? `${base} / 最大+${definition.hungerMax}` : base;
      }
      if (definition.kind === "potion") {
        if (definition.cureAll) return "状態異常をすべて治す";
        return `HP+${definition.heal || 0}`;
      }
      return "効果不明";
    }

    function flavorText(itemOrKey) {
      return resolve(itemOrKey).definition.flavor;
    }

    return {
      catalog,
      definitions,
      keys: catalog.map((definition) => definition.key),
      kindProfiles: KIND_PROFILES,
      definitionByKey,
      clampUpgrade,
      kindOf,
      isKind,
      equipSlotOf,
      actionLabel,
      kindLabel,
      displayName,
      attackBonus,
      defenseBonus,
      slayerBonusFor,
      slayerLabelFor,
      throwPowerOf,
      canUpgrade,
      effectText,
      flavorText,
    };
  }

  window.GORO_DUNGEON_ITEMS = {
    createSystem,
  };
})();
