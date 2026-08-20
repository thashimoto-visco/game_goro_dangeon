(function () {
  function createSystem(catalogSource) {
    const definitions = Object.fromEntries(
      (Array.isArray(catalogSource) ? catalogSource : [])
        .filter((entry) => entry && entry.key)
        .map((entry) => [entry.key, { ...entry }])
    );

    function definitionByKey(key) {
      return definitions[key] || null;
    }

    function statusesOf(actor) {
      return actor && Array.isArray(actor.statuses) ? actor.statuses : [];
    }

    function ensureStatuses(actor) {
      if (!actor || typeof actor !== "object") return null;
      if (!Array.isArray(actor.statuses)) actor.statuses = [];
      return actor.statuses;
    }

    function has(actor, key) {
      return statusesOf(actor).some((status) => status && status.key === key && status.remaining > 0);
    }

    function apply(actor, key, options = {}) {
      const definition = definitionByKey(key);
      if (!definition) return { applied: false, refreshed: false, reason: "unknown" };

      const tags = Array.isArray(options.tags) ? options.tags : Array.isArray(actor?.tags) ? actor.tags : [];
      const resisted = (definition.resistTags || []).some((tag) => tags.includes(tag));
      if (resisted) return { applied: false, refreshed: false, reason: "resist", key };

      const statuses = ensureStatuses(actor);
      if (!statuses) return { applied: false, refreshed: false, reason: "invalid-actor", key };
      const duration = Math.max(1, Math.floor(options.duration || definition.duration || 1));
      const current = statuses.find((status) => status && status.key === key);
      if (current) {
        current.remaining = Math.max(current.remaining || 0, duration);
        return { applied: true, refreshed: true, key, remaining: current.remaining };
      }

      statuses.push({ key, remaining: duration });
      return { applied: true, refreshed: false, key, remaining: duration };
    }

    function tick(actor) {
      const statuses = statusesOf(actor);
      if (statuses.length === 0) return [];

      const results = [];
      const active = [];
      for (const status of statuses) {
        if (!status || !status.key) continue;
        const definition = definitionByKey(status.key);
        const remaining = Math.max(0, (Number.isFinite(status.remaining) ? status.remaining : 1) - 1);
        const result = {
          key: status.key,
          damage: Math.max(0, definition?.tickDamage || 0),
          expired: remaining === 0,
          remaining,
        };
        results.push(result);
        if (remaining > 0) active.push({ key: status.key, remaining });
      }
      actor.statuses = active;
      return results;
    }

    function onDamage(actor) {
      const statuses = statusesOf(actor);
      if (statuses.length === 0) return [];
      const cleared = [];
      actor.statuses = statuses.filter((status) => {
        const definition = definitionByKey(status.key);
        if (!definition?.clearedByDamage) return true;
        cleared.push({ key: status.key, remaining: status.remaining });
        return false;
      });
      return cleared;
    }

    function clearAll(actor) {
      const cleared = statusesOf(actor).map((status) => ({ ...status }));
      if (actor && typeof actor === "object") actor.statuses = [];
      return cleared;
    }

    function hasFlag(actor, field) {
      return statusesOf(actor).some((status) => status.remaining > 0 && Boolean(definitionByKey(status.key)?.[field]));
    }

    function blocksAction(actor) {
      return hasFlag(actor, "blocksAction");
    }

    function blocksNaturalRecovery(actor) {
      return hasFlag(actor, "blocksNaturalRecovery");
    }

    function marks(actor) {
      return statusesOf(actor)
        .filter((status) => status && status.remaining > 0)
        .map((status) => {
          const definition = definitionByKey(status.key);
          return {
            key: status.key,
            name: definition?.name || status.key,
            mark: definition?.mark || status.key,
            color: definition?.color || "#ffffff",
            remaining: status.remaining,
          };
        });
    }

    return {
      catalog: Object.values(definitions),
      definitions,
      definitionByKey,
      apply,
      tick,
      onDamage,
      blocksAction,
      blocksNaturalRecovery,
      has,
      clearAll,
      marks,
    };
  }

  window.GORO_DUNGEON_STATUSES = { createSystem };
})();
