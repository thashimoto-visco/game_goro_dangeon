# Topic 1 Step 5 詳細プラン: 階層別出現テーブル

## 目的

1Fから5F程度まで、階層ごとに敵とアイテムの出現傾向を変える。

現在は敵が部屋順に `monsterTypes` を循環し、アイテムは単一の `itemDropTable` から抽選される。Step 5では、階層別の敵出現テーブルとアイテム出現テーブルを導入し、序盤は安全に、深い階ほど危険と報酬が増える形にする。

## 前提

Step 1からStep 4で以下が実装済みであること。

- 敵ごとの経験値 `exp`
- レベルアップ
- レベル/経験値UI
- HP自然回復
- 既存の敵3種
  - `slime`
  - `bat`
  - `golem`
- 既存のアイテム4種
  - `riceBall`
  - `herb`
  - `woodenSword`
  - `ironSword`

## 対象範囲

- 階層別の敵出現テーブルを追加する。
- 階層別のアイテム出現テーブルを追加する。
- 階層に対応するテーブル取得関数を追加する。
- 重み付き抽選ヘルパーを追加する。
- 敵種キーから `monsterTypes` を引くヘルパーを追加する。
- `generateFloor()` の敵生成を階層テーブル方式に置き換える。
- `placeItems()` の抽選を階層テーブル方式に置き換える。
- 敵とアイテムの配置が、開始位置、階段、敵、アイテムと重ならないようにする。
- 生成失敗時に無限ループしないよう試行回数上限を維持する。

## 非対象

- 新敵追加。
- 新アイテム追加。
- 強敵、ボス、レア敵。
- 特殊部屋。
- マップ生成方式の変更。
- 敵AI調整。
- 本格バランス調整。
- 自動シミュレーション。

## 変更対象

- `main.js`
  - `floorEnemyTables`
  - `floorItemTables`
  - テーブル取得ヘルパー
  - 重み付き抽選ヘルパー
  - 敵生成ヘルパー
  - `generateFloor()`
  - `randomItemType()`
  - `placeItems(rooms)`

`index.html` とCSSは変更しない。

## 敵出現テーブル

初期候補:

```js
const floorEnemyTables = [
  { minFloor: 1, maxFloor: 1, count: [3, 4], entries: [{ type: "slime", weight: 100 }] },
  { minFloor: 2, maxFloor: 2, count: [4, 5], entries: [{ type: "slime", weight: 75 }, { type: "bat", weight: 25 }] },
  { minFloor: 3, maxFloor: 3, count: [4, 5], entries: [{ type: "slime", weight: 50 }, { type: "bat", weight: 40 }, { type: "golem", weight: 10 }] },
  { minFloor: 4, maxFloor: 4, count: [5, 6], entries: [{ type: "slime", weight: 35 }, { type: "bat", weight: 45 }, { type: "golem", weight: 20 }] },
  { minFloor: 5, maxFloor: 99, count: [5, 7], entries: [{ type: "slime", weight: 20 }, { type: "bat", weight: 45 }, { type: "golem", weight: 35 }] },
];
```

方針:

- 1Fはスライムのみ。
- 2Fからコウモリを混ぜる。
- 3Fからゴーレムを低確率で混ぜる。
- 4Fから敵数とゴーレム比率を上げる。
- 5F以降は暫定で同じテーブルを使う。

## アイテム出現テーブル

初期候補:

```js
const floorItemTables = [
  { minFloor: 1, maxFloor: 1, count: [3, 5], entries: [
    { type: "riceBall", weight: 36 },
    { type: "herb", weight: 40 },
    { type: "woodenSword", weight: 20 },
    { type: "ironSword", weight: 4 },
  ] },
  { minFloor: 2, maxFloor: 3, count: [3, 5], entries: [
    { type: "riceBall", weight: 32 },
    { type: "herb", weight: 34 },
    { type: "woodenSword", weight: 24 },
    { type: "ironSword", weight: 10 },
  ] },
  { minFloor: 4, maxFloor: 99, count: [3, 6], entries: [
    { type: "riceBall", weight: 30 },
    { type: "herb", weight: 30 },
    { type: "woodenSword", weight: 22 },
    { type: "ironSword", weight: 18 },
  ] },
];
```

方針:

- 1Fは薬草とおにぎりを厚めにして事故を減らす。
- 2Fから3Fは現状に近い出現率を維持する。
- 4F以降は鉄の剣を少し出やすくして、深い階の報酬感を作る。
- 新アイテムは増やさない。

## 共通ヘルパー

### `tableForFloor(tables, floor)`

階層に一致するテーブルを返す。

候補:

