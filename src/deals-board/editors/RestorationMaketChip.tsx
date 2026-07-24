import { useState, type MouseEvent as ReactMouseEvent } from 'react';

import {
  STANDARD_RESTORATION_MAKETS,
  toSsylkaNaMakety,
  type StandardRestorationMaket,
} from 'src/constants/standard-restoration-makets';

import { useUpdateLineItem } from '../hooks/useLineItems';
import { useTheme } from '../theme/ThemeContext';
import type { LineItemRow } from '../types';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';

type RestorationMaketChipProps = {
  item: LineItemRow;
};

export const RestorationMaketChip = ({ item }: RestorationMaketChipProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius } = theme;
  const updateMutation = useUpdateLineItem();
  const [open, setOpen] = useState(false);

  const currentLabel =
    item.ssylkaNaMakety?.primaryLinkLabel?.trim() ||
    item.ssylkaNaMakety?.primaryLinkUrl?.trim() ||
    '';

  const applyMaket = async (maket: StandardRestorationMaket) => {
    try {
      await updateMutation.mutateAsync({
        id: item.id,
        data: { ssylkaNaMakety: toSsylkaNaMakety(maket) },
      });
      setOpen(false);
    } catch (error) {
      window.alert(
        `Не удалось подставить макет.${error instanceof Error ? ` ${error.message}` : ''}`,
      );
    }
  };

  const openCatalog = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setOpen(true);
  };

  const chipText = currentLabel
    ? `Макет · ${currentLabel.length > 18 ? `${currentLabel.slice(0, 17)}…` : currentLabel}`
    : 'Станд. макет';

  return (
    <>
      <button
        type="button"
        data-restoration-maket-chip
        aria-expanded={open}
        onClick={openCatalog}
        onMouseDown={(event) => event.stopPropagation()}
        title={currentLabel || 'Подставить стандартный макет реставрации'}
        style={{
          maxWidth: '100%',
          padding: '3px 8px',
          border: `1px solid ${open || currentLabel ? colors.accent : colors.borderStrong}`,
          borderRadius: '999px',
          background: open || currentLabel ? colors.accentMuted : 'transparent',
          color: open || currentLabel ? colors.accentText : 'inherit',
          cursor: 'pointer',
          font: 'inherit',
          fontWeight: open || currentLabel ? font.weightSemibold : font.weightNormal,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {chipText}
      </button>

      <Modal
        theme={theme}
        isOpen={open}
        title="Стандартные макеты"
        description="Демо-ссылки — заменим на боевые, когда будут готовы."
        onClose={() => setOpen(false)}
        portalTarget="root"
        footer={
          <Button theme={theme} variant="ghost" size="sm" onClick={() => setOpen(false)}>
            Закрыть
          </Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
          {STANDARD_RESTORATION_MAKETS.map((maket) => (
            <button
              key={maket.id}
              type="button"
              disabled={updateMutation.isPending}
              onClick={() => void applyMaket(maket)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-start',
                gap: 2,
                width: '100%',
                padding: spacing.sm,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.md,
                background: colors.bg,
                color: colors.text,
                cursor: updateMutation.isPending ? 'default' : 'pointer',
                textAlign: 'left',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: font.sizeSm, fontWeight: font.weightSemibold }}>
                {maket.label}
                {maket.isDefault ? ' · по умолчанию' : ''}
              </span>
              <span
                style={{
                  fontSize: font.sizeXs,
                  color: colors.textMuted,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  maxWidth: '100%',
                }}
              >
                {maket.url}
              </span>
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
};
