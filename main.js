const TILE = 32;
const COLS = 40;
const ROWS = 30;
const MAX_DELTA = 100;
const PLAYER_DRAW = { offsetX: -22, offsetY: -92, w: 44, h: 92 };
const PLAYER_MOTION = {
  idleCycle: 980,
  walkBob: 4,
  attackTilt: 0.12,
  damageDuration: 220,
  damageKnockback: 6,
};
const STAIRS_DRAW = { offsetX: 8, offsetY: 8, w: 16, h: 16 };
const ITEM_DRAW = {
  size: 22,
  offsetX: 5,
  offsetY: 5,
  shadowX: 11,
  shadowY: 4,
  glow: {
    weapon: "rgba(250, 204, 21, 0.2)",
    food: "rgba(248, 250, 252, 0.18)",
    potion: "rgba(34, 197, 94, 0.2)",
  },
};

const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const appConfig = {
  assetBaseUrl: "",
  ...(window.GORO_DUNGEON_CONFIG || {}),
};

if (!window.GORO_DUNGEON_MONSTERS || typeof window.GORO_DUNGEON_MONSTERS.createSystem !== "function") {
  throw new Error("必要なモンスターシステム GORO_DUNGEON_MONSTERS.createSystem を読み込めません。");
}
const monsterSystem = window.GORO_DUNGEON_MONSTERS.createSystem(window.GORO_DUNGEON_MONSTER_CATALOG);
const monsterCatalog = monsterSystem.catalog;
const monsterTypes = monsterSystem.types;

function resolveAssetUrl(path) {
  if (/^(?:https?:|data:|blob:|file:)/.test(path)) return path;
  const baseUrl = appConfig.assetBaseUrl || document.baseURI;
  return new URL(path, baseUrl).toString();
}

function createImage(src) {
  const image = new Image();
  const resolvedSrc = resolveAssetUrl(src);
  image.addEventListener("error", () => {
    console.warn(`画像を読み込めません: ${resolvedSrc}`);
  });
  image.src = resolvedSrc;
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
  monsters: Object.fromEntries(
    monsterCatalog.map((monster) => [monster.key, monster.asset ? createImage(monster.asset) : null])
  ),
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
  monsters: Object.fromEntries(monsterCatalog.map((monster) => [monster.key, { image: images.monsters[monster.key] }])),
};

const runtime = {
  lastTime: 0,
  elapsed: 0,
  hitStop: 0,
};

const debug = {
  structureOverlay: false,
};

const itemTypes = {
  woodenSword: {
    name: "木の棒",
    kind: "weapon",
    icon: "weapon",
    atk: 1,
    description: "攻撃+1",
  },
  ironSword: {
    name: "鉄の剣",
    kind: "weapon",
    icon: "weapon",
    atk: 3,
    description: "攻撃+3",
  },
  riceBall: {
    name: "おにぎり",
    kind: "food",
    icon: "food",
    hunger: 35,
    description: "満腹度+35",
  },
  herb: {
    name: "薬草",
    kind: "potion",
    icon: "potion",
    heal: 10,
    description: "HP+10",
  },
};

const levelTable = [
  { level: 1, nextExp: 8, maxHp: 20, atk: 5, def: 2 },
  { level: 2, nextExp: 20, maxHp: 24, atk: 6, def: 2 },
  { level: 3, nextExp: 38, maxHp: 29, atk: 7, def: 3 },
  { level: 4, nextExp: 62, maxHp: 34, atk: 8, def: 3 },
  { level: 5, nextExp: 92, maxHp: 40, atk: 9, def: 4 },
  { level: 6, nextExp: 128, maxHp: 46, atk: 10, def: 4 },
];

const RECOVERY_PROGRESS_MAX = 24;

function buildEnemySpawnTables(tables) {
  const catalogKeys = new Set(monsterCatalog.map((monster) => monster.key));
  const normalized = Array.isArray(tables) ? tables : [];
  const spawnTables = normalized
    .map((table) => ({
      ...table,
      count: Array.isArray(table.count) ? table.count : [3, 4],
      entries: (table.entries || []).filter((entry) => catalogKeys.has(entry.type) && entry.weight > 0),
    }))
    .filter((table) => table.entries.length > 0);
  if (spawnTables.length > 0) return spawnTables;
  const fallbackKey = monsterCatalog[0]?.key || monsterSystem.definitionByKey("fallback").key;
  return [{ minFloor: 1, maxFloor: 99, count: [3, 4], entries: [{ type: fallbackKey, weight: 100 }] }];
}

const floorEnemyTables = buildEnemySpawnTables(window.GORO_DUNGEON_ENEMY_SPAWN_TABLES);

const floorItemTables = [
  {
    minFloor: 1,
    maxFloor: 1,
    count: [3, 5],
    entries: [
      { type: "riceBall", weight: 36 },
      { type: "herb", weight: 40 },
      { type: "woodenSword", weight: 20 },
      { type: "ironSword", weight: 4 },
    ],
  },
  {
    minFloor: 2,
    maxFloor: 3,
    count: [3, 5],
    entries: [
      { type: "riceBall", weight: 32 },
      { type: "herb", weight: 34 },
      { type: "woodenSword", weight: 24 },
      { type: "ironSword", weight: 10 },
    ],
  },
  {
    minFloor: 4,
    maxFloor: 99,
    count: [3, 6],
    entries: [
      { type: "riceBall", weight: 30 },
      { type: "herb", weight: 30 },
      { type: "woodenSword", weight: 22 },
      { type: "ironSword", weight: 18 },
    ],
  },
];

const floorEventTables = [
  {
    minFloor: 1,
    maxFloor: 1,
    chance: 18,
    entries: [
      { type: "treasure", weight: 60 },
      { type: "spring", weight: 40 },
    ],
  },
  {
    minFloor: 2,
    maxFloor: 3,
    chance: 28,
    entries: [
      { type: "treasure", weight: 55 },
      { type: "spring", weight: 45 },
    ],
  },
  {
    minFloor: 4,
    maxFloor: 99,
    chance: 35,
    entries: [
      { type: "treasure", weight: 50 },
      { type: "spring", weight: 50 },
    ],
  },
];

const treasureRewardTables = [
  {
    minFloor: 1,
    maxFloor: 3,
    count: [2, 2],
    entries: [
      { type: "riceBall", weight: 30 },
      { type: "herb", weight: 34 },
      { type: "woodenSword", weight: 26 },
      { type: "ironSword", weight: 10 },
    ],
  },
  {
    minFloor: 4,
    maxFloor: 99,
    count: [2, 2],
    entries: [
      { type: "riceBall", weight: 26 },
      { type: "herb", weight: 30 },
      { type: "woodenSword", weight: 24 },
      { type: "ironSword", weight: 20 },
    ],
  },
];

const eventRoomTypes = {
  treasure: {
    roomColor: "rgba(250, 204, 21, 0.13)",
    onDiscover() {
      addLog("宝物の気配がする部屋だ。");
      playSound("treasure");
      startFlash("rgba(250,204,21,0.16)", 140);
    },
    placeRewards(eventRoom) {
      placeTreasureRoomRewards(eventRoom);
    },
  },
  spring: {
    roomColor: "rgba(45, 212, 191, 0.12)",
    onDiscover() {
      addLog("澄んだ水音が聞こえる。");
      playSound("spring");
      startFlash("rgba(45,212,191,0.14)", 140);
    },
  },
};

const eventObjectTypes = {
  spring: {
    onStep(object) {
      handleSpringObject(object);
    },
    draw(object) {
      drawSpringObject(object);
    },
  },
};

const defeatReasons = {
  hunger: "吾郎は空腹で倒れた",
  fallbackEnemy: "吾郎は力尽きた",
};

let nextItemId = 1;
let nextEventId = 1;
let inventoryRenderKey = "";

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

const MINIMAP = {
  scale: 3,
  margin: 8,
  padding: 5,
};

const minimap = {
  visible: true,
  canvas: null,
  ctx: null,
  renderedKey: "",
};

const DASH_WALK_DURATION = 95;

const dash = {
  active: false,
  dx: 0,
  dy: 0,
};

const floorTransition = {
  active: false,
  age: 0,
  fadeOut: 260,
  hold: 500,
  fadeIn: 300,
  floorGenerated: false,
};

const sound = {
  context: null,
  master: null,
  muted: true,
  musicTimer: null,
  musicStep: 0,
};

const ui = {
  floor: document.getElementById("floor"),
  level: document.getElementById("level"),
  hp: document.getElementById("hp"),
  atk: document.getElementById("atk"),
  def: document.getElementById("def"),
  hunger: document.getElementById("hunger"),
  exp: document.getElementById("exp"),
  weapon: document.getElementById("weapon"),
  inventory: document.getElementById("inventory"),
  soundToggle: document.getElementById("sound-toggle"),
  log: document.getElementById("log"),
};

const state = {
  floor: 1,
  map: [],
  tileKinds: [],
  rooms: [],
  corridors: [],
  doorways: [],
  visibleTiles: new Set(),
  exploredTiles: new Set(),
  stairsSeen: false,
  enemies: [],
  items: [],
  eventRooms: [],
  eventObjects: [],
  stairs: { x: 0, y: 0 },
  action: null,
  gameOver: {
    active: false,
    age: 0,
    duration: 900,
    reason: "",
  },
  stats: {
    turns: 0,
    defeated: 0,
  },
  menu: {
    type: null,
    selectedIndex: 0,
  },
  player: {
    x: 2,
    y: 2,
    direction: "down",
    level: 1,
    hp: 20,
    maxHp: 20,
    atk: 5,
    def: 2,
    hunger: 100,
    exp: 0,
    recoveryProgress: 0,
    inventoryLimit: 9,
    inventory: [],
    weapon: null,
    motion: null,
    hitTime: 0,
    hitDuration: 0,
    hitDirection: "down",
  },
};

