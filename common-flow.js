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
    state.requestRows = [{type:'初回公表',base:'特2025-17_2-1',date:'',url:'',facilityType:'',facilityDetail:'',content:'',notes:''}];
  if (!state.requestRows[idx]) state.requestRows[idx] = {type:'初回公表',base:'特2025-17_2-1',date:'',url:'',facilityType:'',facilityDetail:'',content:'',notes:''};
  state.requestRows[idx][key] = val;
}

// 依頼行の出力番号を計算（applyは生成後の起案番号を元の起案番号と同じにする）
function requestOutputNo(r) {
  if (pageMode === 'apply') return r.base || '特2025-17_2-1';
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
    date: r['報告期間'] ? formatDateRangeToSlash(r['報告期間']) : normalizeToYmdSlash(r['公表日'] || ''),
    approval: r['承認日'] || '',
    url: r['jRCT URL'] || '',
    facilityType: r['自施設他施設'] || '',
    facilityDetail: r['報告詳細'] || '',
    content: r['申請内容'] || '',
    notes: r['備考'] || ''
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
    if (first['起案者職名']) state.drafterTitle = first['起案者職名'];
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

// 今日の日付をYYYY/M/D形式で返す（月日は先頭ゼロなし）
function todayFormatted() {
  var d = new Date();
  return d.getFullYear() + '/' + (d.getMonth() + 1) + '/' + d.getDate();
}

// 日付をYYYY/M/D形式に正規化（月日は先頭ゼロなし）
function normalizeToYmdSlash(v) {
  var s = String(v || '').trim();
  if (!s) return '';
  var m = s.match(/(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/);
  if (m) return m[1] + '/' + parseInt(m[2], 10) + '/' + parseInt(m[3], 10);
  var m2 = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m2) return m2[1] + '/' + parseInt(m2[2], 10) + '/' + parseInt(m2[3], 10);
  return s;
}

// 日付をYYYY年M月D日形式に変換（月日は先頭ゼロなし）
function formatDateToJapanese(v) {
  var s = String(v || '').trim();
  if (!s) return '';
  var m = s.match(/(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/);
  if (!m) return s;
  return m[1] + '年' + parseInt(m[2], 10) + '月' + parseInt(m[3], 10) + '日';
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

// 日付範囲をスラッシュ形式に正規化（月日は先頭ゼロなし）
function formatDateRangeToSlash(v) {
  var s = String(v || '').trim();
  if (!s) return '';
  var parts = s.split('～').map(function(x) { return x.trim(); });
  if (parts.length >= 2) {
    return parts.map(function(p) {
      var m = p.match(/(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/);
      return m ? m[1] + '/' + parseInt(m[2], 10) + '/' + parseInt(m[3], 10) : p;
    }).join('～');
  }
  var m = s.match(/(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/);
  return m ? m[1] + '/' + parseInt(m[2], 10) + '/' + parseInt(m[3], 10) : s;
}

// DOCX用の年月日部分を取得（月日は先頭ゼロなし）
function currentDocxDateParts() {
  var src = state.draftDate || todayFormatted();
  var m = String(src).match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (m) {
    return {
      year: m[1],
      month: String(parseInt(m[2], 10)),
      day: String(parseInt(m[3], 10))
    };
  }
  var now = new Date();
  return {
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1),
    day: String(now.getDate())
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

// docx差し込み用の研究区分ラベル（特定→特定臨床研究、非特定→非特定臨床研究）
function docxStudyCategoryLabel() {
  if (!!state.studyTypeSpecific) return '特定臨床研究';
  if (!!state.studyTypeNonspecific) return '非特定臨床研究';
  return '';
}

// 申請内容から■（チェック）のすぐ右隣の一つながりの文字列だけを抽出して箇条書き（・で連結、項目間はスペース）で返す
function extractCheckedItems(text) {
  if (!text) return '';
  return text.split('\n').map(function(line) {
    line = line.replace(/[☐]/g, '□').replace(/[☑☒✓✔●]/g, '■');
    if (line.indexOf('■') === -1) return '';
    var parts = line.split(/(?=[■□])/);
    var out = '';
    parts.forEach(function(p) {
      if (p.charAt(0) === '■') out += p.substring(1).replace(/^[\s\u3000]+/, '');
    });
    var cleaned = out.replace(/^[\s\u3000：:]+/, '').trim();
    var open = (cleaned.match(/[（(]/g) || []).length;
    var close = (cleaned.match(/[）)]/g) || []).length;
    if (open > close) cleaned += new Array(open - close + 1).join('）');
    return '・' + cleaned;
  }).filter(Boolean).join(' ');
}

// docx用申請内容を出力（applyは入力欄の内容をそのまま反映し、publishはチェック項目のみ抽出）
function docxContentForPrint(rows) {
  var text = rows.map(function(x) { return x?.content || ''; }).filter(Boolean).join('\n');
  if (pageMode === 'apply') {
    return text.split('\n').map(function(l) {
      l = l.replace(/^[\s\u3000・□■：:]+/, '').trim();
      return l;
    }).filter(Boolean).join('\n');
  }
  return extractCheckedItems(text);
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

// 現在のメール案（編集済みなら編集内容）を件名・本文の組で返す
function getMailDraftRecord() {
  var draft = emailDraft();
  return {subject: draft.subject, body: draft.body};
}

// 台帳行からメール件名・本文を復元する（該当列が存在し値があれば反映）
function restoreMailFromLedger(row) {
  if (!row) return;
  var subj = row['メール件名'];
  var body = row['メール本文'];
  if (subj || body) {
    state.mailSubjectEdit = subj || '';
    state.mailBodyEdit = body || '';
    state.mailTouched = true;
  }
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