import { getTwentyFunctionsBaseUrl } from '../utils/twenty-functions-base-url';

export type ListName =
  | 'blacklist'
  | 'restoration'
  | 'podryad'
  | 'banner'
  | 'ne_nashe_branding'
  | 'decor_blacklist'
  | 'mk_blacklist'
  | 'ne_nashe_decor_mk';

export type ManualLineItemSyncBody = {
  opportunityId: string;
  name: string;
  kolichestvo: number;
  amountMicros: number;
  currencyCode: string;
};

export type LineItemListStatus = {
  known?: boolean;
  blacklisted: boolean;
  decorBlacklisted?: boolean;
  mkBlacklisted?: boolean;
  restorationMatch: boolean;
  podryadMatch: boolean;
  bannerMatch: boolean;
  neNasheBrandingMatch?: boolean;
  neNasheDecorMkMatch?: boolean;
  pattern: string | null;
  dealId: number | null;
  dealTwentyId: string | null;
};

type BatchStatusesResponse = {
  statuses: Record<string, LineItemListStatus>;
};

const BATCH_WINDOW_MS = 32;
const MAX_BATCH_IDS = 500;

const readProcessEnv = (): Record<string, string | undefined> =>
  globalThis.process?.env ?? {};

const getAppAccessToken = (): string | null => {
  const token = readProcessEnv().TWENTY_APP_ACCESS_TOKEN?.trim();
  return token || null;
};

export const isCrmparserConfigured = (): boolean =>
  Boolean(getTwentyFunctionsBaseUrl() && getAppAccessToken());

const formatCrmparserProxyError = (status: number, body: unknown): string => {
  const record = body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  const messages = Array.isArray(record.messages)
    ? record.messages.filter((message): message is string => typeof message === 'string')
    : [];
  const detail =
    (typeof record.error === 'string' && record.error) ||
    messages[0] ||
    `Crmparser proxy error ${status}`;

  if (detail.includes('fetch failed')) {
    return 'Парсер недоступен с сервера Twenty. В настройках приложения укажите CRMPARSER_API_INTERNAL_URL=http://crmparser:3000/api (Docker) или проверьте CRMPARSER_API_URL.';
  }

  return detail;
};

async function logicFunctionFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const baseUrl = getTwentyFunctionsBaseUrl();
  const token = getAppAccessToken();
  if (!baseUrl || !token) {
    throw new Error('Crmparser proxy not configured');
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init?.headers,
    },
  });

  const body = (await response.json().catch(() => ({}))) as T & {
    error?: string;
    messages?: string[];
  };
  if (!response.ok) {
    throw new Error(formatCrmparserProxyError(response.status, body));
  }

  return body;
}

type BatchWaiter = {
  resolve: (value: LineItemListStatus | null) => void;
  reject: (reason?: unknown) => void;
};

type PendingBatch = {
  ids: Set<string>;
  waiters: Map<string, BatchWaiter[]>;
  timer: ReturnType<typeof setTimeout> | null;
};

let pendingBatch: PendingBatch | null = null;

const flushListStatusBatch = async () => {
  const batch = pendingBatch;
  pendingBatch = null;
  if (!batch) return;

  if (batch.timer) {
    clearTimeout(batch.timer);
    batch.timer = null;
  }

  const ids = [...batch.ids].slice(0, MAX_BATCH_IDS);
  try {
    const statuses = await fetchLineItemsListStatusBatch(ids);
    for (const id of ids) {
      const status = statuses[id] ?? null;
      for (const waiter of batch.waiters.get(id) ?? []) {
        waiter.resolve(status);
      }
    }
    for (const [id, waiters] of batch.waiters) {
      if (ids.includes(id)) continue;
      for (const waiter of waiters) waiter.resolve(null);
    }
  } catch (error) {
    for (const waiters of batch.waiters.values()) {
      for (const waiter of waiters) waiter.reject(error);
    }
  }
};

/** @internal test helper */
export const resetListStatusBatcherForTests = () => {
  if (pendingBatch?.timer) clearTimeout(pendingBatch.timer);
  pendingBatch = null;
};

export async function fetchLineItemsListStatusBatch(
  lineItemIds: string[],
): Promise<Record<string, LineItemListStatus>> {
  if (!isCrmparserConfigured()) return {};
  const ids = [...new Set(lineItemIds.map((id) => id.trim()).filter(Boolean))].slice(
    0,
    MAX_BATCH_IDS,
  );
  if (ids.length === 0) return {};

  try {
    const body = await logicFunctionFetch<BatchStatusesResponse>(
      `/crmparser/line-items/list-status`,
      {
        method: 'POST',
        body: JSON.stringify({ ids }),
      },
    );
    return body.statuses ?? {};
  } catch {
    return {};
  }
}

