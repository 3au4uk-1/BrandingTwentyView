import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import {
  buildOkleykaDraft,
  formatOkleykaMessage,
  type OkleykaMessageDraft,
} from '../automations/okleyka-message';
import { resolvePrevyuFileUrls } from '../api/files-field';
import { useTheme } from '../theme/ThemeContext';
import {
  registerOkleykaMessageHandler,
  type OkleykaNotifyPayload,
} from '../utils/okleyka-message-notify';
import { openRecordSidePanel } from '../utils/open-record-side-panel';
import { sendOkleykaPayload } from '../utils/send-okleyka-payload';
import { Button } from './Button';
import { Input, Textarea } from './Input';
import { resolvePortalContainer, usePortalHost } from './PortalHostContext';

type OkleykaMessageDialogProviderProps = {
  children: ReactNode;
};

const fieldLabelStyle = (theme: ReturnType<typeof useTheme>) => ({
  display: 'flex',
  flexDirection: 'column' as const,
  gap: 4,
  fontSize: theme.font.sizeSm,
  color: theme.colors.textMuted,
});

export const OkleykaMessageDialogProvider = ({
  children,
}: OkleykaMessageDialogProviderProps) => {
  const theme = useTheme();
  const portalHostRef = usePortalHost();
  const [payload, setPayload] = useState<OkleykaNotifyPayload | null>(null);
  const [draft, setDraft] = useState<OkleykaMessageDraft | null>(null);
  const [copied, setCopied] = useState(false);
  const { colors, radius, font, spacing, zIndex } = theme;

  useEffect(() => {
    registerOkleykaMessageHandler((next) => {
      setCopied(false);
      setPayload(next);
      setDraft(buildOkleykaDraft(next));
    });
    return () => registerOkleykaMessageHandler(null);
  }, []);

  const handleDismiss = useCallback(() => {
    setPayload(null);
    setDraft(null);
    setCopied(false);
  }, []);

  const updateDraft = useCallback(
    <K extends keyof OkleykaMessageDraft>(key: K, value: OkleykaMessageDraft[K]) => {
      setDraft((prev) => (prev ? { ...prev, [key]: value } : prev));
    },
    [],
  );

  const handleCopy = useCallback(async () => {
    if (!draft || !payload) return;
    const text = formatOkleykaMessage(draft);
    const fileUrls = resolvePrevyuFileUrls(payload.lineItem.prevyuOkleyki);
    const result = await sendOkleykaPayload({ text, fileUrls });
    setCopied(result.copiedText || result.copiedUrls);
  }, [draft, payload]);

  useEffect(() => {
    if (!draft) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleDismiss();
    };

    const view = typeof globalThis !== 'undefined' ? globalThis : undefined;
    view?.addEventListener?.('keydown', handleKeyDown);
    return () => view?.removeEventListener?.('keydown', handleKeyDown);
  }, [handleDismiss, draft]);

  const fileUrls = payload ? resolvePrevyuFileUrls(payload.lineItem.prevyuOkleyki) : [];
  const hasPhotos = fileUrls.length > 0 || (payload?.lineItem.prevyuOkleyki?.length ?? 0) > 0;
  const previewText = draft ? formatOkleykaMessage(draft) : '';

  const dialog =
    draft && payload ? (
      <div
        role="presentation"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: zIndex.modal,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: spacing.xl,
          boxSizing: 'border-box',
          pointerEvents: 'none',
        }}
      >
        <div
          aria-hidden="true"
          onMouseDown={handleDismiss}
          style={{
            position: 'absolute',
            inset: 0,
            backgroundColor: colors.overlay,
            pointerEvents: 'auto',
          }}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Сообщение для оклейки"
          data-okleyka-message-dialog
          onMouseDown={(event) => event.stopPropagation()}
          style={{
            position: 'relative',
            zIndex: 1,
            pointerEvents: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.sm,
            maxWidth: 480,
            width: '100%',
            maxHeight: '90vh',
            overflow: 'auto',
            padding: spacing.md,
            borderRadius: radius.lg,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.bgElevated,
            boxShadow: colors.shadowLg,
          }}
        >
          <div
            style={{
              fontSize: font.sizeMd,
              fontWeight: font.weightSemibold,
              color: colors.text,
            }}
          >
            Сообщение для оклейки
          </div>

          {!hasPhotos ? (
            <div
              style={{
                padding: spacing.sm,
                borderRadius: radius.md,
                backgroundColor: colors.warningMuted,
                color: colors.warning,
                fontSize: font.sizeSm,
              }}
            >
              Нет фото — «Добавить фото» откроет карточку позиции (там Ctrl+V работает).
            </div>
          ) : null}

          <div style={{ display: 'flex', gap: spacing.xs, flexWrap: 'wrap', alignItems: 'center' }}>
            {fileUrls.slice(0, 3).map((url) => (
              <a
                key={url}
                href={url}
                target="_blank"
                rel="noreferrer"
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: radius.md,
                  border: `1px solid ${colors.border}`,
                  overflow: 'hidden',
                  display: 'block',
                  backgroundColor: colors.bg,
                }}
              >
                <img
                  src={url}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              </a>
            ))}
            <Button
              theme={theme}
              size="sm"
              variant="ghost"
              onClick={() => openRecordSidePanel('dealLineItem', payload.lineItemId)}
            >
              {hasPhotos ? 'Фото в карточке' : 'Добавить фото'}
            </Button>
          </div>

          <label style={fieldLabelStyle(theme)}>
            Заказ
            <Input
              theme={theme}
              value={draft.order}
              onChange={(event) => updateDraft('order', event.target.value)}
            />
          </label>
          <label style={fieldLabelStyle(theme)}>
            Бронь
            <Input
              theme={theme}
              value={draft.booking}
              onChange={(event) => updateDraft('booking', event.target.value)}
            />
          </label>
          <label style={fieldLabelStyle(theme)}>
            Плёнка
            <Input
              theme={theme}
              value={draft.film}
              onChange={(event) => updateDraft('film', event.target.value)}
            />
          </label>
          <label style={fieldLabelStyle(theme)}>
            Оборудование
            <Input
              theme={theme}
              value={draft.equipment}
              onChange={(event) => updateDraft('equipment', event.target.value)}
            />
          </label>
          <label style={fieldLabelStyle(theme)}>
            Комментарий
            <Textarea
              theme={theme}
              rows={2}
              value={draft.comment}
              onChange={(event) => updateDraft('comment', event.target.value)}
            />
          </label>

          <pre
            style={{
              margin: 0,
              padding: spacing.sm,
              borderRadius: radius.md,
              backgroundColor: colors.bg,
              border: `1px solid ${colors.border}`,
              fontSize: font.sizeSm,
              fontFamily: font.mono,
              color: colors.text,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              maxHeight: 160,
              overflow: 'auto',
            }}
          >
            {previewText}
          </pre>

          <div style={{ display: 'flex', gap: spacing.xs, justifyContent: 'flex-end' }}>
            <Button theme={theme} variant="ghost" size="sm" onClick={handleDismiss}>
              Отмена
            </Button>
            <Button
              theme={theme}
              variant="primary"
              size="sm"
              onClick={() => void handleCopy()}
            >
              {copied ? 'Скопировано' : 'Копировать'}
            </Button>
          </div>
        </div>
      </div>
    ) : null;

  const container = resolvePortalContainer('root', portalHostRef);
  const portal = dialog && container ? createPortal(dialog, container) : dialog;

  return (
    <>
      {children}
      {portal}
    </>
  );
};
