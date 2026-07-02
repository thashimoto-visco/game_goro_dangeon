# アニメーション/モーション資産方針

## 目的

吾郎とモンスターを増やしても、`main.js` にキャラクター個別の分岐を戻さない。
モーションは「誰か固有の実装」ではなく、データ定義と汎用再生処理で増やせる形にする。

## 現在の前提

- 吾郎は spritesheet から `idle / walk / attack` の一部フレームを参照している。
- モンスターは `monster-catalog.js` で画像、描画サイズ、motion profile、fallback shape、burst を定義する。
- 敵の正規化、fallback、生成は `monster-system.js` が担当する。
- `main.js` は現時点では描画パイプラインとゲーム進行をつないでいるが、敵種別名を知らない。

## 方針

### 1. モーションは二層に分ける

1. **visual asset**
   画像ファイル、spritesheet 座標、フレーム列、向き、基準点を定義する。

2. **motion profile**
   bob、scale、rotation、hit、attack、shadow など、手続き的な揺れや反応を定義する。

フレームアニメがあるキャラクターでも、攻撃反動や被弾の補正は motion profile で重ねる。

### 2. モンスター追加は catalog だけで始められる

最小定義:

```js
{
  key: "newMonster",
  name: "新しい魔物",
  stats: { baseHp: 6, baseAtk: 3, hpScale: 1, atkScale: 0.4, exp: 5 },
  asset: "assets/monster_new.svg",
  draw: { offsetX: -24, offsetY: -58, w: 48, h: 58 },
  motion: { cycle: 760, bob: 1, anchor: 0.92 },
  fallbackShape: { kind: "block", fill: "#f59e0b" },
  burst: { kind: "chunks" }
}
```

画像が未完成でも `fallbackShape` で仮表示できる。
つまり、ゲームロジック、出現テーブル、視界、描画パイプラインを壊さずに敵を増やせる。

### 3. 将来のフレームアニメ拡張

`monster-catalog.js` には将来的に `clips` を追加する。

```js
clips: {
  idle: [{ x: 0, y: 0, w: 48, h: 48, duration: 180 }],
  walk: [{ x: 48, y: 0, w: 48, h: 48, duration: 120 }],
  attack: [{ x: 96, y: 0, w: 48, h: 48, duration: 100 }],
  hit: [{ x: 144, y: 0, w: 48, h: 48, duration: 80 }]
}
```

再生処理は `monster-system.js` または将来の `actor-animation-system.js` に集約する。
`main.js` は `drawEnemyActor(enemy)` の入口を持つだけにする。

### 4. 吾郎の扱い

吾郎も最終的には専用定数ではなく、プレイヤー用 actor definition に寄せる。

候補:

```js
const playerActorDefinition = {
  key: "goro",
  draw: { offsetX: -22, offsetY: -92, w: 44, h: 92 },
  clips: {
    idle: { down: ..., up: ..., left: ..., right: ... },
    walk: { down: [...], up: [...], left: [...], right: [...] },
    attack: { down: ..., up: ..., left: ..., right: ... },
    hit: { down: ..., up: ..., left: ..., right: ... }
  },
  motion: {
    idleCycle: 980,
    walkBob: 4,
    attackTilt: 0.12,
    damageDuration: 220,
    damageKnockback: 6
  }
};
```

吾郎だけ特別扱いする場合でも、例外は「入力とゲーム進行」までに留める。
描画・フレーム選択・被弾/攻撃補正は actor animation system へ寄せる。

## 次に実装するなら

1. `player-actor.js` を作り、`PLAYER_DRAW / PLAYER_MOTION / sprites.player` を移す。
2. `actor-animation-system.js` を作り、clip 選択と procedural tuning を共通化する。
3. `monster-catalog.js` に `clips` を受け入れる schema を追加する。
4. 既存の procedural monster motion は clips がない場合の fallback として残す。

## 完了条件

- 新しい敵を追加するとき、`main.js` に敵キーを書かない。
- 新しいモーションを追加するとき、`main.js` にキャラクター名分岐を書かない。
- 画像未完成でも fallback shape と procedural motion でゲーム上に出せる。
- フレームアニメが追加されたら、同じ actor pipeline で再生できる。
