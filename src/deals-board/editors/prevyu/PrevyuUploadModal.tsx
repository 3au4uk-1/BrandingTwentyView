import { useEffect, useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useTheme } from '../../theme/ThemeContext';
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
  isOpen: boolean;
  onClose: () => void;
};

/**
 * Modal shell in the board + iframe to logic-function HTML (main thread).
 * Upload/paste happen outside Remote DOM; board refreshes via BroadcastChannel /
 * postMessage / invalidate on close.
 */
export const PrevyuUploadModal = ({
  itemId,
  itemName,
  isOpen,
  onClose,
}: PrevyuUploadModalProps) => {
  const theme = useTheme();
  const { colors, font, spacing } = theme;
  const queryClient = useQueryClient();
  const iframeUrl = useMemo(
    () => (isOpen ? resolvePrevyuUploadPageUrl(itemId) : null),
    [isOpen, itemId],
  );

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
      {iframeUrl ? (
        <iframe
          title="prevyu-upload"
          src={iframeUrl}
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
          Не задан TWENTY_FUNCTIONS_URL — iframe загрузки недоступен. Используйте «Открыть в
          карточке».
        </div>
      )}
    </Modal>
  );
};
