# Phase 2 詳細プラン: SFC風グラフィックス差し替え

## Phase 2の目的

Phase 1で整理した描画レイヤーを使い、ゲーム画面を単色矩形中心の見た目から、スーパーファミコン風のタイルマップ画面へ引き上げる。

このフェーズのゴールは「完成版アセットを全て揃える」ことではなく、以降の攻撃モーション、アイテム、全滅演出を載せても破綻しないビジュアル基準を作ること。画面を見た瞬間に、床、壁、階段、敵、吾郎の位置関係が読み取れ、かつ今よりゲーム画面らしく見える状態を目指す。

## Phase 2の前提

Phase 1で以下が実装済みであることを前提にする。

- `sprites` によるアセット定義
- `state.player.direction`
- `drawMapLayer()`
- `drawStairsLayer()`
- `drawItemLayer()`
- `drawEnemyLayer()`
- `drawPlayerLayer()`
- `drawEffectsLayer()`
- `drawOverlayLayer()`
- `loop(timestamp)` による `delta` 時間管理
- 簡易エフェクト、画面シェイク、フラッシュの入口

## Phase 2のスコープ

含める:

- SFC風タイルアセットの追加
- 床、壁、通路、階段の画像描画化
- タイルバリエーション表示
- プレイヤーとMOBを大きく表示するための描画スケール基準
- 全体マップ表示からスクロールカメラ表示への移行
- `assets/materials/spritesheet.webp` を使った吾郎の方向別スプライト定義
- 吾郎の移動時歩行モーション
- モンスターの表示サイズと基準位置の統一
- アイテムアイコン用の仮アセット定義
- UIパネルのSFC風スタイル調整
- READMEまたは計画書へのアセット方針メモ追記

含めない:

- 本格的な攻撃モーション
- 武器、所持品、床アイテムのゲームロジック
- 全滅演出の完成版
- 音声追加
- 大規模なJSファイル分割

## 目標ビジュアル

### 画面密度

- 640x480のcanvasを維持する。
- 1タイルは内部座標として現状どおり `32x32` を維持する。
- ただし、プレイヤーとMOBは1タイル内に完全に収める前提をやめる。
- プレイヤーは添付されたCodexペット画像のように、画面内で高さ70から90px程度の存在感を目標にする。
- MOBは種類ごとに差をつけつつ、標準で高さ42から64px程度を目標にする。
- キャラクターは「足元が現在マスに乗っている」ように描く。上半身が隣マスにはみ出すことは許容する。
- 全体マップを常時1画面に収めるのではなく、プレイヤー中心のスクロールカメラで表示する。
- 内部アセットは16pxまたは32px相当のドット絵風で作り、canvas側でピクセル感を維持する。
- マップ全体は暗めのダンジョンだが、床、壁、敵、吾郎のシルエットは明確に分ける。

### スクロールカメラ方針

Phase 2では、マップ全体をcanvasに固定表示する方式から、カメラがプレイヤーを追う方式へ移行する。

目的:

- キャラクターを大きく表示しても画面が窮屈にならないようにする。
- 今後マップサイズを広げても描画方式を変えずに済むようにする。
- 攻撃モーション、アイテム、全滅演出を見せるための画面余白を作る。

初期方針:

- `TILE = 32` はゲームロジック用のマスサイズとして維持する。
- canvasの表示範囲は `640x480` のまま。
- `camera.x` / `camera.y` をワールド座標pxで持つ。
- 描画時は `worldToScreenX()` / `worldToScreenY()` を通してcanvas座標に変換する。
- カメラはプレイヤーの足元を中心に追う。
- マップ端では空白が見えないようにクランプする。
- Phase 2ではスムーズ追従は任意。まずは即時追従でよい。

現状の `COLS * TILE = 640`, `ROWS * TILE = 480` はcanvasと同サイズなので、スクロール効果を出すにはマップ生成サイズを表示サイズより大きくする。

推奨:

```js
const COLS = 40;
const ROWS = 30;
const VIEW_COLS = 20;
const VIEW_ROWS = 15;
```

または、まずは `COLS = 32`, `ROWS = 24` 程度に拡大する。

### キャラクター表示サイズ方針

添付画像のCodexペットくらいの存在感を目安に、吾郎は「小さな駒」ではなく「画面内の主役」として扱う。

推奨値:

```js
const PLAYER_DRAW = {
  offsetX: -18,
  offsetY: -54,
  w: 68,
  h: 88,
};
```

