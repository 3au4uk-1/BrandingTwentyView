import { useState } from 'react';

import { useUpdateLineItem } from '../hooks/useLineItems';

type NumberCellProps = {
  itemId: string;
  value?: number;
  colorScheme: 'light' | 'dark';
};

export const NumberCell = ({ itemId, value, colorScheme }: NumberCellProps) => {
  const updateMutation = useUpdateLineItem();
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(
    typeof value === 'number' ? String(value) : '',
  );

  const openEditor = () => {
    setDraftValue(typeof value === 'number' ? String(value) : '');
    setIsEditing(true);
  };

  const closeEditor = () => {
    setDraftValue(typeof value === 'number' ? String(value) : '');
    setIsEditing(false);
  };

  const save = async () => {
    const trimmed = draftValue.trim();
    const parsed = Number(trimmed);

    if (!trimmed || Number.isNaN(parsed)) {
      window.alert('Введите корректное число');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: itemId,
        data: { kolichestvo: parsed },
      });
      setIsEditing(false);
    } catch (error) {
      window.alert(
        `Не удалось сохранить количество.${error instanceof Error ? ` ${error.message}` : ''}`,
      );
    }
  };

  if (isEditing) {
    return (
      <input
        autoFocus
        type="number"
        value={draftValue}
        onChange={(event) => setDraftValue(event.target.value)}
        onBlur={() => void save()}
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
          minWidth: '70px',
          fontSize: '11px',
          borderRadius: '4px',
          border: `1px solid ${colorScheme === 'dark' ? '#444' : '#d9d9d9'}`,
          padding: '2px 6px',
          background: colorScheme === 'dark' ? '#262626' : '#fff',
          color: colorScheme === 'dark' ? '#ececec' : '#222',
        }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={openEditor}
      disabled={updateMutation.isPending}
      style={{
        border: 'none',
        background: 'transparent',
        padding: 0,
        margin: 0,
        cursor: 'pointer',
        color: colorScheme === 'dark' ? '#e3e3e3' : '#333',
        fontSize: '11px',
      }}
    >
      {typeof value === 'number' ? value : '—'}
    </button>
  );
};
