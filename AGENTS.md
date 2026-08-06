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

## apply/publish共通JSの変更ルール（重要）
`common.js` はapply_report.htmlとpublish_report.htmlの**両方で共有**されている。
apply側の改善をpublish側に影響させたくない場合は、`pageMode === 'apply'` でガードする：
```js
var pageMode = pageMode || 'publish'; // 各HTMLで設定済み（apply='apply' / publish='publish'）
```
- `pageMode` はapply_report.html→'apply'、publish_report.html→'publish' で設定済み
- 改善をpublishに波及させない既存ガード例：`reportTypeLabel` / `reportTypeFromLabel` / `updateModeUI` のタイトル / `renderRequestRows` の報告区分・申請内容・備考欄
- `identifiers.js` は**publish_report.htmlでは読み込まれない**（apply専用）ためガード不要

## キャッシュバスター更新ルール（重要）
`common.js` を変更した場合は、**全HTMLのキャッシュバスタークエリを更新する**こと：
```
<script src="common.js?v=<最新コミットハッシュ>"></script>
```
- 更新対象：apply_report.html / publish_report.html / index.html / other_report.html / procedure.html / guide.html / approval.html の7ファイル
- 更新を忘れると、ブラウザキャッシュにガード前のcommon.jsが残り、publish側に改善版の挙動が混ざる

## GitHub Actionsデプロイの注意点
- デプロイは `morikawa001/kanri_flow` リポジトリのActionsで自動実行（pages.yml）
- **連続pushすると、前回のデプロイが「in progress」のまま次のデプロイが失敗する**（`Deployment request failed ... due to in progress deployment`）
- 失敗した場合は `gh run rerun <run_id>` で再実行（前のデプロイ完了を待ってから）
- デプロイ完了は `gh run list --repo morikawa001/kanri_flow --limit 1` で確認

## wordファイルの復元
- 変更申請用テンプレート（03_2_kanri-flow_変更_起案.doc / 03_kanri-flow_変更_起案.docx / 04_kanri-flow_変更_報告案.docx）はmasterには含まれておらず、バックアップブランチ `backup/20260806-apply-improvements` にのみ存在する
- 削除時は以下で復元する：
  ```bash
  git checkout backup/20260806-apply-improvements -- "03_2_kanri-flow_変更_起案.doc" "03_kanri-flow_変更_起案.docx" "04_kanri-flow_変更_報告案.docx"
  ```
