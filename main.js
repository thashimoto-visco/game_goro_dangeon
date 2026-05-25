const TILE = 32;
const COLS = 40;
const ROWS = 30;
const MAX_DELTA = 100;
const PLAYER_DRAW = { offsetX: -22, offsetY: -92, w: 44, h: 92 };
const ENEMY_DRAW = {
  slime: { offsetX: -20, offsetY: -36, w: 40, h: 34 },
  bat: { offsetX: -27, offsetY: -54, w: 54, h: 42 },
  golem: { offsetX: -29, offsetY: -66, w: 58, h: 66 },
  fallback: { offsetX: -24, offsetY: -58, w: 48, h: 58 },
};
const STAIRS_DRAW = { offsetX: 8, offsetY: 8, w: 16, h: 16 };

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

function createImage(src) {
  const image = new Image();
  image.src = src;
  return image;
}

const images = {
  goro: createImage("assets/materials/spritesheet.webp"),
  tiles: {
    floor1: createImage("assets/tiles/floor_01.svg"),
    floor2: createImage("assets/tiles/floor_02.svg"),
    floor3: createImage("assets/tiles/floor_03.svg"),
    wall1: createImage("assets/tiles/wall_01.svg"),
    wall2: createImage("assets/tiles/wall_02.svg"),
    wall3: createImage("assets/tiles/wall_03.svg"),
    stairsDown: createImage("assets/tiles/stairs_down.svg"),
  },
  icons: {
    weapon: createImage("assets/icons/item_weapon.svg"),
    food: createImage("assets/icons/item_food.svg"),
    potion: createImage("assets/icons/item_potion.svg"),
  },
  monsters: {
    slime: createImage("assets/monster_slime.svg"),
    bat: createImage("assets/monster_bat.svg"),
    golem: createImage("assets/monster_golem.svg"),
  },
};

const sprites = {
  player: {
    idle: {
      down: { image: images.goro, x: 52, y: 5, w: 87, h: 185 },
      up: { image: images.goro, x: 52, y: 5, w: 87, h: 185 },
      left: { image: images.goro, x: 42, y: 213, w: 108, h: 198, flipX: true },
      right: { image: images.goro, x: 42, y: 213, w: 108, h: 198 },
    },
    walk: {
      down: [
        { image: images.goro, x: 244, y: 5, w: 87, h: 198 },
        { image: images.goro, x: 820, y: 5, w: 87, h: 198 },
      ],
      up: [
        { image: images.goro, x: 244, y: 5, w: 87, h: 198 },
        { image: images.goro, x: 820, y: 5, w: 87, h: 198 },
      ],
      left: [
        { image: images.goro, x: 42, y: 213, w: 108, h: 198, flipX: true },
        { image: images.goro, x: 230, y: 213, w: 115, h: 198, flipX: true },
        { image: images.goro, x: 427, y: 213, w: 106, h: 198, flipX: true },
        { image: images.goro, x: 619, y: 213, w: 106, h: 198, flipX: true },
      ],
      right: [
        { image: images.goro, x: 42, y: 213, w: 108, h: 198 },
        { image: images.goro, x: 230, y: 213, w: 115, h: 198 },
        { image: images.goro, x: 427, y: 213, w: 106, h: 198 },
        { image: images.goro, x: 619, y: 213, w: 106, h: 198 },
      ],
    },
    attack: {
      down: { image: images.goro, x: 424, y: 1045, w: 112, h: 198 },
      up: { image: images.goro, x: 424, y: 1045, w: 112, h: 198 },
      left: { image: images.goro, x: 820, y: 1461, w: 88, h: 198, flipX: true },
      right: { image: images.goro, x: 820, y: 1461, w: 88, h: 198 },
    },
  },
  tiles: {
    floor: [
      { image: images.tiles.floor1 },
      { image: images.tiles.floor2 },
      { image: images.tiles.floor3 },
    ],
    wall: [
      { image: images.tiles.wall1 },
      { image: images.tiles.wall2 },
      { image: images.tiles.wall3 },
    ],
    stairsDown: { image: images.tiles.stairsDown },
  },
  icons: {
    weapon: { image: images.icons.weapon },
    food: { image: images.icons.food },
    potion: { image: images.icons.potion },
  },
  monsters: {
    slime: { image: images.monsters.slime },
    bat: { image: images.monsters.bat },
    golem: { image: images.monsters.golem },
  },
};

