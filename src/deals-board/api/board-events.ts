import type { ObjectRecordEvent } from '../realtime/types';
import { getTwentyFunctionsBaseUrl } from '../utils/twenty-functions-base-url';

export type BoardEventsResponse = {
  epoch?: string;
  cursor?: number;
  reset?: boolean;
  disabled?: boolean;
  events?: ObjectRecordEvent[];
};

export type FetchBoardEventsParams = {
  since?: number;
  epoch?: string;
  signal: AbortSignal;
};

const getAppAccessToken = (): string | null => {
  const token = globalThis.process?.env?.TWENTY_APP_ACCESS_TOKEN?.trim();
  return token || null;
};

export const fetchBoardEvents = async ({
  since,
  epoch,
  signal,
}: FetchBoardEventsParams): Promise<BoardEventsResponse> => {
  const baseUrl = getTwentyFunctionsBaseUrl();
  const token = getAppAccessToken();
  if (!baseUrl || !token) {
    throw new Error('Board events proxy not configured');
  }

  const params = new URLSearchParams();
  if (typeof since === 'number') params.set('since', String(since));
  if (epoch) params.set('epoch', epoch);
  const query = params.toString();

  const response = await fetch(
    `${baseUrl}/deals-board/events${query ? `?${query}` : ''}`,
    {
      headers: { Authorization: `Bearer ${token}` },
      signal,
    },
  );

  const body = (await response.json().catch(() => ({}))) as BoardEventsResponse & {
    error?: string;
  };

  if (!response.ok) {
    throw new Error(body.error ?? `Board events request failed (${response.status})`);
  }

  return body;
};
