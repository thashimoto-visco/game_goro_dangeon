# Phase 3 詳細プラン: 攻撃モーションと戦闘演出

## Phase 3の目的

現在の戦闘は、敵のいるマスへ移動入力した瞬間にダメージ計算とログ表示が完了する。Phase 3ではこれを、短い攻撃モーション、ヒット演出、ダメージ数字、敵のリアクションを含む「見て気持ちいい戦闘」にする。

重要なのは、戦闘テンポを重くしすぎないこと。ローグライクとしての入力の軽さを保ちながら、攻撃した手応えを足す。

## Phase 3の前提

Phase 2で以下が実装済みであることを前提にする。

- プレイヤー追従カメラ
- 大型化された吾郎とMOB
- 足元基準の描画
- プレイヤー/MOBの足元 `y` ソート
- `state.player.direction`
- `state.player.motion`
- `sprites.player.idle`
- `sprites.player.walk`
- `effects` 配列
- `drawEffectsLayer()`
- `startCameraShake()`
- `startFlash()`
- ダメージ数字の簡易 `floatingText`

## Phase 3のスコープ

含める:

- 攻撃状態 `attack` の追加
- 隣接敵方向への移動入力を通常攻撃として扱う操作方針
- 通常攻撃の1ターン消費
- 攻撃中の入力受付制御
- プレイヤー攻撃モーション
- 敵攻撃の簡易モーション
- 斬撃/打撃エフェクト
- ヒットストップ
- ダメージ数字のタイミング調整
- 敵の被弾点滅/揺れ
- 敵撃破時の消滅演出
- 戦闘処理と演出処理の責務整理

含めない:

- 武器種ごとの攻撃モーション差分
- 専用攻撃ボタン
- 素振り/空振り
- アイテムや武器のダメージ補正
- 状態異常
- 遠距離攻撃
- 魔法
- 本格的な効果音/BGM

## 目標体験

プレイヤーが敵を攻撃したとき:

```text
入力
↓
吾郎が敵方向を向く
↓
吾郎が一瞬踏み込む
↓
斬撃/打撃エフェクトが敵の手前に出る
↓
ヒットストップ
↓
ダメージ数字表示
↓
敵が点滅または揺れる
↓
敵が生きていれば反撃
↓
ターン終了
```

敵が攻撃したとき:

```text
敵が吾郎方向に少し寄る
↓
赤フラッシュ/小シェイク
↓
吾郎にダメージ数字
↓
ターン終了
```

敵を倒したとき:

```text
ヒット
↓
敵が点滅
↓
小さな消滅エフェクト
↓
ログ表示
↓
経験値加算
```

## 戦闘設計方針

### 操作方針

トルネコ/シレン系に寄せるため、Phase 3の通常攻撃は「隣接敵方向への移動入力」で発生する。

```text
敵がいる方向へ移動入力
↓
プレイヤーは移動しない
↓
その方向へ通常攻撃
↓
攻撃で1ターン消費
↓
敵が生きていれば敵ターン/反撃演出
```

Phase 3では専用攻撃ボタンは追加しない。

将来的に攻撃ボタンを検討する用途:

- 素振り/空振り
- 方向指定攻撃
- 武器の特殊攻撃
- 弓、杖、魔法などの遠距離攻撃
- 罠確認や壁殴りなどの特殊操作

Phase 3では、`Space` は従来どおり足踏みで1ターン消費する。

### 現状

現在は `combat(enemy)` の中で、以下を即時実行している。

- プレイヤーダメージ計算
- 敵HP減少
- ダメージ数字
- ログ表示
- 敵撃破判定
- 敵反撃
- プレイヤーHP減少
- 被弾エフェクト

### Phase 3での方針

戦闘結果の計算と、画面上の演出を分ける。

ただし、この段階で大きな非同期システムを作りすぎない。まずは `state.action` に短いアクションシーケンスを持たせ、`updateAnimations(delta)` で進行する。

## 状態設計

### `state.action`

演出中の入力制御とタイミング管理に使う。

```js
state.action = null;
```

攻撃中の例:

```js
state.action = {
  type: "playerAttack",
  age: 0,
  duration: 260,
  phase: "windup",
  attacker: state.player,
  target: enemy,
  direction: state.player.direction,
  result: {
    damage: 7,
    killed: false,
    counterDamage: 2,
  },
  appliedHit: false,
  appliedCounter: false,
};
```

### 入力受付

`canAcceptInput()` を以下のように変更する。