意味:

- 吾郎の足元がタイル中央下あたりに合うようにする。
- 高さはおおよそ2.5から3タイルぶん。
- 横幅は2タイル程度まで許容する。
- 当たり判定は従来どおり1マスのまま。

MOB推奨値:

```js
const ENEMY_DRAW_DEFAULT = {
  offsetX: -8,
  offsetY: -28,
  w: 48,
  h: 58,
};
```

種類別の目安:

- スライム: `40x34` 程度。低く横広。
- コウモリ: `54x42` 程度。少し上に浮かせる。
- ゴーレム: `58x66` 程度。吾郎より少し低いが重い。

注意:

- 見た目だけが大きくなるため、足元基準と描画順が重要になる。
- 下にいるキャラほど手前に見えるよう、敵とプレイヤーは `y` 座標でソートして描画する。

### 色の方向性

単色の暗い青灰色から少し離れ、石床・土・苔・金属感を混ぜる。

候補パレット:

- 床: `#2d3442`, `#343b4b`, `#465163`
- 壁: `#141922`, `#202736`, `#313a4e`
- 輪郭: `#080b10`, `#0f172a`
- 階段: `#7dd3fc`, `#38bdf8`, `#e0f2fe`
- UI枠: `#d6b15f`, `#6b4e27`, `#111827`
- 危険色: `#fb7185`, `#f97316`

注意:

- 画面全体が暗青色だけに寄りすぎないよう、床に少し温かいグレーや苔色を入れる。
- 吾郎と敵の視認性を最優先にする。

## アセット構成案

### 追加フォルダ

Phase 2で以下のフォルダを追加する。

```text
assets/tiles/
assets/icons/
```

将来的に分ける場合の候補:

```text
assets/sprites/
assets/effects/
```

ただし、Phase 2では既存 `assets/materials/spritesheet.webp` を吾郎用に使うため、プレイヤー画像の新規分割は必須ではない。

### タイルアセット

最低限追加する。

```text
assets/tiles/floor_01.svg
assets/tiles/floor_02.svg
assets/tiles/floor_03.svg
assets/tiles/wall_01.svg
assets/tiles/wall_02.svg
assets/tiles/wall_03.svg
assets/tiles/stairs_down.svg
```

追加候補:

```text
assets/tiles/floor_crack.svg
assets/tiles/floor_moss.svg
assets/tiles/wall_corner.svg
assets/tiles/wall_shadow.svg
```

Phase 2ではまず単純なランダム/座標ベースのバリエーションでよい。壁の接続判定によるオートタイルは後回しにする。

### アイコン仮アセット

ゲームロジックはPhase 4だが、描画レイヤーの準備として仮アイコンだけ定義する。

```text
assets/icons/item_weapon.svg
assets/icons/item_food.svg
assets/icons/item_potion.svg
```

このフェーズでは `drawItemLayer()` にテスト表示を入れるか、未使用定義だけに留める。実際の床アイテム配置はPhase 4で行う。

## 吾郎スプライト方針

ユーザー指定の `assets/materials/spritesheet.webp` を使用する。

### Phase 2でやること

- `sprites.player.idle` に方向別の切り出し座標を設定する。
- まずは「前向き」「横向き」を実際のシートから拾う。
- 後ろ向きがない場合は前向きまたは横向きの暫定代替を使う。
- `state.player.direction` に応じて `drawPlayerLayer()` が選ぶ仕組みは維持する。

### 候補セル

現状確認済み:

- シートサイズ: `1536x1872`
- 先頭立ち絵の透過範囲: おおよそ `x=52, y=5, w=87, h=185`

Phase 2で追加確認する候補:

- 前向き立ち: 1段目
- 横向き走り: 2段目または3段目
- ダメージ/落胆: 下段の落ち込みポーズ
- 構え: 下段の拳を構えたポーズ

攻撃や全滅ポーズはPhase 3/5で使うため、Phase 2では座標メモだけ残す。

## コード設計

### ワールド座標と画面座標

スクロールカメラを入れるため、座標を以下の3つに分ける。

- マップ座標: `x`, `y` のグリッド座標
- ワールド座標: `x * TILE`, `y * TILE` のpx座標
- 画面座標: ワールド座標から `camera.x`, `camera.y` を引いたcanvas座標

追加する関数候補:

```js
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

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
```

カメラ更新候補:

