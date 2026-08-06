---
name: kanri-flow
description: 管理者報告フロー統合パネルの開発・保守に関するスキル。臨床研究支援チーム向けWebアプリケーションのプロジェクト構造、デザインパターン、コーディング規約を提供します。
---

## プロジェクト概要
臨床研究支援チームが使用する管理者報告フロー統合パネルのWebアプリケーションです。

## ページ構成
- `0719_01.index.html` - トップページ（ログインページ）
- `0719_01.login.html` - ログイン画面
- `0719_02.procedure.html` - 手続き選択ページ
- `0719_03_approval.html` - 承認申請ページ
- `0719_04_apply_report.html` - 申請管理者報告ページ
- `0719_05_publish_report.html` - 公表管理者報告ページ
- `0719_06_other_report.html` - その他報告ページ

## デザインコンセプト
- **かわいいロボット調**：親しみやすく、現代的なロボットをモチーフにしたデザイン
- 全ページで統一されたデザインコンセプトを適用
- ロボット要素：丸みのある形状、アイコン、優しいカラーパレット

## デザインパターン
- CSS カスタムプロパティ（CSS変数）を使用したテーマ管理
- ライト/ダークテーマ切替対応
- レスポンシブデザイン（モバイル対応）
- フォント: Satoshi（Fontshare）
- ロボット調のUI要素：丸みのあるボタン、カーディザイン、柔らかい影

## コーディング規約
- 日本語コメントを使用
- CSSはBEM Naming Conventionに準拠
- JavaScriptはvanilla JS（フレームワーク不使用）
- ボタンクリック時は`location.href`でページ遷移

## Gitリモート構成（重要）
このプロジェクトには**2つのリモートリポジトリ**が存在する：

| リモート名 | URL | 用途 | デフォルトブランチ |
|---|---|---|---|
| `origin` | `https://github.com/morikawa001/kanri-flow-web-app.git` | 開発用（コードの原本） | `master` |
| `kanri_flow` | `https://github.com/morikawa001/kanri_flow.git` | GitHub Pages公開用 | `main` |

### push時の注意
両方のリモートにpushする必要がある：
```bash
git push origin master          # 開発用リポジトリへ
git push kanri_flow master:main # Pages用リポジトリへ（master→mainにマッピング）
```

**よくあるミス**: `origin`だけpushして `kanri_flow` へのpushを忘れると、Webサイト（GitHub Pages）は更新されない。

## GitHub Pages（GitHub Actions方式）
- デプロイ先: `https://morikawa001.github.io/kanri_flow/`
- ページ間の遷移はGitHub PagesのURLを使用
- **デプロイ方式: GitHub Actions**（`.github/workflows/pages.yml`）。`kanri_flow/main` へのpushで自動デプロイ
- デプロイ完了まで約2〜3分（legacyビルドの不安定問題を回避するため2026-08-06に切り替え済み）
- `build_type: workflow` に設定済み（legacyビルドは無効）

### デプロイ確認
```bash
# ① デプロイワークフローの状態を確認
gh run list --repo morikawa001/kanri_flow --limit 1

# ② デプロイ済みページをキャッシュ回避で確認
# https://morikawa001.github.io/kanri_flow/?v=2c4a23c
```

## 運用メモ（2026-08-06 時点・再開用）

### 現在の状態
- `master` / `kanri_flow/main` は **`eaaa6b7`**
- Pagesの`build_type`を `legacy` → `workflow` に切り替え、`.github/workflows/pages.yml` + `.nojekyll` を追加
- **`apply_report.html` は改善版（`backup/20260806-apply-improvements` の `b028b91` 相当）を復元済み**
  （申請内容・備考欄、docx差し込みタグ、JRCT自動入力、報告区分表示切替。依存の `common.js` / `identifiers.js` も同時復元）
- 復元対象外: `publish_report.html` をはじめ他ページは巻き戻し後の状態（c5dedff系）のまま
- バックアップブランチ **`backup/20260806-apply-improvements`**（= `5da734d`）は保存・origin push済み
- `kanri_flow` の不要な `master` ブランチは削除済み（`main` のみ）

### 注意点
- **apply側のファイルとその他のページで状態が異なる混在状態**になっている
  - `apply_report.html` / `common.js` / `identifiers.js` = 改善版（b028b91相当）
  - `publish_report.html` ほか他ページ = 巻き戻し後（c5dedff相当）
- `common.js` はapplyとpublishで共有。apply用の改善（`reportTypeLabel`・`extractCheckedItems`等）は
  `pageMode === 'apply'` 分岐で他のページに影響しない設計になっている
- 今後publish側も改善版に戻す場合は、バックアップブランチから `publish_report.html` を抽出する
- legacyビルドは不安定だった（2026-08-06に`errored`/長時間`building`が多発）。現在はActions方式のため影響なし