const runtime = {
  lastTime: 0,
  elapsed: 0,
};

const effects = [];

const camera = {
  x: 0,
  y: 0,
  shakeTime: 0,
  shakeDuration: 0,
  shakeStrength: 0,
};

const overlay = {
  flashTime: 0,
  flashDuration: 0,
  flashColor: "rgba(255,255,255,0)",
};

const ui = {
  floor: document.getElementById("floor"),
  hp: document.getElementById("hp"),
  atk: document.getElementById("atk"),
  def: document.getElementById("def"),
  hunger: document.getElementById("hunger"),
  exp: document.getElementById("exp"),
  log: document.getElementById("log"),
};

const state = {
  floor: 1,
  map: [],
  enemies: [],
  stairs: { x: 0, y: 0 },
  action: null,
  player: {
    x: 2,
    y: 2,
    direction: "down",
    hp: 20,
    maxHp: 20,
    atk: 5,
    def: 2,
    hunger: 100,
    exp: 0,
    motion: null,
  },
};

function rng(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function gridToWorldX(x) {
  return x * TILE;
}

function gridToWorldY(y) {
  return y * TILE;
}

function worldToScreenX(x) {
  return Math.round(x - camera.x);
}

function worldToScreenY(y) {
  return Math.round(y - camera.y);
}

function gridToScreenX(x) {
  return worldToScreenX(gridToWorldX(x));
}

function gridToScreenY(y) {
  return worldToScreenY(gridToWorldY(y));
}

function addLog(text) {
  const li = document.createElement("li");
  li.textContent = text;
  ui.log.prepend(li);
  while (ui.log.children.length > 12) {
    ui.log.removeChild(ui.log.lastChild);
  }
}

function isImageReady(image) {
  return image && image.complete && image.naturalWidth > 0;
}

function directionFromDelta(dx, dy) {
  if (dx > 0) return "right";
  if (dx < 0) return "left";
  if (dy > 0) return "down";
  if (dy < 0) return "up";
  return state.player.direction;
}

function directionToDelta(direction) {
  if (direction === "right") return { dx: 1, dy: 0 };
  if (direction === "left") return { dx: -1, dy: 0 };
  if (direction === "down") return { dx: 0, dy: 1 };
  return { dx: 0, dy: -1 };
}

function directionBetween(from, to) {
  return directionFromDelta(Math.sign(to.x - from.x), Math.sign(to.y - from.y));
}

function setPlayerDirection(dx, dy) {
  state.player.direction = directionFromDelta(dx, dy);
}

function canAcceptInput() {
  return !state.action;
}

function startPlayerWalk(fromX, fromY, toX, toY) {
  state.player.motion = {
    type: "walk",
    fromX,
    fromY,
    toX,
    toY,
    age: 0,
    duration: 160,
  };
}

function clearPlayerMotion() {
  state.player.motion = null;
}

function updatePlayerMotion(delta) {
  const motion = state.player.motion;
  if (!motion) return;

  motion.age += delta;
  if (motion.age >= motion.duration) {
    clearPlayerMotion();
  }
}

function getPlayerVisualGrid() {
  const motion = state.player.motion;
  if (!motion) {
    return { x: state.player.x, y: state.player.y, progress: 1, walking: false };
  }

  if (motion.type === "attack") {
    const progress = clamp(motion.age / motion.duration, 0, 1);
    const lunge = progress < 0.5 ? progress * 2 * 0.32 : (1 - progress) * 2 * 0.32;
    const delta = directionToDelta(motion.direction);
    return {
      x: state.player.x + delta.dx * lunge,
      y: state.player.y + delta.dy * lunge,
      progress,
      walking: false,
      attacking: true,
    };
  }

  if (motion.type !== "walk") {
    return { x: state.player.x, y: state.player.y, progress: 1, walking: false };
  }

  const progress = clamp(motion.age / motion.duration, 0, 1);
  const eased = 1 - Math.pow(1 - progress, 3);
  return {
    x: motion.fromX + (motion.toX - motion.fromX) * eased,
    y: motion.fromY + (motion.toY - motion.fromY) * eased,
    progress,
    walking: true,
  };
}

function getPlayerSprite() {
  const direction = state.player.direction;
  const visual = getPlayerVisualGrid();
  if (visual.attacking) {
    return sprites.player.attack[direction] || sprites.player.attack.down;
  }

  if (!visual.walking) {
    return sprites.player.idle[direction] || sprites.player.idle.down;
  }

  const frames = sprites.player.walk[direction] || sprites.player.walk.down;
  const frameIndex = Math.min(frames.length - 1, Math.floor(visual.progress * frames.length));
  return frames[frameIndex];
}

function addFloatingText(text, x, y, color = "#ffffff") {
  effects.push({
    type: "floatingText",
    text,
    x,
    y,
    age: 0,
    duration: 650,
    color,
  });
}

function addSlashEffect(x, y, direction) {
  effects.push({
    type: "slash",
    x,
    y,
    direction,
    age: 0,
    duration: 140,
  });
}

function addImpactEffect(x, y) {
  effects.push({
    type: "impact",
    x,
    y,
    age: 0,
    duration: 140,
  });
}

function addDefeatEffect(x, y) {
  effects.push({
    type: "defeat",
    x,
    y,
    age: 0,
    duration: 300,
  });
}

function startCameraShake(duration = 120, strength = 2) {
  camera.shakeTime = duration;
  camera.shakeDuration = duration;
  camera.shakeStrength = strength;
}

function startFlash(color = "rgba(255,255,255,0.25)", duration = 120) {
  overlay.flashTime = duration;
  overlay.flashDuration = duration;
  overlay.flashColor = color;
}

function clearTransientVisuals() {
  effects.length = 0;
  state.action = null;
  clearPlayerMotion();
  camera.x = 0;
  camera.y = 0;
  camera.shakeTime = 0;
  camera.shakeDuration = 0;
  overlay.flashTime = 0;
  overlay.flashDuration = 0;
}

function updateCameraTarget() {
  const visual = getPlayerVisualGrid();
  const playerCenterX = gridToWorldX(visual.x) + TILE / 2;
  const playerCenterY = gridToWorldY(visual.y) + TILE / 2;
  const mapWidth = COLS * TILE;
  const mapHeight = ROWS * TILE;

  camera.x = clamp(playerCenterX - canvas.width / 2, 0, Math.max(0, mapWidth - canvas.width));
  camera.y = clamp(playerCenterY - canvas.height / 2, 0, Math.max(0, mapHeight - canvas.height));
}

function carveRoom(map, x, y, w, h) {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) {
      map[yy][xx] = ".";
    }
  }
}

