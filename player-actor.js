(function (global) {
  const DIRECTIONS = ["down", "up", "left", "right"];

  const PLAYER_ACTOR = {
    key: "goro",
    draw: { offsetX: -27.5, offsetY: -100, w: 55, h: 100 },
    motion: {
      idleCycle: 980,
      walkContactInterval: 180,
      walkBob: 0.6,
      walkTilt: 0.008,
      attackTilt: 0.12,
      damageDuration: 220,
      damageKnockback: 6,
    },
    assets: {
      idleDown: "assets/actors/goro/runtime/goro-idle-down-v3.webp",
      idleUp: "assets/actors/goro/runtime/goro-idle-up-v2.webp",
      idleRight: "assets/actors/goro/runtime/goro-idle-right-v1.webp",
      idleLeft: "assets/actors/goro/runtime/goro-idle-left-relit-v1.webp",
      walkDownRightContact: "assets/actors/goro/runtime/goro-walk-down-right-foot-forward-v1.webp",
      walkDownLeftContact: "assets/actors/goro/runtime/goro-walk-down-left-foot-forward-relit-v1.webp",
      walkUpRightContact: "assets/actors/goro/runtime/goro-walk-up-right-foot-forward-v1.webp",
      walkUpLeftContact: "assets/actors/goro/runtime/goro-walk-up-left-foot-forward-relit-v1.webp",
      walkRightRightContact:
        "assets/actors/goro/runtime/goro-walk-right-contact-right-leg-left-arm-forward-v3.webp",
      walkRightLeftPassing: "assets/actors/goro/runtime/goro-walk-right-passing-left-leg-v1.webp",
      walkRightLeftContact:
        "assets/actors/goro/runtime/goro-walk-right-contact-left-leg-right-arm-forward-v3.webp",
      walkRightRightPassing: "assets/actors/goro/runtime/goro-walk-right-passing-right-leg-v1.webp",
      walkLeftRightContact:
        "assets/actors/goro/runtime/goro-walk-left-contact-right-leg-left-arm-forward-relit-v3.webp",
      walkLeftLeftPassing:
        "assets/actors/goro/runtime/goro-walk-left-passing-left-leg-relit-v1.webp",
      walkLeftLeftContact:
        "assets/actors/goro/runtime/goro-walk-left-contact-left-leg-right-arm-forward-relit-v3.webp",
      walkLeftRightPassing:
        "assets/actors/goro/runtime/goro-walk-left-passing-right-leg-relit-v1.webp",
      attackDown: "assets/actors/goro/runtime/goro-attack-down-v1.webp",
      attackUp: "assets/actors/goro/runtime/goro-attack-up-v1.webp",
      attackRight: "assets/actors/goro/runtime/goro-attack-right-v1.webp",
      attackLeft: "assets/actors/goro/runtime/goro-attack-left-relit-v1.webp",
    },
    clips: {
      idle: {
        down: [{ asset: "idleDown", duration: 1 }],
        up: [{ asset: "idleUp", duration: 1 }],
        right: [{ asset: "idleRight", duration: 1 }],
        left: [{ asset: "idleLeft", duration: 1 }],
      },
      walk: {
        down: [
          { asset: "walkDownRightContact", duration: 180 },
          { asset: "walkDownLeftContact", duration: 180 },
        ],
        up: [
          { asset: "walkUpRightContact", duration: 180 },
          { asset: "walkUpLeftContact", duration: 180 },
        ],
        right: [
          { asset: "walkRightRightContact", duration: 90 },
          { asset: "walkRightLeftPassing", duration: 90 },
          { asset: "walkRightLeftContact", duration: 90 },
          { asset: "walkRightRightPassing", duration: 90 },
        ],
        left: [
          { asset: "walkLeftRightContact", duration: 90 },
          { asset: "walkLeftLeftPassing", duration: 90 },
          { asset: "walkLeftLeftContact", duration: 90 },
          { asset: "walkLeftRightPassing", duration: 90 },
        ],
      },
      attack: {
        down: [{ asset: "attackDown", duration: 1, drawW: 75, drawH: 100 }],
        up: [{ asset: "attackUp", duration: 1, drawW: 55, drawH: 100 }],
        left: [{ asset: "attackLeft", duration: 1, drawW: 90, drawH: 100 }],
        right: [{ asset: "attackRight", duration: 1, drawW: 90, drawH: 100 }],
      },
    },
  };

  function validateDefinition(definition) {
    if (!definition || typeof definition !== "object") {
      throw new Error("プレイヤーアクター定義がありません。");
    }

    for (const action of ["idle", "walk", "attack"]) {
      const directionalClips = definition.clips?.[action];
      if (!directionalClips) throw new Error(`プレイヤーclip ${action} がありません。`);
      for (const direction of DIRECTIONS) {
        const frames = directionalClips[direction];
        if (!Array.isArray(frames) || frames.length === 0) {
          throw new Error(`プレイヤーclip ${action}.${direction} が空です。`);
        }
        for (const frame of frames) {
          if (!definition.assets[frame.asset]) {
            throw new Error(`プレイヤーasset ${frame.asset} が定義されていません。`);
          }
          if (!Number.isFinite(frame.duration) || frame.duration <= 0) {
            throw new Error(`プレイヤーclip ${action}.${direction} のdurationが不正です。`);
          }
        }
      }
    }
  }

  function spriteFromFrame(frame, images) {
    const sprite = { image: images[frame.asset] };
    for (const key of [
      "x",
      "y",
      "w",
      "h",
      "flipX",
      "drawW",
      "drawH",
      "drawOffsetX",
      "drawOffsetY",
    ]) {
      if (frame[key] !== undefined) sprite[key] = frame[key];
    }
    return { ...frame, sprite };
  }

  function selectFrame(frames, progress = 0) {
    if (!Array.isArray(frames) || frames.length === 0) return null;
    if (frames.length === 1) return frames[0];

    const safeProgress = Math.max(0, Math.min(0.999999, Number(progress) || 0));
    const totalDuration = frames.reduce((total, frame) => total + frame.duration, 0);
    let cursor = safeProgress * totalDuration;
    for (const frame of frames) {
      if (cursor < frame.duration) return frame;
      cursor -= frame.duration;
    }
    return frames[frames.length - 1];
  }

  function selectFrameAtElapsed(frames, elapsed = 0) {
    if (!Array.isArray(frames) || frames.length === 0) return null;
    if (frames.length === 1) return frames[0];

    const totalDuration = frames.reduce((total, frame) => total + frame.duration, 0);
    let cursor = ((Number(elapsed) || 0) % totalDuration + totalDuration) % totalDuration;
    for (const frame of frames) {
      if (cursor < frame.duration) return frame;
      cursor -= frame.duration;
    }
    return frames[frames.length - 1];
  }

  function createSystem(definition = PLAYER_ACTOR) {
    validateDefinition(definition);
    return {
      definition,
      assetEntries() {
        return Object.entries(definition.assets);
      },
      createClips(images) {
        return Object.fromEntries(
          Object.entries(definition.clips).map(([action, directionalClips]) => [
            action,
            Object.fromEntries(
              Object.entries(directionalClips).map(([direction, frames]) => [
                direction,
                frames.map((frame) => spriteFromFrame(frame, images)),
              ])
            ),
          ])
        );
      },
      clipFor(clips, action, direction) {
        return clips[action]?.[direction] || clips[action]?.down || [];
      },
      frameAtProgress(frames, progress) {
        return selectFrame(frames, progress);
      },
      frameAtElapsed(frames, elapsed) {
        return selectFrameAtElapsed(frames, elapsed);
      },
    };
  }

  global.GORO_DUNGEON_PLAYER_ACTOR = {
    definition: PLAYER_ACTOR,
    createSystem,
  };
})(typeof window !== "undefined" ? window : globalThis);
