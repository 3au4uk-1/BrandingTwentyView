/**
 * Remote DOM safe blob download.
 * Never uses `document.createElement('a').click()` — proxies have no `.click`.
 */

export type DownloadBlobOutcome = 'opened' | 'needs-link' | 'failed';

export type PendingDownloadLink = {
  url: string;
  filename: string;
};

export const downloadBlobRemoteDomSafe = (
  blob: Blob,
  filename: string,
): { outcome: DownloadBlobOutcome; pending?: PendingDownloadLink } => {
  try {
    const url = URL.createObjectURL(blob);
    const view = typeof globalThis !== 'undefined' ? (globalThis as { open?: unknown }).open : undefined;
    if (typeof view === 'function') {
      try {
        const opened = (view as (url: string, target?: string) => unknown)(url, '_blank');
        if (opened) {
          globalThis.setTimeout?.(() => URL.revokeObjectURL(url), 60_000);
          return { outcome: 'opened' };
        }
      } catch {
        // fall through to user link
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