function generateFloor() {
  const map = Array.from({ length: ROWS }, () => Array(COLS).fill("#"));
  const rooms = [];

  for (let i = 0; i < 14; i++) {
    const w = rng(5, 9);
    const h = rng(4, 7);
    const x = rng(1, COLS - w - 2);
    const y = rng(1, ROWS - h - 2);

    carveRoom(map, x, y, w, h);
    rooms.push({ x, y, w, h, cx: x + Math.floor(w / 2), cy: y + Math.floor(h / 2) });
  }

  rooms.sort((a, b) => a.cx - b.cx);
  for (let i = 1; i < rooms.length; i++) {
    const a = rooms[i - 1];
    const b = rooms[i];
    for (let x = Math.min(a.cx, b.cx); x <= Math.max(a.cx, b.cx); x++) map[a.cy][x] = ".";
    for (let y = Math.min(a.cy, b.cy); y <= Math.max(a.cy, b.cy); y++) map[y][b.cx] = ".";
  }

  state.map = map;
  state.action = null;
  const start = rooms[0];
  state.player.x = start.cx;
  state.player.y = start.cy;
  clearPlayerMotion();
  updateCameraTarget();

  const stairRoom = rooms[rooms.length - 1];
  state.stairs = { x: stairRoom.cx, y: stairRoom.cy };

  const monsterTypes = [
    { key: "slime", name: "ぬるりスライム" },
    { key: "bat", name: "バサバサコウモリ" },
    { key: "golem", name: "ゴロ岩ゴーレム" },
  ];

  state.enemies = rooms.slice(1, 6).map((room, i) => {
    const type = monsterTypes[i % monsterTypes.length];
    return {
      x: room.cx,
      y: room.cy,
      hp: 6 + state.floor,
      atk: 2 + Math.floor(state.floor / 2),
      name: type.name,
      sprite: type.key,
    };
  });
}

