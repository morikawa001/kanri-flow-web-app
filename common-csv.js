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

// 申請内容チェックパネルの状態をCSV保存用のJSON文字列へ（apply専用）
function contentCheckToCsv(rowIdx) {
  if (pageMode !== 'apply' || typeof contentCheckState === 'undefined') return '';
  var prefix = rowIdx + ':';
  var out = {};
  Object.keys(contentCheckState).forEach(function(k) {
    if (k.indexOf(prefix) !== 0) return;
    out[k.slice(prefix.length)] = (contentCheckState[k] || {});
  });
  return Object.keys(out).length ? JSON.stringify(out) : '';
}

// CSVの「申請内容チェック」列からチェックパネル状態を復元（apply専用）
function contentCheckFromCsv(text, rowIdx) {
  if (pageMode !== 'apply' || typeof contentCheckState === 'undefined') return;
  var prefix = rowIdx + ':';
  Object.keys(contentCheckState).forEach(function(k) { if (k.indexOf(prefix) === 0) delete contentCheckState[k]; });
  if (!text) return;
  try {
    var obj = JSON.parse(String(text));
    if (!obj || typeof obj !== 'object') return;
    Object.keys(obj).forEach(function(k) {
      var st = obj[k];
      if (st && typeof st === 'object' && 'checked' in st) {
        contentCheckState[prefix + k] = { checked: !!st.checked, free: st.free || '' };
      }
    });
  } catch(e) {}
}

// CSVを生成（依頼行から）
function csvFromRequests() {
  var rows = requestRowsData();
  var isApply = pageMode === 'apply';
  var header = ['起案日','元の起案番号','起案番号','報告区分','担当者','所属・部門名','ステータス','公表日','報告期間','jRCT URL','jRCT番号','研究課題名','研究責任者','研究区分','サブ分類','研究略称','研究責任者1所属','研究責任者1部署','研究責任者1職名','研究責任者1氏名','研究責任者2氏名','研究責任者2所属','研究責任者2部署','研究責任者2職名','管理者報告メール送信日','管理者側フォルダパス','自施設他施設','報告詳細','step1(秒)','step2(秒)','step3(秒)','step4(秒)','step5(秒)','step6(秒)','step7(秒)','メール件名','メール本文'];
  if (isApply) header.splice(header.indexOf('公表日') + 1, 0, '承認日');
  if (isApply) header.push('申請内容','備考','申請内容チェック','審査依頼書添付資料');
  var mailDraft = getMailDraftRecord();
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
    var rowArr = [
      draftDate, r.base || '', requestOutputNo(r), r.type, drafter, getValue('drafterDept') || '', status,
      r.type === '定期報告' ? '' : r.date || ''
    ];
    if (pageMode === 'apply') rowArr.push(r.approval || '');
    rowArr.push(r.type === '定期報告' ? r.date || '' : '', r.url || '');
    rowArr.push(getValue('jrctNo') || '', studyTitle, managerName,
      studyCategory, subCategory, mailSubject,
      getValue('managerAffil1') || '', getValue('managerDept1') || '', getValue('managerTitle1') || '', getValue('managerName1') || '',
      getValue('managerName2') || '', getValue('managerAffil2') || '', getValue('managerDept2') || '', getValue('managerTitle2') || '',
      state.sendDate || '', paths[idx] || '', r.facilityType || '', r.facilityDetail || '',
      state.stepDurations['intake'] || 0, state.stepDurations['folders'] || 0, state.stepDurations['drafts'] || 0,
      state.stepDurations['files'] || 0, state.stepDurations['work'] || 0, state.stepDurations['path'] || 0, state.stepDurations['send'] || 0,
      mailDraft.subject, mailDraft.body);
    if (pageMode === 'apply') rowArr.push(r.content || '', r.notes || '', contentCheckToCsv(idx), state.attachmentInputRaw || '');
    return rowArr.map(csvEscape).join(',');
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

// 台帳ファイル（CSV／Excel）を一行データへ変換
function readLedgerFile(file, cb) {
  var name = (file && file.name || '').toLowerCase();
  var isExcel = /\.(xlsx|xls)$/.test(name) || (file && /spreadsheet/i.test(file.type));
  var reader = new FileReader();
  reader.onerror = function() { cb(null, new Error('ファイルを読み込めませんでした。')); };
  reader.onload = function(e) {
    try {
      var parsed;
      if (isExcel && typeof XLSX !== 'undefined') {
        var wb = XLSX.read(e.target.result, { type: 'array' });
        var sheet = wb.Sheets[wb.SheetNames[0]];
        parsed = parseCsvRobust(XLSX.utils.sheet_to_csv(sheet));
      } else {
        parsed = parseCsvRobust(String(e.target.result || ''));
      }
      cb(parsed);
    } catch (err) {
      cb(null, err);
    }
  };
  if (isExcel) reader.readAsArrayBuffer(file);
  else reader.readAsText(file);
}

function fileFromEvent(ev) {
  if (ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0]) return ev.dataTransfer.files[0];
  return ev.target && ev.target.files && ev.target.files[0];
}

