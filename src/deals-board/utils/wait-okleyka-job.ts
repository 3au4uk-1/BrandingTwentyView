import { fetchOkleykaJob, type OkleykaJobStatus } from '../api/crmparser';

export type WaitOkleykaJobOptions = {
  fetchJob?: (lineItemId: string) => Promise<OkleykaJobStatus>;
  intervalMs?: number;
  maxMs?: number;
  sleep?: (ms: number) => Promise<void>;
};

export type WaitOkleykaJobResult = {
  status: string;
  error?: string | null;
};

const defaultSleep = (ms: number) =>
  new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });

export async function waitOkleykaJob(
  lineItemId: string,
  options: WaitOkleykaJobOptions = {},
): Promise<WaitOkleykaJobResult> {
  const fetchJob = options.fetchJob ?? fetchOkleykaJob;
  const intervalMs = options.intervalMs ?? 2000;
  const maxMs = options.maxMs ?? 300_000;
  const sleep = options.sleep ?? defaultSleep;

  let elapsed = 0;
  while (true) {
    try {
      const result = await fetchJob(lineItemId);
      const status = result.job?.status;
      if (status === 'sent' || status === 'failed') {
        return { status, error: result.job?.error ?? null };
      }
    } catch {
      // Poll errors: keep waiting; the job stays in SQLite.
    }

    if (elapsed >= maxMs) {
      return { status: 'pending' };
    }

    await sleep(intervalMs);
    elapsed += intervalMs;
  }
}