```js
function tableForFloor(tables, floor) {
  return tables.find((table) => floor >= table.minFloor && floor <= table.maxFloor) || tables[tables.length - 1];
}
```

### `weightedPick(entries)`

重み付き抽選で `type` を返す。

候補:

```js
function weightedPick(entries) {
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng(1, total);

  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry.type;
  }

  return entries[0].type;
}
```

### `monsterTypeByKey(key)`

敵種キーから `monsterTypes` の定義を返す。

候補:

```js
function monsterTypeByKey(key) {
  return monsterTypes.find((type) => type.key === key) || monsterTypes[0];
}
```

Step 5では `monsterTypes` の配列形式を維持する。オブジェクト化はまだ不要。

## 敵生成

### `createEnemy(type, x, y)`

敵インスタンス生成を小さな関数に切り出す。

候補:

```js
function createEnemy(type, x, y) {
  const floorBonus = Math.max(0, state.floor - 1);
  return {
    x,
    y,
    hp: Math.round(type.baseHp + floorBonus * type.hpScale),
    atk: Math.round(type.baseAtk + floorBonus * type.atkScale),
    exp: type.exp,
    name: type.name,
    sprite: type.key,
  };
}
```

現在の敵生成ロジックをそのまま移すだけにする。

### `isEnemyPlacementBlocked(x, y)`

敵配置の重なりチェックを追加する。

候補:

```js
function isEnemyPlacementBlocked(x, y) {
  if (!isWalkable(x, y)) return true;
  if (state.player.x === x && state.player.y === y) return true;
  if (state.stairs.x === x && state.stairs.y === y) return true;
  return Boolean(enemyAt(x, y));
}
```

敵は床アイテムより先に配置されるため、アイテムとの重なりはこの時点では不要。

### `placeEnemies(rooms)`

候補:

```js
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
```

方針:

- 開始部屋は候補から外す。
- 部屋中心固定ではなく、部屋内ランダム座標に置く。
- 試行上限は160程度。
- 部屋数や配置候補が少ない場合、要求数に届かなくてもよい。

## アイテム生成

### `randomItemType()`

既存の `itemDropTable` ベースから、階層別テーブルベースに変更する。

候補:

```js
function randomItemType() {
  const table = tableForFloor(floorItemTables, state.floor);
  return weightedPick(table.entries);
}
```

または、`randomItemType(table)` にして `placeItems()` からテーブルを渡してもよい。

### `placeItems(rooms)`

候補:

```js
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
      type: weightedPick(table.entries),
      x,
      y,
    });
    nextItemId += 1;
  }
}
```

方針:

- 既存の `isItemPlacementBlocked()` を維持する。
- 敵配置後にアイテムを置くため、敵との重なりは既存チェックで防げる。
- 試行上限は既存の120を維持する。

## `generateFloor()` の変更

現在:

```js
state.enemies = rooms.slice(1, 6).map((room, i) => {
  const type = monsterTypes[i % monsterTypes.length];
  ...
});

placeItems(rooms);
```

Step 5後:

```js
placeEnemies(rooms);
placeItems(rooms);
```

敵を先に置き、アイテムを後に置く順序は維持する。

## `itemDropTable` の扱い

Step 5では `itemDropTable` は使わなくなる。

選択肢:

1. 削除して `floorItemTables` に完全移行する。
2. 互換用に残す。

おすすめは削除。理由は、使われないテーブルが残ると今後の調整時に混乱するため。

Step 5では削除して、`floorItemTables` に完全移行する。

## 将来拡張方針

### 新アイテムを追加する場合

新アイテムは、まず `itemTypes` に定義を追加する。

その後、出したい階層の `floorItemTables` に `type` と `weight` を追加する。

例:

```js
const itemTypes = {
  antidote: {
    name: "毒消し草",
    kind: "potion",
    icon: "potion",
    description: "毒を治す",
  },
};

const floorItemTables = [
  { minFloor: 3, maxFloor: 5, count: [3, 6], entries: [
    { type: "riceBall", weight: 28 },
    { type: "herb", weight: 28 },
    { type: "antidote", weight: 12 },
    { type: "woodenSword", weight: 20 },
    { type: "ironSword", weight: 12 },
  ] },
];
```

この形なら、アイテム定義と階層別の出現調整を分けて扱える。

### 新敵を追加する場合

新敵は、まず `monsterTypes` に定義を追加する。

その後、出したい階層の `floorEnemyTables` に `type` と `weight` を追加する。

例:

