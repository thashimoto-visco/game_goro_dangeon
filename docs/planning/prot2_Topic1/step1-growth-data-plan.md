# Topic 1 Step 1 詳細プラン: 成長データ追加

## 目的

レベルアップ処理を実装する前に、プレイヤー成長、敵経験値、初期化のデータ構造を先に固める。

このステップでは「経験値を得てレベルアップする」挙動までは入れない。後続のStep 2で処理をつなげられるように、参照しやすい定数と状態だけを追加する。

## 対象範囲

- プレイヤーの `level` を追加する。
- プレイヤーの自然回復用カウンターを追加する。
- レベルテーブルを追加する。
- 敵ごとの経験値を追加する。
- レベルテーブル参照用の小さな関数を追加する。
- リトライ時にレベルと成長関連状態が初期化されるようにする。
- この時点ではUI表示やレベルアップ演出は変更しない。

## 変更対象

- `main.js`
  - `monsterTypes`
  - `state.player`
  - `resetPlayerRunState()`
  - レベルテーブル定数
  - レベル参照ヘルパー

必要に応じて `index.html` はStep 3で触る。Step 1では触らない。

## データ追加方針

`state.player` に以下を追加する。

```js
level: 1,
recoveryCounter: 0,
```

`exp` は既に存在するため、そのまま使う。

`nextExp` は `state.player` には持たせない。経験値テーブルから計算する。理由は、レベルと経験値の二重管理を避けるため。

## レベルテーブル

`monsterTypes` と同じ定数群の近くに追加する。

```js
const levelTable = [
  { level: 1, nextExp: 8, maxHp: 20, atk: 5, def: 2 },
  { level: 2, nextExp: 20, maxHp: 24, atk: 6, def: 2 },
  { level: 3, nextExp: 38, maxHp: 29, atk: 7, def: 3 },
  { level: 4, nextExp: 62, maxHp: 34, atk: 8, def: 3 },
  { level: 5, nextExp: 92, maxHp: 40, atk: 9, def: 4 },
  { level: 6, nextExp: 128, maxHp: 46, atk: 10, def: 4 },
];
```

ここでの `nextExp` は「そのレベルから次レベルへ上がるために必要な累計経験値」とする。

例:

- レベル1、経験値0から開始。
- 経験値8以上でレベル2。
- 経験値20以上でレベル3。

## レベル参照ヘルパー

Step 1では処理を使い切らなくても、後続で使う関数を先に用意する。

候補:

```js
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
```

`nextLevelExp()` は最大レベル時に `null` を返す。Step 3のUIでは `null` を `--` 表示に変換できる。

## 敵経験値

既存の `monsterTypes` に `exp` を追加する。

```js
const monsterTypes = [
  { key: "slime", name: "ぬるりスライム", baseHp: 5, baseAtk: 2, hpScale: 1, atkScale: 0.35, exp: 4 },
  { key: "bat", name: "バサバサコウモリ", baseHp: 4, baseAtk: 3, hpScale: 0.8, atkScale: 0.45, exp: 5 },
  { key: "golem", name: "ゴロ岩ゴーレム", baseHp: 9, baseAtk: 4, hpScale: 1.4, atkScale: 0.6, exp: 9 },
];
```

Step 1では配列形式を維持する。階層別テーブルを入れるStep 5で、必要ならキー参照用ヘルパーを追加する。

## 敵インスタンスへの持たせ方

`generateFloor()` で敵を作る時、敵インスタンスにも `exp` をコピーする。

```js
exp: type.exp,
```

理由:

- 撃破時に `enemy.exp` を見ればよくなる。
- 将来、同じ敵種でも強敵版だけ経験値を増やす余地が残る。
- Topic 4の強敵報酬へ接続しやすい。

## 初期化

`resetPlayerRunState()` で以下を初期化する。

```js
state.player.level = 1;
state.player.exp = 0;
state.player.maxHp = levelEntry(1).maxHp;
state.player.hp = state.player.maxHp;
state.player.atk = levelEntry(1).atk;
state.player.def = levelEntry(1).def;
state.player.recoveryCounter = 0;
```

現在の初期値と同じでも、レベルテーブルを正として再代入する。今後初期値を変える時に、テーブル側だけ見ればよくなる。

## Step 1ではやらないこと

- 敵撃破時の `state.player.exp += 3` はまだ置き換えない。
- レベルアップ判定はまだ追加しない。
- UIにレベル表示はまだ追加しない。
- 自然回復処理はまだ追加しない。
- 階層別の敵/アイテムテーブルはまだ追加しない。

この区切りにすると、Step 1完了時点ではゲーム挙動がほぼ変わらない。差分確認がしやすい。

## 完了条件

- `state.player.level` が存在し、初期値が1になっている。
- `state.player.recoveryCounter` が存在し、初期値が0になっている。
- `levelTable` が存在する。
- レベル参照ヘルパーが存在する。
- `monsterTypes` に `exp` が追加されている。
- 生成された敵インスタンスに `exp` が入っている。
- リトライ時にレベル、経験値、HP最大値、攻撃、守備、自然回復カウンターが初期化される。
- 既存の移動、攻撃、撃破、階段移動、リトライが壊れていない。

## 確認方法

- 起動して1Fを移動できる。
- 敵を攻撃できる。
- 敵を倒せる。
- 階段で次の階へ進める。
- HP 0後にリトライできる。
- 開発者ツールで敵オブジェクトを見た時に `exp` が入っている。
- 開発者ツールで `state.player.level` と `state.player.recoveryCounter` が確認できる。

## 想定差分

このステップの差分は小さく保つ。

- 定数追加。
- 状態プロパティ追加。
- 敵インスタンスのプロパティ追加。
- リトライ初期化追加。
- 小さなヘルパー追加。

見た目やゲームバランスは変えない。
