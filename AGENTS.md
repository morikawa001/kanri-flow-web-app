# AGENTS.md - 開発エージェント向けプロジェクトガイド

臨床研究支援チームが使う「管理者報告フロー統合パネル」のWebアプリ。**静的HTMLページ群**（フレームワーク・ビルドツール・テスト基盤なし）。このファイルは常に参照し、変更前に必ず読むこと。

## 1. ビルド / Lint / テスト コマンド

**このプロジェクトにビルド・Lint・自動テストの仕組みは存在しない。** 取り扱うのはGitHub Pages上で動く静的なHTML/CSS/JSのみ。

- ビルドコマンド: **なし**（`.github/workflows/pages.yml` が `kanri_flow/main` へのpush時にページをそのまま公開する）
- Lintコマンド: **なし**（eslint/prettier等の設定・依存は存在しない）
- テストコマンド: **なし**（テストフレームワークや `*.test.*` / `*.spec.*` ファイルは存在しない）

### 変更後の検証手順（これが「テスト」の代わり）

1. **JS構文チェック**（変更した各JSファイルに対して実行）:
   ```bash
   node --check common.js        # 変更したファイルごとに実行
   node --check apply_report.html  # ※使わない。HTMLはnodeで直接検査不可
   ```
   補足: `node --check <file.js>` はファイル末尾で実行し、構文エラーがあれば終了コード非0で報告される。変更した全JSファイル（common.js / state.js / utils.js / dates.js / identifiers.js / gas/Code.gs）に適用。
   - HTML埋め込みの `<script>`（apply_report.html / publish_report.html / procedure.html のインラインJS含む）は抽出して検査する:
     ```bash
     node -e "const s=require('fs').readFileSync('apply_report.html','utf8'); const m=[...s.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n'); new Function(m); console.log('OK apply_report.html')"
     ```
     （修正: 上記は `new Function(...)` で構文検証する。`</script>` を含むHTMLは改行コード等に注意）
3. **ページ番号の一貫性確認**: 全HTMLの見出し・フロー定義が `state.js` / 各HTML内 `stages` と一致しているか目視確認。
4. **ブラウザ検証**: ローカルで `python -m http.server 8000` 等で起動し、apply / publish / index / procedure / guide / approval / other_report の7ページを開いて動作確認（コンソールエラーなし・テーマ切替・ナビONなど）。
5. **デプロイ確認**: push後は `.github/workflows/pages.yml` によるGitHub Pagesデプロイが成功するまで待ち、`gh run list --repo morikawa001/kanri_flow --limit 1` で "completed" を確認。

### 単一のテストだけ走らせたい場合
単一テストの仕組み自体が存在しないため、「変更した関数の単体検証」を node で直接行う:
```bash
git diff --stat        # どのファイルを変えたか確認 → 変更JSのみ node --check
node --check common.js # 例：common.js を変更した場合
```

## 2. コードスタイルガイドライン

### 2.1 全体方針
- **Vanilla JSのみ**。フレームワーク・ライブラリ・ビルドツールは使わない（外部CDNライブラリ：JSZip / SheetJS / Pizzip / docxtemplater のみ例外として `<script>` で読み込み）。
- **日本語コメント・日本語UI文言**を前提とする。英単語を使う場合も語の表記揺れを避ける（例:「起案」「報告」の表記）※参照: `.opencode/skills/kanri-flow/SKILL.md`。
- 1ファイル1役割（`state.js`=状態, `utils.js`=汎用, `dates.js`=日付, `identifiers.js`=番号・依頼行, `common.js`=共通ロジック）。

### 2.2 モジュールパターン（重要）
- グローバル名前空間 `App` に IIFE（即時実行関数）で名前空間を追加する：
  ```js
  var App = App || {};
  App.utils = (function() {
    'use strict';
    // private functions...
    return { publicApi: publicApi };   // 公開APIのみexport
  })();
  ```
- `common.js` はページモード付きグローバル関数群（`h`, `getValue`, `folderSetFor` 等。モジュール化されていない）。
- `state.js` が `App.state.stages` を管理しているが、各HTMLの `stages` はHTML内に直接定義された重複版。**ES保守時に両者を同期させる**こと。

### 2.3 命名規則
- 関数/変数: **camelCase**（例: `requestRowsData`, `folderSetFor`）。
- 定数: **SCREAMING_SNAKE_CASE**（例: `STORAGE_KEY = 'kanri-flow-theme'`）。
- HTML: クラス名は小文字の **kebab-case / BEM風**（例: `.checkitem`, `.template-card`）。日本語は不可。
- CSS変数: `--プレフィックス-名前`（例: `--primary` / `--primary-glow` / `--robot-accent`）＋ライト/ダークは `[data-theme="light"|"dark"]`。
- ページ識別: `<html data-theme="light">` と `<body class="page-apply|page-publish">` で差別化。

### 2.4 型・エラー処理
- **型は明示しない**（JS）。`var` / `let` / `const` の混用可だが古いコードは `var`。新規は `const` 優先。
- エラー処理は `try/catch` と `catch(e){...}`、古いスタイルでは `if(!x) return;` フェイルファスト。UIの返事は日本語メッセージ。
- `escapeHtml` / `h()` で出力をHTMLエスケープしてから `innerHTML` に流す（XSS対策）。直接文字列連結で `innerHTML` に渡さない。
- `?` 演算子などES2020以降の構文を古いファイルでは使う場合、スクリプトがどこで読まれているか（IE非対応可＝そのまま使用してOKなことが多い）事前に確認すること。