function isWalkable(x, y) {
  if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return false;
  return state.map[y][x] === ".";
}

function enemyAt(x, y) {
  return state.enemies.find((e) => e.x === x && e.y === y && e.hp > 0);
}

function buildPlayerAttackResult(enemy) {
  const damage = Math.max(1, state.player.atk + rng(0, 2));
  const killed = enemy.hp - damage <= 0;
  const counterDamage = killed ? 0 : Math.max(1, enemy.atk - state.player.def + rng(0, 1));
  return { damage, killed, counterDamage };
}

function startPlayerAttack(enemy) {
  const direction = directionBetween(state.player, enemy);
  state.player.direction = direction;
  const result = buildPlayerAttackResult(enemy);
  const duration = result.killed ? 300 : 430;
  state.action = {
    type: "playerAttack",
    age: 0,
    duration,
    target: enemy,
    direction,
    result,
    appliedSlash: false,
    appliedHit: false,
    appliedCounter: false,
  };
  state.player.motion = {
    type: "attack",
    age: 0,
    duration: 240,
    direction,
  };
}

function finishAction() {
  const finished = state.action;
  state.action = null;
  clearPlayerMotion();

  if (finished && finished.type === "playerAttack") {
    tickTurn({ skipEnemy: finished.target });
  }
}

function applyPlayerAttackHit(action) {
  if (action.appliedHit) return;

  const enemy = action.target;
  action.appliedHit = true;
  if (!enemy || enemy.hp <= 0) return;

  enemy.hp -= action.result.damage;
  enemy.hitTime = 180;
  enemy.hitDuration = 180;
  enemy.hitDirection = action.direction;
  addImpactEffect(enemy.x, enemy.y);
  addFloatingText(String(action.result.damage), enemy.x, enemy.y, "#fde68a");
  startCameraShake(90, action.result.killed ? 4 : 2);
  addLog(`${enemy.name}に${action.result.damage}ダメージ。`);

  if (enemy.hp <= 0) {
    state.player.exp += 3;
    addDefeatEffect(enemy.x, enemy.y);
    addFloatingText("撃破", enemy.x, enemy.y, "#fca5a5");
    addLog(`${enemy.name}をたおした！`);
  }
}

function applyEnemyCounter(action) {
  if (action.appliedCounter || action.result.killed) return;

  const enemy = action.target;
  action.appliedCounter = true;
  if (!enemy || enemy.hp <= 0 || state.player.hp <= 0) return;

  enemy.counterTime = 140;
  enemy.counterDuration = 140;
  enemy.counterDirection = directionBetween(enemy, state.player);
  state.player.hp -= action.result.counterDamage;
  addFloatingText(String(action.result.counterDamage), state.player.x, state.player.y, "#fb7185");
  startCameraShake();
  startFlash("rgba(239,68,68,0.22)", 120);
  addLog(`${enemy.name}の反撃！ 吾郎は${action.result.counterDamage}ダメージを受けた。`);
  if (state.player.hp <= 0) {
    addLog("吾郎は力尽きた… Rキーで再開。");
  }
}

function updateAction(delta) {
  const action = state.action;
  if (!action) return;

  action.age += delta;

  if (action.type === "playerAttack") {
    if (!action.appliedSlash && action.age >= 70) {
      action.appliedSlash = true;
      addSlashEffect(action.target.x, action.target.y, action.direction);
    }
    if (action.age >= 95) {
      applyPlayerAttackHit(action);
    }
    if (action.age >= 280) {
      applyEnemyCounter(action);
    }
  }

  if (action.age >= action.duration) {
    finishAction();
  }
}

