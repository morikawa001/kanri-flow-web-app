/**
 * identifiers.js - 番号生成・依頼行管理
 * 臨床研究支援チーム管理画面
 */

var App = App || {};

App.identifiers = (function() {
  'use strict';

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
    var rows = App.state.data.requestRows;
    return rows && rows.length
      ? rows
      : [{type:'初回公表',base:'特2025-17_2-1',date:'',url:'',facilityType:'',facilityDetail:''}];
  }

  // 依頼行のフィールドを設定
  function setRequestRow(idx, key, val) {
    var state = App.state.data;
    if (!state.requestRows || !state.requestRows.length)
      state.requestRows = [{type:'初回公表',base:'特2025-17_2-1',date:'',url:''}];
    if (!state.requestRows[idx]) state.requestRows[idx] = {type:'初回公表',base:'特2025-17_2-1',date:'',url:'',facilityType:'',facilityDetail:''};
    state.requestRows[idx][key] = val;
  }

  // 依頼行の出力番号を計算（生成後の起案番号は元の起案番号と同じ）
  function requestOutputNo(r) {
    return r.base || '特2025-17_2-1';
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

  // 報告区分を出力カテゴリにマッピング
  function outputCategory(type) {
    var map = {
      '軽微変更': '申請',
      '変更': '申請',
      '定期報告': '定期報告',
      '一部公表': '申請',
      '初回公表': '申請',
      '不適合報告': '不適合',
      '疾病等報告（医療機器）': '医療機器'
    };
    return map[type] || type;
  }

  // 台帳行から依頼行オブジェクトを生成
  function rowFromLedger(r) {
    return {
      type: r['報告区分'] || '初回公表',
      base: r['元の起案番号'] || r['起案番号'] || '特2025-17_2-1',
      date: r['報告期間'] ? formatDateRangeToSlash(r['報告期間']) : normalizeToYmdSlash(r['公表日'] || ''),
      url: r['jRCT URL'] || '',
      facilityType: r['自施設他施設'] || '',
      facilityDetail: r['報告詳細'] || ''
    };
  }

  // 選択中の台帳行を取得
  function selectedLedgerRows() {
    var state = App.state.data;
    var idxs = (state.selectedLedgerIndexes || []).filter(function(i) {
      return state.loadedLedgerRows[i];
    });
    return idxs.map(function(i) { return state.loadedLedgerRows[i]; });
  }

  // 選択中台帳行から依頼行を同期
  function syncRequestRowsFromSelectedLedger() {
    var state = App.state.data;
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
    var count = (App.state.data.selectedLedgerIndexes || []).length;
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

  // 公開API
  return {
    incrementLastBranch: incrementLastBranch,
    branchSuffix: branchSuffix,
    requestRowsData: requestRowsData,
    setRequestRow: setRequestRow,
    requestOutputNo: requestOutputNo,
    combinedDraftReportPrefix: combinedDraftReportPrefix,
    outputCategory: outputCategory,
    rowFromLedger: rowFromLedger,
    selectedLedgerRows: selectedLedgerRows,
    syncRequestRowsFromSelectedLedger: syncRequestRowsFromSelectedLedger,
    ledgerSelectionSummary: ledgerSelectionSummary,
    reportType: reportType,
    effectiveReportNo: effectiveReportNo
  };
})();
