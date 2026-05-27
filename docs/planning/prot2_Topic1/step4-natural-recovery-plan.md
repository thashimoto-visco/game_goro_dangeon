# Topic 1 Step 4 詳細プラン: HP自然回復

## 目的

満腹度が十分ある時だけ、ターン経過に応じてHPが少しずつ自然回復するようにする。

Step 4では、足踏み、探索、食料の価値を少し高める。ただし自然回復だけで安全に粘り続けられる状態にはしない。敵行動と満腹度消費はそのまま維持し、回復は「余裕がある時の小さな支え」に留める。

## 前提

Step 1からStep 3で以下が実装済みであること。

- `state.player.recoveryCounter`
- リトライ時の `recoveryCounter` 初期化
- HP表示 `現在 / 最大`
- レベルアップ時のHP全回復
- 満腹度の毎ターン減少
- 満腹度0時の空腹ダメージ
- `Space` 足踏みが `tickTurn()` を呼ぶ

Step 4実装時に、`recoveryCounter` は `recoveryProgress` へリネームする。

## 対象範囲

- 満腹度に応じた自然回復進捗量を決める。
- 自然回復用ヘルパー関数を追加する。
- `tickTurn()` に自然回復処理を追加する。
- HP最大時は回復進捗を無駄に溜めない。
- 満腹度29以下では回復進捗が増えない。
- 満腹度0で空腹ダメージが発生したターンは自然回復しない。
- 回復時に短いログと浮遊テキストを出す。
- 回復時のSEは追加しない。

## 非対象

- 自然回復専用UIゲージ。
- 自然回復専用SEの作り込み。
- 満腹度最大値の増減。
- 食料アイテムの追加。
- 敵AI調整。
- 難度の本格調整。
- 階層別敵/アイテムテーブル。

## 変更対象

- `main.js`
  - `state.player.recoveryCounter` から `recoveryProgress` へのリネーム
  - リトライ時の自然回復進捗初期化
  - 自然回復進捗定数
  - 自然回復進捗ヘルパー
  - 自然回復処理ヘルパー
  - `tickTurn(options = {})`

`index.html` とCSSは変更しない。

## 回復進捗ルール

自然回復は「何ターンごと」ではなく、24ポイントの回復進捗で管理する。

初期候補:

- 回復進捗の最大値: 24。
- 満腹度90以上: 1ターンごとに進捗+4。
- 満腹度70から89: 1ターンごとに進捗+3。
- 満腹度30から69: 1ターンごとに進捗+2。
- 満腹度1から29: 進捗増加なし。
- 満腹度0: 空腹ダメージのみ。進捗増加なし。

進捗が24以上になったらHPを1回復し、進捗を0に戻す。

このルールでは、おおよそ以下の回復速度になる。

- 満腹度90以上: 6ターンごとにHP+1。
- 満腹度70から89: 8ターンごとにHP+1。
- 満腹度30から69: 12ターンごとにHP+1。

満腹度判定は、ターン開始時ではなく、現在の `tickTurn()` と同じく「満腹度を1減らした後」の値で判定する。

例:

- 満腹度90でターン開始。
- `tickTurn()` で89になる。
- 89帯なので進捗+3として扱う。

理由:

- UIに表示される満腹度と回復判定が一致する。
- 空腹になったターンに回復しない設計と相性がよい。
- 境界をまたいでも、進捗が急に消えたり即時回復したりしにくい。
- 満腹度29以下で進捗をリセットしないため、低満腹帯へ一瞬入った時の損失が大きすぎない。

## 境界をまたぐ時の挙動

回復進捗は満腹度帯をまたいでも維持する。

例1: 70以上から69以下へ下がる場合

- 満腹度72から2ターン経過し、進捗が6になる。
- その後、満腹度69以下になったら進捗は6のまま。
- 以後は1ターンごとに+2される。
- 進捗24に達した時点でHP+1。

例2: 69以下から70以上へ戻る場合