function moveEnemies(options = {}) {
  for (const e of state.enemies) {
    if (options.skipEnemy === e) continue;
    if (e.hp <= 0) continue;
    const dx = Math.sign(state.player.x - e.x);
    const dy = Math.sign(state.player.y - e.y);
    const nx = e.x + (Math.random() < 0.5 ? dx : 0);
    const ny = e.y + (Math.random() < 0.5 ? dy : 0);

    if (state.player.x === nx && state.player.y === ny) {
      const enemyDmg = Math.max(1, e.atk - state.player.def + rng(0, 1));
      state.player.hp -= enemyDmg;
      addFloatingText(String(enemyDmg), state.player.x, state.player.y, "#fb7185");
      startCameraShake();
      startFlash("rgba(239,68,68,0.22)", 120);
      addLog(`${e.name}の攻撃！ ${enemyDmg}ダメージ。`);
      continue;
    }

    if (isWalkable(nx, ny) && !enemyAt(nx, ny) && !(state.player.x === nx && state.player.y === ny)) {
      e.x = nx;
      e.y = ny;
    }
  }
}

function tickTurn(options = {}) {
  if (state.player.hp <= 0) return;
  state.player.hunger = Math.max(0, state.player.hunger - 1);
  if (state.player.hunger === 0) {
    state.player.hp = Math.max(0, state.player.hp - 1);
    addLog("満腹度が0！ 空腹ダメージ。");
  }
  if (!options.skipEnemies) {
    moveEnemies(options);
  }
}

function tryMove(dx, dy) {
  if (!canAcceptInput() || state.player.hp <= 0) return;
  setPlayerDirection(dx, dy);
  const nx = state.player.x + dx;
  const ny = state.player.y + dy;

  const e = enemyAt(nx, ny);
  if (e) {
    startPlayerAttack(e);
    return;
  }

  if (!isWalkable(nx, ny)) return;
  startPlayerWalk(state.player.x, state.player.y, nx, ny);
  state.player.x = nx;
  state.player.y = ny;

  if (nx === state.stairs.x && ny === state.stairs.y) {
    state.floor += 1;
    addLog(`${state.floor}Fへ進んだ。`);
    generateFloor();
    return;
  }

  tickTurn();
}