```js
const monsterTypes = [
  { key: "ghost", name: "ゆらゆら亡霊", baseHp: 7, baseAtk: 5, hpScale: 1.1, atkScale: 0.55, exp: 8 },
];

const floorEnemyTables = [
  { minFloor: 4, maxFloor: 7, count: [5, 7], entries: [
    { type: "bat", weight: 35 },
    { type: "golem", weight: 25 },
    { type: "ghost", weight: 15 },
    { type: "slime", weight: 25 },
  ] },
];
```

この形なら、敵の基礎ステータスと階層別の出現調整を分けて扱える。

### テーブル分割の目安

敵やアイテムが増えたら、階層テーブルは以下のように細かく分ける。

- 1F
- 2Fから3F
- 4Fから5F
- 6Fから9F
- 10F以降

`minFloor` と `maxFloor` の範囲を変えるだけでよい。生成処理側は変更しない。

### 将来足せる任意項目

Step 5では使わないが、将来はテーブル項目へ以下を足せる。

```js
{ type: "ghost", weight: 15, minLevel: 3 }
{ type: "ironSword", weight: 12, uniquePerFloor: true }
```

ただし、Step 5では `type` と `weight` だけに留める。今は単純なテーブルにしておき、特殊条件は必要になった時に追加する。

## 実装順

1. `floorEnemyTables` を追加する。
2. `floorItemTables` を追加する。
3. `itemDropTable` を削除する。
4. `tableForFloor(tables, floor)` を追加する。
5. `weightedPick(entries)` を追加する。
6. `monsterTypeByKey(key)` を追加する。
7. `createEnemy(type, x, y)` を追加する。
8. `isEnemyPlacementBlocked(x, y)` を追加する。
9. `placeEnemies(rooms)` を追加する。
10. `generateFloor()` の敵生成を `placeEnemies(rooms)` に差し替える。
11. `randomItemType()` または `placeItems()` を階層別テーブル対応にする。
12. 構文チェックを行う。
13. 1Fから5Fまで手動確認する。

## 完了条件

- 1Fではスライムのみが出る。
- 2Fではスライムとコウモリが出る。
- 3F以降ではゴーレムが低確率で出る。
- 4F以降では敵数が少し増える。
- 5F以降でも生成が破綻しない。
- 1Fでは薬草とおにぎりが比較的出やすい。
- 4F以降では鉄の剣が少し出やすい。
- 敵が開始位置、階段、敵同士と重ならない。
- アイテムが開始位置、階段、敵、アイテム同士と重ならない。
- 階段移動を繰り返してもエラーが出ない。
- 既存の戦闘、経験値、レベルアップ、自然回復が壊れていない。

## 確認方法

### 1F

- 起動する。
- 1Fの敵がスライムのみであることを確認する。
- アイテムが3から5個程度出ることを確認する。
- アイテムが敵や階段と重ならないことを確認する。

### 2F

- 階段で2Fへ進む。
- コウモリが混ざることを確認する。
- ゴーレムが出ないことを確認する。

### 3F

- 階段で3Fへ進む。
- 低確率でゴーレムが混ざることを確認する。
- 敵数が4から5体程度になることを確認する。

### 4Fから5F

- 4F以降で敵数が5から7体程度になることを確認する。
- ゴーレム比率が上がることを確認する。
- 鉄の剣が1Fより出やすくなっているかを複数回生成で確認する。

### 生成安定性

- 階段移動を10回程度繰り返す。
- コンソールエラーが出ない。
- 敵やアイテムが壁内、開始位置、階段上に出ない。

## リスクと対策

### リスク: 配置がランダム化されて敵が近すぎる

対策:

- 開始部屋は候補から外す。
- 必要なら開始部屋に隣接する最初の部屋も候補から外すが、Step 5ではまず開始部屋除外だけにする。

### リスク: 敵数増加で難度が急に上がる

対策:

- 1Fと2Fの敵数は控えめにする。
- 本格調整は全要素が揃った後に行う。
- 明らかに理不尽な場合だけ count を下げる。

### リスク: 重み付き抽選のヘルパーが敵/アイテムで混乱する

対策:

- `weightedPick()` は `type` だけ返す単純な関数にする。
- 敵は `monsterTypeByKey()`、アイテムはそのまま `item.type` として使う。

### リスク: 未使用の `itemDropTable` が残る

対策:

- Step 5で削除する。
- `rg itemDropTable` で参照が残っていないか確認する。

### リスク: 部屋数や配置候補不足で要求数に届かない

対策:

- 試行上限で止める。
- 要求数に届かなくてもゲームは続行する。
- 生成失敗をログに出す必要はない。

## Step 6への引き継ぎ

Step 5完了後、Step 6では1Fから5Fの難度カーブ確認とドキュメント更新へ進む。

敵/アイテムの階層差が入ることで、成長、自然回復、装備、回復アイテムを含めた実プレイの消耗を確認できる。
