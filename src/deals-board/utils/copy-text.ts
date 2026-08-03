/**
 * Remote DOM safe clipboard helper.
 * The front component sandbox has no usable `navigator.clipboard`, so the copy
 * runs inside a same-origin srcdoc iframe (main-thread DOM) and reports the
 * result back via postMessage — same pattern as the Excel download iframe.
 */

export const COPY_DONE_MESSAGE_TYPE = 'okleyka-copy-done';

export const buildCopySrcDoc = (text: string): string => {
  const safeText = JSON.stringify(text);
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body>
<script>
(function () {
  var text = ${safeText};
  function report(ok) {
    try {
      parent.postMessage({ type: '${COPY_DONE_MESSAGE_TYPE}', ok: !!ok }, '*');
    } catch (e) {}
  }
  function fallback() {
    try {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      var ok = document.execCommand('copy');
      ta.remove();
      report(ok);
    } catch (e) {
      report(false);
    }
  }
  try {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      navigator.clipboard.writeText(text).then(
        function () { report(true); },
        function () { fallback(); }
      );
    } else {
      fallback();
    }
  } catch (e) {
    fallback();
  }
})();
</script>
</body></html>`;
};
