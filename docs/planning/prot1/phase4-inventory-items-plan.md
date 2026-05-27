# Phase 4 詳細プラン: 持ち物・武器・床アイテム

## Phase 4の目的

探索中に「拾う」「装備する」「使う」という判断を追加し、ローグライクらしい遊びを強化する。

Phase 3までで、移動、戦闘、攻撃演出、カメラ、タイル、UIの土台ができた。Phase 4ではその上に、床アイテム、所持品、武器、食料、回復薬を追加する。まずは操作を軽く保ち、トルネコ/シレン系の基本に近い体験を目指す。

## Phase 4の前提

以下が実装済みであることを前提にする。

- 広いフロアとスクロールカメラ
- `drawItemLayer()` の空レイヤー
- 仮アイコン:
  - `assets/icons/item_weapon.svg`
  - `assets/icons/item_food.svg`
  - `assets/icons/item_potion.svg`
- `sprites.icons`
- `buildPlayerAttackResult(enemy)`
- `state.action` による入力制御
- 右側ステータス/UIパネル

## Phase 4のスコープ

含める:

- 床アイテム `state.items`
- アイテム定義 `itemTypes`
- 武器、食料、回復薬
- 所持品 `state.player.inventory`
- 所持上限
- 装備中武器 `state.player.weapon`
- 床アイテム描画
- アイテム拾得
- アイテム使用
- 武器装備
- 攻撃ダメージへの武器補正
- 所持品UI
- README更新

含めない:

- 壺、巻物、杖、矢
- 呪い、強化値、合成
- アイテム識別
- 床置き/投げる
- 複雑なメニュー操作
- ショップ

## 操作方針

Phase 4では操作を増やしすぎない。

基本操作:

```text
アイテム上に移動
↓
自動拾得
↓
所持品に追加
```

使用/装備:

```text
1〜9キー
↓
該当スロットのアイテムを使用
↓
武器なら装備、食料/回復薬なら消費
↓
1ターン消費
```

理由:

- 既存操作と衝突しにくい。
- メニューUIなしで最小実装できる。
- 後で `i` キーのインベントリメニューへ拡張できる。

将来候補:

- `i`: 所持品メニュー
- `g`: 足元アイテムを拾う
- `d`: 置く
- `t`: 投げる
- `Enter`: メニュー決定
- `Esc`: キャンセル

Phase 4では自動拾得で十分。

## データ設計

### アイテム定義

```js
const itemTypes = {
  woodenSword: {
    key: "woodenSword",
    name: "木の棒",
    kind: "weapon",
    icon: "weapon",
    atk: 1,
    description: "攻撃+1",
  },
  ironSword: {
    key: "ironSword",
    name: "鉄の剣",
    kind: "weapon",
    icon: "weapon",
    atk: 3,
    description: "攻撃+3",
  },
  riceBall: {
    key: "riceBall",
    name: "おにぎり",
    kind: "food",
    icon: "food",
    hunger: 35,
    description: "満腹度+35",
  },
  herb: {
    key: "herb",
    name: "薬草",
    kind: "potion",
    icon: "potion",
    heal: 10,
    description: "HP+10",
  },
};
```

### 床アイテム

```js
{
  id: 1,
  type: "woodenSword",
  x: 12,
  y: 8,
}
```

`state.items` に保持する。

### 所持品

```js
state.player.inventory = [];
state.player.inventoryLimit = 9;
state.player.weapon = null;
```

最初は数字キー `1〜9` で選べるように、所持上限は9が扱いやすい。

### 装備

武器を使うと装備する。

```js
state.player.weapon = item;
```

装備中の武器も所持品に残す方式にするか、所持品とは別枠にするかを決める。

推奨:

- 装備中武器は所持品に残す。
- UI上で `[E]` を付ける。
- 将来、装備解除や持ち替えがしやすい。

## ダメージ計算

Phase 3の `buildPlayerAttackResult(enemy)` に武器補正を入れる。

現状:

```js
const damage = Math.max(1, state.player.atk + rng(0, 2));
```

Phase 4:

```js
function playerAttackPower() {
  return state.player.atk + (state.player.weapon?.atk || 0);
}

const damage = Math.max(1, playerAttackPower() + rng(0, 2));
```

UIの攻撃表示は、基礎攻撃力と武器補正が分かる形が望ましい。

例:

```text
攻撃 5 + 3
```

## フロア生成

### アイテム配置

`generateFloor()` で部屋にアイテムを配置する。

基本方針:

- 開始部屋には置かない。
- 階段と同じマスには置かない。
- 敵と同じマスには置かない。
- 壁には置かない。
- 1フロアに3〜6個程度。

候補:

```js
function placeItems(rooms) {}
```

配置数:

