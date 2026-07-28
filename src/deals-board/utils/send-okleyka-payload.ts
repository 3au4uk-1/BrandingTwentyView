export type OkleykaSendPayload = {
  text: string;
  fileUrls: string[];
};

export const buildClipboardText = (payload: OkleykaSendPayload): string => {
  if (!payload.fileUrls.length) return payload.text;
  return `${payload.text}\n\nФото:\n${payload.fileUrls.join('\n')}`;
};

export const sendOkleykaPayload = async (
  payload: OkleykaSendPayload,
): Promise<{ copiedText: boolean; copiedUrls: boolean }> => {
  const clipboardText = buildClipboardText(payload);
  try {
    await navigator.clipboard.writeText(clipboardText);
    return {
      copiedText: true,
      copiedUrls: payload.fileUrls.length > 0,
    };
  } catch {
    window.prompt('Скопируйте сообщение:', clipboardText);
    return {
      copiedText: false,
      copiedUrls: false,
    };
  }
};
