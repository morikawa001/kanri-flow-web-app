// ============================================================
// docx関連
// ============================================================

// docxテンプレート読み込みの汎用ヘルパー
function loadDocxTemplate(ev, cfg) {
  var file = ev && ev.target && ev.target.files && ev.target.files[0];
  var statusKey = cfg.statusKey;
  var statusElId = cfg.statusElId;
  if (!file) {
    fileStatuses[statusKey] = 'ファイルが選択されていません。';
    var el0 = document.getElementById(statusElId);
    if (el0) el0.textContent = fileStatuses[statusKey];
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    cfg.onLoad(e.target.result, file);
    var el = document.getElementById(statusElId);
    if (el) el.textContent = fileStatuses[statusKey];
  };
  reader.onerror = function() {
    fileStatuses[statusKey] = 'テンプレート読込に失敗しました。';
    var el = document.getElementById(statusElId);
    if (el) el.textContent = fileStatuses[statusKey];
  };
  reader.readAsArrayBuffer(file);
}

// docxテンプレート読み込みハンドラ（報告案）
function handleReportTemplateDocxLoad(ev) {
  loadDocxTemplate(ev, {
    statusKey: 'reportDocx',
    statusElId: 'reportDocxTemplateStatus',
    onLoad: function(result, file) {
      reportTemplateDocxBuffer = result;
      reportTemplateDocxName = file.name || '報告案テンプレート.docx';
      fileStatuses.reportDocx = '✅ ひな形（' + reportTemplateDocxName + '）を読み込みました。';
    }
  });
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
  var summaryPublishRow = relatedRows.find(function(x) { return x?.type === '主要評価項目報告書又は総括報告書の概要の公表' || x?.type === '主要評価項目報告書又は総括報告書の概要の公表（一部公表）'; }) || null;
  var summaryPublishPartialRow = firstRowOfType('主要評価項目報告書又は総括報告書の概要の公表（一部公表）');
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
  var isSummaryPublish = hasType('主要評価項目報告書又は総括報告書の概要の公表') || hasType('主要評価項目報告書又は総括報告書の概要の公表（一部公表）');
  var isReviewOpinion = hasType('審査意見の報告');
  var isOther = hasType('その他');

  return {
    '所属': safeDocxText(getValue('managerAffil1') || ''),
    '所属部署': safeDocxText(getValue('managerDept1') || ''),
    '職名': safeDocxText(getValue('managerTitle1') || ''),
    '氏名': safeDocxText(getValue('managerName1') || ''),
    '研究題名': safeDocxText(getValue('studyTitle') || ''),
    '研究区分': safeDocxText(docxStudyCategoryLabel()),
    'jRCT番号': safeDocxText(getValue('jrctNo') || ''),
    '元の起案番号': safeDocxText(relatedRows.map(function(x) { return x?.base || ''; }).filter(Boolean).join('\n')),
    '申請内容': safeDocxText(docxContentForPrint(relatedRows)),
    '備考': safeDocxText(relatedRows.map(function(x) { return x?.notes || ''; }).filter(Boolean).join('\n')),
    '作成年': safeDocxText(today.year),
    '作成月': safeDocxText(today.month),
    '作成日': safeDocxText(today.day),

    '公表日': joinDocxLines([
      initialRow ? formatDateToJapanese(initialRow.date || '') : '',
      changeRow ? formatDateToJapanese(changeRow.date || '') : '',
      minorRow ? formatDateToJapanese(minorRow.date || '') : '',
      todokedeGaiRow ? formatDateToJapanese(todokedeGaiRow.date || '') : ''
    ]),

    '承認日': (pageMode === 'apply') ? formatDateToJapanese(relatedRows[0]?.approval || '') : '',

    '研究種別_特定': mark(isSpecific),
    '特定内訳_未承認適応外': mark(isSpecific && isUnapproved),
    '特定内訳_資金提供': mark(isSpecific && isFunding),
    '研究種別_非特定': mark(isNonspecific),

    '報告事項_実施計画公表': mark(!!initialRow || !!changeRow || !!minorRow),
    '公表区分_新規': mark(!!initialRow),
    '新規公表日': formatDateToJapanese(initialRow?.date || ''),
    '新規URL': safeDocxText(initialRow?.url || ''),
    '公表区分_上位変更': (pageMode === 'apply') ? ((changeRow || minorRow) ? '■' : '□') : (changeRow ? '■' : '□'),
    '公表区分_下位変更': changeRow ? '■' : '□',
    '変更公表日': formatDateToJapanese(changeRow?.date || ''),
    '変更URL': safeDocxText(changeRow?.url || ''),
    '公表区分_軽微': (pageMode === 'apply') ? (minorRow ? '■' : '□') : mark(!!minorRow),
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
        parts.push('実施計画の公表（' + pubPairs.map(function(arr) { return padFullWidth(arr[0], maxW) + '　' + normalizeToYmdSlash(arr[1]?.date || ''); }).join('、') + '）');
      }
      if (hasPeriodic) {
        var periodicRow = relatedRows.find(function(x) { return x?.type === '定期報告'; });
        if (periodicRow?.date) {
          parts.push('定期報告（報告期間：' + formatDateRangeToSlash(periodicRow.date) + '）');
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
      var pubPairs = [['初回公表', initialRow], ['変更', changeRow], ['軽微変更', minorRow], ['主要評価項目報告書等の通知', mainResultNotifyRow], ['主要評価項目報告書又は総括報告書の概要の公表', summaryPublishRow]].filter(function(arr) { return arr[1]; });
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

// docx出力前の共通ガード（ひな形・ライブラリ確認）。成功時はtrue
function docxExportGuard(buffer, statusKey, noTemplateMsg) {
  if (!buffer) {
    fileStatuses[statusKey] = noTemplateMsg;
    renderTemplate();
    return false;
  }
  if (!ensureDocxLibReady()) {
    fileStatuses[statusKey] = 'docx差し込みライブラリの読み込みに失敗しました。';
    renderTemplate();
    return false;
  }
  return true;
}

// 報告案docxをダウンロード
async function downloadReportDocxForRow(idx) {
  if (!docxExportGuard(reportTemplateDocxBuffer, 'reportDocx', '先に報告案ひな形（.docx）を読み込んでください。')) return;
  var r = requestRowsData()[idx];
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
  if (!docxExportGuard(reportTemplateDocxBuffer, 'reportDocx', '先に報告案ひな形（.docx）を読み込んでください。')) return;
  var r = requestRowsData()[0];
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
  loadDocxTemplate(ev, {
    statusKey: 'docx',
    statusElId: 'docxTemplateStatus',
    onLoad: function(result, file) {
      templateDocxBuffer = result;
      templateDocxName = file.name || '起案テンプレート.docx';
      fileStatuses.docx = '✅ ひな形（' + templateDocxName + '）を読み込みました。';
    }
  });
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
  var mainResultNotifyRow = firstRowOfType('主要評価項目報告書等の通知');
  var summaryPublishRow = targetRows.find(function(x) { return x?.type === '主要評価項目報告書又は総括報告書の概要の公表' || x?.type === '主要評価項目報告書又は総括報告書の概要の公表（一部公表）'; }) || null;
  var summaryPublishPartialRow = firstRowOfType('主要評価項目報告書又は総括報告書の概要の公表（一部公表）');

  var reportPairs = [
    ['初回公表', initialRow],
    ['変更', changeRow],
    ['軽微変更', minorRow],
    ['届出外', todokedeGaiRow]
  ].filter(function(arr) { return arr[1]; });

  return {
    '所属部門': safeDocxText(getValue('drafterDept') || ''),
    '起案者職名': safeDocxText(getValue('drafterTitle') || ''),
    '起案者名': safeDocxText(getValue('drafterName') || ''),
    '所属': safeDocxText(getValue('managerAffil1') || ''),
    '所属部署': safeDocxText(getValue('managerDept1') || ''),
    '職名': safeDocxText(getValue('managerTitle1') || ''),
    '氏名': safeDocxText(getValue('managerName1') || ''),
    '研究題名': safeDocxText(getValue('studyTitle') || ''),
    '研究区分': safeDocxText(docxStudyCategoryLabel()),
    'jRCT番号': safeDocxText(getValue('jrctNo') || ''),
    '元の起案番号': safeDocxText(targetRows.map(function(x) { return x?.base || ''; }).filter(Boolean).join('\n')),
    '申請内容': safeDocxText(docxContentForPrint(targetRows)),
    '備考': safeDocxText(targetRows.map(function(x) { return x?.notes || ''; }).filter(Boolean).join('\n')),

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

    '承認日': (pageMode === 'apply') ? formatDateToJapanese(requestRowsData()[0]?.approval || '') : '',

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
        parts.push('実施計画の公表（' + pubPairs.map(function(arr) { return padFullWidth(arr[0], maxW) + '　' + normalizeToYmdSlash(arr[1]?.date || ''); }).join('、') + '）');
      }
      if (hasPeriodic) {
        var periodicRow = targetRows.find(function(x) { return x?.type === '定期報告'; });
        if (periodicRow?.date) {
          parts.push('定期報告（報告期間：' + formatDateRangeToSlash(periodicRow.date) + '）');
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
      var pubPairs = [['初回公表', initialRow], ['変更', changeRow], ['軽微変更', minorRow], ['主要評価項目報告書等の通知', mainResultNotifyRow], ['主要評価項目報告書又は総括報告書の概要の公表', summaryPublishRow]].filter(function(arr) { return arr[1]; });
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

// docx条件分岐を前処理（タグが複数のw:tに分かれていても対応、publish側のみ（公表日：）を丸ごと非表示）
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
  // apply側は従来通り（公表日：）を表示し続けるためpublishのみ処理
  if ((typeof pageMode === 'undefined') || pageMode !== 'publish') return buffer;

  // 実体参照を含む文字列を1文字ずつXML上のoffset付きで分割
  function parseXmlTextChars(text) {
    var entities = {
      '&amp;': '&',
      '&lt;': '<',
      '&gt;': '>',
      '&quot;': '"',
      '&apos;': "'",
      '&nbsp;': ' '
    };
    var res = [];
    var i = 0;
    while (i < text.length) {
      var matched = null;
      for (var e in entities) {
        if (text.slice(i, i + e.length) === e) { matched = e; break; }
      }
      if (matched) {
        res.push({ch: entities[matched], start: i, len: matched.length});
        i += matched.length;
      } else {
        res.push({ch: text.charAt(i), start: i, len: 1});
        i++;
      }
    }
    return res;
  }

  var editsPerFile = {};
  xmlPaths.forEach(function(path) {
    var xml = zip.file(path).asText();
    var inserts = [];

    // 段落ごとにw:t文字列を連結し、各文字の絶対XML offsetを対応付ける
    var pRe = /<w:p\b[^>]*>[\s\S]*?<\/w:p>/g;
    var pm;
    while ((pm = pRe.exec(xml)) !== null) {
      var pXml = pm[0];
      var pStart = pm.index;
      var chars = []; // {ch:文字, start:絶対offset, len:XML上の長さ}
      var runs = [];  // 各w:t {begin, end}（fallback用）
      var tRe = /<w:t\b[^>]*?>([\s\S]*?)<\/w:t>/g;
      var tm;
      var openRe = /^<w:t\b[^>]*?>/;
      while ((tm = tRe.exec(pXml)) !== null) {
        var openTagLen = 0;
        var om = openRe.exec(tm[0]);
        if (om) openTagLen = om[0].length;
        var contentBegin = pStart + tm.index + openTagLen;
        var contentEnd = pStart + tm.index + tm[0].length - '</w:t>'.length;
        runs.push({begin: contentBegin, end: contentEnd});
        var local = parseXmlTextChars(tm[1]);
        for (var li = 0; li < local.length; li++) {
          chars.push({ch: local[li].ch, start: contentBegin + local[li].start, len: local[li].len});
        }
      }
      if (!chars.length) continue;

      var fullText = chars.map(function(c) { return c.ch; }).join('');

      for (var ki = 0; ki < emptyKeys.length; ki++) {
        var key = emptyKeys[ki];
        var tag = '{{' + key + '}}';
        var pos = 0;
        while (pos < fullText.length) {
          var tagIdx = fullText.indexOf(tag, pos);
          if (tagIdx === -1) break;
          pos = tagIdx + tag.length;

          // 直前の（ ）を探す（）があれば途中の（は無視）
          var leftParenIdx = -1;
          for (var i = tagIdx - 1; i >= 0; i--) {
            if (fullText.charAt(i) === '\uFF09') break;
            if (fullText.charAt(i) === '\uFF08') { leftParenIdx = i; break; }
          }
          var rightParenIdx = -1;
          for (var j = tagIdx + tag.length; j < fullText.length; j++) {
            if (fullText.charAt(j) === '\uFF08') break;
            if (fullText.charAt(j) === '\uFF09') { rightParenIdx = j; break; }
          }

          if (leftParenIdx !== -1 && rightParenIdx !== -1 &&
              chars[leftParenIdx] && chars[rightParenIdx]) {
            // （公表日：{{key}}）→ {{#key}}（公表日：{{key}}）{{/key}}
            inserts.push({pos: chars[leftParenIdx].start, text: '{{#' + key + '}}'});
            inserts.push({pos: chars[rightParenIdx].start + chars[rightParenIdx].len, text: '{{/' + key + '}}'});
          } else {
            // 括弧で囲われていない場合はタグを含むw:t全体を条件化（従来挙動の維持）
            var firstC = chars[tagIdx];
            var lastC = chars[tagIdx + tag.length - 1];
            if (!firstC || !lastC) continue;
            var repBegin = null;
            var repEnd = null;
            for (var r = 0; r < runs.length; r++) {
              if (firstC.start >= runs[r].begin && firstC.start < runs[r].end &&
                  (repBegin === null || runs[r].begin < repBegin)) repBegin = runs[r].begin;
              if (lastC.start >= runs[r].begin && lastC.start < runs[r].end &&
                  (repEnd === null || runs[r].end > repEnd)) repEnd = runs[r].end;
            }
            if (repBegin !== null && repEnd !== null) {
              inserts.push({pos: repBegin, text: '{{#' + key + '}}'});
              inserts.push({pos: repEnd, text: '{{/' + key + '}}'});
            }
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

    // 同じ位置に複数の挿入が重なった場合は1つにまとめる（閉じタグを開きタグより先に出す）
    var byPos = {};
    for (var ii = 0; ii < inserts.length; ii++) {
      var ins = inserts[ii];
      if (!byPos[ins.pos]) byPos[ins.pos] = [];
      byPos[ins.pos].push(ins.text);
    }
    var posKeys = Object.keys(byPos).map(Number).sort(function(a, b) { return b - a; });
    for (var pi = 0; pi < posKeys.length; pi++) {
      var texts = byPos[posKeys[pi]];
      texts.sort(function(a, b) {
        if (a.indexOf('{{/') === 0 && b.indexOf('{{#') === 0) return -1;
        if (a.indexOf('{{#') === 0 && b.indexOf('{{/') === 0) return 1;
        return 0;
      });
      var combined = texts.join('');
      xml = xml.substring(0, posKeys[pi]) + combined + xml.substring(posKeys[pi]);
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

// 連番を2桁ゼロ埋めラベルに整形（数値は先頭0埋め、それ以外はそのまま）
function seqLabel(v) {
  var n = String(v || '').trim();
  var m = n.match(/^(\d+)(?:\.\d+)?$/);
  return m ? m[1].padStart(2, '0') : n;
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
  pairs.forEach(function(arr) { data.push([arr[0], normalizeToYmdSlash(arr[1].date || ''), arr[1].url || '', requestOutputNo(arr[1])]); });
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
  var parts = naming.pattern.slice();
  if (parts.length >= 3) parts[2] = seqLabel(parts[2]);
  return [prefix].concat(parts.slice(1)).join('_') + '.xlsx';
}

// 起案文docxをダウンロード
async function downloadDraftDocxForRow(idx) {
  if (!docxExportGuard(templateDocxBuffer, 'docx', '先に起案文ひな形（.docx）を読み込んでください。')) return;
  var r = requestRowsData()[idx];
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
  if (!docxExportGuard(templateDocxBuffer, 'docx', '先に起案文ひな形（.docx）を読み込んでください。')) return;
  var r = requestRowsData()[0];
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