## 主な機能
1. テーマ切替（ライト/ダーク）
2. 手続き選択ボタン
3. フォーム送信
4. 戻るボタン导航
5. メール読み込みによる手続き自動判定

## ファイル命名規則（NAMING_MASTER）

### 命名パターン
各カテゴリのファイルは `{起案番号}_{区分}_{通し番号}_{ファイル名}.{拡張子}` の形式で命名する。

### カテゴリ別命名規則

#### 初回公表
| 資料名 | パターン | 必須 |
|--------|----------|------|
| 管理者報告様式 | 特XXXX-XX-XXXX-X-2_公表_1.0_管理者報告.docx | はい |
| 管理者承認様式 | 特XXXX-XX-XXXX-X-2_公表_3.0_管理者承認.docx | はい |
| jRCT URL | 特XXXX-XX-XXXX-X-2_公表_2.0_jRCT_URL.xlsx | はい |

#### 変更
| 資料名 | パターン | 必須 |
|--------|----------|------|
| 管理者報告様式 | 特XXXX-XX-XXXX-X-2_公表_1.0_管理者報告.docx | はい |
| 管理者承認様式 | 特XXXX-XX-XXXX-X-2_公表_3.0_管理者承認.docx | はい |
| 実施計画変更届 | 特XXXX-XX-XXXX-X-2_公表_4.0_実施計画変更届.pdf | はい |

#### 軽微変更
| 資料名 | パターン | 必須 |
|--------|----------|------|
| 管理者報告様式 | 特XXXX-XX-XXXX-X-1_公表_1.0_管理者報告.docx | はい |
| 軽微通知書（収受印あり） | 特XXXX-XX-XXXX-X-1_公表_6.0_軽微通知書（収受印あり）.pdf | 状況により |
| 軽微通知書 | 特XXXX-XX-XXXX-X-1_公表_6.0_軽微通知書.pdf | はい |
| 軽微変更届 | 特XXXX-XX-XXXX-X-1_公表_7.0_軽微変更届.pdf | はい |
| 実施計画 | 特XXXX-XX-XXXX-X-1_公表_10.0_実施計画.pdf | 状況により |
| 補足資料 | 特XXXX-XX-XXXX-X-1_公表_10.0_補足資料_XXXX.pdf | 状況により |

#### 定期報告
| 資料名 | パターン | 必須 |
|--------|----------|------|
| 管理者報告様式 | 特XXXX-XX-XXXX-X-2_定期報告_1.0_管理者報告.docx | はい |
| 審査結果通知書 | 特XXXX-XX-XXXX-X-2_定期報告_2.0_審査結果.pdf | はい |
| 統一5報告書 | 特XXXX-XX-XXXX-X-2_定期報告_3.0_統一5報告書.pdf | はい |
| 別紙3報告書 | 特XXXX-XX-XXXX-X-2_定期報告_4.0_別紙3報告書.pdf | はい |
| 定期報告別紙 | 特XXXX-XX-XXXX-X-2_定期報告_6.0_定期報告別紙.pdf | はい |
| モニタリングレポート | 特XXXX-XX-XXXX-X-2_定期報告_7.0_モニ報.pdf | はい |
| COI医薬品 | 特XXXX-XX-XXXX-X-2_定期報告_9.0_COI医薬品.pdf | はい |
| COI様式E | 特XXXX-XX-XXXX-X-2_定期報告_11.0_COI様式E_組織名.pdf | はい |

#### 不適合報告
| 資料名 | パターン | 必須 |
|--------|----------|------|
| 管理者報告様式 | 特XXXX-XX-XXXX-X-2_不適合_1.0_管理者報告.docx | はい |
| 審査結果通知書 | 特XXXX-XX-XXXX-X-2_不適合_2.0_審査結果.pdf | はい |
| 不適合報告書（重大な） | 特XXXX-XX-XXXX-X-2_不適合_3.0_不適合報告書（重大な）.pdf | はい |

#### 疾病等報告（医療機器）
| 資料名 | パターン | 必須 |
|--------|----------|------|
| 管理者報告様式 | 特XXXX-XX-XXXX-X-X_公表_1_管理者報告.docx | はい |
| 審査結果通知書 | 特XXXX-XX-XXXX-X-X_医療機器_2_審査結果.pdf | はい |
| 不具合報告書 | 特XXXX-XX-XXXX-X-X_医療機器_3_不具合報告書.pdf | はい |
| 詳細記載用書式 | 特XXXX-XX-XXXX-X-X_医療機器_4_詳細_登録番号XX.pdf | 状況により |
| 検査結果等 | 特XXXX-XX-XXXX-X-X_医療機器_6_検査.pdf | 状況により |

### 命名時の注意点
- 起案番号は `特2025-17_2-1` の形式（年度-通し番号_報告区分番号）
- 軽微変更は `-1`、それ以外は `-2` が末尾に付く
- 通し番号は `01`, `02`, `03`...と2桁で揃える
- 拡張子は資料種別に応じて `docx` または `pdf` を使用
