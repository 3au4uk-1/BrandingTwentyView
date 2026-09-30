import type { PrevyuFileRefLike } from './prevyu-upload-service';

export type BuildPrevyuUploadHtmlOpts = {
  lineItemId: string;
  lineItemName: string;
  files: PrevyuFileRefLike[];
  /** Absolute POST URL — required for srcdoc iframes (no useful location.pathname). */
  postUrl: string;
  /** App access token for Authorization on POST (iframe navigation cannot send Bearer). */
  accessToken: string;
  /**
   * `bridge` — call `window.__prevyuUpload` injected by the board modal (preferred).
   * `direct` — fetch from the iframe (GET page / fallback).
   * `auto` — bridge if present, else direct.
   */
  uploadMode?: 'bridge' | 'direct' | 'auto';
  /** Which FILES field the POST should append to. Empty keeps the okleyka preview. */
  fieldName?: 'prevyuOkleyki' | 'fotoProizvodstva';
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Self-contained main-thread upload page for iframe srcdoc embedding.
 * Paste target is a contenteditable catcher (not a full-size file input overlay) —
 * otherwise Ctrl+V never reaches the paste handler.
 */
export const buildPrevyuUploadHtml = ({
  lineItemId,
  lineItemName,
  files,
  postUrl,
  accessToken,
  uploadMode = 'auto',
  fieldName,
}: BuildPrevyuUploadHtmlOpts): string => {
  const safeId = escapeHtml(lineItemId);
  const safeName = escapeHtml(lineItemName || 'Позиция');
  const filesJson = JSON.stringify(files).replace(/</g, '\\u003c');
  const postUrlJson = JSON.stringify(postUrl);
  const accessTokenJson = JSON.stringify(accessToken);
  const uploadModeJson = JSON.stringify(uploadMode);

  return `<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Превью — ${safeName}</title>
  <style>
    :root { color-scheme: dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      background: #141414;
      color: #f5f5f5;
      min-height: 100vh;
    }
    .wrap { padding: 16px; display: flex; flex-direction: column; gap: 12px; }
    h1 { margin: 0; font-size: 16px; font-weight: 600; }
    .sub { margin: 0; font-size: 12px; color: #a3a3a3; line-height: 1.4; }
    .zone {
      position: relative;
      min-height: 140px;
      border: 1px dashed #525252;
      border-radius: 10px;
      background: #1f1f1f;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 20px;
      outline: none;
    }
    .zone:focus-within { border-color: #3b82f6; }
    .paste-catch {
      position: absolute;
      inset: 0;
      opacity: 0;
      z-index: 1;
      color: transparent;
      caret-color: transparent;
      overflow: hidden;
      outline: none;
    }
    .zone-ui {
      position: relative;
      z-index: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 6px;
      pointer-events: none;
      text-align: center;
    }
    .zone-ui strong { font-size: 13px; }
    .zone-ui span { font-size: 11px; color: #a3a3a3; }
    #pick {
      position: relative;
      z-index: 2;
      pointer-events: auto;
      border: 1px solid #525252;
      background: #2a2a2a;
      color: #f5f5f5;
      border-radius: 8px;
      padding: 8px 12px;
      font-size: 12px;
      cursor: pointer;
    }
    #file { display: none; }
    .status { font-size: 12px; min-height: 16px; color: #a3a3a3; }
    .status.err { color: #ff453a; }
    .status.ok { color: #30d158; }
    .list { display: flex; flex-direction: column; gap: 8px; }
    .row { display: flex; align-items: center; gap: 8px; font-size: 12px; color: #a3a3a3; }
    .thumb {
      width: 40px; height: 40px; border-radius: 6px; overflow: hidden;
      background: #1f1f1f; border: 1px solid #333; flex-shrink: 0;
    }
    .thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
  </style>
</head>
<body data-prevyu-upload="${safeId}">
  <div class="wrap">
    <h1>Превью</h1>
    <p class="sub">${safeName} — кликните в область и нажмите Ctrl+V, либо выберите файл (до 6).</p>
    <div class="zone" id="zone">
      <div class="paste-catch" id="pasteCatch" contenteditable="true" spellcheck="false" tabindex="0" aria-label="Вставка превью"></div>
      <div class="zone-ui">
        <strong>Ctrl+V / перетащить</strong>
        <span>Фокус должен быть в этой области</span>
      </div>
      <button type="button" id="pick">Выбрать с диска</button>
      <input id="file" type="file" accept="image/*" multiple />
    </div>
    <div class="status" id="status">Кликните сюда и нажмите Ctrl+V</div>
    <div class="list" id="list"></div>
  </div>
  <script>
(function () {
  var lineItemId = ${JSON.stringify(lineItemId)};
  var postUrl = ${postUrlJson};
  var accessToken = ${accessTokenJson};
  var uploadMode = ${uploadModeJson};
  var files = ${filesJson};
  var uploadField = ${JSON.stringify(fieldName ?? '')};
  var zone = document.getElementById('zone');
  var pasteCatch = document.getElementById('pasteCatch');
  var fileInput = document.getElementById('file');
  var pickBtn = document.getElementById('pick');
  var statusEl = document.getElementById('status');
  var listEl = document.getElementById('list');
  var busy = false;

  function setStatus(text, kind) {
    statusEl.textContent = text || '';
    statusEl.className = 'status' + (kind ? ' ' + kind : '');
  }

  function focusPaste() {
    try {
      pasteCatch.focus();
    } catch (e) {}
  }

  function notifyParent() {
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        new BroadcastChannel('prevyu-upload').postMessage({ type: 'uploaded', lineItemId: lineItemId });
      }
    } catch (e) {}
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ type: 'prevyu-upload', lineItemId: lineItemId }, '*');
      }
    } catch (e) {}
  }

  function formatNetworkError(message) {
    var msg = message ? String(message) : '';
    if (/fetch failed|Failed to fetch|NetworkError|Load failed/i.test(msg)) {
      return 'Не удалось связаться с сервером загрузки. Используйте «Открыть в карточке» или проверьте TWENTY_FUNCTIONS_URL.';
    }
    if (/fetch failed/i.test(msg)) {
      return 'Сервер Twenty не смог сохранить файл. Попробуйте «Открыть в карточке».';
    }
    return msg || 'Сеть недоступна';
  }

  function renderList() {
    listEl.innerHTML = '';
    if (!files.length) return;
    files.forEach(function (file, index) {
      var row = document.createElement('div');
      row.className = 'row';
      var thumb = document.createElement('div');
      thumb.className = 'thumb';
      var label = file.label || file.fileId || '';
      var src = '';
      if (file.url && /^https?:\\/\\//i.test(String(file.url))) {
        src = String(file.url);
      } else if (
        /^https?:\\/\\//i.test(label) &&
        String(label).indexOf('/file/files-field/') === -1
      ) {
        src = label;
      }
      if (src) {
        var img = document.createElement('img');
        img.src = src;
        img.alt = '';
        thumb.appendChild(img);
      }
      var text = document.createElement('span');
      var caption = label;
      if (/^https?:\\/\\//i.test(caption) || String(caption).indexOf('/file/files-field/') !== -1) {
        caption = file.fileId || '';
      }
      text.textContent = caption + (index === 0 ? ' · первое' : '');
      row.appendChild(thumb);
      row.appendChild(text);
      listEl.appendChild(row);
    });
  }

  function applyUploadResult(result) {
    busy = false;
    if (!result || !result.ok) {
      var errText = (result && result.body && result.body.error) || 'Ошибка загрузки';
      setStatus(formatNetworkError(errText), 'err');
      focusPaste();
      return;
    }
    if (Array.isArray(result.body.files)) {
      files = result.body.files;
      renderList();
    }
    setStatus('Загружено — можно вставить ещё (Ctrl+V)', 'ok');
    notifyParent();
    focusPaste();
  }

  function uploadViaBridge(filename, contentType, dataBase64) {
    var uploader = null;
    try {
      if (typeof window.__prevyuUpload === 'function') {
        uploader = window.__prevyuUpload;
      } else if (
        window.parent &&
        window.parent !== window &&
        typeof window.parent.__prevyuUpload === 'function'
      ) {
        uploader = window.parent.__prevyuUpload.bind(window.parent);
      }
    } catch (e) {
      uploader = null;
    }
    if (!uploader) return Promise.reject(new Error('NO_BRIDGE'));
    return Promise.resolve(uploader(filename, contentType, dataBase64)).then(function (result) {
      if (!result || typeof result !== 'object') {
        return { ok: false, body: { error: 'Пустой ответ загрузчика' } };
      }
      return { ok: !!result.ok, body: result.body || {} };
    });
  }

  function uploadDirect(filename, contentType, dataBase64) {
    return fetch(postUrl, {
      method: 'POST',
      credentials: 'omit',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + accessToken,
      },
      body: JSON.stringify({ filename: filename, contentType: contentType, dataBase64: dataBase64, field: uploadField || undefined }),
    }).then(function (res) {
      return res.json().then(function (body) { return { ok: res.ok, body: body }; });
    });
  }

  function uploadBase64(filename, contentType, dataBase64) {
    if (busy) return Promise.resolve();
    if (files.length >= 6) {
      setStatus('Максимум 6 файлов', 'err');
      return Promise.resolve();
    }
    var preferBridge = uploadMode === 'bridge' || uploadMode === 'auto';
    var allowDirect = uploadMode === 'direct' || uploadMode === 'auto';
    if (!preferBridge && (!postUrl || !accessToken)) {
      setStatus('Нет URL или токена для загрузки', 'err');
      return Promise.resolve();
    }
    busy = true;
    setStatus('Загрузка…');

    var chain = Promise.reject(new Error('NO_BRIDGE'));
    if (preferBridge) {
      chain = uploadViaBridge(filename, contentType, dataBase64);
    }
    chain = chain.catch(function (err) {
      if (!allowDirect || (err && err.message !== 'NO_BRIDGE' && uploadMode === 'bridge')) {
        throw err;
      }
      if (!postUrl || !accessToken) {
        throw new Error('Нет URL или токена для загрузки');
      }
      return uploadDirect(filename, contentType, dataBase64);
    });

    return chain
      .then(applyUploadResult)
      .catch(function (err) {
        busy = false;
        setStatus(formatNetworkError(err && err.message), 'err');
        focusPaste();
      });
  }

  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var value = String(reader.result || '');
        var comma = value.indexOf(',');
        resolve(comma >= 0 ? value.slice(comma + 1) : value);
      };
      reader.onerror = function () { reject(reader.error || new Error('FileReader failed')); };
      reader.readAsDataURL(file);
    });
  }

  function isImageLike(file) {
    if (!file) return false;
    if (!file.type || file.type.indexOf('image/') === 0) return true;
    if (file.type === 'application/octet-stream') return true;
    return /\\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(file.name || '');
  }

  function handleFiles(fileList) {
    var images = [];
    for (var i = 0; i < fileList.length; i++) {
      var f = fileList[i];
      if (isImageLike(f)) images.push(f);
    }
    if (!images.length) {
      setStatus('Нужно изображение', 'err');
      return;
    }
    images.reduce(function (chain, file) {
      return chain.then(function () {
        return fileToBase64(file).then(function (dataBase64) {
          return uploadBase64(file.name || 'prevyu.png', file.type || 'image/png', dataBase64);
        });
      });
    }, Promise.resolve());
  }

  function collectFromClipboardData(dt) {
    var out = [];
    if (!dt) return out;
    if (dt.files && dt.files.length) {
      for (var i = 0; i < dt.files.length; i++) {
        if (isImageLike(dt.files[i])) out.push(dt.files[i]);
      }
      if (out.length) return out;
    }
    if (dt.items) {
      for (var j = 0; j < dt.items.length; j++) {
        var item = dt.items[j];
        if (!item) continue;
        var type = item.type || '';
        if (item.kind === 'file' && (!type || type.indexOf('image/') === 0 || type === 'application/octet-stream')) {
          var blob = item.getAsFile && item.getAsFile();
          if (blob) out.push(blob);
        }
      }
    }
    return out;
  }

  function readClipboardApi() {
    if (!navigator.clipboard || typeof navigator.clipboard.read !== 'function') {
      return Promise.resolve([]);
    }
    return navigator.clipboard.read().then(function (items) {
      var pending = [];
      (items || []).forEach(function (item) {
        (item.types || []).forEach(function (type) {
          if (type.indexOf('image/') !== 0) return;
          pending.push(
            item.getType(type).then(function (blob) {
              var ext = type.split('/')[1] || 'png';
              return new File([blob], 'clipboard.' + ext, { type: type });
            })
          );
        });
      });
      return Promise.all(pending);
    }).catch(function () { return []; });
  }

  function onPaste(event) {
    event.preventDefault();
    event.stopPropagation();
    try { pasteCatch.innerHTML = ''; } catch (e) {}
    var fromEvent = collectFromClipboardData(event.clipboardData);
    if (fromEvent.length) {
      handleFiles(fromEvent);
      return;
    }
    setStatus('Читаю буфер…');
    readClipboardApi().then(function (images) {
      if (images && images.length) {
        handleFiles(images);
        return;
      }
      setStatus('В буфере нет изображения — скопируйте картинку и нажмите Ctrl+V здесь', 'err');
      focusPaste();
    });
  }

  document.addEventListener('paste', onPaste);
  pasteCatch.addEventListener('paste', onPaste);

  zone.addEventListener('dragover', function (event) {
    event.preventDefault();
  });
  zone.addEventListener('drop', function (event) {
    event.preventDefault();
    if (event.dataTransfer && event.dataTransfer.files) {
      handleFiles(event.dataTransfer.files);
    }
  });

  zone.addEventListener('click', function (event) {
    if (event.target === pickBtn || event.target === fileInput) return;
    focusPaste();
  });

  pickBtn.addEventListener('click', function (event) {
    event.preventDefault();
    event.stopPropagation();
    fileInput.click();
  });

  fileInput.addEventListener('change', function () {
    if (fileInput.files && fileInput.files.length) {
      handleFiles(fileInput.files);
      fileInput.value = '';
    }
    focusPaste();
  });

  renderList();
  focusPaste();
  setTimeout(focusPaste, 50);
  setTimeout(focusPaste, 300);
})();
  </script>
</body>
</html>`;
};
