/**
 * common.js - 共通JavaScriptユーティリティ
 * 臨床研究支援チーム管理画面共通機能
 */

// ============================================================
// ページモード設定
// ============================================================
// 'apply' = 申請管理者報告、'publish' = 公表管理者報告
var pageMode = pageMode || 'publish';

// テーマ管理モジュール
var ThemeManager = (function() {
  'use strict';

  var STORAGE_KEY = 'kanri-flow-theme';

  // 初期化: 保存されたテーマを復元
  function init() {
    var saved = localStorage.getItem(STORAGE_KEY);
    var root = document.documentElement;
    if (saved) {
      root.setAttribute('data-theme', saved);
    }
    updateButton(saved || root.getAttribute('data-theme'));
  }

  // テーマ切替
  function toggle() {
    var root = document.documentElement;
    var current = root.getAttribute('data-theme');
    var next = current === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    localStorage.setItem(STORAGE_KEY, next);
    updateButton(next);
  }

  // ボタンアイコン更新
  function updateButton(theme) {
    var btn = document.getElementById('themeBtn');
    if (btn) {
      btn.textContent = theme === 'dark' ? '\u2600\uFE0F' : '\uD83C\uDF19';
    }
  }

  // 公開API
  return {
    init: init,
    toggle: toggle
  };
})();

// ============================================================
// 基本ユーティリティ関数
// ============================================================

// HTMLエスケープ（XSS対策）
function h(str) {
  return String(str || '').replace(/[&<>"']/g, function(m) {
    return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m];
  });
}

// DOM要素の値を取得（フォールバック付き）
function getValue(id) {
  var el = document.getElementById(id);
  return el ? el.value.trim() : (state[id] || '');
}

// DOMからstateにデータを同期
function setStateFromDom() {
  document.querySelectorAll('[data-bind]').forEach(function(el) {
    if (el.type === 'checkbox') {
      state[el.dataset.bind] = el.checked;
    } else {
      state[el.dataset.bind] = el.value;
    }
  });
  document.querySelectorAll('[data-preset-free]').forEach(function(el) {
    var sel = document.querySelector('[data-preset-select="' + el.dataset.presetFree + '"]');
    if (sel && sel.value !== '__free') return;
    state[el.dataset.presetFree] = el.value;
  });
}

// チェックボックスマーク
function mark(flag) {
  return flag ? '■' : '☐';
}

// ============================================================
// 番号生成・依頼行管理関数
// ============================================================

// 識別子の末尾ブランチ番号をインクリメント
function incrementLastBranch(no, keepLast) {
  var val = String(no || '').trim();
  if (!val) return '';
  var m = val.match(/^(.*[_-])(\d+)-(\d+)$/);
  if (m) {
    var prefix = m[1], first = m[2], last = parseInt(m[3], 10);
    return prefix + first + '-' + (keepLast ? last : last + 1);
  }
  var m2 = val.match(/^(.*[_-])(\d+)$/);
  if (m2) {
    var prefix2 = m2[1], last2 = parseInt(m2[2], 10);
    return prefix2 + String(keepLast ? last2 : last2 + 1);
  }
  return val;
}

// 識別子の末尾ブランチサフィックスを抽出
function branchSuffix(no) {
  var s = String(no || '').trim();
  var matches = Array.from(s.matchAll(/(\d{4})[-_]/g));
  for (var k = matches.length - 1; k >= 0; k--) {
    var m = matches[k];
    var before = s[m.index - 1];
    var tail = s.substring(m.index + m[0].length);
    if (/[_-\d]/.test(before || '') && /\d/.test(tail)) {
      var yearEnd = m.index + m[1].length;
      return s.substring(yearEnd + 1);
    }
  }
  var i = s.lastIndexOf('_');
  return i >= 0 ? s.substring(i + 1) : s;
}

// 依頼行データを取得（デフォルト付き）
function requestRowsData() {
  var rows = state.requestRows;
  return rows && rows.length
    ? rows
    : [{type:'初回公表',base:'特2025-17_2-1',date:'',url:'',facilityType:'',facilityDetail:''}];
}

// 依頼行のフィールドを設定
function setRequestRow(idx, key, val) {
  if (!state.requestRows || !state.requestRows.length)
    state.requestRows = [{type:'初回公表',base:'特2025-17_2-1',date:'',url:''}];
  if (!state.requestRows[idx]) state.requestRows[idx] = {type:'初回公表',base:'特2025-17_2-1',date:'',url:'',facilityType:'',facilityDetail:''};
  state.requestRows[idx][key] = val;
}

// 依頼行の出力番号を計算
function requestOutputNo(r) {
  return incrementLastBranch(r.base || '特2025-17_2-1', r.type === '軽微変更') || (r.base || '特2025-17_2-1');
}

// 複数依頼行の共通プレフィックスを生成
function combinedDraftReportPrefix() {
  var rows = requestRowsData();
  if (rows.length <= 1) return requestOutputNo(rows[0] || {type:'初回公表',base:'特2025-17_2-1'});
  var first = requestOutputNo(rows[0]);
  var matches = Array.from(first.matchAll(/(\d{4})[-_]/g));
  var basePrefix = first.substring(0, first.lastIndexOf('_'));
  for (var k = matches.length - 1; k >= 0; k--) {
    var m = matches[k];
    var before = first[m.index - 1];
    var tail = first.substring(m.index + m[0].length);
    if (/[_-\d]/.test(before || '') && /\d/.test(tail)) {
      basePrefix = first.substring(0, m.index + m[0].length - 1);
      break;
    }
  }
  var branches = rows.map(function(r) {
    return branchSuffix(requestOutputNo(r));
  });
  var compact = branches.map(function(s, i) {
    if (i === 0) return s;
    return s.replace(/^\d{4}[-_]/, '');
  });
  return basePrefix + '_' + compact.join('_');
}

// 報告区分を出力カテゴリにマッピング（ページモードに応じて切替）
function outputCategory(type) {
  var categoryMap = {
    'apply': {
      '軽微変更': '申請',
      '変更': '申請',
      '定期報告': '定期報告',
      '一部公表': '申請',
      '初回公表': '申請',
      '不適合報告': '不適合',
      '疾病等報告（医療機器）': '医療機器'
    },
    'publish': {
      '軽微変更': '公表',
      '変更': '公表',
      '定期報告': '定期報告',
      '一部公表': '公表',
      '初回公表': '公表',
      '不適合報告': '不適合',
      '疾病等報告（医療機器）': '医療機器'
    }
  };
  var map = categoryMap[pageMode] || categoryMap['publish'];
  return map[type] || type;
}

// 台帳行から依頼行オブジェクトを生成
function rowFromLedger(r) {
  return {
    type: r['報告区分'] || '初回公表',
    base: r['元の起案番号'] || r['起案番号'] || '特2025-17_2-1',
    date: r['公表日'] || r['報告期間'] || '',
    url: r['jRCT URL'] || '',
    facilityType: r['自施設他施設'] || '',
    facilityDetail: r['報告詳細'] || ''
  };
}

// 選択中の台帳行を取得
function selectedLedgerRows() {
  var idxs = (state.selectedLedgerIndexes || []).filter(function(i) {
    return state.loadedLedgerRows[i];
  });
  return idxs.map(function(i) { return state.loadedLedgerRows[i]; });
}

// 選択中台帳行から依頼行を同期
function syncRequestRowsFromSelectedLedger() {
  var rows = selectedLedgerRows();
  if (rows.length) {
    state.requestRows = rows.map(rowFromLedger);
    state.managerPaths = rows.map(function(r) { return r['管理者側フォルダパス'] || ''; });
    var first = rows[0];
    if (first['研究課題名']) state.studyTitle = first['研究課題名'];
    if (first['担当者']) state.drafterName = first['担当者'];
    if (first['所属・部門名']) state.drafterDept = first['所属・部門名'];
    if (first['研究略称']) state.mailSubject = first['研究略称'];
    if (first['jRCT番号']) state.jrctNo = first['jRCT番号'];
    var studyCat = first['研究区分'] || '';
    state.studyTypeNonspecific = studyCat.includes('非特定');
    state.studyTypeSpecific = studyCat.includes('特定') && !studyCat.startsWith('非特定');
    var subCat = first['サブ分類'] || '';
    state.studyTypeUnapproved = subCat.includes('未承認適応外');
    state.studyTypeFunding = subCat.includes('資金提供');
    if (first['研究責任者1氏名']) state.managerName1 = first['研究責任者1氏名'];
    else if (first['研究責任者']) state.managerName1 = first['研究責任者'];
    if (first['研究責任者1所属']) state.managerAffil1 = first['研究責任者1所属'];
    if (first['研究責任者1部署']) state.managerDept1 = first['研究責任者1部署'];
    if (first['研究責任者1職名']) state.managerTitle1 = first['研究責任者1職名'];
    if (first['研究責任者2氏名']) state.managerName2 = first['研究責任者2氏名'];
    if (first['研究責任者2所属']) state.managerAffil2 = first['研究責任者2所属'];
    if (first['研究責任者2部署']) state.managerDept2 = first['研究責任者2部署'];
    if (first['研究責任者2職名']) state.managerTitle2 = first['研究責任者2職名'];
    rows.forEach(function(r, i) {
      if (r['自施設他施設'] && state.requestRows[i]) state.requestRows[i].facilityType = r['自施設他施設'];
    });
  }
}

// 台帳選択サマリーを取得
function ledgerSelectionSummary() {
  var count = (state.selectedLedgerIndexes || []).length;
  return count ? count + '件選択中' : '未選択';
}

// 報告区分を取得
function reportType() {
  var rows = requestRowsData();
  return rows[0] ? rows[0].type : '初回公表';
}

// 有効な報告番号を取得
function effectiveReportNo() {
  var rows = requestRowsData();
  return requestOutputNo(rows[0] || {type:'初回公表',base:'特2025-17_2-1'});
}

// ============================================================
// 日付関数
// ============================================================

// 今日の日付をYYYYMMDD_形式で返す
function datePrefix() {
  var d = new Date();
  return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0') + '_';
}

// 今日の日付をYYYYMMDD形式で返す
function todayYmd() {
  var d = new Date();
  return d.getFullYear() + String(d.getMonth() + 1).padStart(2, '0') + String(d.getDate()).padStart(2, '0');
}

// 今日の日付をYYYY/MM/DD形式で返す
function todayFormatted() {
  var d = new Date();
  return d.getFullYear() + '/' + String(d.getMonth() + 1).padStart(2, '0') + '/' + String(d.getDate()).padStart(2, '0');
}

// 日付をYYYY/MM/DD形式に正規化
function normalizeToYmdSlash(v) {
  var s = String(v || '').trim();
  if (!s) return '';
  var m = s.match(/(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/);
  if (m) return m[1] + '/' + m[2].padStart(2, '0') + '/' + m[3].padStart(2, '0');
  var m2 = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m2) return m2[1] + '/' + m2[2] + '/' + m2[3];
  return s;
}