```js
function canAcceptInput() {
  return !state.action;
}
```

演出中は新しい移動、足踏み、攻撃入力を受け付けない。`R` キーの再挑戦はHP 0時のみ例外で受け付ける。

### プレイヤーモーション

既存の `state.player.motion` は歩行用に使っている。Phase 3では攻撃用も同じ枠に追加する。

```js
state.player.motion = {
  type: "attack",
  age: 0,
  duration: 220,
  direction: "right",
  lungeX: 0.35,
  lungeY: 0,
};
```

`getPlayerVisualGrid()` は `walk` と `attack` の両方を扱う。

攻撃時は、現在マスから敵方向へ0.25から0.35マスだけ踏み込んで戻る。

## スプライト方針

### 吾郎攻撃セル

`assets/materials/spritesheet.webp` から、構えや拳を上げているセルを攻撃用候補として使う。

候補:

- 構え: 下段の拳を構えたポーズ
- 手を上げたポーズ: 中段の片手上げ
- 横向き走りセル: 左右攻撃の踏み込みに流用

Phase 3の最初は、専用攻撃絵が完全でなくてもよい。重要なのは「攻撃中だけ明確に別ポーズ/踏み込みになる」こと。

### 敵リアクション

敵専用の被弾スプライトはまだ不要。

代替表現:

- 点滅
- 横揺れ
- 赤/白の一瞬の乗算風フラッシュ
- 撃破時の縮小またはフェードアウト

## エフェクト設計

### 追加するエフェクト種別

`effects` に以下を追加する。

```js
{
  type: "slash",
  x,
  y,
  direction,
  age,
  duration,
}
```

```js
{
  type: "impact",
  x,
  y,
  age,
  duration,
}
```

```js
{
  type: "defeat",
  x,
  y,
  age,
  duration,
}
```

既存:

- `floatingText`

### `slash`

プレイヤー攻撃時に敵マス上へ表示する。

見た目:

- 白/薄黄色の弧
- 方向に応じて角度を変える
- 100から140ms程度

### `impact`

ヒット時に敵中心へ表示する。

見た目:

- 小さな星形または十字
- 80から120ms程度

### `defeat`

敵撃破時に表示する。

見た目:

- 小さな粒
- フェードアウト
- 200から300ms程度

## 戦闘処理の分割

### 追加する関数

```js
function buildPlayerAttackResult(enemy) {}
function startPlayerAttack(enemy) {}
function updateAction(delta) {}
function updatePlayerAttackAction(action, delta) {}
function applyPlayerAttackHit(action) {}
function applyEnemyCounter(action) {}
function finishAction() {}
```

### `tryMove(dx, dy)` の変更

現状:

```js
if (e) {
  combat(e);
  tickTurn();
  return;
}
```

Phase 3:

```js
if (e) {
  startPlayerAttack(e);
  return;
}
```

攻撃は1ターン消費する。ターン進行はアクション完了時に行う。

### `combat(enemy)` の扱い

`combat(enemy)` は削除または内部関数化する。

推奨:

- ダメージ計算だけを `buildPlayerAttackResult(enemy)` に移す。
- 実際のHP減少、経験値加算、ログ表示は、演出タイミングに合わせて `applyPlayerAttackHit(action)` で行う。

## タイミング案

### プレイヤー攻撃

全体: 260ms程度

```text
0-70ms: windup
70-130ms: slash + hit
130-180ms: hitstop
180-260ms: recover
```

処理タイミング:

- 0ms: 攻撃モーション開始
- 70ms: 斬撃エフェクト追加
- 90ms: ダメージ適用、ダメージ数字表示
- 100ms: 敵被弾リアクション開始
- 180ms: 敵が生きていれば反撃開始
- 260ms: アクション終了、ターン終了

敵反撃を含む場合は、全体を360ms程度に伸ばしてもよい。

### 敵反撃

追加: 140ms程度

```text
0-60ms: 敵が少し寄る
60ms: ダメージ適用
60-120ms: 赤フラッシュ/シェイク
120-140ms: 戻る
```

## カメラ連携

攻撃中は以下の演出を入れてよい。

- ヒット時に軽いカメラシェイク
- 敵撃破時に少し強めのシェイク
- プレイヤー攻撃時にカメラは通常どおりプレイヤー追従

注意:

- カメラ座標を戦闘判定に使わない。
- エフェクト位置はグリッド座標またはワールド座標で持ち、描画時に画面座標へ変換する。

