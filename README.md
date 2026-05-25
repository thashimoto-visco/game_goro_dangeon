# 吾郎の不思議なダンジョン

ブラウザで動く、シンプルなローグライク（不思議のダンジョン風）です。
https://thashimoto-visco.github.io/game_goro_dangeon/

## 遊び方

1. `index.html` をブラウザで開く。
2. 矢印キー または `WASD` で移動。
3. 隣接する敵の方向へ移動入力すると通常攻撃（1ターン経過）。
4. `Space` で足踏み（1ターン経過）。
5. 床アイテムの上に移動すると自動で拾得。
6. `1`-`9` で持ち物を使用または武器を装備（1ターン経過）。
7. 青いマス（階段）に乗ると次の階へ。
8. HPが0になったら `R` で再挑戦。

## 仕様（現状）

- ランダム生成の部屋＋通路マップ
- 画面より広いマップをプレイヤー追従カメラでスクロール表示
- 吾郎の方向表示と移動時の短い歩行モーション
- 隣接敵方向への移動入力で発生するターン制通常攻撃
- 攻撃モーション、斬撃、ヒット、敵リアクション、撃破演出
- 床アイテム、9枠の持ち物、武器装備、食料、回復薬
- 武器の攻撃補正を通常攻撃ダメージに反映
- 満腹度システム（0になると毎ターンダメージ）
- SFC風のステータス表示とログ
- ゲーム内吾郎スプライト: `assets/materials/spritesheet.webp`

- 参照用ラスタ画像: `assets/goro_reference_1.svg`
- 参照用ラスタ画像（2枚目）: `assets/goro_reference_2.svg`

- 旧/参照用吾郎画像: `assets/goro.svg`, `assets/goro_player.svg`, `assets/goro_sprite_sheet.svg`
- モンスター画像: `assets/monster_slime.svg`, `assets/monster_bat.svg`, `assets/monster_golem.svg`

- タイル画像: `assets/tiles/floor_01.svg`, `assets/tiles/floor_02.svg`, `assets/tiles/floor_03.svg`, `assets/tiles/wall_01.svg`, `assets/tiles/wall_02.svg`, `assets/tiles/wall_03.svg`, `assets/tiles/stairs_down.svg`
- 仮アイコン画像: `assets/icons/item_weapon.svg`, `assets/icons/item_food.svg`, `assets/icons/item_potion.svg`
