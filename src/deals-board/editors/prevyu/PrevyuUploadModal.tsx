import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { buildPrevyuUploadHtml } from 'src/logic-functions/shared/prevyu-upload-html';

import { useTheme } from '../../theme/ThemeContext';
import type { LineItemFileRef } from '../../types';
import { Button } from '../../ui/Button';
import { Modal } from '../../ui/Modal';
import { openRecordSidePanel } from '../../utils/open-record-side-panel';
import {
  PREVYU_UPLOAD_CHANNEL,
  resolvePrevyuUploadPageUrl,
} from '../../utils/prevyu-upload-page-url';

export type PrevyuUploadModalProps = {
  itemId: string;
  itemName?: string;
  files?: LineItemFileRef[] | null;
  isOpen: boolean;
  onClose: () => void;
};

const readAppAccessToken = (): string | null => {
  const token = globalThis.process?.env?.TWENTY_APP_ACCESS_TOKEN?.trim();
  return token || null;
};

/**
 * Modal shell + srcdoc iframe (main-thread HTML).
 * Avoids navigating iframe to /s/... without Bearer (Missing authentication token).
 * POST uses embedded TWENTY_APP_ACCESS_TOKEN.
 */
export const PrevyuUploadModal = ({
  itemId,
  itemName,
  files,
  isOpen,
  onClose,
}: PrevyuUploadModalProps) => {
  const theme = useTheme();
  const { colors, font, spacing } = theme;
  const queryClient = useQueryClient();

  const postUrl = useMemo(
    () => (isOpen ? resolvePrevyuUploadPageUrl(itemId) : null),
    [isOpen, itemId],
  );
  const accessToken = useMemo(() => (isOpen ? readAppAccessToken() : null), [isOpen]);

  const srcDoc = useMemo(() => {
    if (!isOpen || !postUrl || !accessToken) return null;
    return buildPrevyuUploadHtml({
      lineItemId: itemId,
      lineItemName: itemName ?? '',
      files: files ?? [],
      postUrl,
      accessToken,
    });
  }, [isOpen, postUrl, accessToken, itemId, itemName, files]);

  const refreshLineItems = () => {
    void queryClient.invalidateQueries({ queryKey: ['lineItems'] });
  };

  useEffect(() => {
    if (!isOpen) return;

    const onMessage = (event: MessageEvent) => {
      const data = event.data;
      if (!data || typeof data !== 'object') return;
      const payload = data as { type?: string; lineItemId?: string };
      if (payload.type !== 'prevyu-upload' && payload.type !== 'uploaded') return;
      if (payload.lineItemId && payload.lineItemId !== itemId) return;
      refreshLineItems();
    };

    const view = typeof window !== 'undefined' ? window : undefined;
    view?.addEventListener?.('message', onMessage);

    let channel: BroadcastChannel | null = null;
    try {
      if (typeof BroadcastChannel !== 'undefined') {
        channel = new BroadcastChannel(PREVYU_UPLOAD_CHANNEL);
        channel.onmessage = (event) => {
          const data = event.data as { type?: string; lineItemId?: string } | null;
          if (!data || data.type !== 'uploaded') return;
          if (data.lineItemId && data.lineItemId !== itemId) return;
          refreshLineItems();
        };
      }
    } catch {
      channel = null;
    }

    const poll = view?.setInterval?.(() => refreshLineItems(), 4000);

    return () => {
      view?.removeEventListener?.('message', onMessage);
      try {
        channel?.close();
      } catch {
        // ignore
      }
      if (poll != null) view?.clearInterval?.(poll);
    };
  }, [isOpen, itemId, queryClient]);

  const handleClose = () => {
    refreshLineItems();
    onClose();
  };

  const missingConfigMessage = !postUrl
    ? 'Не задан URL functions (TWENTY_FUNCTIONS_URL / TWENTY_API_URL). Используйте «Открыть в карточке».'
    : !accessToken
      ? 'Нет TWENTY_APP_ACCESS_TOKEN в front-component. Используйте «Открыть в карточке».'
      : null;

  return (
    <Modal
      theme={theme}
      isOpen={isOpen}
      title="Превью"
      description={
        itemName
          ? `${itemName} — загрузка в отдельном контексте (вне Remote DOM).`
          : 'Загрузка в отдельном контексте (вне Remote DOM).'
      }
      onClose={handleClose}
      portalTarget="root"
      footer={
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: spacing.sm,
            padding: spacing.md,
            borderTop: `1px solid ${colors.borderSubtle}`,
            backgroundColor: colors.bgSecondary,
            flexWrap: 'wrap',
          }}
        >
          <Button
            theme={theme}
            variant="ghost"
            size="sm"
            onClick={() => void openRecordSidePanel('dealLineItem', itemId)}
          >
            Открыть в карточке
          </Button>
          <Button theme={theme} variant="secondary" size="sm" onClick={handleClose}>
            Готово
          </Button>
        </div>
      }
    >
      {srcDoc ? (
        <iframe
          title="prevyu-upload"
          srcDoc={srcDoc}
          sandbox="allow-scripts allow-same-origin allow-forms"
          style={{
            display: 'block',
            width: '100%',
            height: 420,
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: 8,
            backgroundColor: colors.bgInset,
          }}
        />
      ) : (
        <div
          role="alert"
          style={{
            padding: spacing.md,
            borderRadius: 8,
            border: `1px solid ${colors.danger}`,
            backgroundColor: colors.dangerMuted,
            color: colors.danger,
            fontSize: font.sizeSm,
            lineHeight: 1.4,
          }}
        >
          {missingConfigMessage ?? 'Не удалось собрать страницу загрузки.'}
        </div>
      )}
    </Modal>
  );
};