## タスク一覧

### Task 1: `state.action` と入力制御を追加

内容:

- `state.action = null` を追加。
- `canAcceptInput()` を `!state.action` ベースに変更。
- `clearTransientVisuals()` で `state.action` をクリア。

受け入れ条件:

- 攻撃演出中に移動入力が多重に入らない。
- 再挑戦時にアクション状態が残らない。

### Task 2: 攻撃結果ビルダーを作る

内容:

- `buildPlayerAttackResult(enemy)` を追加。
- プレイヤーダメージ、敵撃破、反撃ダメージを計算する。
- この時点ではHPを変更しない。

受け入れ条件:

- 戦闘結果を事前計算できる。
- 実際のHP変更は演出タイミングまで遅延できる。

### Task 3: `startPlayerAttack(enemy)` を追加

内容:

- プレイヤー方向を敵方向へ向ける。
- `state.action` を作る。
- `state.player.motion` に攻撃モーションを設定する。

受け入れ条件:

- 敵に攻撃入力した時、即ダメージではなく攻撃状態へ入る。
- 隣接敵方向への移動入力で攻撃が発生する。
- 専用攻撃ボタンなしで通常攻撃できる。
- 攻撃対象が保存される。

### Task 4: アクション更新処理を追加

内容:

- `updateAction(delta)` を追加。
- `updateAnimations(delta)` から呼ぶ。
- `playerAttack` のタイミングを進行する。

受け入れ条件:

- `state.action.age` が進み、終了時にクリアされる。
- 演出中の入力制御が効く。

### Task 5: 攻撃モーションを描画に反映

内容:

- `getPlayerVisualGrid()` に `attack` を追加。
- `getPlayerSprite()` に攻撃中のセル選択を追加。
- 敵方向へ少し踏み込んで戻る。

受け入れ条件:

- 攻撃時に吾郎が敵方向へ踏み込む。
- 攻撃後に元の足元基準へ戻る。

### Task 6: 斬撃/打撃エフェクトを追加

内容:

- `addSlashEffect(x, y, direction)` を追加。
- `drawEffectsLayer()` で `slash` を描画。
- 方向ごとに弧や線の向きを変える。

受け入れ条件:

- 攻撃時に敵の位置へ短いエフェクトが出る。
- エフェクトが時間経過で消える。

### Task 7: ヒット処理のタイミングを移す

内容:

- 攻撃開始直後ではなく、攻撃中盤でHPを減らす。
- ダメージ数字も同タイミングで表示する。
- ログ表示もヒット時に出す。

受け入れ条件:

- 見た目のヒットとダメージ表示のタイミングが合う。
- 敵撃破時の経験値加算が1回だけ行われる。
- 攻撃完了時に1ターンぶんの満腹度減少と敵行動が発生する。

### Task 8: 敵被弾リアクションを追加

内容:

- 敵に `hitFlash` または `hitMotion` を持たせる。
- 描画時に点滅/揺れを反映する。

受け入れ条件:

- 敵が攻撃を受けたことが視覚的に分かる。
- 点滅や揺れが残り続けない。

### Task 9: 敵反撃演出を追加

内容:

- 敵が生存している場合、短い反撃フェーズを追加。
- 敵を吾郎方向へ少し寄せる。
- 反撃ダメージ、赤フラッシュ、カメラシェイクをタイミング合わせする。

受け入れ条件:

- 敵反撃が即時ログだけではなく見える。
- プレイヤーHPが正しいタイミングで減る。

### Task 10: 撃破演出を追加

内容:

- 敵撃破時に `defeat` エフェクトを追加。
- 敵の消滅をフェード/点滅で見せる。

受け入れ条件:

- 敵撃破時に消え方が自然。
- 死亡済み敵が再描画されない。

### Task 11: 既存 `combat(enemy)` を整理

内容:

- `combat(enemy)` を削除するか、Phase 3用関数に置き換える。
- `tryMove()` から直接 `combat()` を呼ばない。

受け入れ条件:

- 戦闘入口が `startPlayerAttack()` に一本化される。
- 即時ダメージ処理が残っていない。

### Task 12: README更新

内容:

- 攻撃モーション、ヒット演出、敵リアクションを仕様に追記。

受け入れ条件:

- READMEの現状仕様が実装と一致する。

## 推奨実装順

