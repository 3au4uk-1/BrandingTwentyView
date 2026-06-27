import { useState } from 'react';

import { useUpdateRecord } from '../hooks/useUpdateRecord';
import type { BoardObjectName } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { EMPTY_VALUE } from '../theme/tokens';
import { Input } from '../ui/Input';

type DateCellProps = {
  objectName: BoardObjectName;
  recordId: string;
  fieldName: string;
  value?: string | null;
};

const toInputDate = (value?: string | null): string => {
  if (!value) return '';
  const datePart = value.slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(datePart) ? datePart : '';
};

const formatDisplayDate = (value?: string | null): string | null => {
  const inputDate = toInputDate(value);
  if (!inputDate) return null;

  const [year, month, day] = inputDate.split('-');
  return `${day}.${month}.${year}`;
};

export const DateCell = ({ objectName, recordId, fieldName, value }: DateCellProps) => {
  const theme = useTheme();
  const { colors, font } = theme;
  const updateMutation = useUpdateRecord(objectName);
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(toInputDate(value));

  const openEditor = () => {
    setDraftValue(toInputDate(value));
    setIsEditing(true);
  };

  const closeEditor = () => {
    setDraftValue(toInputDate(value));
    setIsEditing(false);
  };

  const save = async () => {
    const trimmed = draftValue.trim();
    const nextValue = trimmed || null;

    try {
      await updateMutation.mutateAsync({
        id: recordId,
        data: { [fieldName]: nextValue },
      });
      setIsEditing(false);
    } catch (error) {
      window.alert(
        `Не удалось сохранить значение.${error instanceof Error ? ` ${error.message}` : ''}`,
      );
    }
  };

  if (isEditing) {
    return (
      <Input
        theme={theme}
        autoFocus
        type="date"
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
        style={{ minWidth: '130px', padding: '4px 8px', fontSize: font.sizeSm }}
      />
    );
  }

  const displayValue = formatDisplayDate(value);

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
      {displayValue || EMPTY_VALUE}
    </button>
  );
};
