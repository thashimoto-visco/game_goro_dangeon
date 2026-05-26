# Topic 1 Step 2 詳細プラン: 経験値とレベルアップ実装

## 目的

Step 1で追加した成長データを使い、敵撃破時に敵ごとの経験値を獲得し、必要経験値に達したらレベルアップする流れを実装する。

このステップでは、ゲーム内の成長挙動を成立させる。UIの専用表示追加、レベルアップ専用SE、派手な演出はStep 3に回す。ただし、プレイ中に成長が分かる最低限のログと既存浮遊テキストは入れる。

## 前提

Step 1で以下が実装済みであること。

- `levelTable`
- `levelEntry(level)`
- `maxLevelEntry()`
- `nextLevelExp(level)`
- `state.player.level`
- `state.player.recoveryCounter`
- `monsterTypes[].exp`
- 敵インスタンスの `exp`
- リトライ時の成長関連初期化

## 対象範囲

- `gainExp(amount)` を追加する。
- `applyLevelUp(nextEntry)` または `levelUp()` を追加する。
- 敵撃破時の固定 `state.player.exp += 3` を `gainExp(enemy.exp)` に置き換える。
- レベルアップ時に最大HP、攻撃、守備を更新する。
- レベルアップ時にHPを新しい最大HPまで全回復する。
- 複数レベルアップに対応する。
- レベルアップ時のログを追加する。
- レベルアップ時の簡易浮遊テキストを追加する。
- 最大レベル到達後の経験値獲得を破綻させない。

## 非対象

- `index.html` のステータス欄追加。
- `updateUi()` のレベル/次レベル表示追加。
- 全滅戦績へのレベル表示追加。
- レベルアップ専用SEの追加。
- 金色フラッシュなどの専用演出。
- HP自然回復。
- 階層別敵/アイテムテーブル。

## 変更対象

- `main.js`
  - 経験値獲得関数
  - レベルアップ関数
  - `applyPlayerAttackHit(action)` の撃破処理

## 関数設計

### `gainExp(amount)`

敵撃破時の経験値加算を担当する。

候補:

```js
function gainExp(amount) {
  if (!Number.isFinite(amount) || amount <= 0) return;

  state.player.exp += amount;
  addLog(`経験値を${amount}得た。`);

  while (canLevelUp()) {
    applyLevelUp(levelEntry(state.player.level + 1));
  }
}
```

方針:

- `amount` が不正なら何もしない。
- 経験値は最大レベル後も蓄積してよい。
- レベルアップ判定は `while` で行い、複数レベルアップに対応する。

## レベルアップ判定

`nextLevelExp(level)` は「次レベルに上がるために必要な累計経験値」を返す。

候補:

```js
function canLevelUp() {
  const requiredExp = nextLevelExp(state.player.level);
  return requiredExp !== null && state.player.exp >= requiredExp;
}
```

最大レベル時は `nextLevelExp()` が `null` を返すため、レベルアップしない。

## レベルアップ処理

候補:

```js
function applyLevelUp(nextEntry) {
  const previous = {
    level: state.player.level,
    maxHp: state.player.maxHp,
    atk: state.player.atk,
    def: state.player.def,
  };

  state.player.level = nextEntry.level;
  state.player.maxHp = nextEntry.maxHp;
  state.player.hp = nextEntry.maxHp;
  state.player.atk = nextEntry.atk;
  state.player.def = nextEntry.def;

  addFloatingText("Lv UP", state.player.x, state.player.y, "#fde68a");
  addLog(`吾郎はレベル${state.player.level}になった！`);
  addLog(`最大HP ${previous.maxHp}→${state.player.maxHp} / 攻撃 ${previous.atk}→${state.player.atk} / 守備 ${previous.def}→${state.player.def}`);
}
```

方針:

- 現在HPは新しい最大HPまで全回復する。
- 攻撃と守備はテーブル値へ更新する。
- 浮遊テキストは既存の `addFloatingText()` を使う。
- 専用SEやフラッシュはStep 3で追加する。

## 撃破処理の差し替え

現在の撃破処理:

```js
if (enemy.hp <= 0) {
  state.player.exp += 3;
  state.stats.defeated += 1;
  playSound("defeat");
  addDefeatEffect(enemy.x, enemy.y);
  addFloatingText("撃破", enemy.x, enemy.y, "#fca5a5");
  addLog(`${enemy.name}をたおした！`);
}
```

Step 2後の候補:

```js
if (enemy.hp <= 0) {
  state.stats.defeated += 1;
  playSound("defeat");
  addDefeatEffect(enemy.x, enemy.y);
  addFloatingText("撃破", enemy.x, enemy.y, "#fca5a5");
  addLog(`${enemy.name}をたおした！`);
  gainExp(enemy.exp);
}
```

ログ順は「倒した」から「経験値獲得」、必要なら「レベルアップ」の順にする。

## ログ方針

Step 2では、表示追加前でも成長が分かるようログを少し厚めにする。

通常撃破:

- `ぬるりスライムをたおした！`
- `経験値を4得た。`

レベルアップ:

- `吾郎はレベル2になった！`
- `最大HP 20→24 / 攻撃 5→6 / 守備 2→2`

守備が変わらない場合も、Step 2では同じ形式でよい。Step 3以降でログを短くしたくなったら調整する。

## UIとの関係

Step 2では既存の `経験値` 表示は累計経験値のまま更新される。

レベル表示はまだないため、レベルアップの確認はログと内部状態で行う。Step 3でUIに以下を追加する。

- レベル
- 経験値 `現在 / 次`
- 最大レベル時の `--` 表示

## 最大レベルの扱い

Step 2では最大レベル到達後も経験値は増える。

理由:

- 全滅戦績で累計経験値として見られる。
- 将来レベル上限を増やしても自然につながる。
- 経験値獲得を止めるより実装が単純。

最大レベル時は `canLevelUp()` が false になるだけでよい。

## 実装順

1. `canLevelUp()` を追加する。
2. `applyLevelUp(nextEntry)` を追加する。
3. `gainExp(amount)` を追加する。
4. `applyPlayerAttackHit(action)` の固定経験値加算を `gainExp(enemy.exp)` に置き換える。
5. 手動またはデバッグ補助で、経験値加算とレベルアップを確認する。

## 完了条件

- 敵撃破時に `enemy.exp` 分の経験値が入る。
- スライム、コウモリ、ゴーレムで獲得経験値が異なる。
- 累計経験値が必要値に達するとレベルが上がる。
- レベルアップ時に最大HP、攻撃、守備がテーブル値へ更新される。
- レベルアップ時にHPが新しい最大HPまで全回復する。
- レベルアップログが出る。
- レベルアップ浮遊テキストが出る。
- 複数レベルアップしても処理が破綻しない。
- 最大レベル到達後に経験値を得てもエラーにならない。
- 既存の撃破演出、撃破数、全滅、リトライが壊れていない。

## 確認方法

### 通常プレイ確認

- 起動する。
- 敵を倒す。
- 経験値表示が敵ごとの値ぶん増える。
- ログに経験値獲得が出る。
- 経験値が8以上になった時、レベルアップログが出る。
- レベルアップ後、攻撃表示またはHP表示が更新される。

### リトライ確認

- レベルアップ後に全滅する。
- `R` でリトライする。
- HP、攻撃、守備、経験値が初期値へ戻る。
- 内部の `state.player.level` が1に戻る。

### 境界確認

- 開発者ツール等で経験値を必要値直前にした状態から敵を倒す。
- ちょうど必要値に達した時にレベルアップする。
- 大きな経験値を入れた時に複数レベルアップできる。
- 最大レベル後に `gainExp()` を呼んでもエラーが出ない。

## リスクと対策

### リスク: ログが増えすぎる

対策:

- Step 2では確認しやすさを優先する。
- Step 3のUI追加後に、経験値ログを短くするか残すか判断する。

### リスク: レベルアップと撃破演出の表示が重なる

対策:

- Step 2では既存の浮遊テキストだけで済ませる。
- 派手なフラッシュやSEはStep 3で画面全体の見え方を見ながら追加する。

### リスク: レベルテーブル値の上書きで装備補正と混ざる

対策:

- `state.player.atk` は素の攻撃力として扱う。
- 装備補正は既存の `weaponAttackBonus()` と `playerAttackPower()` に任せる。
- UIの攻撃表示も既存どおり `素の攻撃 + 装備補正` を維持する。

### リスク: レベルアップ全回復で難度が下がる

対策:

- Topic 1ではレベルアップの気持ちよさと分かりやすさを優先する。
- 難度低下はTopic 4の強敵や後続の階層設計で受け止める。
- Step 2では全回復にして処理を単純に保つ。

## Step 3への引き継ぎ

Step 2完了後、Step 3で以下を追加する。

- ステータス欄のレベル表示。
- 経験値 `現在 / 次` 表示。
- 全滅戦績のレベル表示。
- レベルアップ専用SE。
- 金色フラッシュなどの見た目演出。