// 日付をYYYY年MM月DD日形式に変換
function formatDateToJapanese(v) {
  var s = String(v || '').trim();
  if (!s) return '';
  var m = s.match(/(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/);
  if (!m) return s;
  return m[1] + '年' + m[2].padStart(2, '0') + '月' + m[3].padStart(2, '0') + '日';
}

// 日付範囲（～区切り）を日本語形式に変換
function formatDateRangeToJapanese(v) {
  var s = String(v || '').trim();
  if (!s) return '';
  var parts = s.split('～').map(function(x) { return x.trim(); });
  if (parts.length >= 2) {
    return parts.map(function(p) { return formatDateToJapanese(p); }).join('～');
  }
  return formatDateToJapanese(s);
}

// 日付範囲をスラッシュ形式に正規化
function formatDateRangeToSlash(v) {
  var s = String(v || '').trim();
  if (!s) return '';
  var parts = s.split('～').map(function(x) { return x.trim(); });
  if (parts.length >= 2) {
    return parts.map(function(p) {
      var m = p.match(/(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/);
      return m ? m[1] + '/' + m[2].padStart(2, '0') + '/' + m[3].padStart(2, '0') : p;
    }).join('～');
  }
  var m = s.match(/(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/);
  return m ? m[1] + '/' + m[2].padStart(2, '0') + '/' + m[3].padStart(2, '0') : s;
}

// DOCX用の年月日部分を取得
function currentDocxDateParts() {
  var src = state.draftDate || todayFormatted();
  var m = String(src).match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (m) {
    return {
      year: m[1],
      month: m[2].padStart(2, '0'),
      day: m[3].padStart(2, '0')
    };
  }
  var now = new Date();
  return {
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1).padStart(2, '0'),
    day: String(now.getDate()).padStart(2, '0')
  };
}

// ============================================================
// フォルダ関連
// ============================================================

// フォルダセットを生成
function folderSetFor(r) {
  var no = requestOutputNo(r);
  var outType = outputCategory(r.type);
  var applyNo = no.replace(/_(\d+)-(\d+)$/, function(_, a, b) {
    return '_' + a + '-' + Math.max(1, parseInt(b, 10) - 1);
  });
  return {
    no: no,
    apply: applyNo + '_' + outType + '_申請',
    cscc: no + '_' + outType + '(cscc)',
    manager: no + '_' + outType
  };
}

// フォルダ選択状態を取得
function getFolderSelection(rowIdx, key) {
  var k = rowIdx + '_' + key;
  if (folderSelections[k] === undefined) return true;
  return !!folderSelections[k];
}

// フォルダ選択状態を設定
function setFolderSelection(rowIdx, key, checked) {
  folderSelections[rowIdx + '_' + key] = !!checked;
}

// ============================================================
// 表示関連
// ============================================================

// 研究責任者表示を構築
function buildManagerDisplay() {
  var managers = [1, 2].map(function(n) {
    var parts = [
      getValue('managerAffil' + n),
      getValue('managerDept' + n),
      getValue('managerTitle' + n),
      getValue('managerName' + n)
    ].filter(Boolean);
    return parts.join(' ');
  }).filter(Boolean);
  return managers.join('／');
}

// 主たる研究責任者を取得
function primaryManager() {
  var affil = getValue('managerAffil1') || '所属';
  var dept = getValue('managerDept1') || '';
  var title = getValue('managerTitle1') || '職名';
  var name = getValue('managerName1') || '氏名';
  return {affil: affil, dept: dept, title: title, name: name};
}

// メールアドレスを取得
function emailAddresses() {
  var m1 = primaryManager();
  var lines = [m1.affil + '\n' + m1.dept + ' ' + m1.title + ' ' + m1.name + ' 先生'];
  var affil2 = getValue('managerAffil2');
  var dept2 = getValue('managerDept2');
  var title2 = getValue('managerTitle2');
  var name2 = getValue('managerName2');
  if (affil2 || title2 || name2) {
    lines.push((affil2 || '') + '\n' + [dept2, title2, name2].filter(Boolean).join(' ') + ' 先生');
  }
  return lines.join('\n\n');
}

// 研究区分ラベルを取得
function studyCategoryLabel() {
  var specific = !!state.studyTypeSpecific;
  var nonspecific = !!state.studyTypeNonspecific;
  var opts = [
    state.studyTypeUnapproved ? '未承認・適応外' : '',
    state.studyTypeFunding ? '資金提供' : ''
  ].filter(Boolean);
  if (specific && nonspecific) return '特定臨床研究・非特定臨床研究' + (opts.length ? '（' + opts.join('・') + '）' : '');
  if (specific) return '特定臨床研究' + (opts.length ? '（' + opts.join('・') + '）' : '');
  if (nonspecific) return '非特定臨床研究';
  return '';
}

// ============================================================
// メール関連
// ============================================================

// 自動メールドラフトを生成（ページモードに応じて切替）
function autoEmailDraft() {
  var title = getValue('mailSubject') || '【研究略称】';
  var rows = requestRowsData();
  var paths = state.managerPaths || [];
  var drafter = getValue('drafterName') || '起案・報告案の報告者';
  
  // ページモードに応じた設定
  var isApply = (pageMode === 'apply');
  var categoryLabel = isApply ? '申請' : '報告';
  var categoryLabelKanji = isApply ? '申請' : '報告';
  var dateLabel = isApply ? 'jRCT 申請日未入力' : 'jRCT 公表日未入力';
  var folderLabel = isApply ? '（決裁後に確定する管理者側フォルダパス）' : '（決裁後に確定する管理者側フォルダパス）';
  
  var details = rows.map(function(r, i) {
    return '・' + requestOutputNo(r) + '_' + (isApply ? '申請' : '公表') + '（' + (formatDateToJapanese(r.date) || dateLabel) + '）\n「NAS」内保存場所：' + (paths[i] || folderLabel);
  }).join('\n\n');
  
  return {
    subject: '【' + title + '】管理者「' + categoryLabel + '」：完了',
    body: emailAddresses() + '\n\nいつもお世話になっております。\n臨床研究管理・調整室の' + drafter + 'です。\n\n' + title + ' 試験について、\n下記 管理者「' + categoryLabel + '」のお手続きが完了いたしました。\n書類は「NAS」に保存しております。\n\n' + details + '\n\n\n病院長の押印を省略しているため、紙書類のお渡しはございません。\nどうぞよろしくお願いいたします。\n\n※NASにアクセスするにはユーザー登録が必要です。\n（パスワード一覧表（エクセル）を未提出の方はお声がけください）\n※そのほかご不明な点があれば、お声がけください。\n\n************************************************\n　静岡県立静岡がんセンター\n　臨床研究支援センター 臨床研究管理・調整室\n　〒411-8777 静岡県駿東郡長泉町下長窪1007\n　E-mail: jimukanri@scchr.jp　（担当：' + drafter + '）\n************************************************'
  };
}

// メールドラフトを取得
function emailDraft() {
  var auto = autoEmailDraft();
  if (state.mailTouched) {
    return {
      subject: state.mailSubjectEdit || auto.subject,
      body: state.mailBodyEdit || auto.body
    };
  }
  state.mailSubjectEdit = auto.subject;
  state.mailBodyEdit = auto.body;
  return {subject: state.mailSubjectEdit, body: state.mailBodyEdit};
}

// メール編集をリセット
function resetMailEdits() {
  state.mailSubjectEdit = '';
  state.mailBodyEdit = '';
  state.mailTouched = false;
}

// メール編集を初期化
function initMailEdits() {
  emailDraft();
}

// 複数依頼メールファイル名を取得
function combinedMailFileName() {
  var rows = requestRowsData();
  var base = rows.length ? requestOutputNo(rows[0]) : '特2025-17_2-2';
  return base + '_複数起案_管理者報告メール案.txt';
}

// ============================================================
// CSV関連
// ============================================================

// CSVをロバストにパース
function parseCsvRobust(text) {
  var clean = String(text || '').replace(/^\uFEFF/, '');
  var out = [];
  var row = [];
  var cell = '';
  var inQ = false;
  for (var i = 0; i < clean.length; i++) {
    var ch = clean[i];
    if (ch === '"') {
      if (inQ && clean[i + 1] === '"') {
        cell += '"';
        i++;
      } else {
        inQ = !inQ;
      }
    } else if ((ch === ',' || ch === '\t') && !inQ) {
      row.push(cell);
      cell = '';
    } else if ((ch === '\n' || ch === '\r') && !inQ) {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(cell);
      out.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    out.push(row);
  }
  var lines = out.filter(function(r) {
    return r.some(function(v) { return String(v).trim() !== ''; });
  });
  if (!lines.length) return {headers: [], rows: []};
  var headers = lines[0].map(function(v) { return String(v).trim(); });
  var rows = lines.slice(1).map(function(cols) {
    var obj = {};
    headers.forEach(function(h, i) { obj[h] = cols[i] ?? ''; });
    return obj;
  });
  return {headers: headers, rows: rows};
}

// CSVエスケープ
function csvEscape(v) {
  return '"' + String(v ?? '').replace(/"/g, '""') + '"';
}

// CSVを生成（依頼行から）
function csvFromRequests() {
  var rows = requestRowsData();
  var header = ['起案日','元の起案番号','起案番号','報告区分','担当者','所属・部門名','ステータス','公表日','報告期間','jRCT URL','jRCT番号','研究課題名','研究責任者','研究区分','サブ分類','研究略称','研究責任者1所属','研究責任者1部署','研究責任者1職名','研究責任者1氏名','研究責任者2氏名','研究責任者2所属','研究責任者2部署','研究責任者2職名','管理者報告メール送信日','管理者側フォルダパス','自施設他施設','報告詳細','step1(秒)','step2(秒)','step3(秒)','step4(秒)','step5(秒)','step6(秒)','step7(秒)'];
  var drafter = getValue('drafterName') || '';
  var studyTitle = getValue('studyTitle') || '';
  var managerName = buildManagerDisplay() || '';
  var status = '起案中';
  var studyTypeSpecific = !!state.studyTypeSpecific;
  var studyTypeNonspecific = !!state.studyTypeNonspecific;
  var studyTypeUnapproved = !!state.studyTypeUnapproved;
  var studyTypeFunding = !!state.studyTypeFunding;
  var studyTypeParts = [];
  if (studyTypeSpecific) studyTypeParts.push('特定');
  if (studyTypeNonspecific) studyTypeParts.push('非特定');
  var studyCategory = studyTypeParts.join('・');
  var subParts = [];
  if (studyTypeUnapproved) subParts.push('未承認適応外');
  if (studyTypeFunding) subParts.push('資金提供');
  var subCategory = subParts.join('・');
  var mailSubject = getValue('mailSubject') || '';
  var paths = state.managerPaths || [];
  var draftDate = state.draftDate || todayFormatted();
  var body = rows.map(function(r, idx) {
    return [
      draftDate, r.base || '', requestOutputNo(r), r.type, drafter, getValue('drafterDept') || '', status,
      r.type === '定期報告' ? '' : r.date || '', r.type === '定期報告' ? r.date || '' : '', r.url || '',
      getValue('jrctNo') || '', studyTitle, managerName,
      studyCategory, subCategory, mailSubject,
      getValue('managerAffil1') || '', getValue('managerDept1') || '', getValue('managerTitle1') || '', getValue('managerName1') || '',
      getValue('managerName2') || '', getValue('managerAffil2') || '', getValue('managerDept2') || '', getValue('managerTitle2') || '',
      state.sendDate || '', paths[idx] || '', r.facilityType || '', r.facilityDetail || '',
      state.stepDurations['intake'] || 0, state.stepDurations['folders'] || 0, state.stepDurations['drafts'] || 0,
      state.stepDurations['files'] || 0, state.stepDurations['work'] || 0, state.stepDurations['path'] || 0, state.stepDurations['send'] || 0
    ].map(csvEscape).join(',');
  }).join('\n');
  return header.map(csvEscape).join(',') + '\n' + body;
}

// 台帳CSVファイル名を取得
function ledgerCsvFileName() {
  var rows = requestRowsData();
  var r = rows[0] || {type: '初回公表'};
  var outType = outputCategory(r.type);
  return datePrefix() + combinedDraftReportPrefix() + '_' + outType + '_01_台帳.csv';
}

// CSVをダウンロード
function downloadCsvFromRequests() {
  var csv = csvFromRequests();
  var blob = new Blob(['\uFEFF' + csv], {type: 'text/csv;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = ledgerCsvFileName();
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  fileStatuses.csv = '✅ ひな型CSVをダウンロードしました。';
  renderTemplate();
}

// CSVファイルから読み込み
function handleCsvLoadFromFile(ev) {
  var file = ev.target.files && ev.target.files[0];
  if (!file) {
    fileStatuses.csv = 'ファイルが選択されていません。';
    renderTemplate();
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var parsed = parseCsvRobust(String(e.target.result || ''));
      if (!parsed.rows.length) {
        fileStatuses.csv = 'CSVに有効な行がありません。';
        renderTemplate();
        return;
      }
      state.requestRows = parsed.rows.map(function(r) {
        return {
          type: r['報告区分'] || '初回公表',
          base: r['元の起案番号'] || r['起案番号'] || '特2025-17_2-1',
          date: r['公表日'] || r['報告期間'] || '',
          url: r['jRCT URL'] || '',
          facilityType: r['自施設他施設'] || '',
          facilityDetail: r['報告詳細'] || ''
        };
      });
      var first = parsed.rows[0];
      if (first['研究課題名']) state.studyTitle = first['研究課題名'];
      if (first['担当者']) state.drafterName = first['担当者'];
      if (first['所属・部門名']) state.drafterDept = first['所属・部門名'];
      if (first['研究略称']) state.mailSubject = first['研究略称'];
      if (first['jRCT番号']) state.jrctNo = first['jRCT番号'];
      var studyCat = first['研究区分'] || '';
      state.studyTypeNonspecific = studyCat.includes('非特定');
      state.studyTypeSpecific = studyCat.includes('特定') && !studyCat.startsWith('非特定');
      var subCat = first['サブ分類'] || '';
      state.studyTypeUnapproved = subCat.includes('未承認適応外');
      state.studyTypeFunding = subCat.includes('資金提供');
      if (first['研究責任者1氏名']) state.managerName1 = first['研究責任者1氏名'];
      else if (first['研究責任者']) state.managerName1 = first['研究責任者'];
      if (first['研究責任者1所属']) state.managerAffil1 = first['研究責任者1所属'];
      if (first['研究責任者1部署']) state.managerDept1 = first['研究責任者1部署'];
      if (first['研究責任者1職名']) state.managerTitle1 = first['研究責任者1職名'];
      if (first['研究責任者2氏名']) state.managerName2 = first['研究責任者2氏名'];
      if (first['研究責任者2所属']) state.managerAffil2 = first['研究責任者2所属'];
      if (first['研究責任者2部署']) state.managerDept2 = first['研究責任者2部署'];
      if (first['研究責任者2職名']) state.managerTitle2 = first['研究責任者2職名'];
      if (first['起案日']) state.draftDate = normalizeToYmdSlash(first['起案日']);
      if (first['管理者報告メール送信日']) state.sendDate = first['管理者報告メール送信日'];
      state.managerPaths = parsed.rows.map(function(r) { return r['管理者側フォルダパス'] || ''; });
      var cnt = parsed.rows.length;
      var msg = '\u2705 ' + cnt + '件の依頼行を読み込み、研究課題情報・研究責任者・研究区分を復元しました。';
      fileStatuses.csv = msg;
      var s1 = document.getElementById('csvStatusStep1');
      if (s1) { s1.textContent = msg; s1.style.color = 'var(--success)'; }
      renderAll();
    } catch(err) {
      fileStatuses.csv = 'CSV読み込みに失敗しました：' + err.message;
      renderTemplate();
    }
  };
  reader.readAsText(file);
}

// 台帳CSVを読み込み（後方処理用）
function handleLedgerLoadForBack(ev) {
  var file = ev.target.files && ev.target.files[0];
  if (!file) {
    fileStatuses.csvStep5 = 'ファイルが選択されていません。';
    renderTemplate();
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var parsed = parseCsvRobust(String(e.target.result || ''));
      if (!parsed.rows.length) {
        fileStatuses.csvStep5 = 'CSVに有効な行がありません。';
        renderTemplate();
        return;
      }
      state.loadedLedgerHeaders = parsed.headers;
      state.loadedLedgerRows = parsed.rows;
      state.selectedLedgerIndexes = parsed.rows.map(function(_, i) { return i; });
      state.managerPaths = parsed.rows.map(function(r) { return r['管理者側フォルダパス'] || ''; });
      syncRequestRowsFromSelectedLedger();
      fileStatuses.csvStep5 = '✅ 台帳CSVを読み込みました。対象行を選択してください。';
      renderAll();
    } catch(err) {
      fileStatuses.csvStep5 = 'CSV読み込みに失敗しました：' + err.message;
      renderTemplate();
    }
  };
  reader.readAsText(file);
}

// 台帳行選択をトグル
function toggleLedgerRowSelection(idx, checked) {
  var set = new Set(state.selectedLedgerIndexes || []);
  if (checked) set.add(idx);
  else set.delete(idx);
  state.selectedLedgerIndexes = Array.from(set).sort(function(a, b) { return a - b; });
  syncRequestRowsFromSelectedLedger();
}

// すべての台帳行を選択
function selectAllLedgerRows() {
  state.selectedLedgerIndexes = state.loadedLedgerRows.map(function(_, i) { return i; });
  syncRequestRowsFromSelectedLedger();
  renderAll();
}

// 台帳行選択をクリア
function clearLedgerRowSelection() {
  state.selectedLedgerIndexes = [];
  state.requestRows = [{type: '初回公表', base: '特2025-17_2-1', date: '', url: '', facilityType: '', facilityDetail: ''}];
  renderAll();
}

// 台帳CSVをダウンロード用に生成
function ledgerCsvForDownload() {
  var headers = state.loadedLedgerHeaders.length
    ? state.loadedLedgerHeaders.slice()
    : ['起案日','起案番号','報告区分','担当者','ステータス','公表日','jRCT URL','元の起案番号','研究課題名','研究責任者'];
  if (!headers.includes('起案日')) headers.unshift('起案日');
  if (!headers.includes('研究課題名')) headers.push('研究課題名');
  if (!headers.includes('研究責任者')) headers.push('研究責任者');
  if (!headers.includes('ステータス')) headers.push('ステータス');
  if (!headers.includes('管理者報告メール送信日')) headers.push('管理者報告メール送信日');
  if (!headers.includes('管理者側フォルダパス')) headers.push('管理者側フォルダパス');
  if (!headers.includes('元の起案番号')) headers.push('元の起案番号');
  if (!headers.includes('担当者')) headers.push('担当者');
  if (!headers.includes('研究区分')) headers.push('研究区分');
  if (!headers.includes('サブ分類')) headers.push('サブ分類');
  if (!headers.includes('研究略称')) headers.push('研究略称');
  if (!headers.includes('研究責任者1所属')) headers.push('研究責任者1所属');
  if (!headers.includes('研究責任者1部署')) headers.push('研究責任者1部署');
  if (!headers.includes('研究責任者1職名')) headers.push('研究責任者1職名');
  if (!headers.includes('研究責任者1氏名')) headers.push('研究責任者1氏名');
  if (!headers.includes('研究責任者2氏名')) headers.push('研究責任者2氏名');
  if (!headers.includes('研究責任者2所属')) headers.push('研究責任者2所属');
  if (!headers.includes('研究責任者2部署')) headers.push('研究責任者2部署');
  if (!headers.includes('研究責任者2職名')) headers.push('研究責任者2職名');
  if (!headers.includes('jRCT番号')) headers.push('jRCT番号');
  if (!headers.includes('所属・部門名')) headers.push('所属・部門名');
  if (!headers.includes('公表日')) headers.push('公表日');
  if (!headers.includes('報告期間')) headers.push('報告期間');
  if (!headers.includes('自施設他施設')) headers.push('自施設他施設');
  if (!headers.includes('報告詳細')) headers.push('報告詳細');
  if (!headers.includes('step1(秒)')) headers.push('step1(秒)');
  if (!headers.includes('step2(秒)')) headers.push('step2(秒)');
  if (!headers.includes('step3(秒)')) headers.push('step3(秒)');
  if (!headers.includes('step4(秒)')) headers.push('step4(秒)');
  if (!headers.includes('step5(秒)')) headers.push('step5(秒)');
  if (!headers.includes('step6(秒)')) headers.push('step6(秒)');
  if (!headers.includes('step7(秒)')) headers.push('step7(秒)');

  var sendDate = getValue('sendDate') || '';
  var draftDate = state.draftDate || todayFormatted();
  var paths = state.managerPaths || [];
  var studyTitle = getValue('studyTitle') || '';
  var managerName = buildManagerDisplay() || '';
  var drafter = getValue('drafterName') || '';
  var mailSubject = getValue('mailSubject') || '';
  var studyTypeSpecific = !!state.studyTypeSpecific;
  var studyTypeNonspecific = !!state.studyTypeNonspecific;
  var studyTypeUnapproved = !!state.studyTypeUnapproved;
  var studyTypeFunding = !!state.studyTypeFunding;
  var studyTypeParts = [];
  if (studyTypeSpecific) studyTypeParts.push('特定');
  if (studyTypeNonspecific) studyTypeParts.push('非特定');
  var studyCategory = studyTypeParts.join('・');
  var subParts = [];
  if (studyTypeUnapproved) subParts.push('未承認適応外');
  if (studyTypeFunding) subParts.push('資金提供');
  var subCategory = subParts.join('・');
  var targetIndexes = new Set(state.selectedLedgerIndexes || []);
  var hasLoaded = state.loadedLedgerRows.length > 0;

  var baseRows = hasLoaded
    ? state.loadedLedgerRows.map(function(r) { return Object.assign({}, r); })
    : requestRowsData().map(function(r) {
        return {
          '起案番号': requestOutputNo(r),
          '報告区分': r.type,
          '公表日': r.type === '定期報告' ? '' : r.date || '',
          '報告期間': r.type === '定期報告' ? r.date || '' : '',
          'jRCT URL': r.url || '',
          '元の起案番号': r.base || '',
          '研究課題名': studyTitle,
          '研究責任者': managerName
        };
      });
  if (hasLoaded) {
    baseRows.forEach(function(r) {
      var type = r['報告区分'] || '';
      if (type === '定期報告') {
        if (!r['報告期間'] && r['公表日']) { r['報告期間'] = r['公表日']; r['公表日'] = ''; }
      } else {
        if (!r['公表日'] && r['報告期間']) { r['公表日'] = r['報告期間']; r['報告期間'] = ''; }
      }
    });
  }

  var rows = baseRows.map(function(r, idx) {
    var obj = Object.assign({}, r);
    if (!obj['起案日']) obj['起案日'] = draftDate;
    if (!obj['研究課題名']) obj['研究課題名'] = studyTitle;
    if (!obj['研究責任者']) obj['研究責任者'] = managerName;
    if (!obj['担当者']) obj['担当者'] = drafter;
    if (!obj['研究区分']) obj['研究区分'] = studyCategory;
    if (!obj['サブ分類']) obj['サブ分類'] = subCategory;
    if (!obj['研究略称']) obj['研究略称'] = mailSubject;
    if (!obj['研究責任者1氏名']) obj['研究責任者1氏名'] = getValue('managerName1') || '';
    if (!obj['研究責任者1所属']) obj['研究責任者1所属'] = getValue('managerAffil1') || '';
    if (!obj['研究責任者1部署']) obj['研究責任者1部署'] = getValue('managerDept1') || '';
    if (!obj['研究責任者1職名']) obj['研究責任者1職名'] = getValue('managerTitle1') || '';
    if (!obj['研究責任者2氏名']) obj['研究責任者2氏名'] = getValue('managerName2') || '';
    if (!obj['研究責任者2所属']) obj['研究責任者2所属'] = getValue('managerAffil2') || '';
    if (!obj['研究責任者2部署']) obj['研究責任者2部署'] = getValue('managerDept2') || '';
    if (!obj['研究責任者2職名']) obj['研究責任者2職名'] = getValue('managerTitle2') || '';
    if (!obj['jRCT番号']) obj['jRCT番号'] = getValue('jrctNo') || '';
    if (!obj['所属・部門名']) obj['所属・部門名'] = getValue('drafterDept') || '';
    if (!hasLoaded || targetIndexes.has(idx)) {
      obj['ステータス'] = '送信済';
      obj['管理者報告メール送信日'] = sendDate;
      obj['管理者側フォルダパス'] = paths[idx] || '';
      if (!obj['元の起案番号']) obj['元の起案番号'] = obj['起案番号'] || '';
    }
    obj['step1(秒)'] = state.stepDurations['intake'] || 0;
    obj['step2(秒)'] = state.stepDurations['folders'] || 0;
    obj['step3(秒)'] = state.stepDurations['drafts'] || 0;
    obj['step4(秒)'] = state.stepDurations['files'] || 0;
    obj['step5(秒)'] = state.stepDurations['work'] || 0;
    obj['step6(秒)'] = state.stepDurations['path'] || 0;
    obj['step7(秒)'] = state.stepDurations['send'] || 0;
    if (!obj['自施設他施設']) obj['自施設他施設'] = requestRowsData()[idx]?.facilityType || '';
    if (!obj['報告詳細']) obj['報告詳細'] = requestRowsData()[idx]?.facilityDetail || '';
    return obj;
  });
  var body = rows.map(function(r) {
    return headers.map(function(hd) { return csvEscape(r[hd] || ''); }).join(',');
  }).join('\n');
  return headers.map(csvEscape).join(',') + '\n' + body;
}

// 更新済み台帳CSVをダウンロード（ページモードに応じて切替）
function downloadUpdatedLedgerCsv() {
  var csv = ledgerCsvForDownload();
  var blob = new Blob(['\uFEFF' + csv], {type: 'text/csv;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  var isApply = (pageMode === 'apply');
  a.download = datePrefix() + combinedDraftReportPrefix() + '_管理者' + (isApply ? '申請' : '報告') + '_進捗台帳_更新済み.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  fileStatuses.csvStep7 = '✅ 更新済み台帳CSVをダウンロードしました。';
  renderTemplate();
}

// ============================================================
// docx関連
// ============================================================

// docxテンプレート読み込みハンドラ（報告案）
function handleReportTemplateDocxLoad(ev) {
  var file = ev.target.files && ev.target.files[0];
  if (!file) {
    fileStatuses.reportDocx = 'ファイルが選択されていません。';
    var el = document.getElementById('reportDocxTemplateStatus');
    if (el) el.textContent = fileStatuses.reportDocx;
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    reportTemplateDocxBuffer = e.target.result;
    reportTemplateDocxName = file.name || '報告案テンプレート.docx';
    fileStatuses.reportDocx = '✅ ひな形（' + reportTemplateDocxName + '）を読み込みました。';
    var el = document.getElementById('reportDocxTemplateStatus');
    if (el) el.textContent = fileStatuses.reportDocx;
  };
  reader.onerror = function() {
    fileStatuses.reportDocx = 'テンプレート読込に失敗しました。';
    var el = document.getElementById('reportDocxTemplateStatus');
    if (el) el.textContent = fileStatuses.reportDocx;
  };
  reader.readAsArrayBuffer(file);
}

// 報告案docxデータを生成
function reportDocxDataForRow(r) {
  var rows = requestRowsData();
  var relatedRows = rows.length ? rows : (r ? [r] : []);
  var today = currentDocxDateParts();

  var firstRowOfType = function(t) {
    return relatedRows.find(function(x) { return x?.type === t; }) || null;
  };
  var initialRow = firstRowOfType('初回公表');
  var changeRow = firstRowOfType('変更');
  var minorRow = firstRowOfType('軽微変更');
  var futekigouRow = firstRowOfType('不適合報告');
  var mainResultNotifyRow = firstRowOfType('主要評価項目報告書等の通知');
  var summaryPublishRow = firstRowOfType('主要評価項目報告書又は総括報告書の概要の公表');
  var reviewOpinionRow = firstRowOfType('審査意見の報告');

  var hasType = function(t) {
    return relatedRows.some(function(x) { return x?.type === t; });
  };

  var isPeriodic = relatedRows.some(function(x) { return x?.type === '定期報告'; });
  var isSpecific = !!state.studyTypeSpecific;
  var isNonspecific = !!state.studyTypeNonspecific;
  var isUnapproved = !!state.studyTypeUnapproved;
  var isFunding = !!state.studyTypeFunding;

  var todokedeGaiRow = firstRowOfType('届出外');
  var isTodokedeGai = hasType('届出外');
  var isDrugIssue = hasType('疾病等報告（医薬品）');
  var isDeviceIssue = hasType('疾病等報告（医療機器）');
  var isRegenIssue = hasType('疾病等報告（再生医療等製品）');
  var hasIssue = isDrugIssue || isDeviceIssue || isRegenIssue;

  var isFutekigou = hasType('不適合報告');
  var isMainResultNotify = hasType('主要評価項目報告書等の通知');
  var isSummaryPublish = hasType('主要評価項目報告書又は総括報告書の概要の公表');
  var isReviewOpinion = hasType('審査意見の報告');
  var isOther = hasType('その他');

  return {
    '所属': safeDocxText(getValue('managerAffil1') || ''),
    '所属部署': safeDocxText(getValue('managerDept1') || ''),
    '職名': safeDocxText(getValue('managerTitle1') || ''),
    '氏名': safeDocxText(getValue('managerName1') || ''),
    '研究題名': safeDocxText(getValue('studyTitle') || ''),
    '作成年': safeDocxText(today.year),
    '作成月': safeDocxText(today.month),
    '作成日': safeDocxText(today.day),

    '公表日': joinDocxLines([
      initialRow ? formatDateToJapanese(initialRow.date || '') : '',
      changeRow ? formatDateToJapanese(changeRow.date || '') : '',
      minorRow ? formatDateToJapanese(minorRow.date || '') : '',
      todokedeGaiRow ? formatDateToJapanese(todokedeGaiRow.date || '') : ''
    ]),

    '研究種別_特定': mark(isSpecific),
    '特定内訳_未承認適応外': mark(isSpecific && isUnapproved),
    '特定内訳_資金提供': mark(isSpecific && isFunding),
    '研究種別_非特定': mark(isNonspecific),

    '報告事項_実施計画公表': mark(!!initialRow || !!changeRow || !!minorRow),
    '公表区分_新規': mark(!!initialRow),
    '新規公表日': formatDateToJapanese(initialRow?.date || ''),
    '新規URL': safeDocxText(initialRow?.url || ''),
    '公表区分_上位変更': (changeRow || minorRow) ? '■' : '□',
    '公表区分_下位変更': changeRow ? '■' : '□',
    '変更公表日': formatDateToJapanese(changeRow?.date || ''),
    '変更URL': safeDocxText(changeRow?.url || ''),
    '公表区分_軽微': minorRow ? '■' : '□',
    '軽微公表日': formatDateToJapanese(minorRow?.date || ''),
    '軽微URL': safeDocxText(minorRow?.url || ''),
    '公表区分_届出外': mark(isTodokedeGai),
    '届出外公表日': formatDateToJapanese(todokedeGaiRow?.date || ''),
    '届出外URL': safeDocxText(todokedeGaiRow?.url || ''),

    '報告事項_疾病等不具合': mark(hasIssue),
    '疾病区分_医薬品': mark(isDrugIssue),
    '疾病施設_医薬品_自施設': mark(isDrugIssue && relatedRows.some(function(x) { return x?.type === '疾病等報告（医薬品）' && x?.facilityType === '自施設'; })),
    '疾病施設_医薬品_他施設': mark(isDrugIssue && relatedRows.some(function(x) { return x?.type === '疾病等報告（医薬品）' && x?.facilityType === '他施設'; })),
    '疾病区分_医療機器': mark(isDeviceIssue),
    '疾病施設_医療機器_自施設': mark(isDeviceIssue && relatedRows.some(function(x) { return x?.type === '疾病等報告（医療機器）' && x?.facilityType === '自施設'; })),
    '疾病施設_医療機器_他施設': mark(isDeviceIssue && relatedRows.some(function(x) { return x?.type === '疾病等報告（医療機器）' && x?.facilityType === '他施設'; })),
    '疾病区分_再生医療等製品': mark(isRegenIssue),
    '疾病施設_再生_自施設': mark(isRegenIssue && relatedRows.some(function(x) { return x?.type === '疾病等報告（再生医療等製品）' && x?.facilityType === '自施設'; })),
    '疾病施設_再生_他施設': mark(isRegenIssue && relatedRows.some(function(x) { return x?.type === '疾病等報告（再生医療等製品）' && x?.facilityType === '他施設'; })),
    '疾病報告詳細': safeDocxText(relatedRows.filter(function(x) { return x?.type && x.type.includes('疾病等'); }).map(function(x) { return x?.facilityDetail || ''; }).filter(Boolean).join('／')),
    '報告詳細': safeDocxText(relatedRows.filter(function(x) { return x?.type && x.type.includes('疾病等'); }).map(function(x) { return x?.facilityDetail || ''; }).filter(Boolean).join('／')),
    '報告詳細_医薬品_自施設': safeDocxText(relatedRows.filter(function(x) { return x?.type === '疾病等報告（医薬品）' && x?.facilityType === '自施設'; }).map(function(x) { return x?.facilityDetail || ''; }).filter(Boolean).join('／')),
    '報告詳細_医薬品_他施設': safeDocxText(relatedRows.filter(function(x) { return x?.type === '疾病等報告（医薬品）' && x?.facilityType === '他施設'; }).map(function(x) { return x?.facilityDetail || ''; }).filter(Boolean).join('／')),
    '報告詳細_医療機器_自施設': safeDocxText(relatedRows.filter(function(x) { return x?.type === '疾病等報告（医療機器）' && x?.facilityType === '自施設'; }).map(function(x) { return x?.facilityDetail || ''; }).filter(Boolean).join('／')),
    '報告詳細_医療機器_他施設': safeDocxText(relatedRows.filter(function(x) { return x?.type === '疾病等報告（医療機器）' && x?.facilityType === '他施設'; }).map(function(x) { return x?.facilityDetail || ''; }).filter(Boolean).join('／')),
    '報告詳細_再生_自施設': safeDocxText(relatedRows.filter(function(x) { return x?.type === '疾病等報告（再生医療等製品）' && x?.facilityType === '自施設'; }).map(function(x) { return x?.facilityDetail || ''; }).filter(Boolean).join('／')),
    '報告詳細_再生_他施設': safeDocxText(relatedRows.filter(function(x) { return x?.type === '疾病等報告（再生医療等製品）' && x?.facilityType === '他施設'; }).map(function(x) { return x?.facilityDetail || ''; }).filter(Boolean).join('／')),

    '報告事項_不適合': mark(isFutekigou),
    '不適合_重大': mark(false),
    '不適合公表日': formatDateToJapanese(futekigouRow?.date || ''),
    '不適合URL': safeDocxText(futekigouRow?.url || ''),

    '報告事項_主要評価通知': mark(isMainResultNotify),
    '主要評価通知公表日': formatDateToJapanese(mainResultNotifyRow?.date || ''),
    '主要評価通知URL': safeDocxText(mainResultNotifyRow?.url || ''),

    '報告事項_概要公表': mark(isSummaryPublish),
    '概要公表公表日': formatDateToJapanese(summaryPublishRow?.date || ''),
    '概要公表URL': safeDocxText(summaryPublishRow?.url || ''),

    '報告事項_審査意見': mark(isReviewOpinion),
    '審査意見公表日': formatDateToJapanese(reviewOpinionRow?.date || ''),
    '審査意見URL': safeDocxText(reviewOpinionRow?.url || ''),

    '報告事項_定期': mark(isPeriodic),
    '報告事項_その他': mark(isOther),

    '定期報告_報告期間': safeDocxText((function() {
      var periodicRow = relatedRows.find(function(x) { return x?.type === '定期報告'; });
      if (!periodicRow || !periodicRow.date) return isPeriodic ? '' : '定期報告';
      return '定期報告（報告期間：' + formatDateRangeToSlash(periodicRow.date) + '）';
    })()),
    '定期報告_報告期間_漢字': safeDocxText((function() {
      var periodicRow = relatedRows.find(function(x) { return x?.type === '定期報告'; });
      if (!periodicRow || !periodicRow.date) return isPeriodic ? '' : '定期報告';
      return '定期報告（報告期間：' + formatDateRangeToJapanese(periodicRow.date) + '）';
    })()),

    '報告事項_起案': safeDocxText((function() {
      var hasPeriodic = relatedRows.some(function(x) { return x?.type === '定期報告'; });
      var initialR = relatedRows.find(function(x) { return x?.type === '初回公表'; });
      var changeR = relatedRows.find(function(x) { return x?.type === '変更'; });
      var minorR = relatedRows.find(function(x) { return x?.type === '軽微変更'; });
      var hasOther = !!(initialR || changeR || minorR);
      var parts = [];
      if (hasOther) {
        var pairs = [['初回公表', initialR], ['変更', changeR], ['軽微変更', minorR]].filter(function(arr) { return arr[1]; });
        if (pairs.length) {
          var maxW = Math.max.apply(null, pairs.map(function(arr) { return fullWidthWidth(arr[0]); }));
          parts.push('実施計画の公表（' + pairs.map(function(arr) { return padFullWidth(arr[0], maxW) + '　' + formatDateToJapanese(arr[1]?.date || ''); }).join('、') + '）');
        }
      }
      if (hasPeriodic) {
        var periodicRow = relatedRows.find(function(x) { return x?.type === '定期報告'; });
        if (periodicRow?.date) {
          parts.push('定期報告（報告期間：' + formatDateRangeToJapanese(periodicRow.date) + '）');
        }
      }
      return parts.join('\n');
    })()),

    '報告事項_報告案': safeDocxText((function() {
      var hasPeriodic = relatedRows.some(function(x) { return x?.type === '定期報告'; });
      var initialR = relatedRows.find(function(x) { return x?.type === '初回公表'; });
      var changeR = relatedRows.find(function(x) { return x?.type === '変更'; });
      var minorR = relatedRows.find(function(x) { return x?.type === '軽微変更'; });
      var hasOther = !!(initialR || changeR || minorR);
      var parts = [];
      if (hasOther) {
        var pairs = [['初回公表', initialR], ['変更', changeR], ['軽微変更', minorR]].filter(function(arr) { return arr[1]; });
        if (pairs.length) {
          var urlLines = pairs.map(function(arr) { return arr[0] + '　' + (arr[1]?.url || '').trim(); }).join('\n');
          parts.push('jRCT URL          ' + urlLines);
        }
      }
      if (hasPeriodic) {
        var periodicRow = relatedRows.find(function(x) { return x?.type === '定期報告'; });
        if (periodicRow?.date) {
          parts.push('定期報告（報告期間：' + formatDateRangeToJapanese(periodicRow.date) + '）');
        }
      }
      return parts.join('\n');
    })()),

    '報告事項': safeDocxText((function() {
      var hasPeriodic = relatedRows.some(function(x) { return x?.type === '定期報告'; });
      var hasIssue = relatedRows.some(function(x) { return x?.type && x.type.includes('疾病等'); });
      var pubPairs = [['初回公表', initialRow], ['変更', changeRow], ['軽微変更', minorRow]].filter(function(arr) { return arr[1]; });
      var parts = [];
      if (pubPairs.length) {
        var maxW = Math.max.apply(null, pubPairs.map(function(arr) { return fullWidthWidth(arr[0]); }));
        parts.push('実施計画の公表（' + pubPairs.map(function(arr) { return padFullWidth(arr[0], maxW) + '　' + formatDateToJapanese(arr[1]?.date || ''); }).join('、') + '）');
      }
      if (hasPeriodic) {
        var periodicRow = relatedRows.find(function(x) { return x?.type === '定期報告'; });
        if (periodicRow?.date) {
          parts.push('定期報告（報告期間：' + formatDateRangeToJapanese(periodicRow.date) + '）');
        }
      }
      if (hasIssue) {
        var issueRows = relatedRows.filter(function(x) { return x?.type && x.type.includes('疾病等'); });
        issueRows.forEach(function(row) {
          var label = (row?.type || '').replace('疾病等報告（', '').replace('）', '');
          var detail = row?.facilityDetail || '';
          parts.push(label + 'の疾病等報告（' + detail + '）');
        });
      }
      return parts.join('\n');
    })()),

    '詳細内容': safeDocxText((function() {
      var hasPeriodic = relatedRows.some(function(x) { return x?.type === '定期報告'; });
      var hasIssue = relatedRows.some(function(x) { return x?.type && x.type.includes('疾病等'); });
      var pubPairs = [['初回公表', initialRow], ['変更', changeRow], ['軽微変更', minorRow]].filter(function(arr) { return arr[1]; });
      var parts = [];
      if (pubPairs.length) {
        var urlLines = pubPairs.map(function(arr) { return arr[0] + '　' + (arr[1]?.url || '').trim(); }).join('\n');
        parts.push('jRCT URL          ' + urlLines);
      }
      if (hasPeriodic) {
        parts.push('詳細な内容　　　別紙のとおり');
      }
      if (hasIssue) {
        parts.push('詳細な内容　　　別紙のとおり');
      }
      return parts.join('\n');
    })())
  };
}

// 報告案docxをダウンロード
async function downloadReportDocxForRow(idx) {
  if (!reportTemplateDocxBuffer) {
    fileStatuses.reportDocx = '先に報告案ひな形（.docx）を読み込んでください。';
    renderTemplate();
    return;
  }
  if (!ensureDocxLibReady()) {
    fileStatuses.reportDocx = 'docx差し込みライブラリの読み込みに失敗しました。';
    renderTemplate();
    return;
  }
  var rows = requestRowsData();
  var r = rows[idx];
  if (!r) {
    fileStatuses.reportDocx = '対象の依頼行が見つかりません。';
    renderTemplate();
    return;
  }
  try {
    var blob = renderDocxFromTemplate(reportTemplateDocxBuffer.slice(0), reportDocxDataForRow(r));
    var outType = outputCategory(r.type);
    downloadBlob(blob, combinedDraftReportPrefix() + '_' + outType + '_02_報告案.docx');
    fileStatuses.reportDocx = '✅ 依頼' + (idx + 1) + 'の報告案docxを出力しました。';
    renderTemplate();
  } catch(err) {
    fileStatuses.reportDocx = '報告案docx出力に失敗しました：' + (err.message || err);
    renderTemplate();
  }
}

// 複数依頼の報告案docxをダウンロード
async function downloadCombinedReportDocx() {
  if (!reportTemplateDocxBuffer) {
    fileStatuses.reportDocx = '先に報告案ひな形（.docx）を読み込んでください。';
    renderTemplate();
    return;
  }
  if (!ensureDocxLibReady()) {
    fileStatuses.reportDocx = 'docx差し込みライブラリの読み込みに失敗しました。';
    renderTemplate();
    return;
  }

  var rows = requestRowsData();
  var r = rows[0];
  if (!r) {
    fileStatuses.reportDocx = '対象の依頼行がありません。';
    renderTemplate();
    return;
  }

  try {
    var blob = renderDocxFromTemplate(reportTemplateDocxBuffer.slice(0), reportDocxDataForRow(r));
    var outType = outputCategory(r.type);
    var fileName = combinedDraftReportPrefix() + '_' + outType + '_02_報告案.docx';
    downloadBlob(blob, fileName);
    fileStatuses.reportDocx = '✅ 複数依頼をまとめた報告案docxを1枚出力しました。';
    renderTemplate();
  } catch(err) {
    fileStatuses.reportDocx = '報告案docx出力に失敗しました：' + (err.message || err);
    renderTemplate();
  }
}

// docxテンプレート読み込みハンドラ（起案文）
function handleTemplateDocxLoad(ev) {
  var file = ev.target.files && ev.target.files[0];
  if (!file) {
    fileStatuses.docx = 'ファイルが選択されていません。';
    var el = document.getElementById('docxTemplateStatus');
    if (el) el.textContent = fileStatuses.docx;
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    templateDocxBuffer = e.target.result;
    templateDocxName = file.name || '起案テンプレート.docx';
    fileStatuses.docx = '✅ ひな形（' + templateDocxName + '）を読み込みました。';
    var el = document.getElementById('docxTemplateStatus');
    if (el) el.textContent = fileStatuses.docx;
  };
  reader.onerror = function() {
    fileStatuses.docx = 'テンプレート読込に失敗しました。';
    var el = document.getElementById('docxTemplateStatus');
    if (el) el.textContent = fileStatuses.docx;
  };
  reader.readAsArrayBuffer(file);
}

// docx用テキストを安全に処理
function safeDocxText(v) {
  return String(v ?? '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

// docx用行結合
function joinDocxLines(values) {
  return safeDocxText(
    values
      .map(function(v) { return String(v ?? '').trim(); })
      .filter(function(v) { return v !== ''; })
      .join('\n')
  );
}

// 全角文字幅を計算
function fullWidthWidth(str) {
  var w = 0;
  for (var i = 0; i < String(str).length; i++) {
    var c = String(str).codePointAt(i);
    if (c <= 0x7F) w += 1;
    else if (c <= 0x2E7F) w += 1;
    else if (c <= 0x9FFF) w += 2;
    else if (c <= 0xF9FF) w += 2;
    else if (c <= 0xFEFF) w += 1;
    else if (c <= 0x1FFFF) w += 2;
    else w += 1;
  }
  return w;
}

// 全角文字でパディング
function padFullWidth(str, targetWidth) {
  var cur = fullWidthWidth(str);
  if (cur >= targetWidth) return str;
  return str + '　'.repeat(targetWidth - cur);
}

// docx用アラインメント行を生成
function alignedDocxLines(types, values) {
  var pairs = types.map(function(t, i) {
    return [String(t || '').trim(), String(values[i] || '').trim()];
  }).filter(function(arr) { return arr[0] || arr[1]; });
  if (!pairs.length) return '';
  var maxW = Math.max.apply(null, pairs.map(function(arr) { return fullWidthWidth(arr[0]); }));
  return pairs.map(function(arr) { return padFullWidth(arr[0], maxW) + '\t' + arr[1]; }).join('\n');
}

// 起案文docxデータを生成
function docxDataForRow(r) {
  var today = currentDocxDateParts();
  var rows = requestRowsData();
  var targetRows = rows.length ? rows : (r ? [r] : []);
  var firstRowOfType = function(t) {
    return targetRows.find(function(x) { return x?.type === t; }) || null;
  };
  var isPeriodic = targetRows.some(function(x) { return x?.type === '定期報告'; });

  var initialRow = firstRowOfType('初回公表');
  var changeRow = firstRowOfType('変更');
  var minorRow = firstRowOfType('軽微変更');
  var todokedeGaiRow = firstRowOfType('届出外');

  var reportPairs = [
    ['初回公表', initialRow],
    ['変更', changeRow],
    ['軽微変更', minorRow],
    ['届出外', todokedeGaiRow]
  ].filter(function(arr) { return arr[1]; });

  return {
    '所属部門': safeDocxText(getValue('drafterDept') || ''),
    '起案者名': safeDocxText(getValue('drafterName') || ''),
    '所属': safeDocxText(getValue('managerAffil1') || ''),
    '所属部署': safeDocxText(getValue('managerDept1') || ''),
    '職名': safeDocxText(getValue('managerTitle1') || ''),
    '氏名': safeDocxText(getValue('managerName1') || ''),
    '研究題名': safeDocxText(getValue('studyTitle') || ''),

    '報告区分': joinDocxLines(targetRows.map(function(x) { return x?.type || ''; })),

    '公表日': joinDocxLines([
      changeRow ? formatDateToJapanese(changeRow.date || '') : '',
      minorRow ? formatDateToJapanese(minorRow.date || '') : '',
      initialRow ? formatDateToJapanese(initialRow.date || '') : '',
      todokedeGaiRow ? formatDateToJapanese(todokedeGaiRow.date || '') : ''
    ]),

    'jRCT URL': alignedDocxLines(
      ['変更', '軽微変更', '初回公表', '届出外'],
      [changeRow?.url || '', minorRow?.url || '', initialRow?.url || '', todokedeGaiRow?.url || '']
    ),

    '報告事項一覧': safeDocxText((function() {
      var pairs = reportPairs.map(function(arr) { return [arr[0], formatDateToJapanese(arr[1]?.date || '')]; }).filter(function(arr) { return arr[0] || arr[1]; });
      if (!pairs.length) return '';
      var maxW = Math.max.apply(null, pairs.map(function(arr) { return fullWidthWidth(arr[0]); }));
      return pairs.map(function(arr) { return padFullWidth(arr[0], maxW) + '　' + arr[1]; }).join('、');
    })()),
    'jRCT一覧': alignedDocxLines(
      reportPairs.map(function(arr) { return arr[0]; }),
      reportPairs.map(function(arr) { return (arr[1]?.url || '').trim(); })
    ),

    '変更公表日': formatDateToJapanese(changeRow?.date || ''),
    '軽微変更公表日': formatDateToJapanese(minorRow?.date || ''),
    '変更URL': safeDocxText(changeRow?.url || ''),
    '軽微変更URL': safeDocxText(minorRow?.url || ''),

    '届出外公表日': formatDateToJapanese(todokedeGaiRow?.date || ''),
    '届出外URL': safeDocxText(todokedeGaiRow?.url || ''),

    '定期報告_報告期間': safeDocxText((function() {
      var periodicRow = targetRows.find(function(x) { return x?.type === '定期報告'; });
      if (!periodicRow || !periodicRow.date) return isPeriodic ? '' : '定期報告';
      return '定期報告（報告期間：' + formatDateRangeToSlash(periodicRow.date) + '）';
    })()),
    '定期報告_報告期間_漢字': safeDocxText((function() {
      var periodicRow = targetRows.find(function(x) { return x?.type === '定期報告'; });
      if (!periodicRow || !periodicRow.date) return isPeriodic ? '' : '定期報告';
      return '定期報告（報告期間：' + formatDateRangeToJapanese(periodicRow.date) + '）';
    })()),

    '報告事項_起案': safeDocxText((function() {
      var hasPeriodic = targetRows.some(function(x) { return x?.type === '定期報告'; });
      var hasOther = targetRows.some(function(x) { return ['初回公表', '変更', '軽微変更'].includes(x?.type); });
      var parts = [];
      if (hasOther) {
        var pairs = reportPairs.map(function(arr) { return [arr[0], formatDateToJapanese(arr[1]?.date || '')]; }).filter(function(arr) { return arr[0] || arr[1]; });
        if (pairs.length) {
          var maxW = Math.max.apply(null, pairs.map(function(arr) { return fullWidthWidth(arr[0]); }));
          parts.push('実施計画の公表（' + pairs.map(function(arr) { return padFullWidth(arr[0], maxW) + '　' + arr[1]; }).join('、') + '）');
        }
      }
      if (hasPeriodic) {
        var periodicRow = targetRows.find(function(x) { return x?.type === '定期報告'; });
        if (periodicRow?.date) {
          parts.push('定期報告（報告期間：' + formatDateRangeToJapanese(periodicRow.date) + '）');
        }
      }
      return parts.join('\n');
    })()),

    '報告事項_報告案': safeDocxText((function() {
      var hasPeriodic = targetRows.some(function(x) { return x?.type === '定期報告'; });
      var hasOther = targetRows.some(function(x) { return ['初回公表', '変更', '軽微変更'].includes(x?.type); });
      var parts = [];
      if (hasOther) {
        var urlLines = alignedDocxLines(
          reportPairs.map(function(arr) { return arr[0]; }),
          reportPairs.map(function(arr) { return (arr[1]?.url || '').trim(); })
        );
        if (urlLines) parts.push('jRCT URL          ' + urlLines);
      }
      if (hasPeriodic) {
        var periodicRow = targetRows.find(function(x) { return x?.type === '定期報告'; });
        if (periodicRow?.date) {
          parts.push('定期報告（報告期間：' + formatDateRangeToJapanese(periodicRow.date) + '）');
        }
      }
      return parts.join('\n');
    })()),

    '報告事項': safeDocxText((function() {
      var hasPeriodic = targetRows.some(function(x) { return x?.type === '定期報告'; });
      var hasIssue = targetRows.some(function(x) { return x?.type && x.type.includes('疾病等'); });
      var pubPairs = [['初回公表', initialRow], ['変更', changeRow], ['軽微変更', minorRow]].filter(function(arr) { return arr[1]; });
      var parts = [];
      if (pubPairs.length) {
        var maxW = Math.max.apply(null, pubPairs.map(function(arr) { return fullWidthWidth(arr[0]); }));
        parts.push('実施計画の公表（' + pubPairs.map(function(arr) { return padFullWidth(arr[0], maxW) + '　' + (arr[1]?.date || ''); }).join('、') + '）');
      }
      if (hasPeriodic) {
        var periodicRow = targetRows.find(function(x) { return x?.type === '定期報告'; });
        if (periodicRow?.date) {
          parts.push('定期報告（報告期間：' + periodicRow.date + '）');
        }
      }
      if (hasIssue) {
        var issueRows = targetRows.filter(function(x) { return x?.type && x.type.includes('疾病等'); });
        issueRows.forEach(function(row) {
          var label = (row?.type || '').replace('疾病等報告（', '').replace('）', '');
          var detail = row?.facilityDetail || '';
          parts.push(label + 'の疾病等報告（' + detail + '）');
        });
      }
      return parts.join('\n');
    })()),
    '詳細内容': safeDocxText((function() {
      var hasPeriodic = targetRows.some(function(x) { return x?.type === '定期報告'; });
      var hasIssue = targetRows.some(function(x) { return x?.type && x.type.includes('疾病等'); });
      var pubPairs = [['初回公表', initialRow], ['変更', changeRow], ['軽微変更', minorRow]].filter(function(arr) { return arr[1]; });
      var parts = [];
      if (pubPairs.length) {
        var urlLines = pubPairs.map(function(arr) { return arr[0] + '　' + (arr[1]?.url || '').trim(); }).join('\n');
        parts.push('jRCT URL          ' + urlLines);
      }
      if (hasPeriodic) {
        parts.push('詳細な内容　　　別紙のとおり');
      }
      if (hasIssue) {
        parts.push('詳細な内容　　　別紙のとおり');
      }
      return parts.join('\n');
    })()),

    '報告詳細': safeDocxText(targetRows.filter(function(x) { return x?.type && x.type.includes('疾病等'); }).map(function(x) { return x?.facilityDetail || ''; }).filter(Boolean).join('／')),
    '報告詳細_医薬品_自施設': safeDocxText(targetRows.filter(function(x) { return x?.type === '疾病等報告（医薬品）' && x?.facilityType === '自施設'; }).map(function(x) { return x?.facilityDetail || ''; }).filter(Boolean).join('／')),
    '報告詳細_医薬品_他施設': safeDocxText(targetRows.filter(function(x) { return x?.type === '疾病等報告（医薬品）' && x?.facilityType === '他施設'; }).map(function(x) { return x?.facilityDetail || ''; }).filter(Boolean).join('／')),
    '報告詳細_医療機器_自施設': safeDocxText(targetRows.filter(function(x) { return x?.type === '疾病等報告（医療機器）' && x?.facilityType === '自施設'; }).map(function(x) { return x?.facilityDetail || ''; }).filter(Boolean).join('／')),
    '報告詳細_医療機器_他施設': safeDocxText(targetRows.filter(function(x) { return x?.type === '疾病等報告（医療機器）' && x?.facilityType === '他施設'; }).map(function(x) { return x?.facilityDetail || ''; }).filter(Boolean).join('／')),
    '報告詳細_再生_自施設': safeDocxText(targetRows.filter(function(x) { return x?.type === '疾病等報告（再生医療等製品）' && x?.facilityType === '自施設'; }).map(function(x) { return x?.facilityDetail || ''; }).filter(Boolean).join('／')),
    '報告詳細_再生_他施設': safeDocxText(targetRows.filter(function(x) { return x?.type === '疾病等報告（再生医療等製品）' && x?.facilityType === '他施設'; }).map(function(x) { return x?.facilityDetail || ''; }).filter(Boolean).join('／')),

    '作成年': safeDocxText(today.year),
    '作成月': safeDocxText(today.month),
    '作成日': safeDocxText(today.day)
  };
}

// docxライブラリが利用可能か確認
function ensureDocxLibReady() {
  return typeof window.PizZip !== 'undefined' && typeof window.docxtemplater !== 'undefined';
}

// 正規表現エスケープ
function escapeRegex(str) {
  return String(str).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// docx条件分岐を前処理
function preprocessDocxForConditionals(buffer, data) {
  var zip = new PizZip(buffer);
  var xmlPaths = Object.keys(zip.files).filter(function(f) {
    return /^word\/(document|header|footer)\d*\.xml$/.test(f);
  });
  var emptyKeys = Object.entries(data)
    .filter(function(arr) { return arr[1] === '' || arr[1] === null || arr[1] === undefined; })
    .map(function(arr) { return arr[0]; });
  emptyKeys.forEach(function(k) { data[k] = null; });
  if (!emptyKeys.length) return buffer;

  function isInsideWT(xml, pos) {
    var ltOpen = xml.lastIndexOf('<w:t', pos);
    if (ltOpen === -1) return false;
    var ltTagClose = xml.indexOf('>', ltOpen);
    if (ltTagClose === -1 || pos < ltTagClose + 1) return false;
    var ltEnd = xml.indexOf('</w:t>', ltTagClose);
    if (ltEnd === -1) return false;
    return pos < ltEnd;
  }

  var editsPerFile = {};
  xmlPaths.forEach(function(path) {
    var xml = zip.file(path).asText();
    var inserts = [];
    for (var ki = 0; ki < emptyKeys.length; ki++) {
      var key = emptyKeys[ki];
      var tag = '{{' + key + '}}';
      var pos = 0;
      while (pos < xml.length) {
        var tagIdx = xml.indexOf(tag, pos);
        if (tagIdx === -1) break;
        pos = tagIdx + tag.length;

        var pOpen = xml.lastIndexOf('<w:p', tagIdx);
        var pClose = xml.indexOf('</w:p>', tagIdx);
        if (pOpen === -1 || pClose === -1) continue;

        var leftParenIdx = -1;
        for (var i = tagIdx - 1; i >= pOpen; i--) {
          if (xml[i] === '\uFF09') break;
          if (xml[i] === '\uFF08') { leftParenIdx = i; break; }
        }
        var rightParenIdx = -1;
        for (var j = tagIdx + tag.length; j < pClose + 6; j++) {
          if (xml[j] === '\uFF08') break;
          if (xml[j] === '\uFF09') { rightParenIdx = j; break; }
        }

        if (leftParenIdx !== -1 && isInsideWT(xml, leftParenIdx) &&
            rightParenIdx !== -1 && isInsideWT(xml, rightParenIdx)) {
          inserts.push({pos: leftParenIdx, text: '{{#' + key + '}}'});
          inserts.push({pos: rightParenIdx + 1, text: '{{/' + key + '}}'});
        } else {
          var tOpen = xml.lastIndexOf('<w:t', tagIdx);
          var tClose = xml.indexOf('>', tOpen);
          var tEnd = xml.indexOf('</w:t>', tagIdx);
          if (tOpen !== -1 && tClose !== -1 && tEnd !== -1) {
            inserts.push({pos: tClose + 1, text: '{{#' + key + '}}'});
            inserts.push({pos: tEnd, text: '{{/' + key + '}}'});
          }
        }
      }
    }
    if (inserts.length) editsPerFile[path] = inserts;
  });

  if (!Object.keys(editsPerFile).length) return buffer;

  xmlPaths.forEach(function(path) {
    var inserts = editsPerFile[path];
    if (!inserts || !inserts.length) return;
    var xml = zip.file(path).asText();
    inserts.sort(function(a, b) { return b.pos - a.pos; });
    for (var idx = 0; idx < inserts.length; idx++) {
      var ins = inserts[idx];
      xml = xml.substring(0, ins.pos) + ins.text + xml.substring(ins.pos);
    }
    zip.file(path, xml);
  });

  return zip.generate({type: 'uint8array'});
}

// docxテンプレートからレンダリング
function renderDocxFromTemplate(buffer, data) {
  try {
    var processed = preprocessDocxForConditionals(buffer, data);
    var zip = new PizZip(processed);
    var doc = new window.docxtemplater(zip, {
      delimiters: {start: '{{', end: '}}'},
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: function() { return ''; }
    });
    doc.render(data);
    return doc.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
  } catch(e) {
    console.error('docx rendering failed, trying without preprocess:', e);
    var zip2 = new PizZip(buffer);
    var doc2 = new window.docxtemplater(zip2, {
      delimiters: {start: '{{', end: '}}'},
      paragraphLoop: true,
      linebreaks: true,
      nullGetter: function() { return ''; }
    });
    doc2.render(data);
    return doc2.getZip().generate({
      type: 'blob',
      mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    });
  }
}

// Blobをダウンロード
function downloadBlob(blob, filename) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// jRCT URL Excelを生成
function generateJrctUrlXlsx(allRows) {
  if (typeof XLSX === 'undefined') return null;
  var findRowOfType = function(t) {
    return allRows.find(function(x) { return x?.type === t; }) || null;
  };
  var pairs = [
    ['初回公表', findRowOfType('初回公表')],
    ['変更', findRowOfType('変更')],
    ['軽微変更', findRowOfType('軽微変更')]
  ].filter(function(arr) { return arr[1]; });
  if (!pairs.length) return null;
  var wb = XLSX.utils.book_new();
  var header = ['jRCT種別', '公表日', 'jRCT URL', '管理番号'];
  var data = [header];
  pairs.forEach(function(arr) { data.push([arr[0], arr[1].date || '', arr[1].url || '', requestOutputNo(arr[1])]); });
  var ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [{wch: 14}, {wch: 14}, {wch: 50}, {wch: 30}];
  XLSX.utils.book_append_sheet(wb, ws, 'jRCT URL');
  var buf = XLSX.write(wb, {bookType: 'xlsx', type: 'array'});
  return new Blob([buf], {type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});
}

// jRCT URLファイル名を取得
function jRCTUrlFileName(r) {
  var naming = NAMING_MASTER.find(function(x) { return x.source === 'jRCT_URL'; });
  if (!naming) return null;
  var prefix = requestOutputNo(r);
  var seqLabel = function(v) {
    var n = String(v || '').trim();
    var m = n.match(/^(\d+)(?:\.\d+)?$/);
    return m ? m[1].padStart(2, '0') : n;
  };
  var parts = naming.pattern.slice();
  if (parts.length >= 3) parts[2] = seqLabel(parts[2]);
  return [prefix].concat(parts.slice(1)).join('_') + '.xlsx';
}

// 起案文docxをダウンロード
async function downloadDraftDocxForRow(idx) {
  if (!templateDocxBuffer) {
    fileStatuses.docx = '先に起案文ひな形（.docx）を読み込んでください。';
    renderTemplate();
    return;
  }
  if (!ensureDocxLibReady()) {
    fileStatuses.docx = 'docx差し込みライブラリの読み込みに失敗しました。';
    renderTemplate();
    return;
  }
  var rows = requestRowsData();
  var r = rows[idx];
  if (!r) {
    fileStatuses.docx = '対象の依頼行が見つかりません。';
    renderTemplate();
    return;
  }
  try {
    var blob = renderDocxFromTemplate(templateDocxBuffer.slice(0), docxDataForRow(r));
    var outType = outputCategory(r.type);
    downloadBlob(blob, combinedDraftReportPrefix() + '_' + outType + '_00_起案.docx');
    fileStatuses.docx = '✅ 依頼' + (idx + 1) + 'の起案docxを出力しました。';
    renderTemplate();
  } catch(err) {
    fileStatuses.docx = 'docx出力に失敗しました：' + (err.message || err);
    renderTemplate();
  }
}

// 複数依頼の起案文docxをダウンロード
async function downloadCombinedDraftDocx() {
  if (!templateDocxBuffer) {
    fileStatuses.docx = '先に起案文ひな形（.docx）を読み込んでください。';
    renderTemplate();
    return;
  }
  if (!ensureDocxLibReady()) {
    fileStatuses.docx = 'docx差し込みライブラリの読み込みに失敗しました。';
    renderTemplate();
    return;
  }

  var rows = requestRowsData();
  var r = rows[0];
  if (!r) {
    fileStatuses.docx = '対象の依頼行がありません。';
    renderTemplate();
    return;
  }

  try {
    var blob = renderDocxFromTemplate(templateDocxBuffer.slice(0), docxDataForRow(r));
    var outType = outputCategory(r.type);
    var fileName = combinedDraftReportPrefix() + '_' + outType + '_00_起案.docx';
    downloadBlob(blob, fileName);
    fileStatuses.docx = '✅ 複数依頼をまとめた起案docxを1枚出力しました。';
    renderTemplate();
  } catch(err) {
    fileStatuses.docx = '起案docx出力に失敗しました：' + (err.message || err);
    renderTemplate();
  }
}

// フォルダZIPをダウンロード（ページモードに応じて切替）
async function downloadFolderZip() {
  if (typeof JSZip === 'undefined') {
    fileStatuses.zip = 'ZIP生成ライブラリの読み込みに失敗しました。';
    if (stages[current].id === 'drafts') renderTemplate();
    return;
  }
  fileStatuses.zip = '生成中…';
  if (stages[current].id === 'drafts') renderTemplate();
  var zip = new JSZip();
  var rows = requestRowsData();
  var draft = emailDraft();
  var mailFile = combinedMailFileName();
  var mailContent = '件名：' + draft.subject + '\n\n' + draft.body;
  var ledgerCsv = csvFromRequests();
  var ledgerFileName = ledgerCsvFileName();
  var docxLibReady = ensureDocxLibReady();
  var draftDocxReady = !!templateDocxBuffer && docxLibReady;
  var reportDocxReady = !!reportTemplateDocxBuffer && docxLibReady;
  
  var isApply = (pageMode === 'apply');
  var consolidatedDraftBlob = null;
  var consolidatedReportBlob = null;

  var jrctBlob = null;
  var jrctName = null;
  if (typeof XLSX !== 'undefined') {
    try {
      var b = generateJrctUrlXlsx(rows);
      if (b) {
        jrctBlob = b;
        jrctName = jRCTUrlFileName(rows[0]);
      }
    } catch(e) {
      fileStatuses.zip = 'jRCT URL Excel生成に失敗しました：' + e.message;
    }
  }
  if (draftDocxReady) {
    try {
      consolidatedDraftBlob = renderDocxFromTemplate(templateDocxBuffer.slice(0), docxDataForRow(rows[0]));
    } catch(e) {
      fileStatuses.zip = '起案docx生成に失敗しました：' + e.message;
    }
  }
  if (reportDocxReady) {
    try {
      consolidatedReportBlob = renderDocxFromTemplate(reportTemplateDocxBuffer.slice(0), reportDocxDataForRow(rows[0]));
    } catch(e) {
      fileStatuses.zip = '報告案docx生成に失敗しました：' + e.message;
    }
  }

  rows.forEach(function(r, i) {
    var fs = folderSetFor(r);
    var outType = outputCategory(r.type);

    var includeApply = getFolderSelection(i, 'apply');
    var includeCscc = getFolderSelection(i, 'cscc');
    var includeManager = getFolderSelection(i, 'manager');

    if (includeApply) {
      zip.folder(fs.apply).file('.keep', fs.apply + '（申請フォルダ）');
    }

    var csccFolder = null;
    if (includeCscc) {
      csccFolder = zip.folder(fs.cscc);
      csccFolder.file('.keep', fs.cscc + '（CSCC側' + (isApply ? '申請' : '公表') + 'フォルダ）');
      csccFolder.file(ledgerFileName, '\uFEFF' + ledgerCsv);

      if (consolidatedDraftBlob) {
        try {
          csccFolder.file(combinedDraftReportPrefix() + '_' + outputCategory(rows[0].type) + '_00_起案.docx', consolidatedDraftBlob);
        } catch(e) {
          fileStatuses.zip = '起案docxのZIP格納に失敗しました：' + e.message;
        }
      }

      if (consolidatedReportBlob) {
        try {
          csccFolder.file(combinedDraftReportPrefix() + '_' + outputCategory(rows[0].type) + '_02_報告案.docx', consolidatedReportBlob);
        } catch(e) {
          fileStatuses.zip = '報告案docxのZIP格納に失敗しました：' + e.message;
        }
      }

      csccFolder.file(mailFile, mailContent);
    }

    if (includeManager) {
      var managerFolder = includeCscc && csccFolder
        ? csccFolder.folder(fs.manager)
        : zip.folder(fs.manager);

      managerFolder.file('.keep', fs.manager + '（管理者側' + (isApply ? '申請' : '公表') + 'フォルダ）');
      if (r.type === '初回公表' && jrctBlob && jrctName) {
        try {
          managerFolder.file(jrctName, jrctBlob);
        } catch(e) {
          fileStatuses.zip = 'jRCT URL ExcelのZIP格納に失敗しました：' + e.message;
        }
      }
    }
  });

  try {
    var blob = await zip.generateAsync({type: 'blob'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var zipName = rows.length ? requestOutputNo(rows[0]) + '_フォルダ一式.zip' : 'フォルダ一式.zip';
    a.href = url;
    a.download = zipName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    var docxNote = (consolidatedDraftBlob || consolidatedReportBlob)
      ? '起案docx・報告案docxを全フォルダに格納、'
      : '（起案docx・報告案docxのひな形が未読込のため、docxは含まれていません）';
    fileStatuses.zip = '✅ ' + zipName + ' をダウンロードしました（' + docxNote + '台帳CSVはCSCC側' + (isApply ? '申請' : '公表') + 'フォルダに格納）。';
    if (stages[current].id === 'drafts') renderTemplate();
  } catch(e) {
    fileStatuses.zip = 'ZIP生成に失敗しました：' + e.message;
    if (stages[current].id === 'drafts') renderTemplate();
  }
}

// ============================================================
// UI関連
// ============================================================

// 表示可能なステージを取得
function visibleStages() {
  return state.appMode === 'back'
    ? stages.filter(function(s) { return ['work', 'path', 'send'].includes(s.id); })
    : stages.filter(function(s) { return ['intake', 'folders', 'drafts', 'files'].includes(s.id); });
}

// 現在のステージをモードに同期
function syncCurrentToMode() {
  var ids = visibleStages().map(function(s) { return s.id; });
  if (!ids.includes(stages[current].id)) {
    current = stages.findIndex(function(s) { return s.id === ids[0]; });
  }
}

// モードUIを更新（ページモードに応じて切替）
function updateModeUI() {
  var front = state.appMode === 'front';
  document.getElementById('modeFrontBtn').classList.toggle('active-mode', front);
  document.getElementById('modeBackBtn').classList.toggle('active-mode', !front);
  
  var isApply = (pageMode === 'apply');
  var frontTitle = isApply ? '起案：入口入力から台帳CSV・フォルダZIP作成まで' : '起案：入口入力から台帳CSV・フォルダZIP作成まで';
  var backTitle = isApply ? '申請管理者報告：台帳CSV読込から台帳更新CSV出力まで' : '公表管理者報告：台帳CSV読込から台帳更新CSV出力まで';
  var frontText = isApply 
    ? '研究課題名・研究責任者などの共通情報を最初に入力し、複数依頼は下のエリアで1件ずつ管理します。'
    : '研究課題名・研究責任者などの共通情報を最初に入力し、複数依頼は下のエリアで1件ずつ管理します。';
  var backText = isApply
    ? 'CRB承認後は申請管理者報告台帳CSVを読み込み、対象行を選択してCSCC側作業・管理者側格納・送信後の台帳更新までを進めます。研究課題名・研究責任者は台帳CSVから自動で復元されます。'
    : '決裁後は公表管理者報告台帳CSVを読み込み、対象行を選択してCSCC側作業・管理者側格納・送信後の台帳更新までを進めます。研究課題名・研究責任者は台帳CSVから自動で復元されます。';
  
  document.getElementById('headlineTitle').textContent = front ? frontTitle : backTitle;
  document.getElementById('headlineText').textContent = front ? frontText : backText;
  renderFlowGuide();
}

// フローステップ定数
var FLOW_STEPS = {
  front: [
    {id: 'intake', label: '① 入口入力'},
    {id: 'folders', label: '② フォルダ確認'},
    {id: 'drafts', label: '③ 起案・報告案作成'},
    {id: 'files', label: '④ ファイル名確認'}
  ],
  back: [
    {id: 'work', label: '⑤ CSCC側作業'},
    {id: 'path', label: '⑥ パス確定'},
    {id: 'send', label: '⑦ メール送信'}
  ]
};

// フローガイドをレンダリング
function renderFlowGuide() {
  var el = document.getElementById('flowGuide');
  if (!el) return;
  var mode = state.appMode === 'front' ? 'front' : 'back';
  var steps = FLOW_STEPS[mode];
  var vis = visibleStages();
  var currentId = stages[current].id;
  el.innerHTML = steps.map(function(s, i) {
    var doneFlag = done[stages.findIndex(function(x) { return x.id === s.id; })];
    var isCurrent = s.id === currentId;
    var cls = doneFlag ? 'done' : isCurrent ? 'current' : '';
    var arrow = i < steps.length - 1 ? '<span class="flow-arrow">→</span>' : '';
    return '<span class="flow-step ' + cls + '">' + (doneFlag ? '✓ ' : '') + s.label + '</span>' + arrow;
  }).join('');
}

// 依頼行をレンダリング
function renderRequestRows(hostOverride) {
  var hosts = hostOverride
    ? [hostOverride]
    : Array.from(document.querySelectorAll('#multiRequestHost'));
  if (!hosts.length) return;
  var primaryHost = hostOverride || hosts[0];
  if (!state.requestRows || !state.requestRows.length)
    state.requestRows = [{type: '初回公表', base: '特2025-17_2-1', date: '', url: '', facilityType: '', facilityDetail: ''}];
  var requestHtml = requestRowsData().map(function(r, i) {
    var isPeriodic = r.type === '定期報告';
    var dateLabel = isPeriodic ? '報告期間' : '公表日';
    var datePlaceholder = isPeriodic ? '例：2026/4/5～2026/9/30' : '例：2026/07/05';
    return '<div class="template-card request-row" style="padding:.8rem;margin-top:.55rem">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.55rem">' +
      '<strong style="font-size:.82rem">依頼 ' + (i + 1) + '</strong>' +
      '<button type="button" class="ghost-btn remove-request" data-remove="' + i + '" style="min-height:30px;padding:0 .7rem;font-size:.72rem">削除</button>' +
      '</div>' +
      '<div class="grid-2">' +
      '<div class="field"><label>報告区分</label>' +
      '<select class="select" data-r-type="' + i + '">' +
      ['初回公表','変更','軽微変更','届出外','疾病等報告（医薬品）','疾病等報告（医療機器）','疾病等報告（再生医療等製品）','不適合報告','主要評価項目報告書等の通知','主要評価項目報告書又は総括報告書の概要の公表','審査意見の報告','定期報告','終了','その他'].map(function(opt) {
        return '<option ' + (r.type === opt ? 'selected' : '') + '>' + opt + '</option>';
      }).join('') +
      '</select>' +
      (r.type && r.type.includes('疾病等') ? '<div style="margin-top:.5rem"><div class="help" style="margin-bottom:.3rem">自施設での発現か、他施設での発現かを選択してください。</div><div style="display:flex;align-items:center;gap:.6rem;flex-wrap:wrap"><div class="mode-group" style="display:inline-flex"><button type="button" class="chip-btn ' + (r.facilityType === '自施設' ? 'active-mode' : '') + '" data-r-facility="' + i + '" data-facility-val="自施設">自施設</button><button type="button" class="chip-btn ' + (r.facilityType === '他施設' ? 'active-mode' : '') + '" data-r-facility="' + i + '" data-facility-val="他施設">他施設</button></div><div class="field" style="margin:0;flex:1;min-width:180px"><label>報告詳細</label><input class="input" data-r-facility-detail="' + i + '" value="' + h(r.facilityDetail || '') + '" placeholder="報告詳細を入力"></div></div></div>' : '') +
      '</select></div>' +
      '<div class="field"><label>元の起案番号</label>' +
      '<input class="input" data-r-base="' + i + '" value="' + h(r.base || '特2025-17_2-1') + '" placeholder="例：特2025-17_2-1">' +
      '</div>' +
      '</div>' +
      '<div class="grid-2" style="margin-top:.7rem">' +
      '<div class="field"><label>生成後の起案番号</label>' +
      '<input class="input readonly" readonly data-generated-no value="' + h(requestOutputNo(r)) + '">' +
      '</div>' +
      '<div class="field"><label>' + dateLabel + '</label>' +
      '<input class="input" data-r-date="' + i + '" value="' + h(r.date || '') + '" placeholder="' + datePlaceholder + '"' + (isPeriodic ? ' pattern="\\d{4}/\\d{1,2}/\\d{1,2}～\\d{4}/\\d{1,2}/\\d{1,2}" title="形式：yyyy/m/d～yyyy/m/d"' : '') + '>' +
      (isPeriodic ? '<div class="help" style="color:var(--primary)">形式：yyyy/m/d～yyyy/m/d（最初の日付入力後に「～」が自動挿入されます）</div>' : '') +
      '</div>' +
      '</div>' +
      '<div class="field" style="margin-top:.7rem"><label>jRCT URL</label>' +
      '<input class="input" data-r-url="' + i + '" value="' + h(r.url || '') + '" placeholder="https://jrct...">' +
      '</div>' +
      '<div class="help">1行ごとに「報告区分」と「元の起案番号」を入力すると、生成後の起案番号が自動計算されます。</div>' +
      '</div>';
  }).join('')
    + '<div style="margin-top:.7rem"><button type="button" class="primary-btn" id="addRequestBtn">＋ 依頼行を追加</button></div>';

  hosts.forEach(function(host) { host.innerHTML = requestHtml; });

  primaryHost.querySelectorAll('[data-r-type]').forEach(function(el) {
    el.addEventListener('change', function() {
      var i = +el.dataset.rType;
      setRequestRow(i, 'type', el.value);
      renderAll();
    });
  });
  primaryHost.querySelectorAll('[data-r-facility]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var i = +btn.dataset.rFacility;
      var val = btn.dataset.facilityVal;
      setRequestRow(i, 'facilityType', val);
      renderAll();
    });
  });
  primaryHost.querySelectorAll('[data-r-facility-detail]').forEach(function(el) {
    el.addEventListener('input', function() {
      var i = +el.dataset.rFacilityDetail;
      setRequestRow(i, 'facilityDetail', el.value);
    });
  });
  primaryHost.querySelectorAll('[data-r-base]').forEach(function(el) {
    el.addEventListener('input', function() {
      var i = +el.dataset.rBase;
      setRequestRow(i, 'base', el.value);
      var row = el.closest('.request-row');
      var out = row?.querySelector('[data-generated-no]');
      if (out) out.value = requestOutputNo(state.requestRows[i]);
      renderTemplate();
    });
    el.addEventListener('change', function() {
      var i = +el.dataset.rBase;
      setRequestRow(i, 'base', el.value);
      renderAll();
    });
  });
  primaryHost.querySelectorAll('[data-r-date]').forEach(function(el) {
    el.addEventListener('input', function() {
      var i = +el.dataset.rDate;
      var row = state.requestRows[i];
      var periodic = row && row.type === '定期報告';
      if (periodic) {
        var m = el.value.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
        if (m) {
          var withTilde = el.value + '～';
          el.value = withTilde;
          setRequestRow(i, 'date', withTilde);
          el.setSelectionRange(withTilde.length, withTilde.length);
          renderTemplate();
          return;
        }
        if (el.value && el.value.includes('～')) {
          var valid = /^\d{4}\/\d{1,2}\/\d{1,2}～\d{4}\/\d{1,2}\/\d{1,2}$/.test(el.value);
          el.style.borderColor = valid ? '' : 'var(--error)';
          el.style.boxShadow = valid ? '' : '0 0 0 2px rgba(181,52,130,.12)';
        } else {
          el.style.borderColor = '';
          el.style.boxShadow = '';
        }
      }
      setRequestRow(i, 'date', el.value);
      renderTemplate();
    });
    el.addEventListener('change', function() {
      var i = +el.dataset.rDate;
      setRequestRow(i, 'date', el.value);
      renderAll();
    });
  });
  primaryHost.querySelectorAll('[data-r-url]').forEach(function(el) {
    el.addEventListener('input', function() {
      var i = +el.dataset.rUrl;
      setRequestRow(i, 'url', el.value);
      renderTemplate();
    });
    el.addEventListener('change', function() {
      var i = +el.dataset.rUrl;
      setRequestRow(i, 'url', el.value);
      renderAll();
    });
  });
  primaryHost.querySelectorAll('.remove-request').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var i = +btn.dataset.remove;
      state.requestRows.splice(i, 1);
      if (!state.requestRows.length)
        state.requestRows = [{type: '初回公表', base: '特2025-17_2-1', date: '', url: '', facilityType: '', facilityDetail: ''}];
      renderAll();
    });
  });
  primaryHost.querySelector('#addRequestBtn')?.addEventListener('click', function() {
    state.requestRows.push({type: '変更', base: '特2025-17_2-1', date: '', url: '', facilityType: '', facilityDetail: ''});
    renderAll();
  });
}

// ============================================================
// NAMING_MASTER定数
// ============================================================

var NAMING_MASTER = [
  { category: '初回公表', source: '管理者報告様式_臨床研究法における管理者への報告書', pattern: ['特XXXX-XX-XXXX-X-2', '公表', '1.0', '管理者報告'], required: true, ext: 'docx' },
  { category: '初回公表', source: '管理者承認様式_実施承認申請', pattern: ['特XXXX-XX-XXXX-X-2', '公表', '3.0', '管理者承認'], required: true, ext: 'docx' },
  { category: '初回公表', source: 'jRCT_URL', pattern: ['特XXXX-XX-XXXX-X-2', '公表', '2.0', 'jRCT', 'URL'], required: true, ext: 'xlsx' },

  { category: '変更', source: '管理者報告様式_臨床研究法における管理者への報告書', pattern: ['特XXXX-XX-XXXX-X-2', '公表', '1.0', '管理者報告'], required: true, ext: 'docx' },
  { category: '変更', source: '管理者報告様式_実施承認申請', pattern: ['特XXXX-XX-XXXX-X-2', '公表', '3.0', '管理者承認'], required: true, ext: 'docx' },
  { category: '変更', source: '様式第二（第四十一条関係）_実施計画事項変更届書', pattern: ['特XXXX-XX-XXXX-X-2', '公表', '4.0', '実施計画変更届'], required: true, ext: 'pdf' },

  { category: '軽微変更', source: '管理者報告様式_臨床研究法における管理者への報告書', pattern: ['特XXXX-XX-XXXX-X-1', '公表', '1.0', '管理者報告'], required: true, ext: 'docx' },
  { category: '軽微変更', source: '統一書式6_軽微変更通知（収受印あり）', pattern: ['特XXXX-XX-XXXX-X-1', '公表', '6.0', '軽微通知書（収受印あり）'], required: false, ext: 'pdf' },
  { category: '軽微変更', source: '統一書式6_軽微変更通知', pattern: ['特XXXX-XX-XXXX-X-1', '公表', '6.0', '軽微通知書'], required: true, ext: 'pdf' },
  { category: '軽微変更', source: '様式第三（第四十三条関係）_実施計画事項軽微変更届書', pattern: ['特XXXX-XX-XXXX-X-1', '公表', '7.0', '軽微変更届'], required: true, ext: 'pdf' },
  { category: '軽微変更', source: '様式第一（第三十九条関係）_実施計画', pattern: ['特XXXX-XX-XXXX-X-1', '公表', '10.0', '実施計画'], required: false, ext: 'pdf' },
  { category: '軽微変更', source: '必要時補足資料', pattern: ['特XXXX-XX-XXXX-X-1', '公表', '10.0', '補足資料_XXXX'], required: false, ext: 'pdf' },

  { category: '定期報告', source: '管理者報告様式_臨床研究法における管理者への報告書', pattern: ['特XXXX-XX-XXXX-X-2', '定期報告', '1.0', '管理者報告'], required: true, ext: 'docx' },
  { category: '定期報告', source: '統一書式4_審査結果通知書', pattern: ['特XXXX-XX-XXXX-X-2', '定期報告', '2.0', '審査結果'], required: true, ext: 'pdf' },
  { category: '定期報告', source: '統一書式5_定期報告書', pattern: ['特XXXX-XX-XXXX-X-2', '定期報告', '3.0', '統一5報告書'], required: true, ext: 'pdf' },
  { category: '定期報告', source: '別紙様式3_定期報告書', pattern: ['特XXXX-XX-XXXX-X-2', '定期報告', '4.0', '別紙3報告書'], required: true, ext: 'pdf' },
  { category: '定期報告', source: '定期報告書_別紙', pattern: ['特XXXX-XX-XXXX-X-2', '定期報告', '6.0', '定期報告別紙'], required: true, ext: 'pdf' },
  { category: '定期報告', source: '定期モニタリングレポート', pattern: ['特XXXX-XX-XXXX-X-2', '定期報告', '7.0', 'モニ報'], required: true, ext: 'pdf' },
  { category: '定期報告', source: 'COI医薬品', pattern: ['特XXXX-XX-XXXX-X-2', '定期報告', '9.0', 'COI医薬品'], required: true, ext: 'pdf' },
  { category: '定期報告', source: '様式E　利益相反管理計画', pattern: ['特XXXX-XX-XXXX-X-2', '定期報告', '11.0', 'COI様式E_組織名'], required: true, ext: 'pdf' },

  { category: '一部公表', source: '管理者報告様式_臨床研究法における管理者への報告書', pattern: ['特XXXX-XX-XXXX-X-2', '公表', '1.0', '管理者報告'], required: true, ext: 'docx' },

  { category: '不適合報告', source: '管理者報告様式_臨床研究法における管理者への報告書', pattern: ['特XXXX-XX-XXXX-X-2', '不適合', '1.0', '管理者報告'], required: true, ext: 'docx' },
  { category: '不適合報告', source: '統一書式4_審査結果通知書', pattern: ['特XXXX-XX-XXXX-X-2', '不適合', '2.0', '審査結果'], required: true, ext: 'pdf' },
  { category: '不適合報告', source: '統一書式7_重大な不適合報告書', pattern: ['特XXXX-XX-XXXX-X-2', '不適合', '3.0', '不適合報告書（重大な）'], required: true, ext: 'pdf' },

  { category: '疾病等報告（医療機器）', source: '管理者報告様式_臨床研究法における管理者への報告書', pattern: ['特XXXX-XX-XXXX-X-X', '公表', '1', '管理者報告'], required: true, ext: 'docx' },
  { category: '疾病等報告（医療機器）', source: '統一書式4_審査結果通知書', pattern: ['特XXXX-XX-XXXX-X-X', '医療機器', '2', '審査結果'], required: true, ext: 'pdf' },
  { category: '疾病等報告（医療機器）', source: '統一書式9_医療機器の疾病等又は不具合報告書（第1報）', pattern: ['特XXXX-XX-XXXX-X-X', '医療機器', '3', '不具合報告書'], required: true, ext: 'pdf' },
  { category: '疾病等報告（医療機器）', source: '詳細記載用書式_疾病等に関連すると思われる発現時の原疾患、合併症、既往歴、並びに過去の処置', pattern: ['特XXXX-XX-XXXX-X-X', '医療機器', '4', '詳細', '登録番号XX'], required: false, ext: 'pdf' },
  { category: '疾病等報告（医療機器）', source: '登録番号XXの検査結果等', pattern: ['特XXXX-XX-XXXX-X-X', '医療機器', '6', '検査'], required: false, ext: 'pdf' }
];

// 命名規則を生成
function namingRulesForRow(r) {
  var category = r?.type || '初回公表';
  var items = NAMING_MASTER.filter(function(x) { return x.category === category; });
  var prefix = String(requestOutputNo(r) || '').trim();

  if (!items.length) {
    return {
      category: category,
      html: '<div class="help">この公表区分の命名規則はまだ未登録です。</div>',
      requiredCount: 0
    };
  }

  var seqLabel = function(v) {
    var n = String(v || '').trim();
    var m = n.match(/^(\d+)(?:\.\d+)?$/);
    return m ? m[1].padStart(2, '0') : n;
  };

  var html = items.map(function(it, idx) {
    var parts = it.pattern.slice();
    if (parts.length >= 3) {
      parts[2] = seqLabel(parts[2]);
    }
    var filename = [prefix].concat(parts.slice(1)).join('_') + '.' + (it.ext || 'pdf');

    return '<div class="template-card">' +
      '<h4>' + (idx + 1) + '. ' + h(it.source) + '</h4>' +
      '<div class="mono">' +
      '必須：' + (it.required ? 'はい' : '状況により') + '（' + h(category) + '）' +
      '\n想定ファイル名：\n' + h(filename) +
      '</div>' +
      '<div style="margin-top:.4rem;display:flex;gap:.4rem;flex-wrap:wrap;">' +
      '<button type="button" class="ghost-btn" data-copy-filename data-filename="' + h(filename.replace(/\.[^.]+$/, '')) + '">ファイル名をコピー</button>' +
      '<label class="row-pick" style="padding:.3rem .5rem;">' +
      '<input type="checkbox" data-file-attached="' + idx + '">' +
      '<span class="small">NASに添付済み</span>' +
      '</label>' +
      '</div>' +
      '</div>';
  }).join('');

  return {
    category: category,
    html: html,
    requiredCount: items.filter(function(x) { return x.required; }).length
  };
}

// クリップボードにコピー
function copyToClipboard(text) {
  if (navigator.clipboard && window.isSecureContext) {
    return navigator.clipboard.writeText(text);
  }
  var ta = document.createElement('textarea');
  ta.value = text;
  ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); } catch(e) {}
  document.body.removeChild(ta);
  return Promise.resolve();
}

// ドラフト追加イベントをバインド
function bindDraftsExtraEvents() {
  document.querySelectorAll('[data-folder-sel]').forEach(function(el) {
    el.addEventListener('change', function() {
      var parts = el.dataset.folderSel.split('-');
      setFolderSelection(+parts[0], parts[1], el.checked);
    });
  });

  document.querySelectorAll('[data-copy-filename]').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var filenameLine = btn.dataset.filename || '';
      if (!filenameLine) return;
      copyToClipboard(filenameLine).then(function() {
        var orig = btn.textContent;
        btn.textContent = 'コピーしました!';
        btn.style.color = 'var(--success)';
        setTimeout(function() { btn.textContent = orig; btn.style.color = ''; }, 1500);
      }).catch(function() {});
    });
  });

  document.getElementById('copyAllNaming')?.addEventListener('click', function() {
    var names = Array.from(document.querySelectorAll('[data-copy-filename]'))
      .map(function(btn) { return btn.dataset.filename || ''; })
      .filter(Boolean)
      .join('\n');
    if (!names) return;
    copyToClipboard(names).catch(function() {});
  });
}

