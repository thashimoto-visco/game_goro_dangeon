# Phase 1 詳細プラン: 描画基盤とSFC風画面の土台

## Phase 1の目的

後続フェーズでグラフィックス、攻撃モーション、アイテム、全滅演出を安全に追加できるように、現在の `main.js` の描画周りを整理する。

このフェーズでは「完成版の美麗アセット」を作り込むよりも、SFC風の見た目へ進むための土台を作る。最終的に、タイル、キャラクター、エフェクト、UIを別々に扱える状態を目指す。

## Phase 1のスコープ

含める:

- 描画処理のレイヤー分割
- アセット定義の一元化
- プレイヤー向きの追加
- アニメーション時間の管理
- エフェクト配列の追加
- タイル描画の入口整備
- 画面シェイクやフラッシュを後から入れられる描画構造
- SFC風画面に向けた色とサイズの基本ルール

含めない:

- 完成版の全アセット制作
- 本格的な攻撃モーション実装
- インベントリ実装
- 武器効果実装
- 全滅時の完成演出
- BGM/SE追加
- 大規模なファイル分割

## 現状の課題

### 描画処理が `draw()` に集中している

現在はマップ、階段、敵、プレイヤー描画が `draw()` にまとまっている。小規模な今は問題ないが、エフェクト、ダメージ数字、アイテム、全滅オーバーレイが増えると見通しが悪くなる。

### `drawImage` の座標が直接書かれている

プレイヤースプライトの切り出し座標が描画処理内に直接書かれている。アセット変更時に黒背景を拾うなどの事故が起きやすい。

### ターン処理と演出処理の境界がない

敵に攻撃した瞬間にダメージが確定する。攻撃モーションを入れるには、戦闘結果と視覚演出のタイミングを分ける必要がある。

### プレイヤーの向きがない

攻撃・移動・待機アニメーションのためには、最後に入力した方向を保持する必要がある。

## 実装方針

Phase 1では単一 `main.js` のまま関数と状態を整理する。ファイル分割は後続フェーズで必要になった時に行う。

基本方針:

- 既存のゲーム動作を壊さない。
- `draw()` は描画順を読むための薄い関数にする。
- アセット座標は定数に集約する。
- アニメーション用の `time` と `effects` を追加する。
- 描画レイヤーの順番を固定する。

推奨描画順:

1. 背景クリア
2. 画面シェイク用の座標変換
3. マップタイル
4. 階段
5. 床アイテム用レイヤー
6. モンスター
7. プレイヤー
8. エフェクト
9. フラッシュ/暗転などのオーバーレイ

## データ設計

### アセット定義

`drawImage` の座標を直接書かず、定数にまとめる。

例:

```js
const sprites = {
  player: {
    idle: {
      down: { image: goroImage, x: 80, y: 70, w: 128, h: 176 },
      up: { image: goroImage, x: 80, y: 70, w: 128, h: 176 },
      left: { image: goroImage, x: 80, y: 70, w: 128, h: 176 },
      right: { image: goroImage, x: 80, y: 70, w: 128, h: 176 },
    },
  },
};
```

Phase 1では同じ画像を4方向に割り当ててもよい。Phase 2で本当の4方向スプライトへ差し替える。

### プレイヤー向き

`state.player` に `direction` を追加する。

```js
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
}
```

入力に応じて更新する。

```js
function directionFromDelta(dx, dy) {
  if (dx > 0) return "right";
  if (dx < 0) return "left";
  if (dy > 0) return "down";
  if (dy < 0) return "up";
  return state.player.direction;
}
```

### 時間管理

`requestAnimationFrame` のtimestampを使い、アニメーションの経過時間を管理する。

```js
const runtime = {
  lastTime: 0,
  elapsed: 0,
};
```

`loop(timestamp)` に変更する。

```js
function loop(timestamp) {
  const delta = timestamp - runtime.lastTime;
  runtime.lastTime = timestamp;
  updateAnimations(delta);
  draw();
  updateUi();
  requestAnimationFrame(loop);
}
```

初回フレームでは `lastTime` が0の可能性があるため、過大な `delta` を避ける。

### エフェクト状態

Phase 1では描画できる最小の枠だけ用意する。