```js
const itemCount = rng(3, 6);
```

出現率:

```text
木の棒: 20%
鉄の剣: 10%
おにぎり: 40%
薬草: 30%
```

## 描画設計

`drawItemLayer()` を実装する。

```js
function drawItemLayer() {
  for (const item of state.items) {
    const def = itemTypes[item.type];
    const sprite = sprites.icons[def.icon];
    drawSprite(sprite, gridToScreenX(item.x) + 6, gridToScreenY(item.y) + 6, 20, 20);
  }
}
```

注意:

- 床アイテムは敵/プレイヤーより下に描く。
- 見えやすいように影や小さな光を入れてもよい。
- 画像未読み込み時は色付き小円でフォールバックする。

## 拾得処理

移動完了後に足元チェックを行う。

```js
function itemAt(x, y) {}
function pickupItemAtPlayer() {}
```

タイミング:

- 移動後
- 階段判定の前

推奨:

- 移動後、階段判定より前に拾う。
- ただし階段とアイテムは同じマスに配置しないため、拾得と階段移動の優先順位問題は発生しない。

所持上限:

- 空きがあれば拾う。
- 空きがなければ拾わずログ表示。

```text
持ち物がいっぱいで拾えない。
```

## アイテム使用

### `useInventorySlot(index)`

数字キーで呼ぶ。

```js
function useInventorySlot(index) {}
```

処理:

- スロットが空なら何もしない、またはログ表示。
- 武器なら装備する。
- 食料なら満腹度回復して消費。
- 回復薬ならHP回復して消費。
- 使用/装備に成功したら1ターン消費。

### 武器

```js
function equipWeapon(item) {
  state.player.weapon = item;
  addLog(`${item.name}を装備した。`);
}
```

武器装備は1ターン消費する。

### 食料

```js
state.player.hunger = Math.min(100, state.player.hunger + item.hunger);
```

食料使用は1ターン消費する。

### 回復薬

```js
state.player.hp = Math.min(state.player.maxHp, state.player.hp + item.heal);
```

HP満タンでも使用できるかは好みだが、Phase 4では使用可能でよい。

## UI設計

### HTML追加候補

`index.html` のステータス欄に追加:

```html
<div><dt>装備</dt><dd id="weapon">なし</dd></div>
```

ログ欄の前後に所持品欄:

```html
<h2>持ち物</h2>
<ol id="inventory" class="inventory"></ol>
```

### 表示例

```text
1. 木の棒 [E]
2. おにぎり
3. 薬草
```

空スロットも表示するか:

- Phase 4では所持品だけ表示でよい。
- 上限9は見出しや補足で分かるようにする。

## ターン消費

以下は1ターン消費する。

- 通常移動
- 足踏み
- 通常攻撃
- 武器装備
- 食料使用
- 回復薬使用

拾得はターン消費しない。

理由:

- 移動した結果として拾うため、拾得自体で追加ターンは消費しない。

## タスク一覧

### Task 1: `itemTypes` と `state.items` を追加

内容:

- アイテム定義を追加。
- `state.items = []` を追加。
- `state.player.inventory` / `inventoryLimit` / `weapon` を追加。

受け入れ条件:

- ゲーム状態に床アイテムと所持品を保持できる。

### Task 2: 床アイテム生成を追加

内容:

- `placeItems(rooms)` を追加。
- `generateFloor()` から呼ぶ。
- 部屋内の歩行可能マスに配置する。

受け入れ条件:

- 各階に3〜6個程度のアイテムが配置される。
- 壁、敵、プレイヤー、階段と重ならない。

### Task 3: `drawItemLayer()` を実装

内容:

- `sprites.icons` を使って床アイテムを描画。
- 読み込み失敗時のフォールバックを追加。

受け入れ条件:

- 床に武器/食料/回復薬が見える。
- プレイヤーや敵より下に描かれる。

### Task 4: 拾得処理を追加

内容:

- `itemAt(x, y)` を追加。
- `pickupItemAtPlayer()` を追加。
- 移動後に呼ぶ。

受け入れ条件:

- アイテム上に移動すると拾える。
- 所持上限なら拾えない。
- ログが表示される。
- 階段とアイテムが同じマスにないため、拾得と階段移動の優先順位問題が発生しない。

### Task 5: 所持品UIを追加

内容:

- `index.html` に `weapon` と `inventory` を追加。
- `ui` に参照を追加。
- `updateUi()` で更新。
- `styles.css` に所持品表示スタイルを追加。

受け入れ条件:

- 所持品が右パネルに表示される。
- 装備中武器が分かる。

### Task 6: 数字キー使用を追加

内容:

- `1〜9` のキー入力を処理。
- `useInventorySlot(index)` を呼ぶ。
- `canAcceptInput()` を尊重する。