- 満腹度60台で5ターン経過し、進捗が10になる。
- おにぎりで満腹度70以上へ戻る。
- 進捗10は維持され、以後は1ターンごとに+3される。
- 進捗24に達した時点でHP+1。

例3: 29以下へ下がる場合

- 進捗が18ある状態で満腹度29以下になる。
- 進捗18は維持される。
- ただし29以下の間は進捗が増えない。
- 食料で30以上へ戻ると、進捗18から再開する。

## 関数設計

### `RECOVERY_PROGRESS_MAX`

回復進捗の最大値。

```js
const RECOVERY_PROGRESS_MAX = 24;
```

### `recoveryGainForHunger(hunger)`

満腹度から1ターンあたりの回復進捗量を返す。

候補:

```js
function recoveryGainForHunger(hunger) {
  if (hunger >= 90) return 4;
  if (hunger >= 70) return 3;
  if (hunger >= 30) return 2;
  return 0;
}
```

0の場合は進捗が増えない。

## 自然回復処理

### `applyNaturalRecovery()`

候補:

```js
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
```

方針:

- HP最大時は進捗を0に戻す。
- 回復できない満腹度帯では進捗を増やさないが、リセットもしない。
- 回復量は固定で1。
- ログは回復した時だけ出す。
- 進捗中のログは出さない。

## `tickTurn()` への組み込み

現在:

```js
function tickTurn(options = {}) {
  if (state.player.hp <= 0) return;
  state.stats.turns += 1;
  state.player.hunger = Math.max(0, state.player.hunger - 1);
  if (state.player.hunger === 0) {
    state.player.hp = Math.max(0, state.player.hp - 1);
    addLog("満腹度が0！ 空腹ダメージ。");
    playSound("damage");
    handlePlayerDefeat(defeatReasons.hunger);
  }
  if (state.gameOver.active) return;
  if (!options.skipEnemies) {
    moveEnemies(options);
  }
}
```

Step 4後の順序:

1. HP0なら何もしない。
2. ターン数を増やす。
3. 満腹度を1減らす。
4. 満腹度0なら空腹ダメージを処理する。
5. 空腹ダメージで全滅したら戻る。
6. 満腹度0でなければ自然回復を処理する。
7. 敵行動を処理する。

候補:

```js
function tickTurn(options = {}) {
  if (state.player.hp <= 0) return;
  state.stats.turns += 1;
  state.player.hunger = Math.max(0, state.player.hunger - 1);

  const starved = state.player.hunger === 0;
  if (starved) {
    state.player.hp = Math.max(0, state.player.hp - 1);
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
```

## 敵行動との関係

自然回復は敵行動の前に行う。

理由:

- ターン経過によるプレイヤー側の消耗/回復を先に解決してから敵が動く方が、現在の空腹ダメージ処理と整合する。
- 足踏み回復をしても、その直後に敵が近づく/攻撃するため、安全な無限回復にはなりにくい。

敵から攻撃された後の自然回復は、次のプレイヤー行動ターンまで発生しない。

## ログ方針

回復時のみログを出す。

候補:

- `吾郎のHPが少し回復した。`

ログが多すぎる場合は、実装後に以下へ変更する。

- ログなしで浮遊テキストだけにする。
- HPが5以上回復した累積タイミングだけログを出す。

Step 4では、動作確認しやすさを優先してログありにする。

## 浮遊テキスト

回復時にプレイヤー位置へ `+1` を出す。

候補:

```js
addFloatingText("+1", state.player.x, state.player.y, "#86efac");
```

薬草やレベルアップと区別するため、色は緑系にする。

## SE方針

Step 4では自然回復専用SEを追加しない。

理由:

- 回復頻度が高くなると音がうるさくなる。
- レベルアップやアイテム使用のSEを目立たせたい。
- 自然回復はログと浮遊テキストだけで十分伝わる。

必要なら後続でごく小さい音を追加する。

## 進捗初期化ルール

`state.player.recoveryProgress` は以下で0に戻す。