```js
const effects = [];
```

想定するエフェクト:

- `floatingText`: ダメージ数字やメッセージ
- `slash`: 攻撃エフェクト
- `flash`: 画面フラッシュ
- `shake`: 画面シェイク

Phase 1で最低限実装する候補:

```js
function addFloatingText(text, x, y, color = "#ffffff") {
  effects.push({
    type: "floatingText",
    text,
    x,
    y,
    age: 0,
    duration: 600,
    color,
  });
}
```

戦闘計算に組み込むのはPhase 3でもよい。Phase 1ではテスト用に階層移動や戦闘ログと連動させる程度に留める。

## 関数分割案

### 描画系

追加または整理する関数:

- `draw()`
- `withCameraShake(callback)`
- `drawMapLayer()`
- `drawStairsLayer()`
- `drawItemLayer()`
- `drawEnemyLayer()`
- `drawPlayerLayer()`
- `drawEffectsLayer()`
- `drawOverlayLayer()`
- `drawSprite(sprite, dx, dy, dw, dh)`

`draw()` は以下のような読みやすい形を目指す。

```js
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  applyCameraShake();
  drawMapLayer();
  drawStairsLayer();
  drawItemLayer();
  drawEnemyLayer();
  drawPlayerLayer();
  drawEffectsLayer();
  ctx.restore();

  drawOverlayLayer();
}
```

### 状態更新系

追加または整理する関数:

- `updateAnimations(delta)`
- `updateEffects(delta)`
- `removeExpiredEffects()`
- `setPlayerDirection(dx, dy)`
- `canAcceptInput()`

Phase 1時点では `canAcceptInput()` は常に `true` でもよい。Phase 3で攻撃中は `false` にする。

### アセット系

追加または整理する関数:

- `createImage(src)`
- `isImageReady(image)`
- `drawSprite(sprite, dx, dy, dw, dh)`

画像読み込みチェックを毎回直接書かない。

```js
function isImageReady(image) {
  return image && image.complete && image.naturalWidth > 0;
}
```

## タスク一覧

### Task 1: 描画定数を整理する

内容:

- `TILE`, `COLS`, `ROWS` の近くに描画関連定数を追加する。
- プレイヤー描画サイズ、敵描画サイズ、タイル余白を定数化する。

例:

```js
const PLAYER_DRAW = { offsetX: 5, offsetY: 1, w: 22, h: 30 };
const ENEMY_DRAW = { offsetX: 4, offsetY: 4, w: 24, h: 24 };
```

受け入れ条件:

- `drawImage` の表示サイズがマジックナンバーだらけではない。
- 見た目が現状から大きく崩れていない。

### Task 2: アセット定義を一元化する

内容:

- `goroSprite` を `sprites.player.idle.down` などに移す。
- モンスター画像も `sprites.monsters` にまとめる。
- `isImageReady()` を追加する。

受け入れ条件:

- プレイヤーと敵の画像読み込み判定が共通化されている。
- プレイヤースプライト座標が描画処理内に直接散らばっていない。

### Task 3: プレイヤー方向を追加する

内容:

- `state.player.direction` を追加する。
- `tryMove(dx, dy)` の最初で方向を更新する。
- 壁にぶつかった場合でも向きは変わるようにする。

受け入れ条件:

- 上下左右キー入力で `state.player.direction` が更新される。
- 移動できない壁方向へ入力しても向きが変わる。
- 既存の移動・戦闘挙動が壊れていない。

### Task 4: 描画レイヤーを分割する

内容:

- `drawMapLayer()`
- `drawStairsLayer()`
- `drawEnemyLayer()`
- `drawPlayerLayer()`
- `drawEffectsLayer()`
- `drawOverlayLayer()`

を追加する。

受け入れ条件:

- `draw()` は描画順を並べるだけに近い形になる。
- マップ、階段、敵、プレイヤーの見た目が維持される。
- 後続でアイテムやエフェクトを差し込む場所が明確。

### Task 5: アニメーション時間を導入する

内容:

- `loop(timestamp)` 形式へ変更する。
- `runtime.lastTime` と `delta` を導入する。
- `updateAnimations(delta)` を追加する。

受け入れ条件:

