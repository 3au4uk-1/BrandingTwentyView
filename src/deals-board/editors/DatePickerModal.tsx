import { useUpdateRecord } from '../hooks/useUpdateRecord';
import type { BoardObjectName } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { EMPTY_VALUE } from '../theme/tokens';
import { NativePickerField } from './NativePickerField';

type DatePickerModalProps = {
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

export const DatePickerModal = ({
  objectName,
  recordId,
  fieldName,
  value,
}: DatePickerModalProps) => {
  const theme = useTheme();
  const { colors, font } = theme;
  const updateMutation = useUpdateRecord(objectName);

  const handleChange = async (pickedValue: string) => {
    const trimmed = pickedValue.trim();
    const nextValue = trimmed || null;

    try {
      await updateMutation.mutateAsync({
        id: recordId,
        data: { [fieldName]: nextValue },
      });
    } catch (error) {
      window.alert(
        `Не удалось сохранить значение.${error instanceof Error ? ` ${error.message}` : ''}`,
      );
    }
  };

  const displayValue = formatDisplayDate(value);

  return (
    <NativePickerField
      type="date"
      value={toInputDate(value)}
      disabled={updateMutation.isPending}
      onChange={(pickedValue) => void handleChange(pickedValue)}
      display={
        <span
          style={{
            color: colors.text,
            fontSize: font.sizeSm,
            fontWeight: font.weightMedium,
          }}
        >
          {displayValue || EMPTY_VALUE}
        </span>
      }
    />
  );
};