function rng(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function requireDungeonModule(name, module, methods) {
  const missingMethod = methods.find((method) => !module || typeof module[method] !== "function");
  if (missingMethod) {
    throw new Error(`必要なダンジョンモジュール ${name}.${missingMethod} を読み込めません。script の読み込み順を確認してください。`);
  }
  return module;
}

const dungeonLayoutModule = requireDungeonModule("GORO_DUNGEON_LAYOUT", window.GORO_DUNGEON_LAYOUT, ["createBuilder"]);
const dungeonVisibilityModule = requireDungeonModule("GORO_DUNGEON_VISIBILITY", window.GORO_DUNGEON_VISIBILITY, [
  "createComputer",
]);
const dungeonTileRendererModule = requireDungeonModule("GORO_DUNGEON_TILE_RENDERER", window.GORO_DUNGEON_TILE_RENDERER, [
  "createRenderer",
]);
const dungeonDebugOverlayModule = requireDungeonModule("GORO_DUNGEON_DEBUG_OVERLAY", window.GORO_DUNGEON_DEBUG_OVERLAY, [
  "createRenderer",
]);
const dungeonEventsModule = requireDungeonModule("GORO_DUNGEON_EVENTS", window.GORO_DUNGEON_EVENTS, ["createSystem"]);

const dungeonLayoutBuilder = dungeonLayoutModule.createBuilder({
  cols: COLS,
  rows: ROWS,
  rng,
  clamp,
});
const dungeonVisibility = dungeonVisibilityModule.createComputer({
  cols: COLS,
  rows: ROWS,
});
const dungeonEvents = dungeonEventsModule.createSystem({
  rng,
  weightedPick,
  isSameRoom,
  roomsOverlap,
});

function levelEntry(level) {
  return levelTable.find((entry) => entry.level === level) || levelTable[0];
}

function maxLevelEntry() {
  return levelTable[levelTable.length - 1];
}

function nextLevelExp(level) {
  const entry = levelEntry(level);
  return entry.level >= maxLevelEntry().level ? null : entry.nextExp;
}

function expDisplayText() {
  const requiredExp = nextLevelExp(state.player.level);
  return requiredExp === null ? `${state.player.exp} / --` : `${state.player.exp} / ${requiredExp}`;
}

function canLevelUp() {
  const requiredExp = nextLevelExp(state.player.level);
  return requiredExp !== null && state.player.exp >= requiredExp;
}

function applyLevelUp(nextEntry) {
  const previous = {
    maxHp: state.player.maxHp,
    atk: state.player.atk,
    def: state.player.def,
  };

  state.player.level = nextEntry.level;
  state.player.maxHp = nextEntry.maxHp;
  state.player.hp = nextEntry.maxHp;
  state.player.atk = nextEntry.atk;
  state.player.def = nextEntry.def;

  playSound("levelUp");
  startFlash("rgba(250,204,21,0.2)", 160);
  addFloatingText("Lv UP", state.player.x, state.player.y, "#fde68a");
  addLog(`吾郎はレベル${state.player.level}になった！`);
  addLog(`最大HP ${previous.maxHp}→${state.player.maxHp} / 攻撃 ${previous.atk}→${state.player.atk} / 守備 ${previous.def}→${state.player.def}`);
}

function gainExp(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return;

  state.player.exp += amount;
  addLog(`経験値を${amount}得た。`);

  while (canLevelUp()) {
    applyLevelUp(levelEntry(state.player.level + 1));
  }
}

function recoveryGainForHunger(hunger) {
  if (hunger >= 90) return 4;
  if (hunger >= 70) return 3;
  if (hunger >= 30) return 2;
  return 0;
}

function tableForFloor(tables, floor) {
  return tables.find((table) => floor >= table.minFloor && floor <= table.maxFloor) || tables[tables.length - 1];
}

function weightedPick(entries) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng(1, total);

  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.type;
  }

  return entries[0].type;
}

function monsterTypeByKey(key) {
  return monsterSystem.typeByKey(key);
}

function applyNaturalRecovery() {
  if (state.player.hp <= 0) return;
  if (state.player.hp >= state.player.maxHp) {
    state.player.recoveryProgress = 0;
    return;
  }

  const recoveryGain = recoveryGainForHunger(state.player.hunger);
  if (recoveryGain <= 0) return;

  state.player.recoveryProgress += recoveryGain;
  if (state.player.recoveryProgress < RECOVERY_PROGRESS_MAX) return;

  state.player.recoveryProgress = 0;
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + 1);
  addFloatingText("+1", state.player.x, state.player.y, "#86efac");
  addLog("吾郎のHPが少し回復した。");
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

const dungeonTileRenderer = dungeonTileRendererModule.createRenderer({
  ctx,
  tileSize: TILE,
  sprites: sprites.tiles,
  drawSprite,
  tileKindAt,
  isWalkable,
  gridToScreenX,
  gridToScreenY,
  getFloor: () => state.floor,
});
const dungeonDebugOverlay = dungeonDebugOverlayModule.createRenderer({
  ctx,
  tileSize: TILE,
  gridToScreenX,
  gridToScreenY,
});

function addLog(text) {
  const li = document.createElement("li");
  li.textContent = text;
  ui.log.prepend(li);
  while (ui.log.children.length > 12) {
    ui.log.removeChild(ui.log.lastChild);
  }
}

function ensureAudioContext() {
  if (!sound.context) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    sound.context = new AudioContextClass();
    sound.master = sound.context.createGain();
    sound.master.gain.value = 0.16;
    sound.master.connect(sound.context.destination);
  }

  if (sound.context.state === "suspended") {
    sound.context.resume();
  }

  return sound.context;
}

function setSoundMuted(muted) {
  sound.muted = muted;
  if (ui.soundToggle) {
    ui.soundToggle.textContent = muted ? "音 OFF" : "音 ON";
    ui.soundToggle.setAttribute("aria-pressed", String(!muted));
  }

  if (muted) {
    stopMusic();
  } else {
    ensureAudioContext();
    startMusic();
  }
}

function playTone(frequency, duration = 0.08, type = "square", volume = 0.18, delay = 0) {
  if (sound.muted) return;
  const audio = ensureAudioContext();
  if (!audio || !sound.master) return;

  const start = audio.currentTime + delay;
  const oscillator = audio.createOscillator();
  const gain = audio.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(sound.master);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.02);
}

function playSound(name) {
  if (sound.muted) return;

  if (name === "move") {
    playTone(130, 0.035, "square", 0.05);
    return;
  }
  if (name === "attack") {
    playTone(220, 0.06, "sawtooth", 0.09);
    playTone(160, 0.05, "square", 0.06, 0.035);
    return;
  }
  if (name === "hit") {
    playTone(520, 0.045, "square", 0.11);
    return;
  }
  if (name === "damage") {
    playTone(96, 0.12, "sawtooth", 0.1);
    return;
  }
  if (name === "defeat") {
    playTone(420, 0.08, "square", 0.1);
    playTone(260, 0.1, "square", 0.09, 0.08);
    return;
  }
  if (name === "levelUp") {
    playTone(523, 0.07, "triangle", 0.09);
    playTone(659, 0.08, "triangle", 0.09, 0.06);
    playTone(784, 0.12, "square", 0.08, 0.13);
    return;
  }
  if (name === "treasure") {
    playTone(659, 0.06, "triangle", 0.08);
    playTone(880, 0.08, "triangle", 0.08, 0.07);
    return;
  }
  if (name === "spring") {
    playTone(349, 0.09, "sine", 0.07);
    playTone(523, 0.11, "sine", 0.07, 0.08);
    return;
  }
  if (name === "pickup") {
    playTone(440, 0.06, "square", 0.08);
    playTone(660, 0.07, "square", 0.08, 0.06);
    return;
  }
  if (name === "use") {
    playTone(392, 0.06, "triangle", 0.08);
    playTone(523, 0.08, "triangle", 0.08, 0.055);
    return;
  }
  if (name === "stairs") {
    playTone(330, 0.06, "square", 0.08);
    playTone(494, 0.06, "square", 0.08, 0.06);
    playTone(659, 0.08, "square", 0.08, 0.12);
    return;
  }
  if (name === "gameOver") {
    playTone(220, 0.14, "sawtooth", 0.1);
    playTone(165, 0.16, "sawtooth", 0.1, 0.14);
    playTone(110, 0.28, "sawtooth", 0.1, 0.3);
    return;
  }
  if (name === "menu") {
    playTone(330, 0.04, "square", 0.06);
    return;
  }
  if (name === "cursor") {
    playTone(260, 0.025, "square", 0.04);
    return;
  }
  if (name === "drop") {
    playTone(180, 0.08, "triangle", 0.06);
    return;
  }
  if (name === "fail") {
    playTone(90, 0.08, "sawtooth", 0.06);
    return;
  }
  if (name === "encounter") {
    playTone(740, 0.05, "square", 0.1);
    playTone(988, 0.07, "square", 0.09, 0.05);
  }
}

function startMusic() {
  if (sound.musicTimer || sound.muted) return;
  const notes = [110, 146.83, 164.81, 196, 164.81, 146.83];
  sound.musicTimer = window.setInterval(() => {
    if (sound.muted) return;
    const note = notes[sound.musicStep % notes.length];
    playTone(note, 0.16, "triangle", 0.025);
    sound.musicStep += 1;
  }, 420);
}

function stopMusic() {
  if (!sound.musicTimer) return;
  window.clearInterval(sound.musicTimer);
  sound.musicTimer = null;
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
  return (
    !state.action &&
    !state.player.motion &&
    !state.gameOver.active &&
    !isMenuOpen() &&
    !floorTransition.active
  );
}

function isMenuOpen() {
  return Boolean(state.menu.type);
}

function startPlayerWalk(fromX, fromY, toX, toY, duration = 160) {
  state.player.motion = {
    type: "walk",
    fromX,
    fromY,
    toX,
    toY,
    age: 0,
    duration,
  };
}

