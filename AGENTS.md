# プロジェクトコンテキスト（常に参照すること）

## Gitリモート構成（最重要）
2つのリモートがあり、**両方にpushする必要がある**：

```bash
git push origin master          # 開発用リポジトリ
git push kanri_flow master:main # GitHub Pages公開用
```

`kanri_flow` へのpushを忘れるとWebサイトが更新されない。
詳細は `.opencode/skills/kanri-flow/SKILL.md` 参照。

## トラブルシューティングの優先順位
修正が反映されない場合：
1. まず**リモート構成**を確認（origin vs kanri_flow）
2. 次に**ブラウザキャッシュ**（ハードリロード）
3. 最後に**コード自体**の確認

## 日付フォーマットのルール
- 入力・CSV保存形式: `yyyy/mm/dd`
- **報告案docx**（`reportDocxDataForRow`）の `{{報告事項}}`: `yyyy年mm月dd日`（`formatDateToJapanese` 使用）
- **起案文docx**（`docxDataForRow`）の `{{報告事項}}`: `yyyy/mm/dd`（生の日付を使用、`formatDateToJapanese` を経由しない）
- 個別の `{{公表日}}` フィールドは両方とも `formatDateToJapanese` を使用（`yyyy年mm月dd日`）

## getValue() の動作（重要）
`common.js` の `getValue(id)` は、まずDOM要素（`document.getElementById(id)`）を探し、存在すればその値を返す。DOMに存在しない場合は `state[id]` からフォールバック取得する。ステップ3（起案文・報告案docx差し込み）など、入力欄がDOM上にない画面でもstateから値を取得できる。

## CSVパースの注意
`common.js` の `parseCsvRobust` はカンマ区切り（`,`）とタブ区切り（`\t`）の両方をサポートする。
