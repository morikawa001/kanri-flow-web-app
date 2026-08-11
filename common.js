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