function startPlayerDamage(direction = state.player.direction) {
  state.player.hitTime = PLAYER_MOTION.damageDuration;
  state.player.hitDuration = PLAYER_MOTION.damageDuration;
  state.player.hitDirection = direction;
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

function updatePlayerReaction(delta) {
  state.player.hitTime = Math.max(0, (state.player.hitTime || 0) - delta);
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

function addAlertEffect(x, y) {
  effects.push({
    type: "alert",
    x,
    y,
    age: 0,
    duration: 620,
  });
}

function updateEnemyEncounters() {
  if (state.gameOver.active) return;

  let encountered = false;
  for (const enemy of state.enemies) {
    if (enemy.hp <= 0) continue;
    const visible = isVisibleTile(enemy.x, enemy.y);
    if (visible && !enemy.spotted) {
      enemy.spotted = true;
      addAlertEffect(enemy.x, enemy.y);
      addLog(`${enemy.name}が現れた！`);
      encountered = true;
    } else if (!visible && enemy.spotted) {
      enemy.spotted = false;
    }
  }

  if (encountered) {
    playSound("encounter");
  }
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

function addMonsterBurstEffect(enemy, variant = "hit") {
  effects.push({
    type: "monsterBurst",
    variant,
    sprite: enemy.sprite,
    x: enemy.x,
    y: enemy.y,
    age: 0,
    duration: variant === "attack" ? 180 : 220,
  });
}

function startHitStop(duration) {
  runtime.hitStop = Math.max(runtime.hitStop, duration);
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
  closeMenu();
  state.gameOver.active = false;
  state.gameOver.age = 0;
  state.gameOver.reason = "";
  clearPlayerMotion();
  camera.x = 0;
  camera.y = 0;
  camera.shakeTime = 0;
  camera.shakeDuration = 0;
  overlay.flashTime = 0;
  overlay.flashDuration = 0;
  runtime.hitStop = 0;
  floorTransition.active = false;
  floorTransition.age = 0;
  floorTransition.floorGenerated = false;
  state.player.hitTime = 0;
  state.player.hitDuration = 0;
}

function currentWeaponName() {
  const weapon = equippedWeapon();
  return weapon ? itemTypes[weapon.type].name : "なし";
}

function currentInventoryItem() {
  return state.player.inventory[state.menu.selectedIndex] || null;
}

function openInventoryMenu() {
  if (!canAcceptInput() || state.player.hp <= 0) return;
  state.menu.type = "inventory";
  state.menu.selectedIndex = clamp(state.menu.selectedIndex, 0, Math.max(0, state.player.inventory.length - 1));
  playSound("menu");
}

function closeMenu() {
  state.menu.type = null;
  state.menu.selectedIndex = 0;
}

function moveMenuCursor(delta) {
  if (state.menu.type !== "inventory") return;
  const count = state.player.inventory.length;
  if (count === 0) return;
  state.menu.selectedIndex = (state.menu.selectedIndex + delta + count) % count;
  playSound("cursor");
}

function confirmInventoryMenu() {
  if (state.menu.type !== "inventory") return;
  const item = currentInventoryItem();
  if (!item) {
    playSound("fail");
    return;
  }
  const index = state.menu.selectedIndex;
  closeMenu();
  useInventorySlot(index);
}

function dropInventoryItem(index) {
  if (state.menu.type !== "inventory") return;
  const item = state.player.inventory[index];
  if (!item) {
    playSound("fail");
    return;
  }

  if (itemAt(state.player.x, state.player.y)) {
    playSound("fail");
    addLog("足元に物があって置けない。");
    return;
  }

  const itemType = itemTypes[item.type];
  removeInventoryItem(item);
  state.items.push({
    id: item.id,
    type: item.type,
    x: state.player.x,
    y: state.player.y,
  });
  state.menu.selectedIndex = clamp(index, 0, Math.max(0, state.player.inventory.length - 1));
  playSound("drop");
  addLog(`${itemType.name}を置いた。`);
  closeMenu();
}

function handleMenuInput(key) {
  if (key === "escape" || key === "i") {
    closeMenu();
    playSound("menu");
    return;
  }
  if (key === "arrowup" || key === "w") {
    moveMenuCursor(-1);
    return;
  }
  if (key === "arrowdown" || key === "s") {
    moveMenuCursor(1);
    return;
  }
  if (key === "enter") {
    confirmInventoryMenu();
    return;
  }
  if (key === "d") {
    dropInventoryItem(state.menu.selectedIndex);
  }
}

function defeatReasonFromEnemy(enemy) {
  if (!enemy) return defeatReasons.fallbackEnemy;
  return monsterSystem.definitionByKey(enemy.sprite).defeatText || `${enemy.name}に倒された`;
}

function startGameOver(reason) {
  if (state.gameOver.active) return;

  state.player.hp = 0;
  state.action = null;
  closeMenu();
  clearPlayerMotion();
  state.gameOver.active = true;
  state.gameOver.age = 0;
  state.gameOver.reason = reason;
  playSound("gameOver");
  startCameraShake(260, 6);
  startFlash("rgba(185, 28, 28, 0.42)", 260);
  addLog(`${reason} Rキーで再挑戦。`);
}

function handlePlayerDefeat(reason) {
  if (state.player.hp <= 0) {
    startGameOver(reason);
  }
}

function splitTextByLength(text, maxLength) {
  const lines = [];
  for (let index = 0; index < text.length; index += maxLength) {
    lines.push(text.slice(index, index + maxLength));
  }
  return lines;
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

function inBounds(x, y) {
  return x >= 0 && y >= 0 && x < COLS && y < ROWS;
}

function createEnemy(type, x, y) {
  return monsterSystem.createEnemy(type, x, y, state.floor);
}

function isSameRoom(a, b) {
  return a && b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

function roomsOverlap(a, b) {
  if (!a || !b) return false;
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function roomContains(room, x, y) {
  return x >= room.x && x < room.x + room.w && y >= room.y && y < room.y + room.h;
}

function tileKey(x, y) {
  return `${x},${y}`;
}

function tileKindAt(x, y) {
  if (!inBounds(x, y) || !state.tileKinds[y]) return "wall";
  return state.tileKinds[y][x] || "wall";
}

function computeVisibleTiles() {
  state.visibleTiles = dungeonVisibility.compute(
    {
      map: state.map,
      tileKinds: state.tileKinds,
      rooms: state.rooms,
      corridors: state.corridors,
      doorways: state.doorways,
    },
    state.player
  );

  for (const key of state.visibleTiles) {
    state.exploredTiles.add(key);
  }
  if (!state.stairsSeen && state.visibleTiles.has(tileKey(state.stairs.x, state.stairs.y))) {
    state.stairsSeen = true;
  }
}

function isVisibleTile(x, y) {
  return state.visibleTiles.has(tileKey(x, y));
}

function isExploredTile(x, y) {
  return state.exploredTiles.has(tileKey(x, y));
}

function eventRoomAt(x, y) {
  return state.eventRooms.find((eventRoom) => roomContains(eventRoom.room, x, y));
}

function eventObjectAt(x, y) {
  return state.eventObjects.find((object) => object.x === x && object.y === y);
}

function eventTableForCurrentFloor() {
  return tableForFloor(floorEventTables, state.floor);
}

function eventRoomType(type) {
  return eventRoomTypes[type] || null;
}

function eventObjectType(type) {
  return eventObjectTypes[type] || null;
}

function treasureRewardTableForCurrentFloor() {
  return tableForFloor(treasureRewardTables, state.floor);
}

function selectEventRooms(rooms, startRoom, stairRoom) {
  state.eventObjects = [];
  const result = dungeonEvents.selectRooms({
    rooms,
    startRoom,
    stairRoom,
    table: eventTableForCurrentFloor(),
    nextId: nextEventId,
  });
  state.eventRooms = result.eventRooms;
  nextEventId = result.nextId;
}

function eventObjectPlacementBlocked(x, y) {
  if (!isWalkable(x, y)) return true;
  if (state.player.x === x && state.player.y === y) return true;
  if (state.stairs.x === x && state.stairs.y === y) return true;
  return Boolean(eventObjectAt(x, y));
}

function placeEventObjects() {
  const result = dungeonEvents.placeObjects({
    eventRooms: state.eventRooms,
    isBlocked: eventObjectPlacementBlocked,
    nextId: nextEventId,
  });
  state.eventObjects = result.eventObjects;
  nextEventId = result.nextId;
}

function buildFloorLayout() {
  return dungeonLayoutBuilder.buildFloorLayout();
}

function generateFloor() {
  const layout = buildFloorLayout();

  state.map = layout.map;
  state.tileKinds = layout.tileKinds;
  state.rooms = layout.rooms;
  state.corridors = layout.corridors;
  state.doorways = layout.doorways;
  state.exploredTiles = new Set();
  state.stairsSeen = false;
  minimap.renderedKey = "";
  dash.active = false;
  state.action = null;
  const start = layout.rooms[0];
  state.player.x = start.cx;
  state.player.y = start.cy;
  state.player.hitTime = 0;
  state.player.hitDuration = 0;
  state.player.hitDirection = state.player.direction;
  clearPlayerMotion();
  updateCameraTarget();

  const stairRoom = layout.rooms[layout.rooms.length - 1];
  state.stairs = { x: stairRoom.cx, y: stairRoom.cy };

  selectEventRooms(layout.rooms, start, stairRoom);
  placeEventObjects();
  placeEnemies(layout.rooms);
  placeItems(layout.rooms);
  placeEventRewards();
  computeVisibleTiles();
}

function isWalkable(x, y) {
  if (!inBounds(x, y)) return false;
  return state.map[y][x] === ".";
}

function enemyAt(x, y) {
  return state.enemies.find((e) => e.x === x && e.y === y && e.hp > 0);
}

function itemAt(x, y) {
  return state.items.find((item) => item.x === x && item.y === y);
}

function isEnemyPlacementBlocked(x, y) {
  if (!isWalkable(x, y)) return true;
  if (state.player.x === x && state.player.y === y) return true;
  if (state.stairs.x === x && state.stairs.y === y) return true;
  if (eventObjectAt(x, y)) return true;
  return Boolean(enemyAt(x, y));
}

function equippedWeapon() {
  if (!state.player.weapon) return null;
  const item = state.player.inventory.find((entry) => entry.id === state.player.weapon);
  if (!item || itemTypes[item.type].kind !== "weapon") return null;
  return item;
}

function weaponAttackBonus() {
  const weapon = equippedWeapon();
  return weapon ? itemTypes[weapon.type].atk : 0;
}

function playerAttackPower() {
  return state.player.atk + weaponAttackBonus();
}

function placeEnemies(rooms) {
  state.enemies = [];
  const table = tableForFloor(floorEnemyTables, state.floor);
  const candidates = rooms.slice(1);
  const count = rng(table.count[0], table.count[1]);
  let attempts = 0;

  while (state.enemies.length < count && attempts < 160 && candidates.length > 0) {
    attempts += 1;
    const room = candidates[rng(0, candidates.length - 1)];
    const x = rng(room.x, room.x + room.w - 1);
    const y = rng(room.y, room.y + room.h - 1);

    if (isEnemyPlacementBlocked(x, y)) continue;
    const type = monsterTypeByKey(weightedPick(table.entries));
    state.enemies.push(createEnemy(type, x, y));
  }
}

function randomItemType() {
  const table = tableForFloor(floorItemTables, state.floor);
  return weightedPick(table.entries);
}

function isItemPlacementBlocked(x, y) {
  if (!isWalkable(x, y)) return true;
  if (state.player.x === x && state.player.y === y) return true;
  if (state.stairs.x === x && state.stairs.y === y) return true;
  if (eventObjectAt(x, y)) return true;
  if (enemyAt(x, y)) return true;
  return Boolean(itemAt(x, y));
}

function placeItems(rooms) {
  state.items = [];
  const table = tableForFloor(floorItemTables, state.floor);
  const candidates = rooms.slice(1);
  const count = rng(table.count[0], table.count[1]);
  let attempts = 0;

  while (state.items.length < count && attempts < 120 && candidates.length > 0) {
    attempts += 1;
    const room = candidates[rng(0, candidates.length - 1)];
    const x = rng(room.x, room.x + room.w - 1);
    const y = rng(room.y, room.y + room.h - 1);

    if (isItemPlacementBlocked(x, y)) continue;
    state.items.push({
      id: nextItemId,
      type: randomItemType(),
      x,
      y,
    });
    nextItemId += 1;
  }
}

function placeTreasureRoomRewards(eventRoom) {
  const table = treasureRewardTableForCurrentFloor();
  const count = rng(table.count[0], table.count[1]);
  let placed = 0;
  let attempts = 0;

  while (placed < count && attempts < 80) {
    attempts += 1;
    const x = rng(eventRoom.room.x, eventRoom.room.x + eventRoom.room.w - 1);
    const y = rng(eventRoom.room.y, eventRoom.room.y + eventRoom.room.h - 1);

    if (isItemPlacementBlocked(x, y)) continue;
    state.items.push({
      id: nextItemId,
      type: weightedPick(table.entries),
      x,
      y,
    });
    nextItemId += 1;
    placed += 1;
  }
}

function placeEventRewards() {
  for (const eventRoom of state.eventRooms) {
    const definition = eventRoomType(eventRoom.type);
    if (definition && definition.placeRewards) {
      definition.placeRewards(eventRoom);
    }
  }
}

function buildPlayerAttackResult(enemy) {
  const damage = Math.max(1, playerAttackPower() + rng(0, 2));
  const killed = enemy.hp - damage <= 0;
  const counterDamage = killed ? 0 : Math.max(1, enemy.atk - state.player.def + rng(0, 1));
  return { damage, killed, counterDamage };
}

function startPlayerAttack(enemy) {
  const direction = directionBetween(state.player, enemy);
  state.player.direction = direction;
  playSound("attack");
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
  addMonsterBurstEffect(enemy, "hit");
  addImpactEffect(enemy.x, enemy.y);
  addFloatingText(String(action.result.damage), enemy.x, enemy.y, "#fde68a");
  playSound("hit");
  startHitStop(action.result.killed ? 130 : 60);
  startCameraShake(90, action.result.killed ? 4 : 2);
  addLog(`${enemy.name}に${action.result.damage}ダメージ。`);

  if (enemy.hp <= 0) {
    state.stats.defeated += 1;
    playSound("defeat");
    addDefeatEffect(enemy.x, enemy.y);
    addFloatingText("撃破", enemy.x, enemy.y, "#fca5a5");
    addLog(`${enemy.name}をたおした！`);
    gainExp(enemy.exp);
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
  addMonsterBurstEffect(enemy, "attack");
  state.player.hp -= action.result.counterDamage;
  startPlayerDamage(directionBetween(enemy, state.player));
  addFloatingText(String(action.result.counterDamage), state.player.x, state.player.y, "#fb7185");
  playSound("damage");
  startCameraShake();
  startFlash("rgba(239,68,68,0.22)", 120);
  addLog(`${enemy.name}の反撃！ 吾郎は${action.result.counterDamage}ダメージを受けた。`);
  handlePlayerDefeat(defeatReasonFromEnemy(enemy));
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
    if (state.gameOver.active) return;
    if (options.skipEnemy === e) continue;
    if (e.hp <= 0) continue;
    const dx = Math.sign(state.player.x - e.x);
    const dy = Math.sign(state.player.y - e.y);
    const nx = e.x + (Math.random() < 0.5 ? dx : 0);
    const ny = e.y + (Math.random() < 0.5 ? dy : 0);

    if (state.player.x === nx && state.player.y === ny) {
      const enemyDmg = Math.max(1, e.atk - state.player.def + rng(0, 1));
      e.counterTime = 140;
      e.counterDuration = 140;
      e.counterDirection = directionBetween(e, state.player);
      addMonsterBurstEffect(e, "attack");
      state.player.hp -= enemyDmg;
      startPlayerDamage(directionBetween(e, state.player));
      addFloatingText(String(enemyDmg), state.player.x, state.player.y, "#fb7185");
      playSound("damage");
      startCameraShake();
      startFlash("rgba(239,68,68,0.22)", 120);
      addLog(`${e.name}の攻撃！ ${enemyDmg}ダメージ。`);
      handlePlayerDefeat(defeatReasonFromEnemy(e));
      if (state.gameOver.active) return;
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
  state.stats.turns += 1;
  state.player.hunger = Math.max(0, state.player.hunger - 1);

  const starved = state.player.hunger === 0;
  if (starved) {
    state.player.hp = Math.max(0, state.player.hp - 1);
    startPlayerDamage();
    addLog("満腹度が0！ 空腹ダメージ。");
    playSound("damage");
    handlePlayerDefeat(defeatReasons.hunger);
  }
  if (state.gameOver.active) return;
  if (!starved) {
    applyNaturalRecovery();
  }
  if (!options.skipEnemies) {
    moveEnemies(options);
  }
}

function handleEventRoomDiscoveryAtPlayer() {
  const eventRoom = eventRoomAt(state.player.x, state.player.y);
  if (!eventRoom || eventRoom.discovered) return;

  eventRoom.discovered = true;
  const definition = eventRoomType(eventRoom.type);
  if (definition && definition.onDiscover) {
    definition.onDiscover(eventRoom);
  }
}

function handleSpringObject(object) {
  if (object.used) {
    addLog("泉は静まり返っている。");
    return;
  }

  if (state.player.hp >= state.player.maxHp) {
    addLog("泉の水は静かに揺れている。");
    return;
  }

  const before = state.player.hp;
  const healAmount = Math.max(8, Math.floor(state.player.maxHp * 0.35));
  state.player.hp = Math.min(state.player.maxHp, state.player.hp + healAmount);
  object.used = true;
  addFloatingText(`+${state.player.hp - before}`, state.player.x, state.player.y, "#5eead4");
  playSound("spring");
  startFlash("rgba(45,212,191,0.22)", 180);
  addLog(`泉の水が吾郎をいやした。HP ${before}→${state.player.hp}。`);
}

function handleEventObjectAtPlayer() {
  const object = eventObjectAt(state.player.x, state.player.y);
  if (!object) return;

  const definition = eventObjectType(object.type);
  if (definition && definition.onStep) {
    definition.onStep(object);
  }
}

function pickUpItemAtPlayer() {
  const item = itemAt(state.player.x, state.player.y);
  if (!item) return false;

  if (state.player.inventory.length >= state.player.inventoryLimit) {
    addLog("持ち物がいっぱいで拾えない。");
    return false;
  }

  state.items = state.items.filter((entry) => entry.id !== item.id);
  state.player.inventory.push({ id: item.id, type: item.type });
  playSound("pickup");
  addLog(`${itemTypes[item.type].name}を拾った。`);
  return true;
}

function removeInventoryItem(item) {
  state.player.inventory = state.player.inventory.filter((entry) => entry.id !== item.id);
  if (state.player.weapon === item.id) {
    state.player.weapon = null;
  }
}

function useInventorySlot(slotIndex) {
  if (!canAcceptInput() || state.player.hp <= 0) return;
  const item = state.player.inventory[slotIndex];
  if (!item) {
    addLog("その番号の持ち物はない。");
    return;
  }

  const itemType = itemTypes[item.type];
  if (itemType.kind === "weapon") {
    state.player.weapon = item.id;
    playSound("use");
    addLog(`${itemType.name}を装備した。`);
    tickTurn();
    return;
  }

  if (itemType.kind === "food") {
    const before = state.player.hunger;
    state.player.hunger = Math.min(100, state.player.hunger + itemType.hunger);
    removeInventoryItem(item);
    playSound("use");
    addLog(`${itemType.name}を食べた。満腹度 ${before}→${state.player.hunger}。`);
    tickTurn();
    return;
  }

  if (itemType.kind === "potion") {
    const before = state.player.hp;
    state.player.hp = Math.min(state.player.maxHp, state.player.hp + itemType.heal);
    removeInventoryItem(item);
    playSound("use");
    addLog(`${itemType.name}を使った。HP ${before}→${state.player.hp}。`);
    tickTurn();
  }
}

function resetPlayerRunState() {
  state.floor = 1;
  state.items = [];
  state.eventRooms = [];
  state.eventObjects = [];
  state.action = null;
  state.gameOver.active = false;
  state.gameOver.age = 0;
  state.gameOver.reason = "";
  state.stats.turns = 0;
  state.stats.defeated = 0;
  const initialLevel = levelEntry(1);
  state.player.level = initialLevel.level;
  state.player.maxHp = initialLevel.maxHp;
  state.player.hp = state.player.maxHp;
  state.player.atk = initialLevel.atk;
  state.player.def = initialLevel.def;
  state.player.hunger = 100;
  state.player.exp = 0;
  state.player.recoveryProgress = 0;
  state.player.direction = "down";
  state.player.inventory = [];
  state.player.weapon = null;
  state.player.hitTime = 0;
  state.player.hitDuration = 0;
  state.player.hitDirection = "down";
  nextItemId = 1;
  nextEventId = 1;
  inventoryRenderKey = "";
}

function tryMove(dx, dy, options = {}) {
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
  startPlayerWalk(state.player.x, state.player.y, nx, ny, options.walkDuration);
  state.player.x = nx;
  state.player.y = ny;
  playSound("move");
  pickUpItemAtPlayer();
  handleEventRoomDiscoveryAtPlayer();
  handleEventObjectAtPlayer();

  if (nx === state.stairs.x && ny === state.stairs.y) {
    startFloorTransition();
    return;
  }

  tickTurn();
}

function startFloorTransition() {
  floorTransition.active = true;
  floorTransition.age = 0;
  floorTransition.floorGenerated = false;
  stopDash();
}

function updateFloorTransition(delta) {
  if (!floorTransition.active) return;

  floorTransition.age += delta;

  if (!floorTransition.floorGenerated && floorTransition.age >= floorTransition.fadeOut) {
    floorTransition.floorGenerated = true;
    state.floor += 1;
    playSound("stairs");
    addLog(`${state.floor}Fへ進んだ。`);
    generateFloor();
  }

  const total = floorTransition.fadeOut + floorTransition.hold + floorTransition.fadeIn;
  if (floorTransition.age >= total) {
    floorTransition.active = false;
  }
}

function anyEnemyVisible() {
  return state.enemies.some((enemy) => enemy.hp > 0 && isVisibleTile(enemy.x, enemy.y));
}

function discoveredEventRoomCount() {
  return state.eventRooms.filter((eventRoom) => eventRoom.discovered).length;
}

function dashExits(x, y, backDx, backDy) {
  const deltas = [
    { dx: 1, dy: 0 },
    { dx: -1, dy: 0 },
    { dx: 0, dy: 1 },
    { dx: 0, dy: -1 },
  ];
  return deltas.filter(
    (delta) =>
      !(delta.dx === backDx && delta.dy === backDy) && isWalkable(x + delta.dx, y + delta.dy)
  );
}

function stopDash(logText) {
  if (dash.active && logText) {
    addLog(logText);
  }
  dash.active = false;
}

function shouldStopDashAfterStep(before) {
  if (state.gameOver.active) return true;
  if (state.floor !== before.floor) return true;
  if (state.player.hp < before.hp) return true;
  if (state.items.length !== before.itemCount) return true;
  if (state.player.inventory.length !== before.inventoryCount) return true;
  if (discoveredEventRoomCount() !== before.discoveredCount) return true;
  if (itemAt(state.player.x, state.player.y)) return true;
  if (eventObjectAt(state.player.x, state.player.y)) return true;

  const kind = tileKindAt(state.player.x, state.player.y);
  if (kind === "doorway") return true;
  return false;
}

function dashStep() {
  if (!dash.active) return;
  if (!canAcceptInput() || state.player.hp <= 0) {
    stopDash();
    return;
  }

  const nx = state.player.x + dash.dx;
  const ny = state.player.y + dash.dy;
  if (!isWalkable(nx, ny) || enemyAt(nx, ny)) {
    stopDash();
    return;
  }

  const before = {
    floor: state.floor,
    hp: state.player.hp,
    itemCount: state.items.length,
    inventoryCount: state.player.inventory.length,
    discoveredCount: discoveredEventRoomCount(),
  };

  tryMove(dash.dx, dash.dy, { walkDuration: DASH_WALK_DURATION });

  if (shouldStopDashAfterStep(before)) {
    stopDash();
    return;
  }

  computeVisibleTiles();
  if (anyEnemyVisible()) {
    stopDash("敵の気配を感じて立ち止まった。");
    return;
  }

  if (tileKindAt(state.player.x, state.player.y) === "corridor") {
    const exits = dashExits(state.player.x, state.player.y, -dash.dx, -dash.dy);
    if (exits.length === 0) {
      stopDash();
      return;
    }
    if (exits.length >= 2) {
      stopDash("分かれ道で立ち止まった。");
      return;
    }
    dash.dx = exits[0].dx;
    dash.dy = exits[0].dy;
  }
}

function startDash(dx, dy) {
  if (!canAcceptInput() || state.player.hp <= 0) return;
  dash.active = true;
  dash.dx = dx;
  dash.dy = dy;
  dashStep();
}

function updateDash() {
  if (!dash.active) return;
  if (canAcceptInput()) {
    dashStep();
  }
}


function drawBlobMonsterShape(px, py, draw, shape) {
  const centerX = px + draw.w / 2;
  const footY = py + draw.h;

  ctx.fillStyle = shape.fill;
  ctx.beginPath();
  ctx.ellipse(centerX, footY - 10, draw.w / 2, draw.h / 3, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shape.shade;
  ctx.beginPath();
  ctx.ellipse(centerX, footY - 7, draw.w / 2.6, draw.h / 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = shape.eye;
  ctx.beginPath();
  ctx.arc(centerX - 7, footY - 13, 3.5, 0, Math.PI * 2);
  ctx.arc(centerX + 7, footY - 13, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = shape.eye;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(centerX, footY - 8, 7, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();
}

function drawWingedMonsterShape(px, py, draw, shape) {
  const centerX = px + draw.w / 2;

  ctx.fillStyle = shape.fill;
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
  ctx.fillStyle = shape.eye;
  ctx.beginPath();
  ctx.arc(centerX - 5, py + draw.h * 0.62, 2.5, 0, Math.PI * 2);
  ctx.arc(centerX + 5, py + draw.h * 0.62, 2.5, 0, Math.PI * 2);
  ctx.fill();
}

function drawBlockMonsterShape(px, py, draw, shape) {
  const centerX = px + draw.w / 2;

  ctx.fillStyle = shape.fill;
  ctx.beginPath();
  drawRoundRectPath(px + 5, py + 5, draw.w - 10, draw.h - 8, 8);
  ctx.fill();
  ctx.fillStyle = shape.shade;
  ctx.fillRect(px + 8, py + draw.h - 17, draw.w - 16, 8);
  ctx.fillStyle = shape.eye;
  ctx.beginPath();
  drawRoundRectPath(centerX - 11, py + 21, 7, 7, 3);
  drawRoundRectPath(centerX + 4, py + 21, 7, 7, 3);
  ctx.fill();
}

function drawMonsterShape(enemy, px, py, draw = monsterSystem.defaults.draw) {
  const shape = monsterSystem.definitionByKey(enemy.sprite).fallbackShape;
  const shapeRenderers = {
    blob: drawBlobMonsterShape,
    winged: drawWingedMonsterShape,
    block: drawBlockMonsterShape,
  };
  const renderer = shapeRenderers[shape.kind] || drawBlockMonsterShape;
  renderer(px, py, draw, shape);
}

function drawRoundRectPath(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
}

function enemyMotionPhase(enemy, motion) {
  const spriteOffset = enemy.sprite.length * 29;
  const positionOffset = enemy.x * 41 + enemy.y * 53;
  const alertFactor = enemy.spotted ? 0.6 : 1;
  const cycle = Math.max(1, (motion.cycle || 760) * alertFactor);
  return ((runtime.elapsed + spriteOffset + positionOffset) % cycle) / cycle;
}

function enemyMotionTuning(enemy, motion) {
  const phase = enemyMotionPhase(enemy, motion);
  const wave = Math.sin(phase * Math.PI * 2);
  const pulse = (wave + 1) / 2;
  const flap = Math.abs(wave);
  const tuning = {
    bob: -(motion.floatOffset || 0) - motion.bob * pulse,
    scaleX: 1 + (motion.scaleX - 1) * pulse + flap * (motion.flapScaleX || 0),
    scaleY: 1 + (motion.scaleY - 1) * pulse + flap * (motion.flapScaleY || 0),
    rotation: wave * (motion.wobble || 0),
    shadowScale: (motion.shadowBase || 1) + pulse * (motion.shadowPulse || 0),
    alpha: 1,
  };

  if (enemy.hitTime > 0) {
    const progress = enemy.hitTime / Math.max(1, enemy.hitDuration || 1);
    tuning.alpha = Math.floor(enemy.hitTime / 45) % 2 === 0 ? 0.55 : 1;
    tuning.scaleX *= 1 + ((motion.hitScaleX || 1.08) - 1) * progress;
    tuning.scaleY *= 1 + ((motion.hitScaleY || 0.92) - 1) * progress;
    tuning.rotation += Math.sin(progress * Math.PI * 8) * (motion.hitRotation || 0.09);
  }

  if (enemy.counterTime > 0) {
    const progress = enemy.counterTime / Math.max(1, enemy.counterDuration || 1);
    const strike = Math.sin(progress * Math.PI);
    tuning.scaleX *= 1 + ((motion.attackScaleX || 1.04) - 1) * strike;
    tuning.scaleY *= 1 + ((motion.attackScaleY || 1.02) - 1) * strike;
    tuning.rotation += (motion.attackRotation || 0.07) * strike;
    tuning.shadowScale += strike * (motion.attackShadowPulse || 0.06);
  }

  return tuning;
}

function drawEnemyShadow(position, draw, motion, tuning) {
  const footX = position.x + draw.w / 2;
  const footY = position.y + draw.h + (motion.shadowOffsetY || 0);
  const scale = tuning.shadowScale || 1;

  ctx.save();
  ctx.fillStyle = "rgba(3, 7, 18, 0.34)";
  ctx.beginPath();
  ctx.ellipse(footX, footY - 2, motion.shadowX * scale, motion.shadowY * scale, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawEnemySpriteWithIdle(enemy, sprite, position, draw, motion) {
  const tuning = enemyMotionTuning(enemy, motion);
  const anchorY = draw.h * motion.anchor;

  drawEnemyShadow(position, draw, motion, tuning);

  ctx.save();
  ctx.globalAlpha = tuning.alpha;
  ctx.translate(position.x + draw.w / 2, position.y + anchorY + tuning.bob);
  ctx.rotate(tuning.rotation);
  ctx.scale(tuning.scaleX, tuning.scaleY);
  const didDraw = drawSprite(sprite, -draw.w / 2, -anchorY, draw.w, draw.h);
  if (!didDraw) {
    drawMonsterShape(enemy, -draw.w / 2, -anchorY, draw);
  }
  ctx.restore();

  return didDraw;
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
  if (runtime.hitStop > 0) {
    runtime.hitStop = Math.max(0, runtime.hitStop - delta);
    return;
  }

  runtime.elapsed += delta;
  updatePlayerMotion(delta);
  updatePlayerReaction(delta);
  updateAction(delta);
  updateDash();
  updateEnemyReactions(delta);
  computeVisibleTiles();
  updateEnemyEncounters();
  updateCameraTarget();
  updateEffects(delta);
  updateGameOver(delta);
  updateCamera(delta);
  updateOverlay(delta);
  updateFloorTransition(delta);
}

function updateGameOver(delta) {
  if (!state.gameOver.active) return;
  state.gameOver.age = Math.min(state.gameOver.duration, state.gameOver.age + delta);
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

function drawTileSprite(tile, x, y) {
  dungeonTileRenderer.drawTile(tile, x, y);
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

function drawVisibilityLayer() {
  const startX = clamp(Math.floor(camera.x / TILE) - 1, 0, COLS - 1);
  const endX = clamp(Math.ceil((camera.x + canvas.width) / TILE) + 1, 0, COLS);
  const startY = clamp(Math.floor(camera.y / TILE) - 1, 0, ROWS - 1);
  const endY = clamp(Math.ceil((camera.y + canvas.height) / TILE) + 1, 0, ROWS);

  ctx.save();
  for (let y = startY; y < endY; y++) {
    for (let x = startX; x < endX; x++) {
      if (isVisibleTile(x, y)) continue;
      ctx.fillStyle = isExploredTile(x, y)
        ? "rgba(3, 7, 18, 0.58)"
        : "rgba(2, 4, 12, 0.94)";
      ctx.fillRect(gridToScreenX(x), gridToScreenY(y), TILE, TILE);
    }
  }
  ctx.restore();
}

function minimapTileColor(kind) {
  if (kind === "room") return "rgba(203, 213, 225, 0.85)";
  if (kind === "corridor") return "rgba(122, 136, 158, 0.8)";
  if (kind === "doorway") return "rgba(240, 244, 250, 0.95)";
  return null;
}

function updateMinimapCanvas() {
  const renderKey = `${state.floor}:${state.exploredTiles.size}:${state.stairsSeen}`;
  if (renderKey === minimap.renderedKey && minimap.canvas) return;
  minimap.renderedKey = renderKey;

  if (!minimap.canvas) {
    minimap.canvas = document.createElement("canvas");
    minimap.canvas.width = COLS * MINIMAP.scale;
    minimap.canvas.height = ROWS * MINIMAP.scale;
    minimap.ctx = minimap.canvas.getContext("2d");
  }

  const mctx = minimap.ctx;
  mctx.clearRect(0, 0, minimap.canvas.width, minimap.canvas.height);

  for (const entry of state.exploredTiles) {
    const [x, y] = entry.split(",").map(Number);
    const color = minimapTileColor(tileKindAt(x, y));
    if (!color) continue;
    mctx.fillStyle = color;
    mctx.fillRect(x * MINIMAP.scale, y * MINIMAP.scale, MINIMAP.scale, MINIMAP.scale);
  }

  if (state.stairsSeen) {
    const sx = state.stairs.x * MINIMAP.scale;
    const sy = state.stairs.y * MINIMAP.scale;
    mctx.fillStyle = "#38bdf8";
    mctx.fillRect(sx - 1, sy - 1, MINIMAP.scale + 2, MINIMAP.scale + 2);
  }
}

function drawMinimapLayer() {
  if (!minimap.visible) return;
  updateMinimapCanvas();

  const w = minimap.canvas.width + MINIMAP.padding * 2;
  const h = minimap.canvas.height + MINIMAP.padding * 2;
  const px = canvas.width - w - MINIMAP.margin;
  const py = MINIMAP.margin;

  ctx.save();
  ctx.fillStyle = "rgba(2, 6, 23, 0.74)";
  ctx.beginPath();
  drawRoundRectPath(px, py, w, h, 6);
  ctx.fill();
  ctx.strokeStyle = "rgba(148, 163, 184, 0.55)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.drawImage(minimap.canvas, px + MINIMAP.padding, py + MINIMAP.padding);

  const pulse = 0.55 + Math.sin(runtime.elapsed / 220) * 0.45;
  const playerX = px + MINIMAP.padding + (state.player.x + 0.5) * MINIMAP.scale;
  const playerY = py + MINIMAP.padding + (state.player.y + 0.5) * MINIMAP.scale;
  ctx.globalAlpha = clamp(pulse, 0.25, 1);
  ctx.fillStyle = "#facc15";
  ctx.beginPath();
  ctx.arc(playerX, playerY, 2.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawDebugStructureOverlay() {
  if (!debug.structureOverlay) return;
  dungeonDebugOverlay.draw(
    {
      rooms: state.rooms,
      corridors: state.corridors,
      doorways: state.doorways,
    },
    state.visibleTiles
  );
}

function eventRoomColor(type) {
  const definition = eventRoomType(type);
  return definition && definition.roomColor ? definition.roomColor : "rgba(255, 255, 255, 0.08)";
}

function drawEventRoomLayer() {
  for (const eventRoom of state.eventRooms) {
    ctx.save();
    ctx.fillStyle = eventRoomColor(eventRoom.type);
    for (let y = eventRoom.room.y; y < eventRoom.room.y + eventRoom.room.h; y++) {
      for (let x = eventRoom.room.x; x < eventRoom.room.x + eventRoom.room.w; x++) {
        if (!isWalkable(x, y)) continue;
        if (!isVisibleTile(x, y)) continue;
        ctx.fillRect(gridToScreenX(x) + 2, gridToScreenY(y) + 2, TILE - 4, TILE - 4);
      }
    }
    ctx.restore();
  }
}

function drawStairsLayer() {
  const stairsVisible = isVisibleTile(state.stairs.x, state.stairs.y);
  if (!stairsVisible && !state.stairsSeen) return;

  const sx = gridToScreenX(state.stairs.x) + STAIRS_DRAW.offsetX;
  const sy = gridToScreenY(state.stairs.y) + STAIRS_DRAW.offsetY;

  ctx.save();
  ctx.fillStyle = "rgba(56, 189, 248, 0.16)";
  ctx.beginPath();
  ctx.ellipse(gridToScreenX(state.stairs.x) + TILE / 2, gridToScreenY(state.stairs.y) + TILE / 2 + 2, 15, 11, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

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

function drawSpringObject(object) {
  const sx = gridToScreenX(object.x);
  const sy = gridToScreenY(object.y);
  const pulse = object.used ? 0 : Math.sin(runtime.elapsed / 240) * 1.5;
  const alpha = object.used ? 0.38 : 0.78;

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = object.used ? "rgba(15, 118, 110, 0.22)" : "rgba(45, 212, 191, 0.22)";
  ctx.beginPath();
  ctx.arc(sx + TILE / 2, sy + TILE / 2, 13 + pulse, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = object.used ? "#134e4a" : "#67e8f9";
  ctx.beginPath();
  ctx.ellipse(sx + TILE / 2, sy + TILE / 2 + 2, 11, 6, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = object.used ? "#0f766e" : "#ccfbf1";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(sx + TILE / 2, sy + TILE / 2 + 2, 12, 7, 0, 0, Math.PI * 2);
  ctx.stroke();

  ctx.strokeStyle = object.used ? "rgba(20, 184, 166, 0.32)" : "rgba(240, 253, 250, 0.72)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(sx + 10, sy + 16);
  ctx.quadraticCurveTo(sx + 16, sy + 13 + pulse, sx + 22, sy + 16);
  ctx.stroke();
  ctx.restore();
}

function drawEventObjectLayer() {
  for (const object of state.eventObjects) {
    if (!isVisibleTile(object.x, object.y)) continue;
    const definition = eventObjectType(object.type);
    if (definition && definition.draw) {
      definition.draw(object);
    }
  }
}

function drawItemLayer() {
  for (const item of state.items) {
    if (!isVisibleTile(item.x, item.y)) continue;
    const itemType = itemTypes[item.type];
    const sx = gridToScreenX(item.x);
    const sy = gridToScreenY(item.y);
    const iconX = sx + ITEM_DRAW.offsetX;
    const iconY = sy + ITEM_DRAW.offsetY;

    ctx.save();
    ctx.fillStyle = ITEM_DRAW.glow[itemType.kind] || "rgba(250, 204, 21, 0.18)";
    ctx.beginPath();
    ctx.arc(sx + TILE / 2, sy + TILE / 2, 13, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "rgba(3, 7, 18, 0.28)";
    ctx.beginPath();
    ctx.ellipse(sx + TILE / 2, sy + TILE - 7, ITEM_DRAW.shadowX, ITEM_DRAW.shadowY, 0, 0, Math.PI * 2);
    ctx.fill();

    const didDraw = drawSprite(sprites.icons[itemType.icon], iconX, iconY, ITEM_DRAW.size, ITEM_DRAW.size);
    if (!didDraw) {
      ctx.fillStyle = itemType.kind === "weapon" ? "#d6b15f" : itemType.kind === "food" ? "#f97316" : "#22c55e";
      ctx.beginPath();
      if (itemType.kind === "weapon") {
        ctx.moveTo(sx + 10, sy + 23);
        ctx.lineTo(sx + 22, sy + 9);
        ctx.lineTo(sx + 24, sy + 12);
        ctx.lineTo(sx + 12, sy + 25);
      } else if (itemType.kind === "food") {
        ctx.moveTo(sx + 16, sy + 7);
        ctx.lineTo(sx + 26, sy + 25);
        ctx.lineTo(sx + 6, sy + 25);
        ctx.closePath();
      } else {
        ctx.arc(sx + TILE / 2, sy + TILE / 2, 8, 0, Math.PI * 2);
      }
      ctx.fill();
    }
    ctx.restore();
  }
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

  if (actor === state.player && actor.hitTime > 0) {
    const progress = actor.hitTime / Math.max(1, actor.hitDuration || 1);
    const direction = directionToDelta(actor.hitDirection || "down");
    const shake = Math.sin(progress * Math.PI * 8) * 1.4;
    reactionX += direction.dx * PLAYER_MOTION.damageKnockback * progress;
    reactionY += direction.dy * PLAYER_MOTION.damageKnockback * progress;
    reactionX += shake;
  }

  if (actor !== state.player && actor.hitTime > 0) {
    const progress = actor.hitTime / Math.max(1, actor.hitDuration || 1);
    const direction = directionToDelta(actor.hitDirection || "down");
    const knockback = monsterSystem.definitionByKey(actor.sprite).motion.hitKnockback || 5;
    reactionX += direction.dx * knockback * progress;
    reactionY += direction.dy * knockback * progress;
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

function drawPlayerShadow(position, tuning) {
  const scale = tuning.shadowScale || 1;
  ctx.save();
  ctx.fillStyle = "rgba(3, 7, 18, 0.34)";
  ctx.beginPath();
  ctx.ellipse(
    position.x + PLAYER_DRAW.w / 2,
    position.y + PLAYER_DRAW.h - 2,
    15 * scale,
    5 * scale,
    0,
    0,
    Math.PI * 2
  );
  ctx.fill();
  ctx.restore();
}

function playerDrawTuning() {
  const visual = getPlayerVisualGrid();
  const tuning = {
    offsetX: 0,
    offsetY: 0,
    scaleX: 1,
    scaleY: 1,
    rotation: 0,
    alpha: 1,
    shadowScale: 1,
  };

  if (visual.walking) {
    const step = Math.sin(visual.progress * Math.PI * 2);
    tuning.offsetY -= Math.abs(step) * PLAYER_MOTION.walkBob;
    tuning.rotation = step * 0.035;
    tuning.shadowScale = 1 - Math.abs(step) * 0.08;
  } else if (visual.attacking) {
    const strike = Math.sin(visual.progress * Math.PI);
    const side = state.player.direction === "left" ? -1 : state.player.direction === "right" ? 1 : 0;
    tuning.offsetY -= strike * 2;
    tuning.scaleX = 1 + strike * 0.04;
    tuning.scaleY = 1 - strike * 0.025;
    tuning.rotation = side * PLAYER_MOTION.attackTilt * strike;
    tuning.shadowScale = 1 + strike * 0.05;
  } else {
    const breath = Math.sin(runtime.elapsed / PLAYER_MOTION.idleCycle);
    tuning.offsetY -= (breath + 1) * 0.45;
    tuning.scaleY = 1 + breath * 0.012;
    tuning.scaleX = 1 - breath * 0.006;
  }

  if (state.player.hitTime > 0) {
    const progress = state.player.hitTime / Math.max(1, state.player.hitDuration || 1);
    tuning.alpha = Math.floor(state.player.hitTime / 42) % 2 === 0 ? 0.58 : 1;
    tuning.rotation += Math.sin(progress * Math.PI * 6) * 0.06;
    tuning.scaleX *= 1 + progress * 0.025;
    tuning.scaleY *= 1 - progress * 0.018;
  }

  return tuning;
}

function drawPlayerSpriteWithTuning(sprite, position, tuning) {
  drawPlayerShadow(position, tuning);

  ctx.save();
  ctx.globalAlpha = tuning.alpha;
  ctx.translate(position.x + PLAYER_DRAW.w / 2 + tuning.offsetX, position.y + PLAYER_DRAW.h + tuning.offsetY);
  ctx.rotate(tuning.rotation);
  ctx.scale(tuning.scaleX, tuning.scaleY);
  const didDraw = drawSprite(sprite, -PLAYER_DRAW.w / 2, -PLAYER_DRAW.h, PLAYER_DRAW.w, PLAYER_DRAW.h);
  if (!didDraw) {
    drawPlayerShape(-PLAYER_DRAW.w / 2, -PLAYER_DRAW.h);
  }
  ctx.restore();

  return didDraw;
}

function drawEnemyHpBar(enemy, position, draw) {
  if (!enemy.maxHp || enemy.hp >= enemy.maxHp || enemy.hp <= 0) return;

  const ratio = clamp(enemy.hp / enemy.maxHp, 0, 1);
  const barWidth = 26;
  const barHeight = 3.5;
  const x = position.x + draw.w / 2 - barWidth / 2;
  const y = position.y - 7;

  ctx.save();
  ctx.fillStyle = "rgba(3, 7, 18, 0.72)";
  ctx.fillRect(x - 1, y - 1, barWidth + 2, barHeight + 2);
  ctx.fillStyle = ratio > 0.5 ? "#4ade80" : ratio > 0.25 ? "#facc15" : "#f87171";
  ctx.fillRect(x, y, barWidth * ratio, barHeight);
  ctx.restore();
}

function drawEnemyActor(enemy) {
  const monster = monsterSystem.definitionByKey(enemy.sprite);
  const draw = monster.draw;
  const motion = monster.motion;
  const position = actorDrawPosition(enemy, draw);
  const sprite = sprites.monsters[enemy.sprite];
  ctx.save();
  drawEnemySpriteWithIdle(enemy, sprite, position, draw, motion);
  ctx.restore();
  drawEnemyHpBar(enemy, position, draw);
}

function drawPlayerActor() {
  const sprite = getPlayerSprite();
  const position = actorDrawPosition(state.player, PLAYER_DRAW);
  const tuning = playerDrawTuning();
  let didDraw = false;

  if (state.gameOver.active) {
    const progress = clamp(state.gameOver.age / 520, 0, 1);
    drawPlayerShadow(position, { shadowScale: Math.max(0.45, 1 - progress * 0.4) });
    ctx.save();
    ctx.globalAlpha = 1 - progress * 0.22;
    ctx.translate(position.x + PLAYER_DRAW.w / 2, position.y + PLAYER_DRAW.h - 10 + progress * 8);
    ctx.rotate(-0.65 * progress);
    didDraw = drawSprite(sprite, -PLAYER_DRAW.w / 2, -PLAYER_DRAW.h + 10, PLAYER_DRAW.w, PLAYER_DRAW.h);
    if (!didDraw) {
      drawPlayerShape(-PLAYER_DRAW.w / 2, -PLAYER_DRAW.h + 10);
    }
    ctx.restore();
  } else {
    didDraw = drawPlayerSpriteWithTuning(sprite, position, tuning);
  }
}

function drawActorLayer() {
  const actors = [
    ...state.enemies
      .filter((e) => e.hp > 0 && isVisibleTile(e.x, e.y))
      .map((enemy) => ({ type: "enemy", actor: enemy })),
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
    if (!isVisibleTile(e.x, e.y)) continue;
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

function drawAlertEffect(effect) {
  const progress = effect.age / effect.duration;
  const alpha = progress < 0.75 ? 1 : Math.max(0, 1 - (progress - 0.75) / 0.25);
  const pop = 1 + Math.max(0, 1 - progress * 3.2) * 0.7;
  const center = effectScreenCenter(effect);
  const x = center.x;
  const y = center.y - TILE * 1.35 - Math.min(progress * 8, 4);

  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y);
  ctx.scale(pop, pop);
  ctx.font = "bold 17px 'Yu Gothic UI', sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(15, 23, 42, 0.9)";
  ctx.strokeText("！", 0, 0);
  ctx.fillStyle = "#fde047";
  ctx.fillText("！", 0, 0);
  ctx.restore();
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

function drawMonsterBurstEffect(effect) {
  const progress = effect.age / effect.duration;
  const alpha = Math.max(0, 1 - progress);
  const center = effectScreenCenter(effect);
  const isAttack = effect.variant === "attack";
  const burst = monsterSystem.definitionByKey(effect.sprite).burst;
  const spread = isAttack ? burst.attackSpread : burst.hitSpread;
  const color = isAttack ? burst.attackColor : burst.hitColor;
  const count = Math.max(1, burst.count || monsterSystem.defaults.burst.count);
  const size = burst.size || monsterSystem.defaults.burst.size;

  ctx.save();
  ctx.globalAlpha = alpha * (isAttack ? 0.75 : 0.9);

  if (burst.kind === "particles") {
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const angle = Math.PI * 0.4 + i * (Math.PI / Math.max(2, count));
      const distance = 5 + progress * spread;
      ctx.beginPath();
      ctx.arc(center.x + Math.cos(angle) * distance, center.y + Math.sin(angle) * distance, size, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (burst.kind === "arcs") {
    ctx.strokeStyle = color;
    ctx.lineWidth = size;
    for (let i = 0; i < count; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const lift = Math.floor(i / 2) * 4;
      ctx.beginPath();
      ctx.moveTo(center.x, center.y - 5 - lift);
      ctx.quadraticCurveTo(
        center.x + side * (10 + progress * spread),
        center.y - 12 - lift + progress * 8,
        center.x + side * (19 + progress * spread * 0.65),
        center.y + 3
      );
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = color;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + 0.3;
      const distance = 4 + progress * spread;
      ctx.fillRect(center.x + Math.cos(angle) * distance, center.y + Math.sin(angle) * distance, size, size);
    }
  }

  ctx.restore();
}

function drawEffectsLayer() {
  ctx.save();
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 12px 'Yu Gothic UI', sans-serif";

  for (const effect of effects) {
    if (!isVisibleTile(effect.x, effect.y)) continue;

    if (effect.type === "alert") {
      drawAlertEffect(effect);
      continue;
    }

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

    if (effect.type === "monsterBurst") {
      drawMonsterBurstEffect(effect);
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

function drawMenuLayer() {
  if (state.menu.type === "inventory" && !state.gameOver.active) {
    drawInventoryMenu();
  }
}

function drawInventoryMenu() {
  const panelWidth = 430;
  const panelHeight = 320;
  const panelX = Math.round((canvas.width - panelWidth) / 2);
  const panelY = Math.round((canvas.height - panelHeight) / 2);
  const items = state.player.inventory;
  const selected = currentInventoryItem();

  ctx.save();
  ctx.fillStyle = "rgba(6, 8, 13, 0.68)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "#111827";
  ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
  ctx.fillStyle = "rgba(9, 13, 20, 0.7)";
  ctx.fillRect(panelX + 10, panelY + 10, panelWidth - 20, panelHeight - 20);
  ctx.strokeStyle = "#d6b15f";
  ctx.lineWidth = 3;
  ctx.strokeRect(panelX + 2, panelY + 2, panelWidth - 4, panelHeight - 4);
  ctx.strokeStyle = "#5f4624";
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX + 9, panelY + 9, panelWidth - 18, panelHeight - 18);

  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "#facc15";
  ctx.font = "bold 22px 'Yu Gothic UI', sans-serif";
  ctx.fillText("持ち物", panelX + 24, panelY + 34);

  ctx.font = "bold 14px 'Yu Gothic UI', sans-serif";
  if (items.length === 0) {
    ctx.fillStyle = "#8ea3c5";
    ctx.fillText("持ち物はない", panelX + 32, panelY + 92);
  } else {
    for (let index = 0; index < items.length; index++) {
      const item = items[index];
      const itemType = itemTypes[item.type];
      const rowY = panelY + 76 + index * 24;
      const isSelected = index === state.menu.selectedIndex;

      if (isSelected) {
        ctx.fillStyle = "rgba(214, 177, 95, 0.24)";
        ctx.fillRect(panelX + 22, rowY - 12, panelWidth - 44, 22);
        ctx.fillStyle = "#facc15";
        ctx.fillText(">", panelX + 24, rowY);
      }

      ctx.fillStyle = isSelected ? "#f8fafc" : "#dbeafe";
      ctx.fillText(`${index + 1}. ${itemType.name}`, panelX + 42, rowY);

      if (state.player.weapon === item.id) {
        ctx.fillStyle = "#facc15";
        ctx.fillText("装備中", panelX + 190, rowY);
      }
    }
  }

  ctx.fillStyle = "#090d14";
  ctx.fillRect(panelX + 22, panelY + 235, panelWidth - 44, 48);
  ctx.strokeStyle = "#6b4e27";
  ctx.lineWidth = 2;
  ctx.strokeRect(panelX + 22, panelY + 235, panelWidth - 44, 48);
  ctx.font = "bold 14px 'Yu Gothic UI', sans-serif";
  ctx.fillStyle = "#e6ecff";
  const detailText = selected ? `${itemTypes[selected.type].description}` : "アイテムを持っていない。";
  ctx.fillText(detailText, panelX + 36, panelY + 260);

  ctx.fillStyle = "#c8d3f0";
  ctx.font = "bold 12px 'Yu Gothic UI', sans-serif";
  const hint = items.length > 0 ? "Enter: 使う/装備  D: 置く  Esc: 閉じる" : "Esc: 閉じる";
  ctx.fillText(hint, panelX + 24, panelY + panelHeight - 22);
  ctx.restore();
}

function drawLowHpVignette() {
  if (state.gameOver.active || state.player.hp <= 0 || state.player.maxHp <= 0) return;
  const ratio = state.player.hp / state.player.maxHp;
  if (ratio > 0.35) return;

  const severity = clamp((0.35 - ratio) / 0.35, 0, 1);
  const pulse = 0.75 + Math.sin(runtime.elapsed / 300) * 0.25;
  const alpha = (0.16 + severity * 0.3) * pulse;
  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const innerRadius = Math.min(canvas.width, canvas.height) * 0.34;
  const outerRadius = Math.max(canvas.width, canvas.height) * 0.72;

  const gradient = ctx.createRadialGradient(centerX, centerY, innerRadius, centerX, centerY, outerRadius);
  gradient.addColorStop(0, "rgba(159, 18, 57, 0)");
  gradient.addColorStop(1, `rgba(159, 18, 57, ${alpha.toFixed(3)})`);

  ctx.save();
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

function drawFloorTransitionLayer() {
  if (!floorTransition.active) return;

  const fadeOutEnd = floorTransition.fadeOut;
  const holdEnd = fadeOutEnd + floorTransition.hold;
  const total = holdEnd + floorTransition.fadeIn;
  const age = floorTransition.age;

  let darkness;
  if (age < fadeOutEnd) {
    darkness = age / fadeOutEnd;
  } else if (age < holdEnd) {
    darkness = 1;
  } else {
    darkness = Math.max(0, 1 - (age - holdEnd) / floorTransition.fadeIn);
  }

  ctx.save();
  ctx.globalAlpha = darkness;
  ctx.fillStyle = "#020412";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.restore();

  const cardIn = clamp((age - fadeOutEnd * 0.85) / 180, 0, 1);
  const cardAlpha = cardIn * darkness;
  if (cardAlpha <= 0 || !floorTransition.floorGenerated) return;

  const centerX = canvas.width / 2;
  const centerY = canvas.height / 2;
  const rise = (1 - cardIn) * 8;

  ctx.save();
  ctx.globalAlpha = cardAlpha;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.font = "bold 40px 'Yu Gothic UI', sans-serif";
  ctx.fillStyle = "rgba(15, 23, 42, 0.9)";
  ctx.fillText(`${state.floor}F`, centerX + 2, centerY + rise + 2);
  ctx.fillStyle = "#e2c56b";
  ctx.fillText(`${state.floor}F`, centerX, centerY + rise);

  ctx.strokeStyle = "rgba(214, 177, 95, 0.65)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(centerX - 90, centerY + rise - 34);
  ctx.lineTo(centerX + 90, centerY + rise - 34);
  ctx.moveTo(centerX - 90, centerY + rise + 34);
  ctx.lineTo(centerX + 90, centerY + rise + 34);
  ctx.stroke();

  ctx.font = "12px 'Yu Gothic UI', sans-serif";
  ctx.fillStyle = "rgba(226, 232, 240, 0.75)";
  ctx.fillText("さらに深く潜っていく……", centerX, centerY + rise + 52);
  ctx.restore();
}

function drawOverlayLayer() {
  drawLowHpVignette();

  if (overlay.flashTime > 0) {
    const progress = overlay.flashTime / Math.max(1, overlay.flashDuration);
    ctx.save();
    ctx.globalAlpha = progress;
    ctx.fillStyle = overlay.flashColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }

  if (state.gameOver.active) {
    drawGameOverLayer();
  }
}

function drawGameOverLayer() {
  const progress = clamp(state.gameOver.age / state.gameOver.duration, 0, 1);
  const fade = clamp(progress * 1.4, 0, 0.78);
  const panelAlpha = clamp((progress - 0.25) / 0.55, 0, 1);
  const panelWidth = 420;
  const panelHeight = 312;
  const panelX = Math.round((canvas.width - panelWidth) / 2);
  const panelY = Math.round((canvas.height - panelHeight) / 2);
  const reasonLines = splitTextByLength(state.gameOver.reason || defeatReasons.fallbackEnemy, 15);

  ctx.save();
  ctx.fillStyle = `rgba(6, 8, 13, ${fade})`;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (panelAlpha > 0) {
    ctx.globalAlpha = panelAlpha;
    ctx.fillStyle = "#111827";
    ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    ctx.fillStyle = "rgba(9, 13, 20, 0.72)";
    ctx.fillRect(panelX + 10, panelY + 10, panelWidth - 20, panelHeight - 20);
    ctx.strokeStyle = "#d6b15f";
    ctx.lineWidth = 3;
    ctx.strokeRect(panelX + 2, panelY + 2, panelWidth - 4, panelHeight - 4);
    ctx.strokeStyle = "#5f4624";
    ctx.lineWidth = 2;
    ctx.strokeRect(panelX + 9, panelY + 9, panelWidth - 18, panelHeight - 18);

    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#facc15";
    ctx.font = "bold 18px 'Yu Gothic UI', sans-serif";
    ctx.fillText("ゲームオーバー", canvas.width / 2, panelY + 34);

    ctx.fillStyle = "#fca5a5";
    ctx.font = reasonLines.length > 1 ? "bold 23px 'Yu Gothic UI', sans-serif" : "bold 28px 'Yu Gothic UI', sans-serif";
    for (let i = 0; i < reasonLines.length; i++) {
      ctx.fillText(reasonLines[i], canvas.width / 2, panelY + 68 + i * 28);
    }

    ctx.fillStyle = "#e6ecff";
    ctx.font = "bold 15px 'Yu Gothic UI', sans-serif";
    const lines = [
      `到達階層: ${state.floor}F`,
      `レベル: ${state.player.level}`,
      `撃破数: ${state.stats.defeated}`,
      `経験値: ${state.player.exp}`,
      `経過ターン: ${state.stats.turns}`,
      `装備: ${currentWeaponName()}`,
    ];

    for (let i = 0; i < lines.length; i++) {
      ctx.fillText(lines[i], canvas.width / 2, panelY + 130 + i * 24);
    }

    ctx.fillStyle = "#facc15";
    ctx.font = "bold 14px 'Yu Gothic UI', sans-serif";
    ctx.fillText("Rキーで再挑戦", canvas.width / 2, panelY + panelHeight - 28);
  }

  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  applyCameraShake();
  drawMapLayer();
  drawEventRoomLayer();
  drawStairsLayer();
  drawEventObjectLayer();
  drawItemLayer();
  drawVisibilityLayer();
  drawActorLayer();
  drawEffectsLayer();
  drawDebugStructureOverlay();
  ctx.restore();

  drawMinimapLayer();
  drawMenuLayer();
  drawOverlayLayer();
  drawFloorTransitionLayer();
}

function updateUi() {
  const weapon = equippedWeapon();
  const bonus = weaponAttackBonus();
  ui.floor.textContent = `${state.floor}F`;
  ui.level.textContent = state.player.level;
  ui.hp.textContent = `${Math.max(0, state.player.hp)} / ${state.player.maxHp}`;
  ui.atk.textContent = bonus > 0 ? `${state.player.atk} + ${bonus}` : state.player.atk;
  ui.def.textContent = state.player.def;
  ui.hunger.textContent = state.player.hunger;
  ui.exp.textContent = expDisplayText();
  ui.weapon.textContent = weapon ? itemTypes[weapon.type].name : "なし";
  renderInventory();
}

function renderInventory() {
  const renderKey = `${state.player.weapon || "none"}:${state.player.inventory
    .map((item) => `${item.id}-${item.type}`)
    .join(",")}`;
  if (renderKey === inventoryRenderKey) return;
  inventoryRenderKey = renderKey;
  ui.inventory.innerHTML = "";

  if (state.player.inventory.length === 0) {
    const li = document.createElement("li");
    li.className = "empty";
    li.textContent = "なし";
    ui.inventory.appendChild(li);
    return;
  }

  for (let index = 0; index < state.player.inventory.length; index++) {
    const item = state.player.inventory[index];
    const itemType = itemTypes[item.type];
    const li = document.createElement("li");
    li.textContent = `${itemType.name} / ${itemType.description}`;

    if (state.player.weapon === item.id) {
      const equipped = document.createElement("span");
      equipped.className = "equipped";
      equipped.textContent = " 装備中";
      li.appendChild(equipped);
    }

    ui.inventory.appendChild(li);
  }
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
  if (
    key === " " ||
    key === "arrowup" ||
    key === "arrowdown" ||
    key === "arrowleft" ||
    key === "arrowright" ||
    key === "f2"
  ) {
    event.preventDefault();
  }

  if (dash.active) {
    if (!event.repeat) {
      stopDash();
    }
    return;
  }

  if (key === "f2") {
    debug.structureOverlay = !debug.structureOverlay;
    addLog(`構造表示: ${debug.structureOverlay ? "ON" : "OFF"}`);
    return;
  }

  if (key === "m") {
    minimap.visible = !minimap.visible;
    addLog(`ミニマップ: ${minimap.visible ? "ON" : "OFF"}`);
    return;
  }

  if (key === "r" && state.gameOver.active) {
    resetPlayerRunState();
    clearPlayerMotion();
    clearTransientVisuals();
    addLog("再挑戦！");
    generateFloor();
    return;
  }

  if (isMenuOpen()) {
    handleMenuInput(key);
    return;
  }

  if (key === "i") {
    openInventoryMenu();
    return;
  }

  if (/^[1-9]$/.test(key)) {
    useInventorySlot(Number(key) - 1);
    return;
  }
  const move = event.shiftKey ? startDash : tryMove;
  if (key === "arrowup" || key === "w") move(0, -1);
  if (key === "arrowdown" || key === "s") move(0, 1);
  if (key === "arrowleft" || key === "a") move(-1, 0);
  if (key === "arrowright" || key === "d") move(1, 0);
  if (key === " " && canAcceptInput()) tickTurn();
});

if (ui.soundToggle) {
  ui.soundToggle.addEventListener("click", () => {
    const nextMuted = !sound.muted;
    setSoundMuted(nextMuted);
    if (!nextMuted) {
      playSound("use");
    }
  });
  setSoundMuted(true);
}

generateFloor();
addLog("ダンジョンに入った。階段を目指そう。青いマスが階段だ。");
requestAnimationFrame(loop);
