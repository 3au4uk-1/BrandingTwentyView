import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as crmparser from '../api/crmparser';
import { sendOkleykaPayload } from './send-okleyka-payload';

describe('sendOkleykaPayload', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('maps success', async () => {
    vi.spyOn(crmparser, 'sendOkleykaTelegramEvent').mockResolvedValue({
      ok: true,
      messageIds: [1],
      loggedAt: '2026-07-30',
    });
    const result = await sendOkleykaPayload({
      text: 't',
      fileUrls: ['https://x'],
      lineItemId: 'li',
      opportunityId: 'opp',
    });
    expect(result.ok).toBe(true);
    expect(crmparser.sendOkleykaTelegramEvent).toHaveBeenCalledWith({
      event: 'okleyka.send',
      force: false,
      lineItemId: 'li',
      opportunityId: 'opp',
      text: 't',
      fileUrls: ['https://x'],
      sentBy: undefined,
    });
  });

  it('maps alreadySent', async () => {
    vi.spyOn(crmparser, 'sendOkleykaTelegramEvent').mockResolvedValue({
      ok: false,
      alreadySent: true,
      lastSentAt: '2026-07-29',
    });
    const result = await sendOkleykaPayload({
      text: 't',
      fileUrls: [],
      lineItemId: 'li',
      force: false,
    });
    expect(result.alreadySent).toBe(true);
  });

  it('maps thrown errors', async () => {
    vi.spyOn(crmparser, 'sendOkleykaTelegramEvent').mockRejectedValue(
      new Error('Telegram не настроен'),
    );
    const result = await sendOkleykaPayload({
      text: 't',
      fileUrls: [],
      lineItemId: 'li',
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/не настроен/);
  });

  it('maps queued send without implying sent', async () => {
    vi.spyOn(crmparser, 'sendOkleykaTelegramEvent').mockResolvedValue({
      ok: true,
      queued: true,
      jobId: 11,
      status: 'pending',
    });
    const result = await sendOkleykaPayload({
      text: 't',
      fileUrls: ['https://x'],
      lineItemId: 'li',
      opportunityId: 'opp',
    });
    expect(result).toEqual({
      ok: true,
      queued: true,
      jobId: 11,
      status: 'pending',
    });
    expect(result).not.toHaveProperty('messageIds');
    expect(result).not.toHaveProperty('loggedAt');
  });
});
