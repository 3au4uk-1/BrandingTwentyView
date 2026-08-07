import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { fetchBoardEvents } from './board-events';

const originalEnv = { ...process.env };

const jsonResponse = (body: unknown, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => body,
});

describe('fetchBoardEvents', () => {
  beforeEach(() => {
    process.env.TWENTY_FUNCTIONS_URL = 'https://twenty.example.com/functions';
    process.env.TWENTY_APP_ACCESS_TOKEN = 'app-token';
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    vi.unstubAllGlobals();
  });

  it('requests without parameters when no cursor is known', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ epoch: 'e1', cursor: 7, events: [] }));
    vi.stubGlobal('fetch', fetchMock);

    const result = await fetchBoardEvents({ signal: new AbortController().signal });

    expect(fetchMock.mock.calls[0][0]).toBe('https://twenty.example.com/functions/deals-board/events');
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer app-token');
    expect(result).toEqual({ epoch: 'e1', cursor: 7, events: [] });
  });

  it('sends since and epoch when known', async () => {
    const fetchMock = vi.fn(async () => jsonResponse({ epoch: 'e1', cursor: 9, events: [] }));
    vi.stubGlobal('fetch', fetchMock);

    await fetchBoardEvents({ since: 7, epoch: 'e1', signal: new AbortController().signal });

    expect(fetchMock.mock.calls[0][0]).toBe(
      'https://twenty.example.com/functions/deals-board/events?since=7&epoch=e1',
    );
  });

  it('throws with the server error message on a failure status', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => jsonResponse({ error: 'consumer down' }, 503)));

    await expect(
      fetchBoardEvents({ signal: new AbortController().signal }),
    ).rejects.toThrow('consumer down');
  });

  it('throws when the proxy is not configured', async () => {
    delete process.env.TWENTY_APP_ACCESS_TOKEN;
    vi.stubGlobal('fetch', vi.fn());

    await expect(
      fetchBoardEvents({ signal: new AbortController().signal }),
    ).rejects.toThrow('not configured');
  });
});
