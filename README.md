# 吾郎の不思議なダンジョン

ブラウザで動く、シンプルなローグライク（不思議のダンジョン風）です。
https://thashimoto-visco.github.io/game_goro_dangeon/

## 遊び方

1. `index.html` をブラウザで開く。
2. 矢印キー または `WASD` で移動。
3. `Space` で足踏み（1ターン経過）。
4. 青いマス（階段）に乗ると次の階へ。
5. HPが0になったら `R` で再挑戦。

## 仕様（現状）

- ランダム生成の部屋＋通路マップ
- 画面より広いマップをプレイヤー追従カメラでスクロール表示
- モンスターとのターン制戦闘
- 満腹度システム（0になると毎ターンダメージ）
- SFC風のステータス表示とログ
- 吾郎のアセット画像: `assets/goro.svg`

- 参照用ラスタ画像: `assets/goro_reference_1.svg`
- 参照用ラスタ画像（2枚目）: `assets/goro_reference_2.svg`

- 吾郎スプライトシート: `assets/goro_sprite_sheet.svg`
- 吾郎素材スプライトシート: `assets/materials/spritesheet.webp`
- モンスター画像: `assets/monster_slime.svg`, `assets/monster_bat.svg`, `assets/monster_golem.svg`

- ゲーム内プレイヤー画像: `assets/goro_player.svg`

- タイル画像: `assets/tiles/floor_01.svg`, `assets/tiles/floor_02.svg`, `assets/tiles/floor_03.svg`, `assets/tiles/wall_01.svg`, `assets/tiles/wall_02.svg`, `assets/tiles/wall_03.svg`, `assets/tiles/stairs_down.svg`
- 仮アイコン画像: `assets/icons/item_weapon.svg`, `assets/icons/item_food.svg`, `assets/icons/item_potion.svg`
