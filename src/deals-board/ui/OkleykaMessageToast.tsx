import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

import { useTheme } from '../theme/ThemeContext';
import { registerOkleykaMessageHandler } from '../utils/okleyka-message-notify';
import { Button } from './Button';
import { resolvePortalContainer, usePortalHost } from './PortalHostContext';

type OkleykaMessageToastProviderProps = {
  children: ReactNode;
};

export const OkleykaMessageToastProvider = ({
  children,
}: OkleykaMessageToastProviderProps) => {
  const theme = useTheme();
  const portalHostRef = usePortalHost();
  const [message, setMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { colors, radius, font, spacing, zIndex } = theme;

  useEffect(() => {
    registerOkleykaMessageHandler((next) => {
      setCopied(false);
      setMessage(next);
    });
    return () => registerOkleykaMessageHandler(null);
  }, []);

  const handleDismiss = useCallback(() => {
    setMessage(null);
    setCopied(false);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
    } catch {
      window.prompt('Скопируйте сообщение:', message);
    }
  }, [message]);

  useEffect(() => {
    if (!message) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') handleDismiss();
    };

    const view = typeof globalThis !== 'undefined' ? globalThis : undefined;
    view?.addEventListener?.('keydown', handleKeyDown);
    return () => view?.removeEventListener?.('keydown', handleKeyDown);
  }, [handleDismiss, message]);

  const toast = message ? (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Сообщение для оклейки"
      data-okleyka-message-toast
      style={{
        position: 'fixed',
        bottom: spacing.lg,
        right: spacing.lg,
        zIndex: zIndex.modal,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.sm,
        maxWidth: 420,
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
        Сообщение для оклейки
      </div>
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
          maxHeight: 220,
          overflow: 'auto',
        }}
      >
        {message}
      </pre>
      <div style={{ display: 'flex', gap: spacing.xs, justifyContent: 'flex-end' }}>
        <Button theme={theme} variant="ghost" size="sm" onClick={handleDismiss}>
          Закрыть
        </Button>
        <Button theme={theme} variant="primary" size="sm" onClick={() => void handleCopy()}>
          {copied ? 'Скопировано' : 'Копировать'}
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
