import type { PrevyuFileRefLike } from './prevyu-upload-service';

export type BuildPrevyuUploadHtmlOpts = {
  lineItemId: string;
  lineItemName: string;
  files: PrevyuFileRefLike[];
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * Self-contained main-thread upload page for iframe embedding.
 * Posts { type: 'prevyu-upload', lineItemId } on success via BroadcastChannel + parent postMessage.
 */
export const buildPrevyuUploadHtml = ({
  lineItemId,
  lineItemName,
  files,
}: BuildPrevyuUploadHtmlOpts): string => {
  const safeId = escapeHtml(lineItemId);
  const safeName = escapeHtml(lineItemName || 'Позиция');
  const filesJson = JSON.stringify(files).replace(/</g, '\\u003c');

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
      gap: 6px;
      padding: 20px;
      outline: none;
    }
    .zone:focus { border-color: #3b82f6; }
    .zone strong { font-size: 13px; }
    .zone span { font-size: 11px; color: #a3a3a3; }
    .zone input[type=file] {
      position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;
    }
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
    <p class="sub">${safeName} — Ctrl+V, перетащите файл или выберите с диска (до 6).</p>
    <div class="zone" id="zone" tabindex="0">
      <input id="file" type="file" accept="image/*" multiple />
      <strong>Ctrl+V / перетащить / выбрать файл</strong>
      <span>Загрузка идёт на главном потоке, вне Remote DOM</span>
    </div>
    <div class="status" id="status">Готово к вставке</div>
    <div class="list" id="list"></div>
  </div>
  <script>
(function () {
  var lineItemId = ${JSON.stringify(lineItemId)};
  var files = ${filesJson};
  var zone = document.getElementById('zone');
  var fileInput = document.getElementById('file');
  var statusEl = document.getElementById('status');
  var listEl = document.getElementById('list');
  var busy = false;

  function setStatus(text, kind) {
    statusEl.textContent = text || '';
    statusEl.className = 'status' + (kind ? ' ' + kind : '');
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

  function renderList() {
    listEl.innerHTML = '';
    if (!files.length) return;
    files.forEach(function (file, index) {
      var row = document.createElement('div');
      row.className = 'row';
      var thumb = document.createElement('div');
      thumb.className = 'thumb';
      var label = file.label || file.fileId || '';
      if (/^https?:\\/\\//i.test(label)) {
        var img = document.createElement('img');
        img.src = label;
        img.alt = '';
        thumb.appendChild(img);
      }
      var text = document.createElement('span');
      text.textContent = (label || file.fileId) + (index === 0 ? ' · первое' : '');
      row.appendChild(thumb);
      row.appendChild(text);
      listEl.appendChild(row);
    });
  }

  function postPath() {
    return location.pathname;
  }

  function uploadBase64(filename, contentType, dataBase64) {
    if (busy) return;
    if (files.length >= 6) {
      setStatus('Максимум 6 файлов', 'err');
      return;
    }
    busy = true;
    setStatus('Загрузка…');
    fetch(postPath(), {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filename: filename, contentType: contentType, dataBase64: dataBase64 }),
    })
      .then(function (res) { return res.json().then(function (body) { return { ok: res.ok, body: body }; }); })
      .then(function (result) {
        busy = false;
        if (!result.ok) {
          setStatus((result.body && result.body.error) || 'Ошибка загрузки', 'err');
          return;
        }
        if (Array.isArray(result.body.files)) {
          files = result.body.files;
          renderList();
        }
        setStatus('Загружено', 'ok');
        notifyParent();
      })
      .catch(function (err) {
        busy = false;
        setStatus(err && err.message ? err.message : 'Сеть недоступна', 'err');
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

  function handleFiles(fileList) {
    var images = [];
    for (var i = 0; i < fileList.length; i++) {
      var f = fileList[i];
      if (f && (!f.type || f.type.indexOf('image/') === 0 || /\\.(png|jpe?g|gif|webp|bmp|heic)$/i.test(f.name || ''))) {
        images.push(f);
      }
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

  zone.addEventListener('paste', function (event) {
    event.preventDefault();
    var dt = event.clipboardData;
    if (dt && dt.files && dt.files.length) {
      handleFiles(dt.files);
      return;
    }
    if (dt && dt.items) {
      var blobs = [];
      for (var i = 0; i < dt.items.length; i++) {
        var item = dt.items[i];
        if (item && item.kind === 'file' && (!item.type || item.type.indexOf('image/') === 0)) {
          var blob = item.getAsFile();
          if (blob) blobs.push(blob);
        }
      }
      if (blobs.length) handleFiles(blobs);
      else setStatus('В буфере нет изображения', 'err');
      return;
    }
    setStatus('В буфере нет изображения', 'err');
  });

  zone.addEventListener('dragover', function (event) {
    event.preventDefault();
  });
  zone.addEventListener('drop', function (event) {
    event.preventDefault();
    if (event.dataTransfer && event.dataTransfer.files) {
      handleFiles(event.dataTransfer.files);
    }
  });

  fileInput.addEventListener('change', function () {
    if (fileInput.files && fileInput.files.length) {
      handleFiles(fileInput.files);
      fileInput.value = '';
    }
  });

  renderList();
  try { zone.focus(); } catch (e) {}
})();
  </script>
</body>
</html>`;
};
