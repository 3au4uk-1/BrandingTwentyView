import { sendOkleykaTelegramEvent } from '../api/crmparser';

export type OkleykaSendPayload = {
  text: string;
  fileUrls: string[];
  lineItemId: string;
  opportunityId?: string;
  force?: boolean;
  sentBy?: { id?: string; name?: string };
};

export type OkleykaSendResult = {
  ok: boolean;
  alreadySent?: boolean;
  lastSentAt?: string;
  warning?: string;
  error?: string;
};

export async function sendOkleykaPayload(
  payload: OkleykaSendPayload,
): Promise<OkleykaSendResult> {
  try {
    const result = await sendOkleykaTelegramEvent({
      event: 'okleyka.send',
      force: payload.force ?? false,
      lineItemId: payload.lineItemId,
      opportunityId: payload.opportunityId,
      text: payload.text,
      fileUrls: payload.fileUrls,
      sentBy: payload.sentBy,
    });

    if (result.alreadySent) {
      return {
        ok: false,
        alreadySent: true,
        lastSentAt: result.lastSentAt,
      };
    }

    if (!result.ok) {
      return {
        ok: false,
        error: result.error ?? 'Не удалось отправить',
        warning: result.warning,
      };
    }

    return {
      ok: true,
      warning: result.warning,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return {
      ok: false,
      error: message,
    };
  }
}