function drawMonsterShape(enemy, px, py, draw = ENEMY_DRAW.fallback) {
  const centerX = px + draw.w / 2;
  const footY = py + draw.h;

  if (enemy.sprite === "slime") {
    ctx.fillStyle = "#5eead4";
    ctx.beginPath();
    ctx.ellipse(centerX, footY - 10, draw.w / 2, draw.h / 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(centerX - 7, footY - 13, 4, 4);
    ctx.fillRect(centerX + 4, footY - 13, 4, 4);
    return;
  }

  if (enemy.sprite === "bat") {
    ctx.fillStyle = "#a78bfa";
    ctx.beginPath();
    ctx.moveTo(px + 3, py + draw.h * 0.55);
    ctx.lineTo(centerX - 6, py + 8);
    ctx.lineTo(centerX + 4, py + draw.h * 0.5);
    ctx.lineTo(px + draw.w - 4, py + 8);
    ctx.lineTo(px + draw.w - 2, py + draw.h * 0.72);
    ctx.lineTo(centerX + 5, py + draw.h - 5);
    ctx.lineTo(centerX - 6, py + draw.h * 0.72);
    ctx.closePath();
    ctx.fill();
    return;
  }

  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(px + 5, py + 5, draw.w - 10, draw.h - 8);
  ctx.fillStyle = "#111827";
  ctx.fillRect(centerX - 8, py + 18, 4, 4);
  ctx.fillRect(centerX + 4, py + 18, 4, 4);
}

function drawPlayerShape(px, py) {
  ctx.fillStyle = "#e8c89f";
  ctx.beginPath();
  ctx.ellipse(px + PLAYER_DRAW.w / 2, py + 18, 16, 18, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#14213d";
  ctx.fillRect(px + 20, py + 38, 28, 34);
  ctx.fillStyle = "#111827";
  ctx.fillRect(px + 27, py + 16, 4, 4);
  ctx.fillRect(px + 39, py + 16, 4, 4);
}

function drawSprite(sprite, dx, dy, dw, dh) {
  if (!sprite || !isImageReady(sprite.image)) return false;

  ctx.save();
  if (sprite.flipX) {
    ctx.translate(dx + dw, dy);
    ctx.scale(-1, 1);
    dx = 0;
    dy = 0;
  }

  if (Number.isFinite(sprite.x)) {
    ctx.drawImage(sprite.image, sprite.x, sprite.y, sprite.w, sprite.h, dx, dy, dw, dh);
  } else {
    ctx.drawImage(sprite.image, dx, dy, dw, dh);
  }

  ctx.restore();
  return true;
}

function updateAnimations(delta) {
  runtime.elapsed += delta;
  updatePlayerMotion(delta);
  updateAction(delta);
  updateEnemyReactions(delta);
  updateCameraTarget();
  updateEffects(delta);
  updateCamera(delta);
  updateOverlay(delta);
}

function updateEnemyReactions(delta) {
  for (const enemy of state.enemies) {
    enemy.hitTime = Math.max(0, (enemy.hitTime || 0) - delta);
    enemy.counterTime = Math.max(0, (enemy.counterTime || 0) - delta);
  }
}

function updateEffects(delta) {
  for (const effect of effects) {
    effect.age += delta;
  }

  for (let i = effects.length - 1; i >= 0; i--) {
    if (effects[i].age >= effects[i].duration) {
      effects.splice(i, 1);
    }
  }
}

function updateCamera(delta) {
  camera.shakeTime = Math.max(0, camera.shakeTime - delta);
}

function updateOverlay(delta) {
  overlay.flashTime = Math.max(0, overlay.flashTime - delta);
}

function applyCameraShake() {
  if (camera.shakeTime <= 0 || camera.shakeStrength <= 0) return;

  const progress = camera.shakeTime / Math.max(1, camera.shakeDuration);
  const strength = camera.shakeStrength * progress;
  const offsetX = (Math.random() * 2 - 1) * strength;
  const offsetY = (Math.random() * 2 - 1) * strength;
  ctx.translate(offsetX, offsetY);
}

function tileVariant(x, y, count) {
  return Math.abs((x * 31 + y * 17 + state.floor * 13) % count);
}

function drawFallbackTile(tile, sx, sy) {
  ctx.fillStyle = tile === "#" ? "#111827" : "#202b44";
  ctx.fillRect(sx, sy, TILE - 1, TILE - 1);
}

function drawTileSprite(tile, x, y) {
  const group = tile === "#" ? sprites.tiles.wall : sprites.tiles.floor;
  const sprite = group[tileVariant(x, y, group.length)];
  const sx = gridToScreenX(x);
  const sy = gridToScreenY(y);
  const didDraw = drawSprite(sprite, sx, sy, TILE, TILE);
  if (!didDraw) {
    drawFallbackTile(tile, sx, sy);
  }
}

function drawMapLayer() {
  const startX = clamp(Math.floor(camera.x / TILE) - 1, 0, COLS - 1);
  const endX = clamp(Math.ceil((camera.x + canvas.width) / TILE) + 1, 0, COLS);
  const startY = clamp(Math.floor(camera.y / TILE) - 1, 0, ROWS - 1);
  const endY = clamp(Math.ceil((camera.y + canvas.height) / TILE) + 1, 0, ROWS);

  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      const tile = state.map[y][x];
      drawTileSprite(tile, x, y);
    }
  }
}

function drawStairsLayer() {
  const sx = gridToScreenX(state.stairs.x) + STAIRS_DRAW.offsetX;
  const sy = gridToScreenY(state.stairs.y) + STAIRS_DRAW.offsetY;
  const didDraw = drawSprite(
    sprites.tiles.stairsDown,
    gridToScreenX(state.stairs.x),
    gridToScreenY(state.stairs.y),
    TILE,
    TILE
  );
  if (!didDraw) {
    ctx.fillStyle = "#93c5fd";
    ctx.fillRect(sx, sy, STAIRS_DRAW.w, STAIRS_DRAW.h);
  }
}