### 2.5 ページ間の重複コード
- 各HTMLは main 部に直接HTMLとJSを持つ（`apply_report.html` / `publish_report.html` の `common.js` + `identifiers.js` 等）。
- 重要な注意：**適用側の改善をpublish側へ波及させないため `pageMode === 'apply'` でガード**している（`common.js`参照）。詳細は下記「apply/publish共通JSの変更ルール」。

### 2.6 コメント規約
- 日本語で、関数の目的を先頭に `// 概要` 記載（例: `// 識別子の末尾ブランチ番号をインクリメント`）。
- 大セクションは `// ============================================================` の飾りラインで区切る。

### 2.7 報告案docxの「変更／軽微変更」チェック規則（基本ルール）
`common-docx.js` の `reportDocxDataForRow`（02_kanri-flow_報告案_共通.docx差し込み）では、報告区分に応じてチェック欄を以下で埋める：
- **報告区分 = 変更** → 1つ目の変更＝■、2つ目の変更＝■、軽微＝□
- **報告区分 = 軽微変更** → 1つ目の変更＝■、2つ目の変更＝□、軽微＝■
- コード上の対応：`公表区分_上位変更`＝`(changeRow || minorRow) ? '■' : '□'`（変更または軽微変更があれば■）、`公表区分_下位変更`＝`changeRow ? '■' : '□'`（変更のみ■）、`公表区分_軽微`＝軽微変更行があるときのみ■。
- この挙動はapply/publish共通（pageMode分岐なし）なので、変更時は両ページの報告案docxに同じ結果が反映される。

## 3. Gitリモート構成（最重要）

2つのリモートがあり、**両方にpushする必要がある**：

```bash
git push origin master            # 開発用リポジトリ（morikawa001/kanri-flow-web-app）
git push kanri_flow master:main   # GitHub Pages公開用（morikawa001/kanri_flow）
```

| リモート | URL | 用途 | デフォルト |
|---|---|---|---|
| `origin` | `https://github.com/morikawa001/kanri-flow-web-app.git` | 開発用 | `master` |
| `kanri_flow` | `https://github.com/morikawa001/kanri_flow.git` | Pages公開用 | `main` |

**`kanri_flow` へのpushを忘れるとWebサイトが更新されない**。「originにpushしたら終わり」ではなく両方へpushする。詳細は `.opencode/skills/kanri-flow/SKILL.md`。

## 4. トラブルシューティングの優先順位

修正が反映されない場合：
1. まず**リモート構成**を確認（origin vs kanri_flow）
2. 次に**ブラウザキャッシュ**（ハードリロード。キャッシュバスターの `?v=` を更新しているか共同確認）
3. 最後に**コード自体**の確認

## 5. apply/publish共通JSの変更ルール（重要）

`common.js` は apply_report.htmlとpublish_report.htmlの**両方で共有**。apply側の改善をpublish側に影響させたくない場合は `pageMode === 'apply'` でガードする：
```js
var pageMode = pageMode || 'publish'; // 各HTMLで設定済み（apply='apply' / publish='publish'）
```
- `pageMode` は apply_report.html→'apply'、publish_report.html→'publish' で設定済み
- 改善をpublishに波及させない既存ガード例：`reportTypeLabel` / `reportTypeFromLabel` / `updateModeUI` のタイトル / `renderRequestRows` の報告区分・申請内容・備考欄
- `identifiers.js` は**publish_report.htmlでは読み込まれない**（apply専用）ためガード不要

## 6. キャッシュバスター更新ルール（重要）

`common.js`（または他のJS）を変更した場合は、**全HTMLのキャッシュバスタークエリを更新する**こと：
```
<script src="common.js?v=<最新コミットハッシュ>"></script>
<script src="state.js?v=<ハッシュ>"></script>   ...他JSも同様
```
- 更新対象：apply_report.html / publish_report.html / index.html / other_report.html / procedure.html / guide.html / approval.html の7ファイル
- 更新を忘れると、ブラウザキャッシュにガード前のcommon.jsが残り、publish側に改善版の挙動が混ざる

## 7. GitHub Actionsデプロイの注意点

- デプロイは `morikawa001/kanri_flow` リポジトリのActionsで自動実行（.github/workflows/pages.yml）
- **連続pushすると、前回のデプロイが「in progress」のまま次のデプロイが失敗する**（`Deployment request failed ... due to in progress deployment`）
- 失敗した場合は `gh run rerun <run_id>` で再実行（前のデプロイ完了を待ってから）
- デプロイ完了は `gh run list --repo morikawa001/kanri_flow --limit 1` で確認

## 8. wordファイル等の復元

- 変更申請用テンプレート（03_2_kanri-flow_変更_起案.doc / 03_kanri-flow_変更_起案.docx / 04_kanri-flow_変更_報告案.docx）はmasterに含まれておらず、バックアップブランチ `backup/20260806-apply-improvements` にのみ存在する
- 削除時は以下で復元する：
  ```bash
  git checkout backup/20260806-apply-improvements -- "03_2_kanri-flow_変更_起案.doc" "03_kanri-flow_変更_起案.docx" "04_kanri-flow_変更_報告案.docx"
  ```

## 9. その他の注意

- `csv_data/` は台帳データのサンプル。実際に使う際は読み込み元を確認してから。
- `gas/` にはGoogle Apps Script（`Code.gs` / `ai-judge-module.js`）が含まれる。「メール読み込みによる手続き自動判定」はルールベース（キーワードマッチング）。
- Webhook等への外部配送は `gas/` 内のみ。本パネルの機能とは独立。

<behavior>エージェントはこのガイドを適用し、変更は最低限に留めること。特に共通JS（common.js）の変更は影響範囲を吟味して進める。</behavior>