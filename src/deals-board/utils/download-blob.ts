/**
 * Remote DOM safe file download helpers.
 * Never uses host `document.createElement('a').click()` — proxies have no `.click`.
 * Prefer a srcdoc iframe (main-thread DOM) so `download` + filename work.
 */

import { XLSX_MIME } from 'src/logic-functions/shared/build-xlsx';

export type DownloadBlobOutcome = 'iframe' | 'opened' | 'needs-link' | 'failed';

export type PendingDownloadLink = {
  url: string;
  filename: string;
};

export const blobToBase64 = async (blob: Blob): Promise<string> => {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode(...chunk);
  }
  return btoa(binary);
};

export const buildDataUrl = async (blob: Blob): Promise<string> => {
  const base64 = await blobToBase64(blob);
  const mime = blob.type || XLSX_MIME;
  return `data:${mime};base64,${base64}`;
};

/** Main-thread HTML that triggers a real anchor download (works inside srcdoc iframe). */
export const buildDownloadSrcDoc = (dataUrl: string, filename: string): string => {
  const safeName = JSON.stringify(filename);
  const safeUrl = JSON.stringify(dataUrl);
  return `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body>
<script>
(function () {
  try {
    var a = document.createElement('a');
    a.href = ${safeUrl};
    a.download = ${safeName};
    a.rel = 'noopener';
    document.body.appendChild(a);
    a.click();
    a.remove();
  } catch (e) {}
  try {
    parent.postMessage({ type: 'okleyka-download-done', filename: ${safeName} }, '*');
  } catch (e2) {}
})();
</script>
<p style="font:14px system-ui">Скачивание ${filename.replace(/[<>&]/g, '')}…</p>
</body></html>`;
};

export const downloadBlobRemoteDomSafe = (
  blob: Blob,
  filename: string,
): { outcome: DownloadBlobOutcome; pending?: PendingDownloadLink } => {
  try {
    const url = URL.createObjectURL(blob);
    const view =
      typeof globalThis !== 'undefined' ? (globalThis as { open?: unknown }).open : undefined;
    if (typeof view === 'function') {
      try {
        const opened = (view as (url: string, target?: string) => unknown)(url, '_blank');
        if (opened) {
          globalThis.setTimeout?.(() => URL.revokeObjectURL(url), 60_000);
          return { outcome: 'opened' };
        }
      } catch {
        // fall through
      }
    }
    return { outcome: 'needs-link', pending: { url, filename } };
  } catch {
    return { outcome: 'failed' };
  }
};

export const revokePendingDownload = (pending: PendingDownloadLink | null | undefined): void => {
  if (!pending?.url) return;
  try {
    URL.revokeObjectURL(pending.url);
  } catch {
    // ignore
  }
};
