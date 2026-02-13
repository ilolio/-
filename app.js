(function () {
  'use strict';

  // --- Storage ---
  const STORAGE_KEY = 'url_memo_data';
  const SETTINGS_KEY = 'url_memo_settings';

  function loadMemos() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  function saveMemos(memos) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
    } catch (e) {
      showToast('保存容量を超えました');
    }
  }

  function loadSettings() {
    try {
      var raw = localStorage.getItem(SETTINGS_KEY);
      return raw ? JSON.parse(raw) : { addNewlineAfterUrl: false, showCharCount: false };
    } catch {
      return { addNewlineAfterUrl: false, showCharCount: false };
    }
  }

  function saveSettings(settings) {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    } catch (e) {
      showToast('設定の保存に失敗しました');
    }
  }

  function generateId() {
    return crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  // --- DOM refs ---
  const listView = document.getElementById('list-view');
  const editView = document.getElementById('edit-view');
  const memoListEl = document.getElementById('memo-list');
  const emptyState = document.getElementById('empty-state');
  const editTitle = document.getElementById('edit-title');
  const memoText = document.getElementById('memo-text');
  const btnNew = document.getElementById('btn-new');
  const btnSave = document.getElementById('btn-save');
  const btnCancel = document.getElementById('btn-cancel');
  const btnCopy = document.getElementById('btn-copy');
  const btnShare = document.getElementById('btn-share');
  const toastEl = document.getElementById('toast');
  const deleteDialog = document.getElementById('delete-dialog');
  const btnDeleteCancel = document.getElementById('btn-delete-cancel');
  const btnDeleteConfirm = document.getElementById('btn-delete-confirm');
  const settingsView = document.getElementById('settings-view');
  const btnSettings = document.getElementById('btn-settings');
  const btnSettingsBack = document.getElementById('btn-settings-back');
  const settingNewline = document.getElementById('setting-newline');
  const settingCharcount = document.getElementById('setting-charcount');
  const charCountEl = document.getElementById('char-count');

  // --- State ---
  let currentMemoId = null;
  let deleteTargetId = null;
  let toastTimer = null;

  // --- Toast ---
  function showToast(message) {
    toastEl.textContent = message;
    toastEl.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
      toastEl.classList.add('hidden');
    }, 2000);
  }

  // --- Character count (twitter-text parseTweet準拠) ---
  function countWeightedChars(text) {
    if (typeof twttr !== 'undefined' && twttr.txt && twttr.txt.parseTweet) {
      return twttr.txt.parseTweet(text).weightedLength;
    }
    // フォールバック: ライブラリ未読み込み時は単純な長さを返す
    var count = 0;
    for (var i = 0; i < text.length; i++) {
      var cp = text.codePointAt(i);
      if (cp > 0xFFFF) i++;
      count += cp <= 0x10FF ? 1 : 2;
    }
    return count;
  }

  function updateCharCount() {
    var settings = loadSettings();
    if (settings.showCharCount && !editView.classList.contains('hidden')) {
      charCountEl.classList.remove('hidden');
      var count = countWeightedChars(memoText.value);
      charCountEl.textContent = count + '文字';
    } else {
      charCountEl.classList.add('hidden');
    }
  }

  // --- View switching ---
  function showListView() {
    editView.classList.add('hidden');
    settingsView.classList.add('hidden');
    listView.classList.remove('hidden');
    currentMemoId = null;
    renderList();
  }

  function showEditView(memo) {
    listView.classList.add('hidden');
    settingsView.classList.add('hidden');
    editView.classList.remove('hidden');
    if (memo) {
      currentMemoId = memo.id;
      memoText.value = memo.text;
      editTitle.textContent = 'メモ編集';
    } else {
      currentMemoId = null;
      memoText.value = '';
      editTitle.textContent = '新規メモ';
    }
    memoText.focus();
    updateCharCount();
  }

  function showSettingsView() {
    listView.classList.add('hidden');
    editView.classList.add('hidden');
    settingsView.classList.remove('hidden');
    var settings = loadSettings();
    settingNewline.checked = settings.addNewlineAfterUrl;
    settingCharcount.checked = settings.showCharCount;
  }

  // --- Rendering ---
  function formatDate(ts) {
    var d = new Date(ts);
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    var h = String(d.getHours()).padStart(2, '0');
    var min = String(d.getMinutes()).padStart(2, '0');
    return y + '/' + m + '/' + day + ' ' + h + ':' + min;
  }

  function renderList() {
    var memos = loadMemos();
    memoListEl.innerHTML = '';

    if (memos.length === 0) {
      emptyState.classList.remove('hidden');
      return;
    }

    emptyState.classList.add('hidden');

    memos.sort(function (a, b) { return b.updatedAt - a.updatedAt; });

    memos.forEach(function (memo) {
      var item = document.createElement('div');
      item.className = 'memo-item';
      item.setAttribute('data-id', memo.id);

      var preview = memo.text.length > 50 ? memo.text.slice(0, 50) + '...' : memo.text;

      var content = document.createElement('div');
      content.className = 'memo-item-content';

      var previewEl = document.createElement('div');
      previewEl.className = 'memo-item-preview';
      previewEl.textContent = preview || '(空のメモ)';

      var dateEl = document.createElement('div');
      dateEl.className = 'memo-item-date';
      dateEl.textContent = formatDate(memo.updatedAt);

      content.appendChild(previewEl);
      content.appendChild(dateEl);

      var deleteBtn = document.createElement('button');
      deleteBtn.className = 'memo-item-delete';
      deleteBtn.setAttribute('aria-label', '削除');
      deleteBtn.textContent = '\u00D7';

      var swipeBg = document.createElement('div');
      swipeBg.className = 'memo-item-swipe-bg';
      swipeBg.textContent = '削除';

      item.appendChild(swipeBg);
      item.appendChild(content);
      item.appendChild(deleteBtn);

      // Tap to edit
      item.addEventListener('click', function (e) {
        if (e.target === deleteBtn) return;
        showEditView(memo);
      });

      // Delete button
      deleteBtn.addEventListener('click', function (e) {
        e.stopPropagation();
        showDeleteDialog(memo.id);
      });

      // Swipe to delete
      setupSwipe(item, memo.id);

      memoListEl.appendChild(item);
    });
  }

  // --- Swipe handling ---
  function setupSwipe(el, memoId) {
    var startX = 0;
    var currentX = 0;
    var swiping = false;

    el.addEventListener('touchstart', function (e) {
      startX = e.touches[0].clientX;
      currentX = startX;
      swiping = false;
    }, { passive: true });

    el.addEventListener('touchmove', function (e) {
      currentX = e.touches[0].clientX;
      var diff = startX - currentX;
      if (diff > 10) {
        swiping = true;
        el.classList.add('swiping');
        var offset = Math.min(diff, 80);
        el.style.transform = 'translateX(-' + offset + 'px)';
      }
    }, { passive: true });

    el.addEventListener('touchend', function () {
      var diff = startX - currentX;
      el.style.transform = '';
      el.classList.remove('swiping');
      if (swiping && diff > 60) {
        showDeleteDialog(memoId);
      }
      swiping = false;
    });
  }

  // --- Delete dialog ---
  function showDeleteDialog(id) {
    deleteTargetId = id;
    deleteDialog.classList.remove('hidden');
  }

  function hideDeleteDialog() {
    deleteTargetId = null;
    deleteDialog.classList.add('hidden');
  }

  btnDeleteCancel.addEventListener('click', hideDeleteDialog);

  btnDeleteConfirm.addEventListener('click', function () {
    if (deleteTargetId) {
      var memos = loadMemos();
      memos = memos.filter(function (m) { return m.id !== deleteTargetId; });
      saveMemos(memos);
      showToast('削除しました');
    }
    hideDeleteDialog();
    renderList();
  });

  // --- Edit actions ---
  btnNew.addEventListener('click', function () {
    showEditView(null);
  });

  btnSave.addEventListener('click', function () {
    var text = memoText.value.trim();
    if (!text) {
      showToast('テキストを入力してください');
      return;
    }

    var memos = loadMemos();
    var now = Date.now();

    if (currentMemoId) {
      var idx = -1;
      for (var i = 0; i < memos.length; i++) {
        if (memos[i].id === currentMemoId) { idx = i; break; }
      }
      if (idx !== -1) {
        memos[idx].text = text;
        memos[idx].updatedAt = now;
      }
    } else {
      memos.push({
        id: generateId(),
        text: text,
        createdAt: now,
        updatedAt: now
      });
    }

    saveMemos(memos);
    showToast('保存しました');
    showListView();
  });

  btnCancel.addEventListener('click', function () {
    showListView();
  });

  btnCopy.addEventListener('click', function () {
    var text = memoText.value;
    if (!text) {
      showToast('コピーするテキストがありません');
      return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () {
        showToast('コピーしました');
      }).catch(function () {
        fallbackCopy(text);
      });
    } else {
      fallbackCopy(text);
    }
  });

  function fallbackCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
      showToast('コピーしました');
    } catch {
      showToast('コピーに失敗しました');
    }
    document.body.removeChild(ta);
  }

  btnShare.addEventListener('click', function () {
    var text = memoText.value;
    if (!text) {
      showToast('共有するテキストがありません');
      return;
    }
    if (navigator.share) {
      navigator.share({ text: text }).catch(function () {
        // User cancelled share
      });
    } else {
      showToast('この環境では共有機能を使用できません');
    }
  });

  // --- Settings ---
  btnSettings.addEventListener('click', function () {
    showSettingsView();
  });

  btnSettingsBack.addEventListener('click', function () {
    showListView();
  });

  settingNewline.addEventListener('change', function () {
    var settings = loadSettings();
    settings.addNewlineAfterUrl = settingNewline.checked;
    saveSettings(settings);
  });

  settingCharcount.addEventListener('change', function () {
    var settings = loadSettings();
    settings.showCharCount = settingCharcount.checked;
    saveSettings(settings);
    updateCharCount();
  });

  memoText.addEventListener('input', updateCharCount);

  // --- Share Target handling ---
  function handleShareTarget() {
    var params = new URLSearchParams(window.location.search);
    var title = params.get('title') || '';
    var url = params.get('url') || '';
    var text = params.get('text') || '';

    // If no share params, show list
    if (!title && !url && !text) {
      return false;
    }

    // Build initial text: "タイトル | URL" or just URL or text
    var parts = [];
    if (title) parts.push(title);
    if (url) parts.push(url);
    if (!title && !url && text) parts.push(text);
    // If text contains a URL different from url param, include it
    if (text && text !== url && (text.startsWith('http://') || text.startsWith('https://'))) {
      if (!url) parts.push(text);
    } else if (text && text !== url && !text.startsWith('http')) {
      // text is a description, use as title if no title
      if (!title) parts.unshift(text);
    }

    var initialText = parts.join(' | ');

    var settings = loadSettings();
    if (settings.addNewlineAfterUrl) {
      initialText += '\n';
    }

    // Clean up URL params
    if (window.history && window.history.replaceState) {
      window.history.replaceState({}, '', window.location.pathname);
    }

    showEditView(null);
    memoText.value = initialText;
    editTitle.textContent = '新規メモ';
    updateCharCount();

    return true;
  }

  // --- Service Worker registration ---
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js');
  }

  // --- Init ---
  if (!handleShareTarget()) {
    showListView();
  }
})();
