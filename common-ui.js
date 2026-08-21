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
  var frontTitle = isApply ? '申請管理者報告起案：入口入力から台帳CSV・フォルダZIP作成まで' : '公表管理者報告起案：入口入力から台帳CSV・フォルダZIP作成まで';
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
// applyページは報告区分を新規申請・変更申請・その他で表示する（内部値は従来のまま）
function reportTypeLabel(t) {
  if (pageMode !== 'apply') return t;
  return {'初回公表':'新規申請','変更':'変更申請'}[t] || t;
}
function reportTypeFromLabel(label) {
  if (pageMode !== 'apply') return label;
  return {'新規申請':'初回公表','変更申請':'変更'}[label] || label;
}
// publish：初回公表を選択した場合に依頼1〜3の各報告区分の横へ付けるガイド文言（依頼4以降は対象外）
function publishFirstTypeGuide(type, i) {
  if (pageMode !== 'publish') return '';
  var firstPub = (state.requestRows || []).some(function(x) { return x.type === '初回公表'; });
  if (!firstPub) return '';
  if (i > 2) return '';
  return {'初回公表':'新規申請の倫理審査委員会（CRB）承認','変更':'倫理審査委員会（CRB）承認日：認定臨床研究審査委員会の承認日の変更等','軽微変更':'新規申請の管理者承認取得：研究計画書・説明同意文書への承認日追記に伴う版更新'}[type] || '';
}
function renderRequestRows(hostOverride) {
  var hosts = hostOverride
    ? [hostOverride]
    : Array.from(document.querySelectorAll('#multiRequestHost'));
  if (!hosts.length) return;
  var primaryHost = hostOverride || hosts[0];
  if (!state.requestRows || !state.requestRows.length)
    state.requestRows = [{type: (pageMode === 'publish' ? '' : '初回公表'), base: '特2025-17_2-1', date: '', url: '', facilityType: '', facilityDetail: '', content: '', notes: ''}];
  var requestHtml = requestRowsData().map(function(r, i) {
    var isPeriodic = r.type === '定期報告';
    var typeGuide = publishFirstTypeGuide(r.type, i);
    var hidePubFields = pageMode === 'publish' && (state.requestRows || []).some(function(x) { return x.type === '初回公表'; }) && (i === 1 || i === 2);
    var isApply = pageMode === 'apply';
    var dateLabel = isPeriodic ? '報告期間' : '公表日';
    var isSummaryPublishPartial = r.type === '主要評価項目報告書又は総括報告書の概要の公表（一部公表）';
    var dateLabelNote = isSummaryPublishPartial ? '<span style="color:var(--warn)">※メールに記載されている届出日を入力</span>' : '';
    var datePlaceholder = isPeriodic ? '例：2026/4/5～2026/9/30' : '例：2026/7/5';
    var dateField = isApply
      ? '<div class="field"><label>承認日</label>' +
        '<input class="input" data-r-approval="' + i + '" value="' + h(formatDateToJapanese(r.approval||'')) + '" placeholder="例：2026年7月5日">' +
        '</div>'
      : (hidePubFields ? '' : '<div class="field"><label>' + dateLabel + dateLabelNote + '</label>' +
        '<input class="input" data-r-date="' + i + '" value="' + h(isPeriodic ? formatDateRangeToSlash(r.date || '') : normalizeToYmdSlash(r.date || '')) + '" placeholder="' + datePlaceholder + '"' + (isPeriodic ? ' pattern="\\d{4}/\\d{1,2}/\\d{1,2}～\\d{4}/\\d{1,2}/\\d{1,2}" title="形式：yyyy/m/d～yyyy/m/d"' : '') + '>' +
        (isPeriodic ? '<div class="help" style="color:var(--primary)">形式：yyyy/m/d～yyyy/m/d（最初の日付入力後に「～」が自動挿入されます）</div>' : '') +
        '</div>');
    var urlField = isApply || hidePubFields
      ? ''
      : '<div class="field" style="margin-top:.7rem"><label>jRCT URL</label>' +
        '<input class="input" data-r-url="' + i + '" value="' + h(r.url || '') + '" placeholder="https://jrct...">' +
        '</div>';
    return '<div class="template-card request-row" style="padding:.8rem;margin-top:.55rem">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;gap:.5rem;margin-bottom:.55rem">' +
      '<strong style="font-size:.82rem">依頼 ' + (i + 1) + '</strong>' +
      '<button type="button" class="ghost-btn remove-request" data-remove="' + i + '" style="min-height:30px;padding:0 .7rem;font-size:.72rem">削除</button>' +
      '</div>' +
      '<div class="grid-2">' +
      '<div class="field"><label>報告区分</label>' +
      '<select class="select" data-r-type="' + i + '">' +
      (pageMode === 'publish' ? '<option value=""' + (r.type ? '' : ' selected') + '>報告区分選択</option>' : '') +
      (pageMode === 'apply' ? ['新規申請','変更申請','その他'] : ['初回公表','変更','軽微変更','届出外','疾病等報告（医薬品）','疾病等報告（医療機器）','疾病等報告（再生医療等製品）','不適合報告','主要評価項目報告書等の通知','主要評価項目報告書又は総括報告書の概要の公表','主要評価項目報告書又は総括報告書の概要の公表（一部公表）','審査意見の報告','定期報告','終了','その他']).map(function(opt) {
        return '<option ' + (reportTypeLabel(r.type) === opt ? 'selected' : '') + '>' + opt + '</option>';
      }).join('') +
      '</select>' +
      (typeGuide ? '<div class="help" style="color:var(--primary);margin-top:.35rem">' + typeGuide + '</div>' : '') +
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
      dateField +
      '</div>' +
      urlField +
      (pageMode === 'apply' ? '<div class="field" style="margin-top:.7rem"><label>申請内容</label>' +
      '<textarea class="input" data-r-content="' + i + '" style="min-height:80px;resize:vertical" placeholder="申請内容を入力">' + h(r.content || '') + '</textarea>' +
      '<div class="help">起案の申請内容欄に記載する内容に修正してください。</div>' +
      '</div>' +
      '<div class="field" style="margin-top:.7rem"><label>備考</label>' +
      '<div style="display:flex;gap:.5rem;align-items:center;flex-wrap:wrap">' +
      '<select class="select" data-r-notes-preset="' + i + '" style="flex:0 0 200px">' +
      '<option value="">備考の定型文を選択</option>' +
      '<option value="all-sites" ' + (r.notesPreset === 'all-sites' ? 'selected' : '') + '>全施設分提供される場合</option>' +
      '<option value="scc-unchanged" ' + (r.notesPreset === 'scc-unchanged' ? 'selected' : '') + '>静がんの変更なしの場合</option>' +
      '<option value="scc-only" ' + (r.notesPreset === 'scc-only' ? 'selected' : '') + '>静がん分のみ提供される場合</option>' +
      '<option value="not-provided" ' + (r.notesPreset === 'not-provided' ? 'selected' : '') + '>提供されない場合</option>' +
      '<option value="free" ' + (r.notesPreset === 'free' ? 'selected' : '') + '>自由記載</option>' +
      '</select>' +
      '<input class="input" data-r-notes="' + i + '" value="' + h(r.notes || '') + '" placeholder="備考を入力" style="flex:1 1 180px">' +
      '</div>' +
      '</div>' : '') +
      '<div class="help">1行ごとに「報告区分」と「元の起案番号」を入力すると、生成後の起案番号が自動計算されます。</div>' +
      '</div>';
  }).join('')
    + '<div style="margin-top:.7rem"><button type="button" class="primary-btn" id="addRequestBtn">＋ 依頼行を追加</button></div>';

  hosts.forEach(function(host) { host.innerHTML = requestHtml; });

  primaryHost.querySelectorAll('[data-r-type]').forEach(function(el) {
    el.addEventListener('change', function() {
      var i = +el.dataset.rType;
      var newType = reportTypeFromLabel(el.value);
      setRequestRow(i, 'type', newType);
      // publish：初回公表を選択したら変更・軽微変更の依頼行を自動追加し、確認メッセージを表示
      if (pageMode === 'publish' && newType === '初回公表') {
        var types = (state.requestRows || []).map(function(x) { return x.type; });
        var baseRef = (state.requestRows[i] && state.requestRows[i].base) || '特2025-17_2-1';
        if (types.indexOf('変更') === -1) state.requestRows.push({type: '変更', base: baseRef, date: '', url: '', facilityType: '', facilityDetail: ''});
        if (types.indexOf('軽微変更') === -1) state.requestRows.push({type: '軽微変更', base: baseRef, date: '', url: '', facilityType: '', facilityDetail: ''});
        alert('初回公表の場合は下の３つを１つの管理者報告として扱う\n初回公表：新規申請の倫理審査委員会（CRB）承認\n変更：倫理審査委員会（CRB）承認日：認定臨床研究審査委員会の承認日の変更等\n軽微変更：新規申請の管理者承認取得：研究計画書・説明同意文書への承認日追記に伴う版更新');
      }
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

  // data-r-url / data-r-approval / data-r-content / data-r-notes の共通バインド
  function bindRowSimple(attrSuffix, key) {
    primaryHost.querySelectorAll('[data-r-' + attrSuffix + ']').forEach(function(el) {
      el.addEventListener('input', function() {
        setRequestRow(+el.dataset['r' + attrSuffix[0].toUpperCase() + attrSuffix.slice(1)], key, el.value);
        renderTemplate();
      });
      el.addEventListener('change', function() {
        setRequestRow(+el.dataset['r' + attrSuffix[0].toUpperCase() + attrSuffix.slice(1)], key, el.value);
        renderAll();
      });
    });
  }
  bindRowSimple('url', 'url');
  bindRowSimple('approval', 'approval');
  bindRowSimple('content', 'content');
  bindRowSimple('notes', 'notes');
  // 備考の定型文プルダウン（applyのみ・選択内容を備考欄へ反映）
  primaryHost.querySelectorAll('[data-r-notes-preset]').forEach(function(el) {
    el.addEventListener('change', function() {
      var i = +el.dataset.rNotesPreset;
      var presetTexts = {
        'all-sites': '他施設の分担医師リスト及びCOI様式Eは添付を省略する。データは保管済。',
        'scc-unchanged': '当院に変更はなく、他施設の分担医師リスト及びCOI様式Eのみの提供であったため添付を省略する。データは保管済。',
        'scc-only': '他施設の分担医師リスト及びCOI様式Eは提供されていない。',
        'not-provided': '分担医師リスト及びCOI様式Eは提供されていない。'
      };
      var val = el.value;
      setRequestRow(i, 'notesPreset', val);
      setRequestRow(i, 'notes', val === 'free' ? '' : (presetTexts[val] || ''));
      renderAll();
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
      var row = state.requestRows[i];
      var val = row && row.type === '定期報告' ? formatDateRangeToSlash(el.value) : normalizeToYmdSlash(el.value);
      el.value = val;
      setRequestRow(i, 'date', val);
      renderAll();
    });
  });
  primaryHost.querySelectorAll('.remove-request').forEach(function(btn) {
    btn.addEventListener('click', function() {
      var i = +btn.dataset.remove;
      state.requestRows.splice(i, 1);
      if (!state.requestRows.length)
        state.requestRows = [{type: (pageMode === 'publish' ? '' : '初回公表'), base: '特2025-17_2-1', date: '', url: '', facilityType: '', facilityDetail: '', content: '', notes: ''}];
      renderAll();
    });
  });
  primaryHost.querySelector('#addRequestBtn')?.addEventListener('click', function() {
    state.requestRows.push({type: (pageMode === 'publish' ? '' : '変更'), base: '特2025-17_2-1', date: '', url: '', facilityType: '', facilityDetail: '', content: '', notes: ''});
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
// ステップ4で編集した想定ファイル名の保管（「行インデックス:項目インデックス」→カスタム名）
var fileNameOverrides = {};
function namingRulesForRow(r, rowIdx) {
  var category = r?.type || '初回公表';
  var items = NAMING_MASTER.filter(function(x) { return x.category === category; });
  var prefix = String(requestOutputNo(r) || '').trim();
  rowIdx = rowIdx || 0;

  if (!items.length) {
    return {
      category: category,
      html: '<div class="help">この公表区分の命名規則はまだ未登録です。</div>',
      requiredCount: 0
    };
  }

  var html = items.map(function(it, idx) {
    var parts = it.pattern.slice();
    // applyでは「公表」を「変更」表記にする（publishは従来どおり）
    if (pageMode === 'apply') {
      parts = parts.map(function(p) { return p === '公表' ? '変更' : p; });
    }
    if (parts.length >= 3) {
      parts[2] = seqLabel(parts[2]);
    }
    var defaultFilename = [prefix].concat(parts.slice(1)).join('_') + '.' + (it.ext || 'pdf');
    var filename = fileNameOverrides[rowIdx + ':' + idx] || defaultFilename;

    return '<div class="template-card">' +
      '<h4>' + (idx + 1) + '. ' + h(it.source) + '</h4>' +
      '<div class="mono">' +
      '必須：' + (it.required ? 'はい' : '状況により') + '（' + h(category) + '）' +
      '</div>' +
      '<div class="field" style="margin-top:.4rem"><label>想定ファイル名（編集可）</label>' +
      '<input class="input" data-file-name="' + rowIdx + ':' + idx + '" value="' + h(filename) + '">' +
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

  // 編集した想定ファイル名（データファイル名）を保管・コピーボタンへ反映
  document.querySelectorAll('[data-file-name]').forEach(function(input) {
    input.addEventListener('input', function() {
      var key = input.dataset.fileName;
      var val = input.value;
      fileNameOverrides[key] = val;
      var card = input.closest('.template-card');
      var btn = card && card.querySelector('[data-copy-filename]');
      if (btn) btn.setAttribute('data-filename', val.replace(/\.[^.]+$/, ''));
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