import { useState } from 'react';

import { useUpdateLineItem } from '../hooks/useLineItems';
import { useTheme } from '../theme/ThemeContext';
import { EMPTY_VALUE } from '../theme/tokens';
import { Input } from '../ui/Input';

type NumberCellProps = {
  itemId: string;
  value?: number;
};

export const NumberCell = ({ itemId, value }: NumberCellProps) => {
  const theme = useTheme();
  const { colors, font } = theme;
  const updateMutation = useUpdateLineItem();
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(typeof value === 'number' ? String(value) : '');

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
      <Input
        theme={theme}
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
        style={{ minWidth: '70px', padding: '4px 8px', fontSize: font.sizeSm }}
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
        color: colors.text,
        fontSize: font.sizeSm,
        fontWeight: font.weightMedium,
      }}
    >
      {typeof value === 'number' ? value : EMPTY_VALUE}
    </button>
  );
};