受け入れ条件:

- 数字キーで所持品を使用/装備できる。
- 空スロットでクラッシュしない。

### Task 7: 武器装備を追加

内容:

- `equipWeapon(item)` を追加。
- 装備中表示を更新。
- 装備時に1ターン消費。

受け入れ条件:

- 武器を装備できる。
- 装備中武器がUIに表示される。

### Task 8: 攻撃ダメージに武器補正を追加

内容:

- `playerAttackPower()` を追加。
- `buildPlayerAttackResult(enemy)` に補正を入れる。
- 攻撃UI表示を更新。

受け入れ条件:

- 武器装備後、攻撃ダメージが上がる。
- UIで攻撃補正が分かる。

### Task 9: 食料と回復薬を追加

内容:

- `eatFood(item)` を追加。
- `drinkPotion(item)` または `usePotion(item)` を追加。
- 使用後に所持品から削除。
- 使用時に1ターン消費。

受け入れ条件:

- 食料で満腹度が回復する。
- 薬草でHPが回復する。
- 使用後に所持品から消える。

### Task 10: README更新

内容:

- 拾得、数字キー使用、武器装備、食料、回復薬を追記。

受け入れ条件:

- READMEの遊び方と仕様が実装に合う。

## 推奨実装順

1. 状態とアイテム定義を追加。
2. 床アイテム生成を追加。
3. 床アイテム描画を追加。
4. 拾得処理を追加。
5. 所持品UIを追加。
6. 数字キー使用を追加。
7. 武器装備を追加。
8. 武器補正を攻撃計算へ追加。
9. 食料/回復薬使用を追加。
10. README更新。
11. 静的確認と手動確認。

## 受け入れ条件

Phase 4完了条件:

- 床アイテムが生成される。
- 床アイテムが描画される。
- アイテム上に移動すると拾える。
- 所持品がUIに表示される。
- 数字キーで所持品を使用できる。
- 武器を装備できる。
- 武器補正が攻撃ダメージに反映される。
- 食料で満腹度が回復する。
- 回復薬でHPが回復する。
- 使用/装備は1ターン消費する。
- 拾得は追加ターンを消費しない。
- 既存の移動、攻撃、階段、再挑戦が壊れていない。

## 手動テスト項目

### 床アイテム

- 新しい階にアイテムが落ちている。
- 武器、食料、回復薬のアイコンが見える。
- アイテムが壁の上に出ない。
- アイテムが階段と同じマスに出ない。

### 拾得

- アイテムの上に移動する。
- ログに拾得メッセージが出る。
- 所持品UIに追加される。
- 床から消える。

### 所持上限

- 所持品を9個まで拾う。
- 10個目を拾えない。
- ログに満杯メッセージが出る。

### 武器

- 武器を拾う。
- 数字キーで装備する。
- 装備表示が変わる。
- 攻撃表示に補正が出る。
- 敵へのダメージが上がる。

### 食料

- 満腹度が減った状態で食料を使う。
- 満腹度が回復する。
- 所持品から消える。
- 1ターン消費する。

### 回復薬

- HPが減った状態で回復薬を使う。
- HPが回復する。
- 所持品から消える。
- 1ターン消費する。

### 既存機能

- 敵への通常攻撃が動く。
- 攻撃演出が壊れない。
- 階段で次階へ進める。
- `R` で再挑戦できる。

## リスクと対策

### リスク: アイテム使用中に戦闘アクションと衝突する

対策:

- `canAcceptInput()` を必ず確認する。
- Phase 4ではアイテム使用演出は最小限にし、即時効果+ターン消費で扱う。

### リスク: 装備中武器と所持品の整合性が崩れる

対策:

- 装備中武器は所持品内のアイテム参照を使う。
- 消費アイテム削除時、武器は削除対象にしない。

### リスク: フロア生成でアイテムが敵や階段と重なる

対策:

- 配置前に `isOccupiedForItem(x, y)` を使う。
- `state.stairs` と同じ座標は必ず除外する。
- 開始部屋は除外する。

### リスク: UIが縦に長くなりすぎる

対策:

- 所持品上限を9にする。
- 所持品欄に最大高さとスクロールを設定する。

### リスク: 武器補正が強すぎる

対策:

- Phase 4では小さい補正から始める。
- Phase 6でバランス調整する。

## Phase 5への引き継ぎ

Phase 5では全滅時の演出と戦績表示を追加する。Phase 4で追加した所持品や装備は、全滅時の戦績やリトライ処理にも影響する。

引き継ぎたい点:

- 全滅時に所持品をどう扱うか。
- 到達階層、撃破数、装備武器などを戦績に表示するか。
- リトライ時に `state.items`, `inventory`, `weapon` を確実に初期化すること。