```js
function updateCameraTarget() {
  const playerCenterX = state.player.x * TILE + TILE / 2;
  const playerCenterY = state.player.y * TILE + TILE / 2;
  const mapWidth = COLS * TILE;
  const mapHeight = ROWS * TILE;
  camera.x = clamp(playerCenterX - canvas.width / 2, 0, Math.max(0, mapWidth - canvas.width));
  camera.y = clamp(playerCenterY - canvas.height / 2, 0, Math.max(0, mapHeight - canvas.height));
}
```

重要:

- `canvas.width` / `canvas.height` は表示サイズ。
- `COLS` / `ROWS` はマップ生成サイズ。
- ゲームロジックにはカメラ座標を持ち込まない。
- 描画関数だけが `worldToScreenX()` / `worldToScreenY()` を使う。

### アセット定義

`images` にタイルとアイコンを追加する。

例:

```js
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
};
```

`sprites` には描画で使う定義をまとめる。

```js
const sprites = {
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
};
```

### タイル選択

床/壁のバリエーションはランダムにしない。毎フレーム変わるとちらつくため、座標から決定する。

例:

```js
function tileVariant(x, y, count) {
  return Math.abs((x * 31 + y * 17 + state.floor * 13) % count);
}
```

この関数を使うと、同じ階層では同じ見た目を維持できる。

### 描画フォールバック

画像が読み込めない場合は既存の矩形描画に戻す。

```js
const didDraw = drawSprite(sprite, x * TILE, y * TILE, TILE, TILE);
if (!didDraw) {
  drawFallbackTile(tile, x, y);
}
```

これにより、アセット読み込みに失敗してもゲーム画面が真っ黒にならない。

## タスク一覧

### Task 1: タイル/アイコン用フォルダを追加

内容:

- `assets/tiles/` を追加する。
- `assets/icons/` を追加する。

受け入れ条件:

- 用途別にアセットを置ける。
- 既存アセットを移動しない。

### Task 2: SFC風タイルSVGを追加

内容:

- 床3種類
- 壁3種類
- 階段1種類

受け入れ条件:

- 各SVGが `32x32` viewBoxで作られている。
- 床と壁が一目で区別できる。
- canvasの暗い背景上でも階段が見える。

### Task 3: アイコン仮SVGを追加

内容:

- 武器
- 食料
- 回復薬

受け入れ条件:

- `32x32` viewBoxで作られている。
- Phase 4で床アイテムとしてそのまま使える。
- UIにも流用できる程度にシルエットが明確。

### Task 4: `images` と `sprites` にタイル/アイコンを追加

内容:

- `images.tiles`
- `images.icons`
- `sprites.tiles`
- `sprites.icons`

を追加する。

受け入れ条件:

- アセットパスが一箇所で管理されている。
- `drawMapLayer()` から `sprites.tiles` を参照できる。

### Task 5: マップサイズと表示サイズを分離する

内容:

- canvasサイズは `640x480` を維持する。
- マップ生成サイズをcanvasより大きくする。
- 例: `COLS = 40`, `ROWS = 30`。
- 必要なら表示用定数 `VIEW_COLS`, `VIEW_ROWS` を追加する。

受け入れ条件:

- 1フロアが画面より広くなる。
- プレイヤー移動に合わせて画面がスクロールする準備ができる。
- 階段、敵、部屋生成が拡大後のマップ内に収まる。

### Task 6: スクロールカメラを追加する

内容:

- `camera.x`, `camera.y` をワールド座標として定義する。
- `clamp()` を追加する。
- `updateCameraTarget()` を追加する。
- `worldToScreenX()` / `worldToScreenY()` を追加する。
- 描画レイヤーは画面座標へ変換して描く。

受け入れ条件:

- プレイヤーが画面中央付近に表示される。
- マップ端では画面外に空白が出ない。
- 既存の移動、戦闘、階段処理はグリッド座標のまま維持される。

### Task 7: `drawMapLayer()` をタイル画像描画に変更

内容:

- `#` は壁タイル
- `.` は床タイル
- 座標ベースでバリエーションを選択
- 画像未読み込み時は既存の矩形描画

受け入れ条件:

- 単色矩形ではなく、床/壁がタイル画像で表示される。
- 毎フレームちらつかない。
- 既存の歩行判定に影響しない。

### Task 8: `drawStairsLayer()` を画像描画に変更

内容:

- `stairs_down.svg` を使う。
- 読み込み失敗時は既存の青い矩形。

