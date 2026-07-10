import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  addLineItemToList,
  type LineItemListStatus,
  type ListName,
} from './api/crmparser';
import { lineItemListStatusQueryKey } from './hooks/useLineItemListStatus';
import { LINE_ITEM_LIST_ACTIONS } from './line-item-list-actions';
import { useTheme } from './theme/ThemeContext';
import { SettingsIcon } from './ui/Icons';

type LineItemListMenuProps = {
  lineItemId: string;
  listStatus: LineItemListStatus | null | undefined;
};

export const LineItemListMenu = ({ lineItemId, listStatus }: LineItemListMenuProps) => {
  const theme = useTheme();
  const { colors, radius, font, spacing } = theme;
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [busyList, setBusyList] = useState<ListName | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    <div
      onClick={(event) => event.stopPropagation()}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 2,
        flexShrink: 0,
      }}
    >
      <button
        type="button"
        data-list-menu-btn="0.2.79"
        onClick={(event) => {
          event.stopPropagation();
          setError(null);
          setIsOpen((open) => !open);
        }}
        title="Списки фильтров"
        aria-label="Списки фильтров"
        aria-expanded={isOpen}
        aria-controls={isOpen ? `line-item-lists-${lineItemId}` : undefined}
        style={{
          border: 'none',
          background: isOpen ? colors.accentMuted : 'transparent',
          borderRadius: radius.sm,
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
          id={`line-item-lists-${lineItemId}`}
          role="group"
          aria-label="Добавить позицию в список"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 2,
          }}
        >
          {LINE_ITEM_LIST_ACTIONS.map(({ list, label, shortLabel, isActive }) => {
            const active = isActive(listStatus);
            const disabled = active || busyList !== null;
            return (
              <button
                key={list}
                type="button"
                disabled={disabled}
                title={active ? `${label} — уже добавлено` : label}
                aria-label={label}
                onClick={() => void handleAction(list)}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '26px',
                  minWidth: '26px',
                  height: '22px',
                  border: `1px solid ${active ? colors.accent : colors.border}`,
                  background: active ? colors.accentMuted : colors.bgSecondary,
                  padding: 0,
                  borderRadius: radius.sm,
                  color: active ? colors.accentText : colors.textSecondary,
                  fontSize: font.sizeXs,
                  fontWeight: font.weightSemibold,
                  cursor: disabled ? 'default' : 'pointer',
                  opacity: disabled ? 0.6 : 1,
                }}
              >
                {busyList === list ? '…' : active ? '✓' : shortLabel}
              </button>
            );
          })}
        </div>
      ) : null}

      {error ? (
        <span
          role="alert"
          aria-live="polite"
          title={error}
          aria-label={error}
          style={{
            color: colors.danger,
            fontSize: font.sizeSm,
            fontWeight: font.weightBold,
            padding: `0 ${spacing.xs}`,
          }}
        >
          !
        </span>
      ) : null}
    </div>
  );
};