export async function fetchLineItemListStatus(
  lineItemId: string,
): Promise<LineItemListStatus | null> {
  if (!isCrmparserConfigured()) return null;
  const id = lineItemId.trim();
  if (!id) return null;

  return new Promise<LineItemListStatus | null>((resolve, reject) => {
    if (!pendingBatch) {
      pendingBatch = {
        ids: new Set(),
        waiters: new Map(),
        timer: setTimeout(() => {
          void flushListStatusBatch();
        }, BATCH_WINDOW_MS),
      };
    }

    pendingBatch.ids.add(id);
    const waiters = pendingBatch.waiters.get(id) ?? [];
    waiters.push({ resolve, reject });
    pendingBatch.waiters.set(id, waiters);
  }).catch(() => null);
}

export async function addLineItemToList(lineItemId: string, list: ListName) {
  return logicFunctionFetch<{ success: boolean }>(
    `/crmparser/line-items/${encodeURIComponent(lineItemId)}/add-to-list`,
    {
      method: 'POST',
      body: JSON.stringify({ list }),
    },
  );
}

export async function syncManualLineItem(lineItemId: string, body: ManualLineItemSyncBody) {
  return logicFunctionFetch<{ success: boolean; dealItemId?: number }>(
    `/crmparser/line-items/${encodeURIComponent(lineItemId)}/sync`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export async function archiveManualLineItem(lineItemId: string) {
  return logicFunctionFetch<{ success: boolean }>(
    `/crmparser/line-items/${encodeURIComponent(lineItemId)}/archive`,
    { method: 'POST', body: JSON.stringify({}) },
  );
}

export type LineItemAmountWriteBackResult = {
  success: true;
  amountRub: number;
  opportunityAmountRub: number;
};

export async function writeBackLineItemAmount(
  lineItemId: string,
  amountRub: number,
): Promise<LineItemAmountWriteBackResult> {
  return logicFunctionFetch<LineItemAmountWriteBackResult>(
    `/crmparser/line-items/${encodeURIComponent(lineItemId)}/amount`,
    {
      method: 'POST',
      body: JSON.stringify({ amountRub }),
    },
  );
}

export async function writeBackLineItemQuantity(
  lineItemId: string,
  kolichestvo: number,
): Promise<{ success: true; kolichestvo: number; opportunityAmountRub: number }> {
  return logicFunctionFetch(
    `/crmparser/line-items/${encodeURIComponent(lineItemId)}/quantity`,
    { method: 'POST', body: JSON.stringify({ kolichestvo }) },
  );
}

export type OkleykaTelegramSendBody = {
  event: 'okleyka.send';
  force?: boolean;
  lineItemId: string;
  opportunityId?: string;
  text: string;
  fileUrls: string[];
  sentBy?: { id?: string; name?: string };
};

export type OkleykaTelegramSendResult = {
  ok: boolean;
  alreadySent?: boolean;
  lastSentAt?: string;
  messageIds?: number[];
  loggedAt?: string;
  warning?: string;
  error?: string;
  queued?: boolean;
  jobId?: number | string;
  status?: string;
};

export type OkleykaJobStatus = {
  job: {
    id: number | string;
    status: string;
    error: string | null;
    updatedAt: string;
  } | null;
  alreadySent: boolean;
  lastSentAt: string | null;
};

export async function fetchOkleykaJob(lineItemId: string): Promise<OkleykaJobStatus> {
  return logicFunctionFetch(
    `/crmparser/telegram/okleyka-job/${encodeURIComponent(lineItemId)}`,
  );
}

export async function sendOkleykaTelegramEvent(
  body: OkleykaTelegramSendBody,
): Promise<OkleykaTelegramSendResult> {
  return logicFunctionFetch<OkleykaTelegramSendResult>(
    `/crmparser/telegram/okleyka-send`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}

export type BannerPodryadCatchupBody = {
  lineItemId: string;
  opportunityId?: string;
  loadDate?: string;
};

export type BannerPodryadCatchupResult = {
  ok: boolean;
  queued?: boolean;
  error?: string;
};

export async function notifyBannerPodryadCatchup(
  body: BannerPodryadCatchupBody,
): Promise<BannerPodryadCatchupResult> {
  return logicFunctionFetch<BannerPodryadCatchupResult>(
    `/crmparser/telegram/banner-podryad-catchup`,
    { method: 'POST', body: JSON.stringify(body) },
  );
}