受け入れ条件:

- 階段が床と明確に区別できる。
- 階段マスに乗る既存挙動が変わらない。

### Task 9: 吾郎の方向別スプライト座標と大型表示を入れる

内容:

- `sprites.player.idle.down`
- `sprites.player.idle.left`
- `sprites.player.idle.right`
- `sprites.player.idle.up`

をシートから設定する。
- `PLAYER_DRAW` を高さ70から90px程度へ拡大する。
- 描画位置は足元基準にする。

受け入れ条件:

- 左右入力時に横向きの吾郎が表示される。
- 上入力時は暫定でもよいが、定義が分かれている。
- 画像切り出しに黒背景や隣セルが混ざらない。
- 吾郎が添付画像のペット程度の存在感で表示される。
- 吾郎の足元が現在マスに合っている。

### Task 10: モンスター表示サイズと足元基準を整える

内容:

- 敵画像の描画サイズを現在より大きくする。
- 必要ならモンスターごとに微調整定義を追加する。
- 敵とプレイヤーを足元 `y` 座標でソートして描画する。

例:

```js
monsters: {
  slime: { image: images.monsters.slime, offsetX: -4, offsetY: -10, w: 40, h: 34 },
  bat: { image: images.monsters.bat, offsetX: -10, offsetY: -22, w: 54, h: 42 },
  golem: { image: images.monsters.golem, offsetX: -13, offsetY: -34, w: 58, h: 66 },
}
```

受け入れ条件:

- 敵の足元や中心位置がマスから大きくズレない。
- 大きさの違いが個性として見える。
- プレイヤーや敵が重なった時、下側のキャラが手前に見える。

### Task 11: 吾郎の歩行モーションを追加する

内容:

- `sprites.player.walk` に左右移動用セルを複数登録する。
- 上下は専用セルが不足する場合、立ち絵の軽い上下揺れで暫定表現する。
- 移動入力時に短い `walk` 状態を持たせる。
- 1マス移動そのものは既存どおり即時でよいが、描画だけ120から180ms程度動かす。

受け入れ条件:

- 移動時に吾郎が静止画のまま滑るのではなく、足踏みまたは走りポーズに切り替わる。
- 歩行中でも次の入力や戦闘処理が壊れない。
- 攻撃モーション実装前の土台として、`walk` と `idle` の状態が分かれている。

### Task 12: UIをSFC風に調整

内容:

- パネル枠を少しドット絵/RPG風にする。
- `border-radius` を抑える。
- ステータス表示を読みやすくする。
- ログ欄の雰囲気をゲーム内メッセージ欄に寄せる。

受け入れ条件:

- 画面右側UIがゲーム画面と調和する。
- 文字が読みづらくならない。
- レイアウト幅が崩れない。

### Task 13: READMEに見た目更新を反映

内容:

- 使用アセットに `assets/materials/spritesheet.webp` を追記する。
- タイル/アイコン追加を追記する。
- スクロールカメラ化したことを追記する。

受け入れ条件:

- READMEの現状仕様が実態と合っている。

## 推奨実装順

1. `assets/tiles/` と `assets/icons/` を作る。
2. 最小タイルSVGを追加する。
3. `images` / `sprites` にタイル定義を追加する。
4. マップサイズと表示サイズを分離する。
5. スクロールカメラを追加する。
6. `drawMapLayer()` を画像描画化する。
7. 階段画像を導入する。
8. 吾郎の方向別スプライト座標を追加し、大きく表示する。
9. 敵の描画サイズを調整し、キャラの描画順を足元基準にする。
10. 吾郎の歩行モーションを追加する。
11. UI CSSをSFC風に調整する。
12. READMEを更新する。
13. 手動確認する。

## 受け入れ条件

Phase 2完了条件:

- 画面が単色矩形中心ではなく、床/壁/階段のタイルマップとして表示される。
- マップ全体固定表示ではなく、プレイヤー追従カメラでスクロールする。
- 床と壁に最低3種類ずつのバリエーションがある。
- 吾郎が左右入力で横向き表示になる。
- 吾郎が移動時に短い歩行モーションを行う。
- 吾郎が高さ70から90px程度の主役サイズで表示される。
- MOBが現在より大きく、種類ごとの差が見える。
- `state.player.direction` と描画が対応している。
- プレイヤーとMOBの足元が現在マスに合っている。
- プレイヤーとMOBの重なり順が大きく破綻しない。
- UIパネルがSFC風のゲーム画面に合う。
- 既存操作が壊れていない。
- 画像読み込み失敗時のフォールバックが残っている。
- READMEが更新されている。

