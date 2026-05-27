# 吾郎の不思議なダンジョン

ブラウザで動く、シンプルなローグライク（不思議のダンジョン風）です。
https://thashimoto-visco.github.io/game_goro_dangeon/

## 遊び方

1. `index.html` をブラウザで開く。
2. 矢印キー または `WASD` で移動。
3. 隣接する敵の方向へ移動入力すると通常攻撃（1ターン経過）。
4. `Space` で足踏み（1ターン経過）。
5. 床アイテムの上に移動すると自動で拾得。
6. `I` で持ち物メニューを開く。上下で選択、`Enter` で使用/装備、`D` で足元に置く、`Escape` で閉じる。
7. `1`-`9` でも持ち物を即使用または武器を装備できる（1ターン経過）。
8. 青いマス（階段）に乗ると次の階へ。
9. HPが0になると全滅画面と戦績が表示される。`R` で再挑戦。
10. `音 OFF` ボタンを押すと音が有効になり、もう一度押すとミュート。
11. 敵を倒すと経験値を得て、一定値でレベルアップ。
12. 満腹度が十分ある時は、ターン経過でHPが少しずつ自然回復。

## 仕様（現状）

- ランダム生成の部屋＋通路マップ
- 画面より広いマップをプレイヤー追従カメラでスクロール表示
- 吾郎の方向表示と移動時の短い歩行モーション
- 隣接敵方向への移動入力で発生するターン制通常攻撃
- 攻撃モーション、斬撃、ヒット、敵リアクション、撃破演出
- 床アイテム、9枠の持ち物、武器装備、食料、回復薬
- 持ち物メニューで使用、装備、足元に置く操作
- 武器の攻撃補正を通常攻撃ダメージに反映
- 敵ごとの経験値、プレイヤーレベル、経験値テーブル
- レベルアップ時の最大HP/攻撃/守備上昇とHP全回復
- レベル、経験値、次レベルまでのステータス表示
- 満腹度に応じたHP自然回復
- 階層別の敵出現テーブル（1Fはスライム中心、深い階ほどコウモリ/ゴーレムが増加）
- 階層別のアイテム出現テーブル（深い階ほど鉄の剣がやや出やすい）
- 全滅時の死因表示、暗転、倒れ演出、戦績表示、再挑戦導線
- 初期ミュートのSE/BGMと音ON/OFFボタン
- 満腹度システム（0になると毎ターンダメージ）
- SFC風のステータス表示とログ
- ゲーム内吾郎スプライト: `assets/materials/spritesheet.webp`

- 参照用ラスタ画像: `assets/goro_reference_1.svg`
- 参照用ラスタ画像（2枚目）: `assets/goro_reference_2.svg`

- 旧/参照用吾郎画像: `assets/goro.svg`, `assets/goro_player.svg`, `assets/goro_sprite_sheet.svg`
- モンスター画像: `assets/monster_slime.svg`, `assets/monster_bat.svg`, `assets/monster_golem.svg`

- タイル画像: `assets/tiles/floor_01.svg`, `assets/tiles/floor_02.svg`, `assets/tiles/floor_03.svg`, `assets/tiles/wall_01.svg`, `assets/tiles/wall_02.svg`, `assets/tiles/wall_03.svg`, `assets/tiles/stairs_down.svg`
- 仮アイコン画像: `assets/icons/item_weapon.svg`, `assets/icons/item_food.svg`, `assets/icons/item_potion.svg`

## 配信時のアセットパス

`main.js` は `window.GORO_DUNGEON_CONFIG.assetBaseUrl` を基準に画像パスを解決します。

未指定の場合は `document.baseURI` を基準にします。GitHub Pagesなどのproject siteでは、`index.html` 側で現在のHTML位置を基準に注入しているため、`/assets/...` ではなく `./assets/...` 相当で解決されます。

別の配信先でアセットだけCDNなどへ置く場合は、`main.js` より前に以下のように指定できます。

```html
<script>
  window.GORO_DUNGEON_CONFIG = {
    assetBaseUrl: "https://example.com/game_goro_dangeon/",
  };
</script>
```
