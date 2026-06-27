import { useRef, useState, type MouseEvent as ReactMouseEvent } from 'react';

import { useUpdateLineItem } from '../hooks/useLineItems';
import { useTheme } from '../theme/ThemeContext';
import { EMPTY_VALUE } from '../theme/tokens';
import { AnchorPopover, type AnchorPoint } from '../ui/AnchorPopover';
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
  const { colors, font } = theme;
  const updateMutation = useUpdateLineItem();
  const anchorRef = useRef<HTMLButtonElement | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [anchorPoint, setAnchorPoint] = useState<AnchorPoint | null>(null);
  const [draftValue, setDraftValue] = useState(value ?? '');

  const open = (event: ReactMouseEvent<HTMLButtonElement>) => {
    setAnchorPoint({ x: event.clientX, y: event.clientY });
    setDraftValue(value ?? '');
    setIsOpen(true);
  };

  const close = () => {
    setDraftValue(value ?? '');
    setAnchorPoint(null);
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
    <>
      <button
        ref={anchorRef}
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

      <AnchorPopover
        theme={theme}
        isOpen={isOpen}
        onClose={close}
        anchorRef={anchorRef}
        anchorPoint={anchorPoint}
        width={320}
      >
        <Textarea
          theme={theme}
          autoFocus
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          rows={6}
          style={{ fontSize: font.sizeSm }}
        />

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: theme.spacing.sm,
            marginTop: theme.spacing.sm,
          }}
        >
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
      </AnchorPopover>
    </>
  );
};
