import { useState } from 'react';

import { useUpdateRecord } from '../hooks/useUpdateRecord';
import type { BoardObjectName } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { EMPTY_VALUE } from '../theme/tokens';
import { Input } from '../ui/Input';

type TextCellProps = {
  objectName: BoardObjectName;
  recordId: string;
  fieldName: string;
  value?: string | null;
};

export const TextCell = ({ objectName, recordId, fieldName, value }: TextCellProps) => {
  const theme = useTheme();
  const { colors, font } = theme;
  const updateMutation = useUpdateRecord(objectName);
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(value ?? '');

  const openEditor = () => {
    setDraftValue(value ?? '');
    setIsEditing(true);
  };

  const closeEditor = () => {
    setDraftValue(value ?? '');
    setIsEditing(false);
  };

  const save = async () => {
    const trimmed = draftValue.trim();

    try {
      await updateMutation.mutateAsync({
        id: recordId,
        data: { [fieldName]: trimmed || null },
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
        type="text"
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
        style={{ minWidth: '100px', padding: '4px 8px', fontSize: font.sizeSm }}
      />
    );
  }

  const displayValue = value?.trim();

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
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        maxWidth: '100%',
      }}
    >
      {displayValue || EMPTY_VALUE}
    </button>
  );
};
