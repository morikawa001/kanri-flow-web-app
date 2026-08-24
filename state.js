/**
 * state.js - アプリケーション状態管理
 * 臨床研究支援チーム管理画面 - ステージ定義・状態管理
 */

var App = App || {};

App.state = (function() {
  'use strict';

  // ステージ定義
  var stages = [
    {
      id:'intake',num:1,title:'案件受付・入口入力',
      desc:'管理メールから研究課題名・研究責任者・研究区分を入力します。CRBへの申請に必要な情報を集め、後工程の起案文・申請書類・メール案にそのまま反映されます。',
      tags:['共通情報の入力','CSVで再開可能','JRCT自動入力'],
      checks:[
        ['管理メールを確認した','CRB申請依頼のメールを確認する'],
        ['研究課題名・略称を入力した','起案文・申請書類・メール件名に共通して使う情報'],
        ['研究責任者を入力した','所属・職名・氏名を最大2名分、報告メールの宛先に利用する'],
        ['研究区分を選択した','特定 or 非特定臨床研究。未承認・適応外・資金提供も該当する場合チェック'],
        ['報告区分を確認した','依頼行の報告区分（新規申請／変更申請など）を確認する'],
      ],
      notes:[
        ['warn','入口で入力した情報は以降の全ステップで自動利用されるため、省略すると後工程で再入力が必要になる。'],
        ['info','台帳CSVを読み込むと、過去の案件情報がすべて復元され、続きから再開できる。']
      ],
      fields:[
        {id:'mailSubject',label:'研究略称',type:'text',placeholder:'例：STANDARD-SG'},
        {id:'studyTitle',label:'研究課題名',type:'text',placeholder:'例：〇〇に関する特定臨床研究'},
        {id:'jrctNo',label:'jRCT番号',type:'text',placeholder:'例：jRCTs042250017'},
        {id:'managerAffil1',label:'研究責任者1 所属機関',type:'text',placeholder:'例：○○病院'},
        {id:'managerDept1',label:'研究責任者1 所属部署',type:'text',placeholder:'例：呼吸器内科'},
        {id:'managerTitle1',label:'研究責任者1 職名',type:'text',placeholder:'例：病院長'},
        {id:'managerName1',label:'研究責任者1 氏名',type:'text',placeholder:'例：〇〇 〇〇'},
        {id:'managerAffil2',label:'研究責任者2 所属機関',type:'text',placeholder:'例：○○大学'},
        {id:'managerDept2',label:'研究責任者2 所属部署',type:'text',placeholder:'例：呼吸器内科'},
        {id:'managerTitle2',label:'研究責任者2 職名',type:'text',placeholder:'例：教授'},
        {id:'managerName2',label:'研究責任者2 氏名',type:'text',placeholder:'例：〇〇 〇〇'},
        {id:'draftDate',label:'申請管理者報告_起案日',type:'text',placeholder:'yyyy/mm/dd（自動入力されます）'},
        {id:'drafterTitle',label:'起案・申請書類の起案者職名',type:'text',placeholder:'例：師長',options:['師長','副看護師長','事務員']},
        {id:'drafterName',label:'起案・申請書類の起案者',type:'text',placeholder:'例：森川 〇〇'},
        {id:'drafterDept',label:'所属・部門名',type:'text',placeholder:'例：臨床研究支援部門',options:['臨床研究管理・調整室']},
      ],
      next:'次：フォルダ名を確認する',
    },
    {
      id:'folders',num:2,title:'フォルダ名を確認',
      desc:'ステップ1の依頼行ごとに、申請フォルダ・CSCC側申請フォルダ・管理者側申請フォルダの3種類が自動生成されます。起案番号をそのまま使うため手入力は不要です。',
      tags:['フォルダ名自動生成','3種類を確認','手入力不要'],
      checks:[
        ['申請フォルダ名を確認した','例：特2025-17_2-1_変更'],
        ['CSCC側申請フォルダ名を確認した','例：特2025-17_2-2_変更(cscc)'],
        ['管理者側申請フォルダ名を確認した','例：特2025-17_2-2_変更'],
      ],
      notes:[
        ['info','管理者側フォルダの実パス（NAS上の場所）は、ステップ6で最終確定する。'],
        ['warn','フォルダ名はステップ1の起案番号から自動生成されるため、ここでの修正は不要。']
      ],
      next:'次：起案文・申請書類を作成する',
    },
    {
      id:'drafts',num:3,title:'起案文・申請書類・ZIP出力',
      desc:'起案文テンプレート(.docx)と申請書類テンプレート(.docx)に差し込みを行い、起案文・申請書類・台帳CSV・フォルダZIPを生成します。生成されたZIPをダウンロードしてNASに展開してください。',
      tags:['docx差し込み','CSV・ZIP生成','NASへ展開'],
      checks:[
        ['起案文の申請事項欄を確認した','CRB申請に必要な情報が正確に入力されているか確認'],
        ['詳細欄の文面を確認した','jRCT URLまたは別紙のとおり'],
        ['申請書類に同内容が反映されることを確認した','起案文ベースで自動反映'],
        ['フォルダZIPをダウンロードした','申請・CSCC側・管理者側の3フォルダを一括取得'],
        ['ZIPをNAS上の所定位置に展開した','ZIPを解凍してフォルダ配置を完了する'],
      ],
      notes:[
        ['warn','複数依頼がある場合は、主たる申請事項を明確にし、付随事項を吸収する整理が必要。'],
        ['info','ブラウザからNASへ直接書き込めないため、ZIPダウンロード→NAS側で展開する流れになっている。'],
        ['info','台帳CSVはZIP内のCSCC側申請フォルダに保存される。'],
      ],
      next:'次：ファイル名を最終確認',
    },
    {
      id:'files',num:4,title:'ファイル名を最終確認',
      desc:'各フォルダに格納するファイルの命名規則を一覧で確認します。命名ルールに従ってファイルをリネームし、必須資料のチェックリストで最終確認を行います。',
      tags:['命名規則','表記ゆれ防止','チェックリスト'],
      checks:[
        ['起案ファイル名を確認した','例：_00_起案'],
        ['申請書類ファイル名を確認した','例：_01_申請書類'],
        ['必須添付ファイルを確認した','各依頼行の必要書類を1件ずつ確認'],
        ['表記ゆれを確認した','一覧どおりに命名されているか最終確認'],
      ],
      notes:[
        ['info','フォルダ作成は済んでいるため、格納するファイル名の最終確認ステップ。'],
      ],
      next:'起案完了 → CRB承認後に作業再開',
    },
    {
      id:'work',num:5,title:'CSCC側フォルダで作業',
      desc:'CRB承認が得られたら、台帳CSVを読み込んで案件を再開します。CSCC側申請フォルダに、承認通知書・承認報告書・必要資料を格納します。',
      tags:['台帳CSVで再開','資料格納','PDF化'],
      checks:[
        ['台帳CSVを読み込んだ','研究課題名・研究責任者・依頼行が自動復元される'],
        ['CRB承認通知書を保存した','承認日を確認して格納'],
        ['承認報告書の確認日をCRB承認日に合わせた','PDF化前に記入'],
        ['必要なPDF・Word資料を格納した','CSCC側フォルダへ収納'],
      ],
      notes:[['info','台帳CSVから研究課題名・研究責任者・研究区分が自動復元されるため、再入力不要。']],
      next:'次：管理者側フォルダに格納',
    },
    {
      id:'path',num:6,title:'管理者側フォルダに格納・パス確定',
      desc:'管理者側申請フォルダに資料を格納し、NAS上の保存パスを確定します。CRB承認報告メール案をテキストファイルとして保存し、CSCC側にショートカットを作成します。',
      tags:['パス確定','メール案保存','ショートカット作成'],
      checks:[
        ['管理者側申請フォルダへ格納した','対になるCSCC側フォルダと合わせて配置'],
        ['保存パスを取得した','メール本文に貼り付けるパスを確定'],
        ['CRB承認報告メール案を保存した','件名・本文をテキストファイルとして保存'],
        ['ショートカットをCSCC側に作成した','対になる関係がわかるようにする'],
      ],
      notes:[
        ['warn','保存パスは入口では確定できず、このステップで最終確定する。'],
        ['info','メール案テキストは後から確認・再送する際の記録にもなる。']
      ],
      fields:[],
      next:'CRB承認報告メールを送信',
    },
    {
      id:'send',num:7,title:'CRB承認報告メールを送信',
      desc:'CRB承認報告メールの宛先・件名・本文を最終確認し、NAS保存パスを差し込んで送信します。送信後、更新済み台帳CSVをダウンロードして保存します。',
      tags:['最終確認','送信','台帳更新'],
      checks:[
        ['宛先が管理者になっていることを確認した','入口で入力済み（または台帳CSVから復元）'],
        ['件名・研究課題名を確認した','入口情報が反映済み'],
        ['NAS保存パスを貼り付けた','最後の未確定項目を差し込み'],
        ['内容確認後に送信した','CRB承認報告メールを送信'],
      ],
      notes:[['info','台帳CSVにも研究課題名・研究責任者が引き続き記録され、次回の再開時に復元される。']],
      fields:[],
      next:'CRB承認報告完了',
    }
  ];

  // 現在のステージインデックス
  var current = 0;

  // 各ステージの完了状態
  var done = Array(stages.length).fill(false);

  // チェックボックス状態
  var checks = {};
  stages.forEach(function(s) {
    s.checks.forEach(function(c, idx) {
      checks[s.id + '_' + idx] = false;
    });
  });

  // アプリケーション状態
  var state = {
    appMode:'front',
    navEnabled:false,
    loadedLedgerRows:[],
    loadedLedgerHeaders:[],
    selectedLedgerIndexes:[],
    requestRows:[{type:'初回公表',base:'特2025-17_2-1',date:'',url:'',facilityType:'',facilityDetail:''}],
    managerPaths:[],
    assistSeen:{},
    stepEnterTimestamp:null,
    stepDurations:{},
    lastRenderedStageId:null
  };

  // フォルダ選択状態
  var folderSelections = {};

  // テンプレートバッファ
  var templateDocxBuffer = null;
  var templateDocxName = '';
  var reportTemplateDocxBuffer = null;
  var reportTemplateDocxName = '';
  var fileStatuses = {};

  // 公開API
  return {
    stages: stages,
    current: function() { return current; },
    setCurrent: function(v) { current = v; },
    done: done,
    checks: checks,
    data: state,
    folderSelections: folderSelections,
    templateDocxBuffer: function() { return templateDocxBuffer; },
    setTemplateDocxBuffer: function(v) { templateDocxBuffer = v; },
    templateDocxName: function() { return templateDocxName; },
    setTemplateDocxName: function(v) { templateDocxName = v; },
    reportTemplateDocxBuffer: function() { return reportTemplateDocxBuffer; },
    setReportTemplateDocxBuffer: function(v) { reportTemplateDocxBuffer = v; },
    reportTemplateDocxName: function() { return reportTemplateDocxName; },
    setReportTemplateDocxName: function(v) { reportTemplateDocxName = v; },
    fileStatuses: fileStatuses
  };
})();