## 手動テスト項目

### 表示

- `index.html` をブラウザで開く。
- 床、壁、階段が画像で表示される。
- 床と壁が混同しない。
- 階段が視認できる。
- 吾郎が添付画像のペット程度の存在感で大きく表示される。
- 敵が今より大きく表示される。
- 吾郎と敵の足元がタイル上に合っている。
- 画面端付近でカメラがマップ外を見せない。

### 入力

- 上下左右またはWASDで移動できる。
- 移動に合わせて画面がスクロールする。
- 左右入力で吾郎の向きが変わる。
- 壁に向かって入力しても向きが変わる。
- Space足踏みが動く。

### 戦闘

- 敵に攻撃できる。
- ダメージ数字が表示される。
- 被弾フラッシュやシェイクが残り続けない。

### 階段

- 階段に乗ると次階へ進む。
- 次階でもタイルバリエーションが表示される。

### 再挑戦

- HP 0後に `R` で再挑戦できる。
- 再挑戦後もタイルと吾郎が表示される。

## ブラウザ確認について

Codex内ブラウザでは `file://` と `localhost` がブロックされる可能性がある。その場合は以下の代替確認を行う。

- `node --check main.js`
- 画像ファイル存在確認
- SVGのXMLとしての妥当性確認
- `spritesheet.webp` の切り出し範囲をPillowで確認
- 通常ブラウザでの手動確認

## リスクと対策

### リスク: タイル画像が読み込めず画面が崩れる

対策:

- `drawSprite()` の戻り値を使い、必ず矩形フォールバックを残す。

### リスク: タイルバリエーションが毎フレーム変わる

対策:

- `Math.random()` を描画中に使わず、座標ベースの `tileVariant()` を使う。

### リスク: 吾郎スプライトが大きすぎて周囲を隠す

対策:

- `PLAYER_DRAW` を調整する。
- 足元基準で描画位置を合わせる。
- 必要なら影を薄くし、当たり判定マスを見失わないようにする。
- スクロールカメラにより、キャラが大きくても周囲の情報量を確保する。
- 敵/プレイヤー描画は足元 `y` ソートで重なりを自然にする。

### リスク: スクロール化で座標系が混ざる

対策:

- ロジックはグリッド座標、描画はワールド座標、canvas表示は画面座標と明確に分ける。
- `worldToScreenX()` / `worldToScreenY()` を通す。
- `isWalkable()` や `enemyAt()` などのゲームロジックにはカメラ座標を持ち込まない。

### リスク: SFC風タイルと高解像度吾郎素材の質感が合わない

対策:

- Phase 2ではまず使える素材として導入する。
- 必要なら後続でドット絵化、縮小PNG化、輪郭強調を行う。

### リスク: UIの装飾が強すぎて読みづらい

対策:

- ステータス数値とログ本文の可読性を優先する。
- 装飾は枠線、背景、余白に留める。

## 実装メモ

### `tileVariant()` の候補

```js
function tileVariant(x, y, count) {
  return Math.abs((x * 31 + y * 17 + state.floor * 13) % count);
}
```

### `drawFallbackTile()` の候補

```js
function drawFallbackTile(tile, x, y) {
  ctx.fillStyle = tile === "#" ? "#111827" : "#202b44";
  ctx.fillRect(x * TILE, y * TILE, TILE - 1, TILE - 1);
}
```

### タイル描画の候補

```js
function drawTileSprite(tile, x, y) {
  const group = tile === "#" ? sprites.tiles.wall : sprites.tiles.floor;
  const sprite = group[tileVariant(x, y, group.length)];
  const didDraw = drawSprite(sprite, x * TILE, y * TILE, TILE, TILE);
  if (!didDraw) {
    drawFallbackTile(tile, x, y);
  }
}
```

## Phase 3への引き継ぎ

Phase 2完了後、Phase 3では以下を使う。

- 吾郎の構え/攻撃に使えそうな `spritesheet.webp` のセル座標
- `drawEffectsLayer()` の上に斬撃エフェクト
- 方向別スプライト定義
- 敵ごとの描画サイズ定義
- タイル化されたマップ画面

Phase 3開始前に、吾郎の攻撃ポーズ候補と倒れ/落胆ポーズ候補の座標メモを作っておくとよい。
