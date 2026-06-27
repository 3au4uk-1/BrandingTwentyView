import { useState, type MouseEvent as ReactMouseEvent } from 'react';

import { useUpdateLineItem } from '../hooks/useLineItems';
import { useTheme } from '../theme/ThemeContext';
import { EMPTY_VALUE } from '../theme/tokens';
import { Button } from '../ui/Button';
import { Textarea } from '../ui/Input';
import { Modal } from '../ui/Modal';

type RichTextPopoverProps = {
  itemId: string;
  value?: string;
  field: 'plenka.markdown' | 'kommentariy';
};

const previewText = (value?: string) => {
  const text = value?.trim();
  return text?.length ? text : EMPTY_VALUE;
};

const fieldTitle = (field: RichTextPopoverProps['field']) =>
  field === 'plenka.markdown' ? 'Плёнка' : 'Комментарий';

export const RichTextPopover = ({ itemId, value, field }: RichTextPopoverProps) => {
  const theme = useTheme();
  const { colors, font } = theme;
  const updateMutation = useUpdateLineItem();
  const [isOpen, setIsOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(value ?? '');

  const open = (event: ReactMouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
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
    <>
      <button
        type="button"
        onClick={open}
        onMouseDown={(event) => event.stopPropagation()}
        title="Редактировать"
        style={{
          border: 'none',
          background: 'transparent',
          padding: '2px 0',
          margin: 0,
          width: '100%',
          minHeight: '24px',
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

      <Modal
        theme={theme}
        isOpen={isOpen}
        title={fieldTitle(field)}
        onClose={close}
        portalTarget="root"
        footer={
          <>
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
          </>
        }
      >
        <Textarea
          theme={theme}
          autoFocus
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          rows={6}
          style={{ width: '100%', fontSize: font.sizeSm }}
        />
      </Modal>
    </>
  );
};