- 既存のゲームループが継続する。
- `delta` が取得できている。
- 長時間タブ非アクティブ後に戻っても極端な演出飛びを起こさないよう、`delta` に上限を設ける。

例:

```js
const delta = Math.min(100, timestamp - runtime.lastTime);
```

### Task 6: エフェクト配列を追加する

内容:

- `effects` 配列を追加する。
- `updateEffects(delta)` を追加する。
- `drawEffectsLayer()` を追加する。
- 最小実装として `floatingText` を描画できるようにする。

受け入れ条件:

- エフェクトが時間経過で消える。
- エフェクト描画がゲーム状態を壊さない。
- 後続の攻撃エフェクトに流用できる。

### Task 7: 画面演出の入口を作る

内容:

- `screenEffects` または `camera` 状態を追加する。
- シェイク量、フラッシュ色、暗転濃度を保持できる形にする。
- Phase 1では未使用またはテスト用に留める。

例:

```js
const camera = {
  shakeTime: 0,
  shakeDuration: 0,
  shakeStrength: 0,
};

const overlay = {
  flashTime: 0,
  flashDuration: 0,
  flashColor: "rgba(255,255,255,0)",
};
```

受け入れ条件:

- `draw()` にシェイクとオーバーレイを挟める構造がある。
- 通常プレイ時に画面がずれたり暗くなったりしない。

### Task 8: SFC風ビジュアルルールを仮決定する

内容:

- タイルサイズは現状の `32x32` を維持。
- 内部アセットは16pxまたは32px相当のドット絵風に寄せる。
- 色数を抑えたパレットを使う。
- canvasは `image-rendering: pixelated` を維持。

受け入れ条件:

- Phase 2以降で作るアセットのサイズと表示ルールが明文化されている。
- 描画サイズの基準がコード上でも読み取れる。

## 推奨コミット分割

1. 描画定数とアセット定義の整理
2. プレイヤー方向の追加
3. 描画レイヤー分割
4. アニメーション時間とエフェクト枠の追加
5. 画面演出入口と軽い確認

## Phase 1完了条件

- `draw()` がレイヤー構造になっている。
- プレイヤーに `direction` がある。
- アセット座標が定数化されている。
- `loop(timestamp)` で `delta` を扱っている。
- `effects` を更新・描画・削除できる。
- 画面シェイク/フラッシュ/暗転を後から追加できる入口がある。
- 既存の移動、戦闘、階段、再挑戦が動く。
- ブラウザのコンソールに画像読み込みやJSエラーが出ない。

## 手動テスト項目

### 起動

- `index.html` をブラウザで開く。
- タイトル、canvas、ステータス、ログが表示される。
- コンソールにエラーが出ない。

### 移動

- 矢印キーまたはWASDで上下左右に移動できる。
- 壁に向かって入力してもクラッシュしない。
- 壁方向入力でもプレイヤーの向きが更新される。

### 戦闘

- 敵に隣接して敵方向へ移動入力すると攻撃できる。
- 敵を倒すと経験値が増える。
- 敵からダメージを受ける。

### 階段

- 階段に乗ると次階へ進む。
- プレイヤー位置、敵位置、階段位置が再生成される。

### 全滅と再挑戦

- HP 0になると操作が止まる。
- `R` キーで再挑戦できる。
- 再挑戦後にエフェクトやオーバーレイが残らない。

## 実装時の注意

- 既存の日本語ログ文言は不用意に変えない。
- ゲーム仕様変更はPhase 1では最小限に留める。
- `drawImage` の切り出し座標は定数以外に増やさない。
- 新しい状態を追加したら、再挑戦時の初期化漏れに注意する。
- エフェクト配列は無制限に増えないよう、期限切れ削除を必ず入れる。
- `delta` は上限を設ける。

## Phase 2への引き継ぎ

Phase 1完了後、Phase 2では以下を行う。

- `drawMapLayer()` をタイル画像描画へ差し替える。
- `sprites.player.idle` を4方向画像へ差し替える。
- `drawItemLayer()` に床アイテム画像を描画する。
- `drawOverlayLayer()` をUI演出にも使えるようにする。
- 必要なら `assets/tiles/` と `assets/sprites/` を追加する。
