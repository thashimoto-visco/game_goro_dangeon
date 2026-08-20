# Topic 8 完了メモ: タイトル、スコア、リザルト

完了日: 2026-08-20

## 実装したもの

- `state.scene` による `title` / `help` / `playing` / `result` の4シーン。
- タイトルの開始導線、`H` の操作説明、`S` の音ON/OFF。
- ゲームオーバーを従来どおり `playing` の重ねパネルとして維持。
- ゲームオーバーの `R` 即再挑戦と `Enter` リザルト導線。
- リザルトの今回結果、通過テーマ、項目別自己ベスト。
- 使用アイテム数、拾得数、最深階層、通過テーマの集計。
- 独立した `run-record.js` のスコア計算、保存データ検証、項目別最大値更新。
- `localStorage` の読み書き例外、破損データ、保存不可環境からの安全な劣化。
- タイトル／リザルトの生成背景と、画像なしでも成立するCanvas図形フォールバック。

## 主要な判断

- シーン分岐は `loop()`、`updateUi()`、`keydown`、`canAcceptInput()` の4箇所に限定した。
- スコアは `最深階層×100 + 撃破×10 + 強敵撃破×50 + レベル×20 + 経験値` とし、ターン数を含めない。
- 自己ベストは最高スコア回への従属ではなく、スコア、階層、撃破、強敵撃破、レベルごとに最大値を持つ。
- 空の杖は効果不発として使用数へ加えない。
- デバッグクエリ有効時は従来の検証速度を保つため、タイトルを飛ばす。

## 画像生成記録

組み込みの画像生成機能で、1280×960・文字なしの背景を生成し、WebPへ変換した。タイトルとリザルトはいずれも、プレイヤーへ本人像を示すため `assets/materials/吾郎.png` を人物参照にした写実表現とした。ゲーム内のタイル、敵、アイテム、吾郎スプライトには生成画像を混ぜていない。

- `assets/ui/title_bg.webp`: 以前の石造門画像は構図ごと破棄して新規生成。濡れた古代石造の地下入口を背に、実在の吾郎を左側へ大きく写した映画的・写実的な一枚。右側はタイトル文字用に空けた。
- `assets/ui/result_bg.webp`: 以前のピクセルアート背景を破棄して新規生成。湿った古代石室の低い段に、冒険を終えて休む実在の吾郎を左側へ配置した映画的・写実的な一枚。右側は結果と自己ベスト用に暗く空けた。
- 吾郎の人物特徴: 頭頂が薄く側頭部に髪、黒い四角眼鏡、丸い顔、紺の作業シャツ。両画面とも年齢、体格、肌や服の質感を本人参照に寄せた。
- 変換後サイズ: タイトル約76KB、リザルト約51KB。いずれも1280×960 WebP。

タイトル再生成時の指示:

> Create a completely new cinematic photorealistic 4:3 title image using `assets/materials/吾郎.png` only as the identity and clothing reference. Show exactly one real Goro large on the left at an ancient wet-stone underground entrance. Preserve his age, face, bald crown with dark side hair, black rectangular glasses, round body shape, and navy work shirt. Use realistic skin, wrinkles, fabric, dramatic cool backlight and warm rim light. Leave the right side dark and low-detail for Canvas title text. No fantasy costume, weapon, other people, monsters, illustration, pixel art, text, logo, or watermark.

リザルト再生成時の指示:

> Create a completely new cinematic photorealistic 4:3 result background using `assets/materials/吾郎.png` only as the identity and clothing reference. Show exactly one real Goro seated on a low wet-stone step in the left 35%, leaning forward after a difficult expedition with tired eyes and a small resilient half-smile. Preserve his age, bald crown, dark side hair, black rectangular glasses, round body shape, navy work shirt, and realistic skin and fabric. Keep the right 60% dark and low-detail for dense Canvas result text. Use cool blue dungeon light with restrained amber rim light. No fantasy armor, weapon, injuries, other people, monsters, illustration, pixel art, text, logo, or watermark.

## テスト

- `node tests/run-record-tests.js`: スコア、項目別更新、初回、更新なし、runCount、破損値、未知キー、読み書き例外を確認。
- `node tests/app-startup-tests.js`: タイトル、説明、音、開始、デバッグスキップ、全滅からリザルト、再挑戦、タイトル復帰、保存例外を確認。
- 既存のフロアテーマ、アイテム、敵AI、モンスター、特殊遭遇、状態異常、構造テストを含む全テストが通過。

## 次への引継ぎ

- `run-record.js` の保存ラッパーと検証は、日替わりダンジョンや中断セーブの作法に流用できる。
- `state.scene` にポーズを追加できるが、今回は専用管理システムへ広げていない。
- 次の中期軸は、視界の光線方式化、行動頻度（倍速／鈍足）、未識別・呪い・店のいずれかを候補とする。