// 標準入力をバインド
function bindStandardInputs(scope) {
  (scope || document).querySelectorAll('[data-bind]').forEach(function(el) {
    if (el.type === 'checkbox') {
      el.addEventListener('change', function() {
        state[el.dataset.bind] = el.checked;
        renderTemplate();
      });
    } else {
      el.addEventListener('input', function() {
        state[el.dataset.bind] = el.value;
      });
      el.addEventListener('change', function() {
        state[el.dataset.bind] = el.value;
        renderAll();
      });
    }
  });
}

// 台帳行HTMLをレンダリング
function renderLedgerRowsHtml() {
  if (!state.loadedLedgerRows.length) return '<div class="help">台帳CSVを読み込むとここに対象行が表示されます。</div>';
  return '<div style="display:flex;gap:.55rem;flex-wrap:wrap;margin-bottom:.7rem">' +
    '<button type="button" class="ghost-btn" id="selectAllLedgerBtn">すべて選択</button>' +
    '<button type="button" class="ghost-btn" id="clearLedgerBtn">選択解除</button>' +
    '</div>' +
    '<div style="display:grid;gap:.6rem">' + state.loadedLedgerRows.map(function(r, i) {
      return '<label class="row-pick ' + ((state.selectedLedgerIndexes || []).includes(i) ? 'selected' : '') + '">' +
        '<input type="checkbox" data-ledger-pick="' + i + '" ' + ((state.selectedLedgerIndexes || []).includes(i) ? 'checked' : '') + '>' +
        '<div class="row-pick-main">' +
        '<strong>' + h(r['起案番号'] || r['元の起案番号'] || '番号なし') + ' / ' + h(r['報告区分'] || '') + '</strong>' +
        '<span>研究課題名：' + h(r['研究課題名'] || '') + '</span>' +
        '<span>研究責任者：' + h(r['研究責任者'] || '') + '</span>' +
        '</div>' +
        '</label>';
    }).join('') + '</div>';
}

