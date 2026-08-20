(function () {
  function randomValue(context) {
    return typeof context.rng === "function" ? context.rng() : Math.random();
  }

  function isAdjacent(enemy, player) {
    return Math.max(Math.abs(player.x - enemy.x), Math.abs(player.y - enemy.y)) <= 1;
  }

  function chase(enemy, context) {
    const dx = Math.sign(context.player.x - enemy.x);
    const dy = Math.sign(context.player.y - enemy.y);
    const nx = enemy.x + (randomValue(context) < 0.5 ? dx : 0);
    const ny = enemy.y + (randomValue(context) < 0.5 ? dy : 0);

    if (context.player.x === nx && context.player.y === ny) {
      return context.isBlockedForEnemy(nx, ny, enemy) ? { type: "wait" } : { type: "melee" };
    }
    if (nx === enemy.x && ny === enemy.y) return { type: "wait" };
    if (context.isBlockedForEnemy(nx, ny, enemy)) return { type: "wait" };
    return { type: "move", x: nx, y: ny };
  }

  function retreat(enemy, context) {
    const candidates = [
      { x: enemy.x - 1, y: enemy.y },
      { x: enemy.x + 1, y: enemy.y },
      { x: enemy.x, y: enemy.y - 1 },
      { x: enemy.x, y: enemy.y + 1 },
    ]
      .filter(
        (position) =>
          (position.x !== context.player.x || position.y !== context.player.y) &&
          !context.isBlockedForEnemy(position.x, position.y, enemy)
      )
      .sort((a, b) => {
        const chebyshevA = Math.max(Math.abs(a.x - context.player.x), Math.abs(a.y - context.player.y));
        const chebyshevB = Math.max(Math.abs(b.x - context.player.x), Math.abs(b.y - context.player.y));
        if (chebyshevA !== chebyshevB) return chebyshevB - chebyshevA;
        const manhattanA = Math.abs(a.x - context.player.x) + Math.abs(a.y - context.player.y);
        const manhattanB = Math.abs(b.x - context.player.x) + Math.abs(b.y - context.player.y);
        return manhattanB - manhattanA;
      });
    const destination = candidates[0];
    return destination ? { type: "move", ...destination } : { type: "melee" };
  }

  function ranged(enemy, context) {
    if (isAdjacent(enemy, context.player)) return retreat(enemy, context);
    const range = Math.max(1, enemy.rangedRange || 4);
    const path = context.straightPathTo(enemy, context.player, range);
    if (path) return { type: "ranged", path };
    return chase(enemy, context);
  }

  const behaviors = { chase, ranged };

  function decide(enemy, context) {
    const behavior = behaviors[enemy?.ai] || behaviors.chase;
    return behavior(enemy, context);
  }

  window.GORO_DUNGEON_MONSTER_AI = {
    behaviors,
    decide,
  };
})();