1. `state.action` と入力制御を追加。
2. 攻撃結果ビルダーを作る。
3. `tryMove()` の戦闘入口を `startPlayerAttack()` に変更。
4. `updateAction()` を追加。
5. プレイヤー攻撃モーションを追加。
6. 斬撃/打撃エフェクトを追加。
7. ヒットタイミングでHP減少とダメージ数字を出す。
8. 敵被弾リアクションを追加。
9. 敵反撃演出を追加。
10. 撃破演出を追加。
11. 旧 `combat()` を整理。
12. READMEを更新。
13. 静的確認と手動確認。

## 受け入れ条件

Phase 3完了条件:

- 隣接敵方向への移動入力が通常攻撃になる。
- 通常攻撃が1ターン消費する。
- Phase 3時点では専用攻撃ボタンを要求しない。
- 敵への攻撃時に吾郎が攻撃モーションを行う。
- 攻撃時に斬撃/打撃エフェクトが出る。
- ダメージ数字がヒットタイミングで出る。
- 敵が被弾時に点滅または揺れる。
- 敵が生きていれば反撃演出を行う。
- 敵撃破時に消滅演出がある。
- 攻撃中に移動入力が多重処理されない。
- 戦闘テンポが重くなりすぎない。
- 既存の移動、階段、再挑戦が壊れていない。

## 手動テスト項目

### 通常攻撃

- 敵の隣へ移動する。
- 敵方向へ入力する。
- 吾郎が敵方向へ向く。
- 吾郎が踏み込む。
- 攻撃エフェクトが出る。
- 敵HPが減る。
- ダメージ数字が表示される。

### 敵反撃

- 敵が生存する攻撃を行う。
- 敵の反撃演出が出る。
- 吾郎HPが減る。
- 赤フラッシュ/カメラシェイクが残らない。

### 敵撃破

- 敵を倒す。
- 撃破演出が出る。
- 経験値が増える。
- 死亡敵が描画されない。

### 入力制御

- 攻撃演出中に方向キーを連打する。
- 多重移動や多重攻撃が起きない。
- 演出終了後は通常入力に戻る。

### 既存機能

- 階段に乗ると次階へ進む。
- HP 0後に `R` で再挑戦できる。
- 再挑戦後にアクションやエフェクトが残らない。

## リスクと対策

### リスク: 戦闘結果が複数回適用される

対策:

- `action.appliedHit` と `action.appliedCounter` を持つ。
- HP変更や経験値加算はフラグ確認後に1回だけ行う。

### リスク: 演出中入力で状態が壊れる

対策:

- `canAcceptInput()` を `!state.action` にする。
- `keydown` の入口で攻撃/移動/足踏みを抑制する。

### リスク: 敵が倒れた後に反撃する

対策:

- `result.killed` がtrueの場合は反撃フェーズを作らない。
- `applyEnemyCounter()` 直前にも敵HPを確認する。

### リスク: カメラとエフェクト位置がズレる

対策:

- エフェクトはグリッド座標またはワールド座標で保存する。
- 描画時に `worldToScreenX()` / `worldToScreenY()` で変換する。

### リスク: 戦闘テンポが悪くなる

対策:

- プレイヤー攻撃単体は260ms程度を上限にする。
- 敵反撃込みでも400ms前後に収める。
- ヒットストップは80ms以下にする。

## 実装メモ

### 攻撃方向

```js
function directionToDelta(direction) {
  if (direction === "right") return { dx: 1, dy: 0 };
  if (direction === "left") return { dx: -1, dy: 0 };
  if (direction === "down") return { dx: 0, dy: 1 };
  return { dx: 0, dy: -1 };
}
```

### 攻撃モーション補間

```js
function attackLunge(progress) {
  if (progress < 0.5) return progress * 2 * 0.32;
  return (1 - progress) * 2 * 0.32;
}
```

### slash描画案

```js
ctx.strokeStyle = "rgba(255, 244, 214, 0.9)";
ctx.lineWidth = 4;
ctx.beginPath();
ctx.arc(px, py, radius, startAngle, endAngle);
ctx.stroke();
```

## Phase 4への引き継ぎ

Phase 3完了後、Phase 4では武器とアイテムを追加する。Phase 3で作る攻撃処理は、武器の攻撃力や武器種ごとの演出差分を足せる形にしておく。

引き継ぎたい設計:

- `buildPlayerAttackResult(enemy)` に武器補正を入れられること。
- `startPlayerAttack(enemy)` に武器種ごとのエフェクトを渡せること。
- `state.action` が他の行動、たとえばアイテム使用演出にも流用できること。