// 台帳選択イベントをバインド
function bindLedgerSelectionEvents() {
  document.querySelectorAll('[data-ledger-pick]').forEach(function(el) {
    el.addEventListener('change', function() {
      toggleLedgerRowSelection(+el.dataset.ledgerPick, el.checked);
      renderAll();
    });
  });
  document.getElementById('selectAllLedgerBtn')?.addEventListener('click', selectAllLedgerRows);
  document.getElementById('clearLedgerBtn')?.addEventListener('click', clearLedgerRowSelection);
}

// メインをレンダリング（ページモードに応じて切替）
function renderMain() {
  syncCurrentToMode();
  var stage = stages[current];
  if (state.lastRenderedStageId && state.lastRenderedStageId !== stage.id && state.stepEnterTimestamp) {
    var elapsed = Math.round((Date.now() - state.stepEnterTimestamp) / 1000);
    state.stepDurations[state.lastRenderedStageId] = (state.stepDurations[state.lastRenderedStageId] || 0) + elapsed;
  }
  if (state.lastRenderedStageId !== stage.id) {
    state.stepEnterTimestamp = Date.now();
    state.lastRenderedStageId = stage.id;
  }
  var vis = visibleStages();
  var allDone = vis.every(function(s) { return done[stages.findIndex(function(x) { return x.id === s.id; })]; });
  var wrap = document.getElementById('mainStage');
  if (allDone) {
    var isApply = (pageMode === 'apply');
    var doneTitle = isApply ? '起案完了' : '起案完了';
    var doneText = isApply ? '台帳CSVひな型とフォルダZIPの作成まで完了しました。' : '台帳CSVひな型とフォルダZIPの作成まで完了しました。';
    wrap.innerHTML = '<div class="success-banner"><div style="font-size:3rem">🎉</div><h3>' + doneTitle + '</h3><p class="small">' + doneText + '</p><div style="margin-top:1rem"><button class="primary-btn" onclick="resetAll()">新しい案件を開始</button></div></div>';
    return;
  }
  // ... レンダリングロジックは各HTMLファイルに残す
}

// ============================================================
// DOM読み込み完了時に初期化
// ============================================================

document.addEventListener('DOMContentLoaded', function() {
  ThemeManager.init();

  var themeBtn = document.getElementById('themeBtn');
  if (themeBtn) {
    themeBtn.addEventListener('click', function() {
      ThemeManager.toggle();
    });
  }
});
