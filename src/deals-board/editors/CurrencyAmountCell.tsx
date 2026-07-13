import { useState } from 'react';

import { useUpdateRecord } from '../hooks/useUpdateRecord';
import type { BoardObjectName } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { EMPTY_VALUE } from '../theme/tokens';
import { Input } from '../ui/Input';

import { formatReadOnlyValue } from '../cells/format-read-only-value';

type CurrencyAmountCellProps = {
  objectName: BoardObjectName;
  recordId: string;
  fieldName: string;
  value?: { amountMicros?: number; currencyCode?: string } | null;
};

const rublesToMicros = (rubles: number): number => Math.round(rubles * 1_000_000);

const microsToRubles = (amountMicros?: number): number | undefined =>
  typeof amountMicros === 'number' ? amountMicros / 1_000_000 : undefined;

export const CurrencyAmountCell = ({
  objectName,
  recordId,
  fieldName,
  value,
}: CurrencyAmountCellProps) => {
  const theme = useTheme();
  const { colors, font } = theme;
  const updateMutation = useUpdateRecord(objectName);
  const rubles = microsToRubles(value?.amountMicros);
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState(
    typeof rubles === 'number' ? String(rubles) : '',
  );

  const openEditor = () => {
    setDraftValue(typeof rubles === 'number' ? String(rubles) : '');
    setIsEditing(true);
  };

  const closeEditor = () => {
    setDraftValue(typeof rubles === 'number' ? String(rubles) : '');
    setIsEditing(false);
  };

  const save = async () => {
    const trimmed = draftValue.trim().replace(/\s/g, '').replace(',', '.');
    const parsed = Number(trimmed);

    if (!trimmed || Number.isNaN(parsed) || parsed < 0) {
      window.alert('Введите корректную сумму');
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id: recordId,
        data: {
          [fieldName]: {
            amountMicros: rublesToMicros(parsed),
            currencyCode: value?.currencyCode ?? 'RUB',
          },
        },
      });
      setIsEditing(false);
    } catch (error) {
      window.alert(
        `Не удалось сохранить сумму.${error instanceof Error ? ` ${error.message}` : ''}`,
      );
    }
  };

  if (isEditing) {
    return (
      <Input
        theme={theme}
        autoFocus
        type="text"
        inputMode="decimal"
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
        style={{ minWidth: '80px', padding: '4px 8px', fontSize: font.sizeSm }}
      />
    );
  }

  const displayValue = formatReadOnlyValue('CURRENCY', value);

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
      {displayValue === EMPTY_VALUE ? EMPTY_VALUE : displayValue}
    </button>
  );
};
