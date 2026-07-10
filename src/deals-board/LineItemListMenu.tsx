import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  addLineItemToList,
  type LineItemListStatus,
  type ListName,
} from './api/crmparser';
import { lineItemListStatusQueryKey } from './hooks/useLineItemListStatus';
import { useTheme } from './theme/ThemeContext';
import { SettingsIcon } from './ui/Icons';

type ListAction = {
  list: ListName;
  label: string;
  isActive: (status: LineItemListStatus | null | undefined) => boolean;
};

const LIST_ACTIONS: ListAction[] = [
  { list: 'blacklist', label: 'В блеклист', isActive: (s) => Boolean(s?.blacklisted) },
  { list: 'restoration', label: 'В реставрацию', isActive: (s) => Boolean(s?.restorationMatch) },
  { list: 'podryad', label: 'В подряд', isActive: (s) => Boolean(s?.podryadMatch) },
  { list: 'banner', label: 'В баннер', isActive: (s) => Boolean(s?.bannerMatch) },
];

type LineItemListMenuProps = {
  lineItemId: string;
  listStatus: LineItemListStatus | null | undefined;
};

export const LineItemListMenu = ({ lineItemId, listStatus }: LineItemListMenuProps) => {
  const theme = useTheme();
  const { colors, radius, font, spacing, zIndex } = theme;
  const queryClient = useQueryClient();
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [busyList, setBusyList] = useState<ListName | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onMouseDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [isOpen]);

  const handleAction = async (list: ListName) => {
    setBusyList(list);
    setError(null);
    try {
      await addLineItemToList(lineItemId, list);
      await queryClient.invalidateQueries({ queryKey: lineItemListStatusQueryKey(lineItemId) });
      await queryClient.invalidateQueries({ queryKey: ['lineItems'] });
      setIsOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось применить список');
    } finally {
      setBusyList(null);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        data-list-menu-btn
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((open) => !open);
        }}
        title="Списки фильтров"
        aria-label="Списки фильтров"
        style={{
          border: 'none',
          background: 'transparent',
          padding: '2px',
          width: '22px',
          minWidth: '22px',
          height: '22px',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: colors.textMuted,
          cursor: 'pointer',
        }}
      >
        <SettingsIcon size={14} color="currentColor" />
      </button>

      {isOpen ? (
        <div
          role="menu"
          onClick={(event) => event.stopPropagation()}
          style={{
            position: 'absolute',
            top: 'calc(100% + 4px)',
            right: 0,
            minWidth: '180px',
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: zIndex.dropdown,
            padding: spacing.xs,
          }}
        >
          {LIST_ACTIONS.map(({ list, label, isActive }) => {
            const active = isActive(listStatus);
            const disabled = active || busyList !== null;
            return (
              <button
                key={list}
                type="button"
                role="menuitem"
                disabled={disabled}
                onClick={() => void handleAction(list)}
                style={{
                  display: 'block',
                  width: '100%',
                  border: 'none',
                  background: 'transparent',
                  textAlign: 'left',
                  padding: `${spacing.xs} ${spacing.sm}`,
                  borderRadius: radius.sm,
                  color: active ? colors.textMuted : colors.text,
                  fontSize: font.sizeSm,
                  cursor: disabled ? 'default' : 'pointer',
                  opacity: disabled ? 0.6 : 1,
                }}
              >
                {active ? `✓ ${label}` : busyList === list ? `${label}…` : label}
              </button>
            );
          })}
          {error ? (
            <p
              style={{
                margin: `${spacing.xs} 0 0`,
                padding: `0 ${spacing.sm}`,
                color: colors.danger,
                fontSize: font.sizeXs,
              }}
            >
              {error}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
};
