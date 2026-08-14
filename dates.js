/**
 * dates.js - 日付ユーティリティ
 * 臨床研究支援チーム管理画面
 */

var App = App || {};

App.dates = (function() {
  'use strict';

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

  // 日付をYYYY年MM月DD日形式に変換
  function formatDateToJapanese(v) {
    var s = String(v || '').trim();
    if (!s) return '';
    var m = s.match(/(\d{4})[\/\-年](\d{1,2})[\/\-月](\d{1,2})/);
    if (m) return m[1] + '年' + parseInt(m[2]) + '月' + parseInt(m[3]) + '日';
    return s;
  }

  // 日付範囲（～区切り）を日本語形式に変換
  function formatDateRangeToJapanese(v) {
    var s = String(v || '').trim();
    if (!s) return '';
    var parts = s.split(/[～~〜]/);
    if (parts.length === 2) {
      return formatDateToJapanese(parts[0]) + '～' + formatDateToJapanese(parts[1]);
    }
    return formatDateToJapanese(s);
  }

  // 日付範囲をスラッシュ形式に正規化
  function formatDateRangeToSlash(v) {
    var s = String(v || '').trim();
    if (!s) return '';
    var parts = s.split(/[～~〜]/);
    if (parts.length === 2) {
      return normalizeToYmdSlash(parts[0]) + '～' + normalizeToYmdSlash(parts[1]);
    }
    return normalizeToYmdSlash(s);
  }

  // DOCX用の年月日部分を取得
  function currentDocxDateParts() {
    var draftDate = App.state.data.draftDate || todayFormatted();
    var m = String(draftDate).match(/(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
    if (m) {
      return {
        year: m[1],
        month: parseInt(m[2]),
        day: parseInt(m[3])
      };
    }
    var d = new Date();
    return {
      year: String(d.getFullYear()),
      month: d.getMonth() + 1,
      day: d.getDate()
    };
  }

  // 公開API
  return {
    datePrefix: datePrefix,
    todayYmd: todayYmd,
    todayFormatted: todayFormatted,
    normalizeToYmdSlash: normalizeToYmdSlash,
    formatDateToJapanese: formatDateToJapanese,
    formatDateRangeToJapanese: formatDateRangeToJapanese,
    formatDateRangeToSlash: formatDateRangeToSlash,
    currentDocxDateParts: currentDocxDateParts
  };
})();
