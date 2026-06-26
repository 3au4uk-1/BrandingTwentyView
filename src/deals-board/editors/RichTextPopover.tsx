import { useState } from 'react';

import { useUpdateLineItem } from '../hooks/useLineItems';
import { useTheme } from '../theme/ThemeContext';
import { EMPTY_VALUE } from '../theme/tokens';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Input';

type RichTextPopoverProps = {
  itemId: string;
  value?: string;
  field: 'plenka.markdown' | 'kommentariy';
};

const previewText = (value?: string) => {
  const text = value?.trim();
  return text?.length ? text : EMPTY_VALUE;
};

export const RichTextPopover = ({ itemId, value, field }: RichTextPopoverProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius, zIndex } = theme;
  const updateMutation = useUpdateLineItem();
  const [isOpen, setIsOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(value ?? '');

  const open = () => {
    setDraftValue(value ?? '');
    setIsOpen(true);
  };

  const close = () => {
    setDraftValue(value ?? '');
    setIsOpen(false);
  };

  const save = async () => {
    try {
      if (field === 'plenka.markdown') {
        await updateMutation.mutateAsync({
          id: itemId,
          data: { plenka: { markdown: draftValue } },
        });
      } else {
        await updateMutation.mutateAsync({
          id: itemId,
          data: { kommentariy: draftValue },
        });
      }

      setIsOpen(false);
    } catch (error) {
      window.alert(
        `Не удалось сохранить текст.${error instanceof Error ? ` ${error.message}` : ''}`,
      );
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={open}
        style={{
          border: 'none',
          background: 'transparent',
          padding: 0,
          margin: 0,
          width: '100%',
          textAlign: 'left',
          cursor: 'pointer',
          color: value?.trim() ? colors.text : colors.textMuted,
          fontSize: font.sizeSm,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
        }}
      >
        {previewText(value)}
      </button>

      {isOpen ? (
        <div
          style={{
            position: 'absolute',
            zIndex: zIndex.dropdown,
            top: 'calc(100% + 4px)',
            left: 0,
            width: '300px',
            padding: spacing.md,
            borderRadius: radius.lg,
            border: `1px solid ${colors.border}`,
            background: colors.bgElevated,
            boxShadow: colors.shadowLg,
          }}
        >
          <Textarea
            theme={theme}
            value={draftValue}
            onChange={(event) => setDraftValue(event.target.value)}
            rows={6}
            style={{ fontSize: font.sizeSm }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: spacing.sm, marginTop: spacing.sm }}>
            <Button theme={theme} variant="ghost" size="sm" onClick={close}>
              Отмена
            </Button>
            <Button
              theme={theme}
              variant="primary"
              size="sm"
              onClick={() => void save()}
              disabled={updateMutation.isPending}
            >
              Сохранить
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
