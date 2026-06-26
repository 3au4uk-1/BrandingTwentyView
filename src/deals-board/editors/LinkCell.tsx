import { useState } from 'react';

import { useUpdateLineItem } from '../hooks/useLineItems';

type LinkCellProps = {
  itemId: string;
  value?: { primaryLinkUrl?: string; primaryLinkLabel?: string };
  colorScheme: 'light' | 'dark';
};

export const LinkCell = ({ itemId, value, colorScheme }: LinkCellProps) => {
  const updateMutation = useUpdateLineItem();
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(value?.primaryLinkUrl ?? '');

  const openEditor = () => {
    setDraftValue(value?.primaryLinkUrl ?? '');
    setIsEditing(true);
  };

  const closeEditor = () => {
    setIsEditing(false);
    setDraftValue(value?.primaryLinkUrl ?? '');
  };

  const save = async () => {
    const trimmed = draftValue.trim();

    try {
      await updateMutation.mutateAsync({
        id: itemId,
        data: {
          ssylkaNaMakety: {
            primaryLinkUrl: trimmed,
            primaryLinkLabel: trimmed ? value?.primaryLinkLabel : undefined,
          },
        },
      });
      setIsEditing(false);
    } catch (error) {
      window.alert(
        `Не удалось сохранить ссылку.${error instanceof Error ? ` ${error.message}` : ''}`,
      );
    }
  };

  if (isEditing) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <input
          autoFocus
          type="url"
          value={draftValue}
          onChange={(event) => setDraftValue(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void save();
            }
            if (event.key === 'Escape') {
              closeEditor();
            }
          }}
          style={{
            width: '100%',
            minWidth: '120px',
            fontSize: '11px',
            borderRadius: '4px',
            border: `1px solid ${colorScheme === 'dark' ? '#444' : '#d9d9d9'}`,
            padding: '2px 6px',
            background: colorScheme === 'dark' ? '#262626' : '#fff',
            color: colorScheme === 'dark' ? '#ececec' : '#222',
          }}
        />
        <button
          type="button"
          onClick={() => void save()}
          disabled={updateMutation.isPending}
          style={{ fontSize: '11px' }}
        >
          Save
        </button>
        <button type="button" onClick={closeEditor} style={{ fontSize: '11px' }}>
          Cancel
        </button>
      </div>
    );
  }

  const url = value?.primaryLinkUrl?.trim();

  return (
    <button
      type="button"
      onClick={openEditor}
      style={{
        border: 'none',
        background: 'transparent',
        padding: 0,
        margin: 0,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        cursor: 'pointer',
        color: colorScheme === 'dark' ? '#e3e3e3' : '#333',
        fontSize: '11px',
      }}
      title={url || 'Добавить ссылку'}
    >
      {url ? <span aria-hidden="true">🔗</span> : null}
      <span>{url || '—'}</span>
    </button>
  );
};
