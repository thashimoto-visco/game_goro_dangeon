const TILE = 32;
const COLS = 20;
const ROWS = 15;

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
const goroImage = new Image();
goroImage.src = "assets/goro_sprite_sheet.svg";
const goroSprite = { x: 80, y: 70, w: 128, h: 176 };

const monsterSprites = {
  slime: new Image(),
  bat: new Image(),
  golem: new Image(),
};
monsterSprites.slime.src = "assets/monster_slime.svg";
monsterSprites.bat.src = "assets/monster_bat.svg";
monsterSprites.golem.src = "assets/monster_golem.svg";

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
  player: {
    x: 2,
    y: 2,
    hp: 20,
    maxHp: 20,
    atk: 5,
    def: 2,
    hunger: 100,
    exp: 0,
  },
};

function rng(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addLog(text) {
  const li = document.createElement("li");
  li.textContent = text;
  ui.log.prepend(li);
  while (ui.log.children.length > 12) {
    ui.log.removeChild(ui.log.lastChild);
  }
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

  for (let i = 0; i < 8; i++) {
    const w = rng(4, 7);
    const h = rng(3, 5);
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
  const start = rooms[0];
  state.player.x = start.cx;
  state.player.y = start.cy;

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

function combat(enemy) {
  const playerDmg = Math.max(1, state.player.atk + rng(0, 2));
  enemy.hp -= playerDmg;
  addLog(`${enemy.name}に${playerDmg}ダメージ。`);
  if (enemy.hp <= 0) {
    state.player.exp += 3;
    addLog(`${enemy.name}をたおした！`);
    return;
  }

  const enemyDmg = Math.max(1, enemy.atk - state.player.def + rng(0, 1));
  state.player.hp -= enemyDmg;
  addLog(`吾郎は${enemyDmg}ダメージを受けた。`);
  if (state.player.hp <= 0) {
    addLog("吾郎は力尽きた… Rキーで再開。");
  }
}

function moveEnemies() {
  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    const dx = Math.sign(state.player.x - e.x);
    const dy = Math.sign(state.player.y - e.y);
    const nx = e.x + (Math.random() < 0.5 ? dx : 0);
    const ny = e.y + (Math.random() < 0.5 ? dy : 0);

    if (state.player.x === nx && state.player.y === ny) {
      const enemyDmg = Math.max(1, e.atk - state.player.def + rng(0, 1));
      state.player.hp -= enemyDmg;
      addLog(`${e.name}の攻撃！ ${enemyDmg}ダメージ。`);
      continue;
    }

    if (isWalkable(nx, ny) && !enemyAt(nx, ny) && !(state.player.x === nx && state.player.y === ny)) {
      e.x = nx;
      e.y = ny;
    }
  }
}

function tickTurn() {
  if (state.player.hp <= 0) return;
  state.player.hunger = Math.max(0, state.player.hunger - 1);
  if (state.player.hunger === 0) {
    state.player.hp = Math.max(0, state.player.hp - 1);
    addLog("満腹度が0！ 空腹ダメージ。");
  }
  moveEnemies();
}

function tryMove(dx, dy) {
  if (state.player.hp <= 0) return;
  const nx = state.player.x + dx;
  const ny = state.player.y + dy;

  const e = enemyAt(nx, ny);
  if (e) {
    combat(e);
    tickTurn();
    return;
  }

  if (!isWalkable(nx, ny)) return;
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


function drawMonsterShape(enemy) {
  const px = enemy.x * TILE;
  const py = enemy.y * TILE;

  if (enemy.sprite === "slime") {
    ctx.fillStyle = "#5eead4";
    ctx.beginPath();
    ctx.ellipse(px + 16, py + 20, 11, 9, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#0f172a";
    ctx.fillRect(px + 11, py + 18, 3, 3);
    ctx.fillRect(px + 18, py + 18, 3, 3);
    return;
  }

  if (enemy.sprite === "bat") {
    ctx.fillStyle = "#a78bfa";
    ctx.beginPath();
    ctx.moveTo(px + 6, py + 18);
    ctx.lineTo(px + 14, py + 12);
    ctx.lineTo(px + 20, py + 18);
    ctx.lineTo(px + 26, py + 12);
    ctx.lineTo(px + 28, py + 20);
    ctx.lineTo(px + 20, py + 24);
    ctx.lineTo(px + 14, py + 20);
    ctx.closePath();
    ctx.fill();
    return;
  }

  ctx.fillStyle = "#f59e0b";
  ctx.fillRect(px + 8, py + 8, 16, 16);
  ctx.fillStyle = "#111827";
  ctx.fillRect(px + 11, py + 13, 3, 3);
  ctx.fillRect(px + 18, py + 13, 3, 3);
}

function drawPlayerShape() {
  const px = state.player.x * TILE;
  const py = state.player.y * TILE;

  ctx.fillStyle = "#e8c89f";
  ctx.beginPath();
  ctx.ellipse(px + 16, py + 11, 8, 9, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#14213d";
  ctx.fillRect(px + 10, py + 18, 12, 10);
  ctx.fillStyle = "#111827";
  ctx.fillRect(px + 12, py + 10, 2, 2);
  ctx.fillRect(px + 18, py + 10, 2, 2);
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const tile = state.map[y][x];
      ctx.fillStyle = tile === "#" ? "#111827" : "#202b44";
      ctx.fillRect(x * TILE, y * TILE, TILE - 1, TILE - 1);
    }
  }

  ctx.fillStyle = "#93c5fd";
  ctx.fillRect(state.stairs.x * TILE + 8, state.stairs.y * TILE + 8, 16, 16);

  for (const e of state.enemies) {
    if (e.hp <= 0) continue;
    const sprite = monsterSprites[e.sprite];
    if (sprite && sprite.complete && sprite.naturalWidth > 0) {
      ctx.drawImage(sprite, e.x * TILE + 4, e.y * TILE + 4, 24, 24);
    } else {
      drawMonsterShape(e);
    }
  }

  if (goroImage.complete && goroImage.naturalWidth > 0) {
    ctx.drawImage(
      goroImage,
      goroSprite.x,
      goroSprite.y,
      goroSprite.w,
      goroSprite.h,
      state.player.x * TILE + 5,
      state.player.y * TILE + 1,
      22,
      30
    );
  } else {
    drawPlayerShape();
  }
}

function updateUi() {
  ui.floor.textContent = `${state.floor}F`;
  ui.hp.textContent = `${Math.max(0, state.player.hp)} / ${state.player.maxHp}`;
  ui.atk.textContent = state.player.atk;
  ui.def.textContent = state.player.def;
  ui.hunger.textContent = state.player.hunger;
  ui.exp.textContent = state.player.exp;
}

function loop() {
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
  if (key === " ") tickTurn();
  if (key === "r" && state.player.hp <= 0) {
    state.floor = 1;
    state.player.hp = state.player.maxHp;
    state.player.hunger = 100;
    state.player.exp = 0;
    addLog("再挑戦！");
    generateFloor();
  }
});

generateFloor();
addLog("ダンジョンに入った。階段を目指そう。青いマスが階段だ。");
loop();