function drawItemLayer() {
}

function actorFootY(actor) {
  if (actor === state.player) {
    return gridToWorldY(getPlayerVisualGrid().y) + TILE;
  }
  return gridToWorldY(actor.y) + TILE;
}

function actorDrawPosition(actor, draw) {
  const visual = actor === state.player ? getPlayerVisualGrid() : actor;
  const footX = gridToWorldX(visual.x) + TILE / 2;
  const footY = gridToWorldY(visual.y) + TILE;
  let reactionX = 0;
  let reactionY = 0;

  if (actor !== state.player && actor.hitTime > 0) {
    const progress = actor.hitTime / Math.max(1, actor.hitDuration || 1);
    const direction = directionToDelta(actor.hitDirection || "down");
    reactionX -= direction.dx * 5 * progress;
    reactionY -= direction.dy * 5 * progress;
  }

  if (actor !== state.player && actor.counterTime > 0) {
    const progress = actor.counterTime / Math.max(1, actor.counterDuration || 1);
    const direction = directionToDelta(actor.counterDirection || "down");
    const lunge = progress > 0.5 ? (1 - progress) * 2 * 0.24 : progress * 2 * 0.24;
    reactionX += direction.dx * TILE * lunge;
    reactionY += direction.dy * TILE * lunge;
  }

  return {
    x: worldToScreenX(footX + draw.offsetX + reactionX),
    y: worldToScreenY(footY + draw.offsetY + reactionY),
  };
}

function drawEnemyActor(enemy) {
  const draw = ENEMY_DRAW[enemy.sprite] || ENEMY_DRAW.fallback;
  const position = actorDrawPosition(enemy, draw);
  const sprite = sprites.monsters[enemy.sprite];
  ctx.save();
  if (enemy.hitTime > 0 && Math.floor(enemy.hitTime / 45) % 2 === 0) {
    ctx.globalAlpha = 0.55;
  }
  const didDraw = drawSprite(sprite, position.x, position.y, draw.w, draw.h);
  if (!didDraw) {
    drawMonsterShape(enemy, position.x, position.y, draw);
  }
  ctx.restore();
}

function drawPlayerActor() {
  const sprite = getPlayerSprite();
  const position = actorDrawPosition(state.player, PLAYER_DRAW);
  const didDraw = drawSprite(sprite, position.x, position.y, PLAYER_DRAW.w, PLAYER_DRAW.h);
  if (!didDraw) {
    drawPlayerShape(position.x, position.y);
  }
}

function drawActorLayer() {
  const actors = [
    ...state.enemies.filter((e) => e.hp > 0).map((enemy) => ({ type: "enemy", actor: enemy })),
    { type: "player", actor: state.player },
  ];

  actors.sort((a, b) => actorFootY(a.actor) - actorFootY(b.actor));

  for (const entry of actors) {
    if (entry.type === "player") {
      drawPlayerActor();
    } else {
      drawEnemyActor(entry.actor);
    }
  }
}

function drawEnemyLayer() {
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    drawEnemyActor(e);
  }
}

function drawPlayerLayer() {
  drawPlayerActor();
}

function effectScreenCenter(effect) {
  return {
    x: worldToScreenX(gridToWorldX(effect.x) + TILE / 2),
    y: worldToScreenY(gridToWorldY(effect.y) + TILE / 2),
  };
}

function drawSlashEffect(effect) {
  const progress = effect.age / effect.duration;
  const alpha = Math.max(0, 1 - progress);
  const center = effectScreenCenter(effect);
  const angles = {
    right: [-0.8, 0.8],
    left: [Math.PI - 0.8, Math.PI + 0.8],
    down: [0.8, Math.PI - 0.8],
    up: [Math.PI + 0.8, Math.PI * 2 - 0.8],
  };
  const [start, end] = angles[effect.direction] || angles.down;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "rgba(255, 244, 214, 0.95)";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.arc(center.x, center.y, 18 + progress * 5, start, end);
  ctx.stroke();
  ctx.strokeStyle = "rgba(251, 191, 36, 0.7)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center.x, center.y, 11 + progress * 6, start, end);
  ctx.stroke();
  ctx.restore();
}

