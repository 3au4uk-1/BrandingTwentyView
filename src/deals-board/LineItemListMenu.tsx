import { useEffect, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  addLineItemToList,
  type LineItemListStatus,
  type ListName,
} from './api/crmparser';
import { lineItemListStatusQueryKey } from './hooks/useLineItemListStatus';
import { useTheme } from './theme/ThemeContext';
import { AnchorPopover } from './ui/AnchorPopover';
import { SettingsIcon } from './ui/Icons';

type ListAction = {
  list: ListName;
  label: string;
  isActive: (status: LineItemListStatus | null | undefined) => boolean;
};

const LIST_ACTIONS: ListAction[] = [
  { list: 'blacklist', label: '? ????????', isActive: (s) => Boolean(s?.blacklisted) },
  { list: 'restoration', label: '? ???????????', isActive: (s) => Boolean(s?.restorationMatch) },
  { list: 'podryad', label: '? ??????', isActive: (s) => Boolean(s?.podryadMatch) },
  { list: 'banner', label: '? ??????', isActive: (s) => Boolean(s?.bannerMatch) },
];

type LineItemListMenuProps = {
  lineItemId: string;
  listStatus: LineItemListStatus | null | undefined;
};

export const LineItemListMenu = ({ lineItemId, listStatus }: LineItemListMenuProps) => {
  const theme = useTheme();
  const { colors, radius, font, spacing } = theme;
  const queryClient = useQueryClient();
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [busyList, setBusyList] = useState<ListName | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const close = () => setIsOpen(false);

    window.addEventListener('resize', close);
    return () => window.removeEventListener('resize', close);
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
      setError(err instanceof Error ? err.message : '?? ??????? ????????? ??????');
    } finally {
      setBusyList(null);
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        type="button"
        data-list-menu-btn="0.2.78"
        onClick={(event) => {
          event.stopPropagation();
          setIsOpen((open) => !open);
        }}
        title="?????? ????????"
        aria-label="?????? ????????"
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

      <AnchorPopover
        theme={theme}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        anchorRef={buttonRef}
        width={196}
      >
        <div
          role="menu"
          onClick={(event) => event.stopPropagation()}
          style={{
            display: 'grid',
            gap: 2,
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
                {active ? `? ${label}` : busyList === list ? `${label}?` : label}
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
      </AnchorPopover>
    </>
  );
};
