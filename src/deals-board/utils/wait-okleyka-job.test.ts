import { describe, expect, it, vi } from 'vitest';

import { waitOkleykaJob } from './wait-okleyka-job';

const job = (status: string, error: string | null = null) => ({
  job: { id: 1, status, error, updatedAt: '2026-09-14T12:00:00.000Z' },
  alreadySent: false,
  lastSentAt: null,
});

describe('waitOkleykaJob', () => {
  it('resolves when job status is sent', async () => {
    const fetchJob = vi.fn().mockResolvedValue(job('sent'));
    const sleep = vi.fn(async () => {});

    await expect(
      waitOkleykaJob('li-1', { fetchJob, sleep, intervalMs: 10, maxMs: 1000 }),
    ).resolves.toEqual({ status: 'sent', error: null });

    expect(fetchJob).toHaveBeenCalledWith('li-1');
    expect(sleep).not.toHaveBeenCalled();
  });

  it('resolves when job status is failed', async () => {
    const fetchJob = vi.fn().mockResolvedValue(job('failed', 'PEER_FLOOD'));
    const sleep = vi.fn(async () => {});

    await expect(waitOkleykaJob('li-1', { fetchJob, sleep })).resolves.toEqual({
      status: 'failed',
      error: 'PEER_FLOOD',
    });
  });

  it('continues polling after fetch throw then resolves sent', async () => {
    const fetchJob = vi
      .fn()
      .mockRejectedValueOnce(new Error('parser down'))
      .mockResolvedValueOnce(job('sent'));
    const sleep = vi.fn(async () => {});

    await expect(
      waitOkleykaJob('li-1', { fetchJob, sleep, intervalMs: 5, maxMs: 1000 }),
    ).resolves.toEqual({ status: 'sent', error: null });

    expect(fetchJob).toHaveBeenCalledTimes(2);
    expect(sleep).toHaveBeenCalledTimes(1);
  });

  it('resolves pending after maxMs', async () => {
    const fetchJob = vi.fn().mockResolvedValue(job('pending'));
    const sleep = vi.fn(async () => {});

    await expect(
      waitOkleykaJob('li-1', { fetchJob, sleep, intervalMs: 100, maxMs: 250 }),
    ).resolves.toEqual({ status: 'pending' });

    expect(fetchJob.mock.calls.length).toBeGreaterThanOrEqual(2);
    expect(sleep).toHaveBeenCalled();
  });
});
