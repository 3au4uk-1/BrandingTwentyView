import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useTheme } from '../theme/ThemeContext';
import type { ManualSyncErrorPayload } from '../utils/manual-sync-notify';
import { registerManualSyncErrorHandler } from '../utils/manual-sync-notify';
import { Button } from './Button';
import { resolvePortalContainer, usePortalHost } from './PortalHostContext';

const TOAST_MESSAGE = 'Не удалось сохранить позицию в parser';

type ManualSyncErrorToastProviderProps = {
  children: ReactNode;
};

export const ManualSyncErrorToastProvider = ({ children }: ManualSyncErrorToastProviderProps) => {
  const theme = useTheme();
  const portalHostRef = usePortalHost();
  const [payload, setPayload] = useState<ManualSyncErrorPayload | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  const { colors, radius, font, spacing, zIndex } = theme;

  useEffect(() => {
    registerManualSyncErrorHandler((next) => setPayload(next));
    return () => registerManualSyncErrorHandler(null);
  }, []);

  const handleDismiss = useCallback(() => {
    setPayload(null);
    setIsRetrying(false);
  }, []);

  const handleRetry = useCallback(async () => {
    if (!payload || isRetrying) return;

    setIsRetrying(true);
    try {
      await payload.retry();
      setPayload(null);
    } catch {
      // keep toast open for another retry
    } finally {
      setIsRetrying(false);
    }
  }, [isRetrying, payload]);

  useEffect(() => {
    if (!payload) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleDismiss();
    };

    const view = typeof globalThis !== 'undefined' ? globalThis : undefined;
    view?.addEventListener?.('keydown', handleKeyDown);
    return () => view?.removeEventListener?.('keydown', handleKeyDown);
  }, [handleDismiss, payload]);

  const toast = payload ? (
    <div
      role="alertdialog"
      aria-live="assertive"
      aria-label={TOAST_MESSAGE}
      data-manual-sync-error-toast
      style={{
        position: 'fixed',
        bottom: spacing.lg,
        right: spacing.lg,
        zIndex: zIndex.modal,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.sm,
        maxWidth: 360,
        width: '100%',
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
        {TOAST_MESSAGE}
      </div>
      {payload.message ? (
        <div
          style={{
            fontSize: font.sizeSm,
            color: colors.textSecondary,
          }}
        >
          {payload.message}
        </div>
      ) : null}
      <div style={{ display: 'flex', gap: spacing.xs, justifyContent: 'flex-end' }}>
        <Button theme={theme} variant="ghost" size="sm" onClick={handleDismiss}>
          Закрыть
        </Button>
        <Button theme={theme} variant="primary" size="sm" onClick={() => void handleRetry()} disabled={isRetrying}>
          Повторить
        </Button>
      </div>
    </div>
  ) : null;

  const container = resolvePortalContainer('root', portalHostRef);
  const portal = toast && container ? createPortal(toast, container) : toast;

  return (
    <>
      {children}
      {portal}
    </>
  );
};