// ドロップゾーンとして機能させる。ドロップされたファイルを input の change イベント経由で処理する
function setupDropZone(dropZoneId, inputId) {
  var zone = document.getElementById(dropZoneId);
  var input = document.getElementById(inputId);
  if (!zone || !input) return;
  var activeCls = 'drop-active';
  zone.addEventListener('dragover', function(e) {
    e.preventDefault();
    zone.classList.add(activeCls);
  });
  zone.addEventListener('dragenter', function(e) {
    e.preventDefault();
    zone.classList.add(activeCls);
  });
  zone.addEventListener('dragleave', function(e) {
    zone.classList.remove(activeCls);
  });
  zone.addEventListener('drop', function(e) {
    e.preventDefault();
    zone.classList.remove(activeCls);
    var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (!file) return;
    var dt = new DataTransfer();
    dt.items.add(file);
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

// 台帳CSVのデータ（parsed）をstateへ復元し、復元メッセージを返す（apply/publish共通）
function applyLedgerParsed(parsed) {
  state.requestRows = parsed.rows.map(function(r) {
    return {
      type: r['報告区分'] || '初回公表',
      base: r['元の起案番号'] || r['起案番号'] || '特2025-17_2-1',
      date: r['公表日'] || r['報告期間'] || '',
      approval: r['承認日'] || '',
      url: r['jRCT URL'] || '',
      facilityType: r['自施設他施設'] || '',
      facilityDetail: r['報告詳細'] || '',
      content: r['申請内容'] || '',
      notes: r['備考'] || ''
    };
  });
  // 申請内容チェックパネルの状態をCSVから復元（apply専用）
  parsed.rows.forEach(function(r, i) {
    if (r['申請内容チェック']) contentCheckFromCsv(r['申請内容チェック'], i);
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
  // 審査依頼書_添付資料の復元（apply専用）
  if (pageMode === 'apply' && first['審査依頼書添付資料']) {
    state.attachmentInputRaw = first['審査依頼書添付資料'];
    state.attachmentData = state.attachmentInputRaw.split(/[,、，:：;；\s\u3000]+/).map(function(x){return x.trim();}).filter(Boolean);
  }
  state.managerPaths = parsed.rows.map(function(r) { return r['管理者側フォルダパス'] || ''; });
  restoreMailFromLedger(first);
  return parsed.rows.length + '件の依頼行を読み込み、研究課題情報・研究責任者・研究区分を復元しました。';
}

// CSV／Excelファイルから読み込み（ステップ1 復元用）
function handleCsvLoadFromFile(ev) {
  var file = fileFromEvent(ev);
  if (!file) {
    fileStatuses.csv = 'ファイルが選択されていません。';
    renderTemplate();
    return;
  }
  fileStatuses.csv = '';
  readLedgerFile(file, function(parsed, err) {
    if (err) {
      fileStatuses.csv = 'ファイル読み込みに失敗しました：' + err.message;
      renderTemplate();
      return;
    }
    if (!parsed || !parsed.rows.length) {
      fileStatuses.csv = 'CSV／Excelに有効な行がありません。';
      renderTemplate();
      return;
    }
    try {
      var msg = applyLedgerParsed(parsed);
      var full = '\u2705 ' + msg;
      fileStatuses.csv = full;
      var s1 = document.getElementById('csvStatusStep1');
      if (s1) { s1.textContent = full; s1.style.color = 'var(--success)'; }
      renderAll();
    } catch(err) {
      fileStatuses.csv = 'CSV読み込みに失敗しました：' + err.message;
      renderTemplate();
    }
  });
}

// 台帳CSV／Excelを読み込み（後方処理用）
function handleLedgerLoadForBack(ev) {
  var file = fileFromEvent(ev);
  if (!file) {
    fileStatuses.csvStep5 = 'ファイルが選択されていません。';
    renderTemplate();
    return;
  }
  fileStatuses.csvStep5 = '';
  readLedgerFile(file, function(parsed, err) {
    if (err) {
      fileStatuses.csvStep5 = 'ファイル読み込みに失敗しました：' + err.message;
      renderTemplate();
      return;
    }
    if (!parsed || !parsed.rows.length) {
      fileStatuses.csvStep5 = 'CSV／Excelに有効な行がありません。';
      renderTemplate();
      return;
    }
    try {
      state.loadedLedgerHeaders = parsed.headers;
      state.loadedLedgerRows = parsed.rows;
      state.selectedLedgerIndexes = parsed.rows.map(function(_, i) { return i; });
      state.managerPaths = parsed.rows.map(function(r) { return r['管理者側フォルダパス'] || ''; });
      // 審査依頼書_添付資料の復元（apply専用）
      if (pageMode === 'apply' && parsed.rows[0]['審査依頼書添付資料']) {
        state.attachmentInputRaw = parsed.rows[0]['審査依頼書添付資料'];
        state.attachmentData = state.attachmentInputRaw.split(/[,、，:：;；\s\u3000]+/).map(function(x){return x.trim();}).filter(Boolean);
      }
      restoreMailFromLedger(parsed.rows[0]);
      syncRequestRowsFromSelectedLedger();
      fileStatuses.csvStep5 = '✅ 台帳CSV／Excelを読み込みました。対象行を選択してください。';
      renderAll();
    } catch(err) {
      fileStatuses.csvStep5 = 'CSV読み込みに失敗しました：' + err.message;
      renderTemplate();
    }
  });
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
  state.requestRows = [{type: '初回公表', base: '特2025-17_2-1', date: '', url: '', facilityType: '', facilityDetail: '', content: '', notes: ''}];
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
  if (pageMode === 'apply' && !headers.includes('承認日')) headers.splice(headers.indexOf('公表日') + 1, 0, '承認日');
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
  if (!headers.includes('メール件名')) headers.push('メール件名');
  if (!headers.includes('メール本文')) headers.push('メール本文');
  if (pageMode === 'apply') {
    if (!headers.includes('申請内容')) headers.push('申請内容');
    if (!headers.includes('備考')) headers.push('備考');
    if (!headers.includes('申請内容チェック')) headers.push('申請内容チェック');
    if (!headers.includes('審査依頼書添付資料')) headers.push('審査依頼書添付資料');
  }

  var sendDate = getValue('sendDate') || '';
  var draftDate = state.draftDate || todayFormatted();
  var paths = state.managerPaths || [];
  var mailDraft = getMailDraftRecord();
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
          '承認日': r.approval || '',
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
    var curRow = requestRowsData()[idx] || {};
    if (!obj['自施設他施設']) obj['自施設他施設'] = curRow.facilityType || '';
    if (!obj['報告詳細']) obj['報告詳細'] = curRow.facilityDetail || '';
    obj['メール件名'] = mailDraft.subject;
    obj['メール本文'] = mailDraft.body;
    if (pageMode === 'apply') {
      obj['申請内容'] = curRow.content || '';
      obj['備考'] = curRow.notes || '';
      obj['申請内容チェック'] = contentCheckToCsv(idx);
      obj['審査依頼書添付資料'] = state.attachmentInputRaw || '';
    }
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
// procedure.html（進捗管理CSV）からの引き継ぎ
// ============================================================

// 読み込んだ進捗管理CSVをsessionStorageへ保存（apply/publishへ引き継ぐ）
function saveLedgerToSession(parsed) {
  try {
    sessionStorage.setItem('kanriFlowLedgerCsv', JSON.stringify({
      headers: parsed.headers || [],
      rows: parsed.rows || []
    }));
  } catch(e) {}
}

// sessionStorageから進捗管理CSVを取得
function loadLedgerFromSession() {
  try {
    var raw = sessionStorage.getItem('kanriFlowLedgerCsv');
    if (!raw) return null;
    var data = JSON.parse(raw);
    if (!data || !data.rows || !data.rows.length) return null;
    return data;
  } catch(e) { return null; }
}

// sessionStorageの進捗管理CSVを破棄
function clearLedgerFromSession() {
  try { sessionStorage.removeItem('kanriFlowLedgerCsv'); } catch(e) {}
}

// procedure.htmlで読み込んだCSVを復元（1件なら即復元、複数件なら選択待ち）
function restoreFromSessionLedger() {
  var data = loadLedgerFromSession();
  if (!data) return;
  var parsed = {headers: data.headers || [], rows: data.rows || []};
  if (!parsed.rows.length) return;
  if (parsed.rows.length === 1) {
    fileStatuses.csv = '\u2705 ' + applyLedgerParsed(parsed);
    clearLedgerFromSession();
    return;
  }
  // 複数件は行選択UIで引き継ぐ行を選んでもらう
  state.loadedLedgerHeaders = parsed.headers;
  state.loadedLedgerRows = parsed.rows;
  state.selectedLedgerIndexes = [];
  state.pendingLedgerFromSession = true;
}

// 選択した行だけを復元
function applySelectedSessionLedger() {
  var idxs = (state.selectedLedgerIndexes || []).filter(function(i) { return state.loadedLedgerRows[i]; });
  if (!idxs.length) return;
  var selected = idxs.map(function(i) { return state.loadedLedgerRows[i]; });
  fileStatuses.csv = '\u2705 ' + applyLedgerParsed({headers: state.loadedLedgerHeaders, rows: selected});
  clearLedgerFromSession();
  state.pendingLedgerFromSession = false;
  state.loadedLedgerRows = [];
  state.loadedLedgerHeaders = [];
  state.selectedLedgerIndexes = [];
}

// 引き継ぎ行の選択をトグル（requestRows同期は行わない）
function toggleSessionLedgerSelection(idx, checked) {
  var set = new Set(state.selectedLedgerIndexes || []);
  if (checked) set.add(idx); else set.delete(idx);
  state.selectedLedgerIndexes = Array.from(set).sort(function(a, b) { return a - b; });
}

// すべての引き継ぎ行を選択
function selectAllSessionLedgerRows() {
  state.selectedLedgerIndexes = state.loadedLedgerRows.map(function(_, i) { return i; });
}

// 引き継ぎ行の選択をクリア
function clearSessionLedgerRows() {
  state.selectedLedgerIndexes = [];
}

// ============================================================
// ステップ3：既存台帳CSVへのデータ追記
// ============================================================

// CSVテキストをファイル名指定でダウンロード
function downloadCsvText(csv, filename) {
  var blob = new Blob(['\uFEFF' + csv], {type: 'text/csv;charset=utf-8'});
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// 既存台帳CSV／Excelデータの読み込み（ステップ3 追記用）
function handleAppendCsvLoad(ev) {
  var file = fileFromEvent(ev);
  if (!file) {
    fileStatuses.csv = 'ファイルが選択されていません。';
    renderTemplate();
    return;
  }
  readLedgerFile(file, function(parsed, err) {
    if (err) {
      fileStatuses.csv = 'ファイル読み込みに失敗しました：' + err.message;
      renderTemplate();
      return;
    }
    if (!parsed || !parsed.rows.length) {
      fileStatuses.csv = '読み込んだCSV／Excelにデータ行がありません。';
      renderTemplate();
      return;
    }
    state.appendLoadedCsv = {headers: parsed.headers, rows: parsed.rows, name: file.name};
    fileStatuses.csv = '\u2705 ' + parsed.rows.length + '件の既存データを読み込みました。「データを追加」で末尾に現在の案件データを追記してダウンロードできます。';
    renderAll();
  });
}

// 読み込んだ既存台帳CSVの末尾に現在の案件データを追記してダウンロード
function appendCurrentRowsToLoadedCsv() {
  if (!state.appendLoadedCsv) {
    fileStatuses.csv = '先に「台帳CSVデータの読み込み」ボタン（またはドラッグ＆ドロップ）で台帳CSVを読み込んでください。';
    renderAll();
    return;
  }
  var loaded = state.appendLoadedCsv;
  // 現在のフォーム情報から台帳CSVを生成し、ヘッダー付きオブジェクト行として取得
  var current = parseCsvRobust(csvFromRequests());
  var headers = loaded.headers;
  var rows = loaded.rows.map(function(r) { return Object.assign({}, r); });
  current.rows.forEach(function(cr) {
    var nr = {};
    headers.forEach(function(h) { nr[h] = cr[h] || ''; });
    rows.push(nr);
  });
  var csvText = headers.map(csvEscape).join(',') + '\n' + rows.map(function(r) {
    return headers.map(function(h) { return csvEscape(r[h] || ''); }).join(',');
  }).join('\n');
  var filename = ledgerCsvFileName().replace('.csv', '_追記済み.csv');
  downloadCsvText(csvText, filename);
  fileStatuses.csv = '\u2705 ' + loaded.rows.length + '件の既存データの末尾に現在の案件データ ' + current.rows.length + ' 行を追記してダウンロードしました。';
  renderAll();
}