- HPが最大の時。
- リトライ時。

満腹度29以下や満腹度0では、進捗を増やさない。ただし進捗はリセットしない。

理由:

- 29以下の境界を一瞬またいだだけで、それまでの回復進捗を全て失うのはリスクが大きい。
- 食料を食べて満腹度を戻した時、以前の進捗から自然に回復を再開できる。

薬草使用時は、HPが最大になれば次のターンで自然に0へ戻る。Step 4では使用時に明示リセットしない。

## 実装順

1. `state.player.recoveryCounter` を `recoveryProgress` へリネームする。
2. リトライ時の初期化も `recoveryProgress = 0` へ変更する。
3. `RECOVERY_PROGRESS_MAX` を追加する。
4. `recoveryGainForHunger(hunger)` を追加する。
5. `applyNaturalRecovery()` を追加する。
6. `tickTurn()` に空腹判定フラグ `starved` を追加する。
7. 空腹でない時だけ `applyNaturalRecovery()` を呼ぶ。
8. 構文チェックを行う。
9. HPを減らした状態で自然回復を手動確認する。

## 完了条件

- 満腹度90以上では6ターンごとにHPが1回復する。
- 満腹度70から89では8ターンごとにHPが1回復する。
- 満腹度30から69では12ターンごとにHPが1回復する。
- 満腹度29以下では回復進捗が増えない。
- 満腹度0では回復進捗が増えず、空腹ダメージだけが発生する。
- 29以下に下がっても既存の回復進捗はリセットされない。
- HP最大時は自然回復ログが出ない。
- 回復時に `+1` の浮遊テキストが出る。
- 回復時にHP表示が更新される。
- 足踏みでも自然回復が発生する。
- 足踏み中も敵は通常どおり動く。
- 全滅、リトライ、レベルアップ全回復が壊れていない。

## 確認方法

### 最高満腹度

- HPを最大未満にする。
- 満腹度を90以上に保つ。
- 6ターン経過でHPが1回復する。
- 回復ログと `+1` が出る。

### 高満腹度

- HPを最大未満にする。
- 満腹度を70から89に保つ。
- 8ターン経過でHPが1回復する。

### 中満腹度

- HPを最大未満にする。
- 満腹度を30から69にする。
- 8ターンでは回復しない。
- 12ターンでHPが1回復する。

### 低満腹度

- HPを最大未満にする。
- 満腹度を29以下にする。
- 何ターン待っても回復進捗が増えない。
- 既存の回復進捗はリセットされない。

### 空腹

- 満腹度を0にする。
- 空腹ダメージが発生する。
- 同じターンに自然回復しない。
- 空腹ダメージでHP0になったら全滅する。

### リトライ

- 自然回復進捗が進んだ状態で全滅する。
- `R` でリトライする。
- 初期状態で余計な自然回復が発生しない。

## リスクと対策

### リスク: 足踏み回復が強すぎる

対策:

- 敵行動は止めない。
- 満腹度は毎ターン消費する。
- 回復量は1に固定する。
- 低満腹時は進捗が増えない。

### リスク: 回復ログが多すぎる

対策:

- まずは確認しやすさを優先してログありにする。
- うるさければログを削り、浮遊テキストだけにする。

### リスク: 空腹ダメージと自然回復が同時に起きる

対策:

- `starved` フラグを使い、満腹度0のターンは `applyNaturalRecovery()` を呼ばない。
- 空腹時は回復進捗を増やさない。

### リスク: レベルアップ全回復直後に自然回復ログが出る

対策:

- HP最大時は `applyNaturalRecovery()` 内で進捗を0に戻して終了する。
- ログは実際にHPが増えた時だけ出す。

## Step 5への引き継ぎ

Step 4完了後、Step 5で階層別の敵/アイテム出現テーブルへ進む。

自然回復が入ることで、敵数やアイテム量の調整時に「HPが少し戻る前提」で1Fから5Fの消耗を見られるようになる。
