function createSeededRng(seed) {
  let state = seed >>> 0;
  return function rng(min, max) {
    state = (state * 1664525 + 1013904223) >>> 0;
    return min + (state % (max - min + 1));
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function isSameRoom(a, b) {
  return a && b && a.x === b.x && a.y === b.y && a.w === b.w && a.h === b.h;
}

function roomsOverlap(a, b) {
  if (!a || !b) return false;
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

module.exports = {
  clamp,
  createSeededRng,
  isSameRoom,
  roomsOverlap,
};