function drawImpactEffect(effect) {
  const progress = effect.age / effect.duration;
  const alpha = Math.max(0, 1 - progress);
  const center = effectScreenCenter(effect);
  const radius = 5 + progress * 12;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = "#fef3c7";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(center.x - radius, center.y);
  ctx.lineTo(center.x + radius, center.y);
  ctx.moveTo(center.x, center.y - radius);
  ctx.lineTo(center.x, center.y + radius);
  ctx.stroke();
  ctx.restore();
}

function drawDefeatEffect(effect) {
  const progress = effect.age / effect.duration;
  const alpha = Math.max(0, 1 - progress);
  const center = effectScreenCenter(effect);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = "#fca5a5";
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI * 2 * i) / 6;
    const distance = 6 + progress * 18;
    ctx.fillRect(center.x + Math.cos(angle) * distance, center.y + Math.sin(angle) * distance, 4, 4);
  }
  ctx.restore();
}

function drawEffectsLayer() {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 12px 'Yu Gothic UI', sans-serif";

  for (const effect of effects) {
    if (effect.type === "slash") {
      drawSlashEffect(effect);
      continue;
    }

    if (effect.type === "impact") {
      drawImpactEffect(effect);
      continue;
    }

    if (effect.type === "defeat") {
      drawDefeatEffect(effect);
      continue;
    }

    if (effect.type !== "floatingText") continue;

    const progress = effect.age / effect.duration;
    const alpha = Math.max(0, 1 - progress);
    const px = worldToScreenX(gridToWorldX(effect.x) + TILE / 2);
    const py = worldToScreenY(gridToWorldY(effect.y) + 8 - progress * 14);

    ctx.globalAlpha = alpha;
    ctx.fillStyle = "rgba(15, 23, 42, 0.8)";
    ctx.fillText(effect.text, px + 1, py + 1);
    ctx.fillStyle = effect.color;
    ctx.fillText(effect.text, px, py);
  }

  ctx.restore();
}

function drawOverlayLayer() {
  if (overlay.flashTime <= 0) return;

  const progress = overlay.flashTime / Math.max(1, overlay.flashDuration);
  ctx.save();
  ctx.globalAlpha = progress;
  ctx.fillStyle = overlay.flashColor;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  applyCameraShake();
  drawMapLayer();
  drawStairsLayer();
  drawItemLayer();
  drawActorLayer();
  drawEffectsLayer();
  ctx.restore();

  drawOverlayLayer();
}

function updateUi() {
  ui.floor.textContent = `${state.floor}F`;
  ui.hp.textContent = `${Math.max(0, state.player.hp)} / ${state.player.maxHp}`;
  ui.atk.textContent = state.player.atk;
  ui.def.textContent = state.player.def;
  ui.hunger.textContent = state.player.hunger;
  ui.exp.textContent = state.player.exp;
}

function loop(timestamp = 0) {
  const delta = runtime.lastTime === 0 ? 0 : Math.min(MAX_DELTA, timestamp - runtime.lastTime);
  runtime.lastTime = timestamp;
  updateAnimations(delta);
  draw();
  updateUi();
  requestAnimationFrame(loop);
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();
  if (key === "arrowup" || key === "w") tryMove(0, -1);
  if (key === "arrowdown" || key === "s") tryMove(0, 1);
  if (key === "arrowleft" || key === "a") tryMove(-1, 0);
  if (key === "arrowright" || key === "d") tryMove(1, 0);
  if (key === " " && canAcceptInput()) tickTurn();
  if (key === "r" && state.player.hp <= 0) {
    state.floor = 1;
    state.player.hp = state.player.maxHp;
    state.player.hunger = 100;
    state.player.exp = 0;
    state.player.direction = "down";
    clearPlayerMotion();
    clearTransientVisuals();
    addLog("再挑戦！");
    generateFloor();
  }
});

generateFloor();
addLog("ダンジョンに入った。階段を目指そう。青いマスが階段だ。");
requestAnimationFrame(loop);
