import { useState } from 'react';

import { useUpdateLineItem } from '../hooks/useLineItems';

type RichTextPopoverProps = {
  itemId: string;
  value?: string;
  field: 'plenka.markdown' | 'kommentariy';
  colorScheme: 'light' | 'dark';
};

const previewText = (value?: string) => {
  const text = value?.trim();
  return text?.length ? text : '—';
};

export const RichTextPopover = ({
  itemId,
  value,
  field,
  colorScheme,
}: RichTextPopoverProps) => {
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
          color: colorScheme === 'dark' ? '#dedede' : '#333',
          fontSize: '11px',
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
            zIndex: 10,
            top: 'calc(100% + 4px)',
            left: 0,
            width: '280px',
            padding: '10px',
            borderRadius: '8px',
            border: `1px solid ${colorScheme === 'dark' ? '#454545' : '#dddddd'}`,
            background: colorScheme === 'dark' ? '#202020' : '#ffffff',
            boxShadow:
              colorScheme === 'dark'
                ? '0 8px 18px rgba(0, 0, 0, 0.45)'
                : '0 8px 18px rgba(0, 0, 0, 0.15)',
          }}
        >
          <textarea
            value={draftValue}
            onChange={(event) => setDraftValue(event.target.value)}
            rows={6}
            style={{
              width: '100%',
              resize: 'vertical',
              fontSize: '12px',
              borderRadius: '6px',
              border: `1px solid ${colorScheme === 'dark' ? '#4a4a4a' : '#d5d5d5'}`,
              background: colorScheme === 'dark' ? '#171717' : '#fff',
              color: colorScheme === 'dark' ? '#ededed' : '#1e1e1e',
              padding: '6px 8px',
              boxSizing: 'border-box',
            }}
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button
              type="button"
              onClick={() => void save()}
              disabled={updateMutation.isPending}
              style={{ fontSize: '11px' }}
            >
              Save
            </button>
            <button type="button" onClick={close} style={{ fontSize: '11px' }}>
              Cancel
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
