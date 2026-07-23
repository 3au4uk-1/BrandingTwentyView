import { useUpdateRecord } from '../hooks/useUpdateRecord';
import type { BoardObjectName, SelectOption } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { Select } from '../ui/Input';
import {
  resolveSelectDisplayValue,
  selectValueToPatch,
} from './select-cell-value';

type SelectCellProps = {
  objectName: BoardObjectName;
  recordId: string;
  fieldName: string;
  value?: string | null;
  options: SelectOption[];
};

export const SelectCell = ({
  objectName,
  recordId,
  fieldName,
  value,
  options,
}: SelectCellProps) => {
  const theme = useTheme();
  const updateMutation = useUpdateRecord(objectName);
  const selectedValue = resolveSelectDisplayValue(value);

  const handleChange = async (nextValue: string) => {
    const patchValue = selectValueToPatch(nextValue);
    if (patchValue === (value ?? null)) return;

    try {
      await updateMutation.mutateAsync({
        id: recordId,
        data: { [fieldName]: patchValue },
      });
    } catch (error) {
      window.alert(
        `Не удалось сохранить значение.${error instanceof Error ? ` ${error.message}` : ''}`,
      );
    }
  };

  return (
    <Select
      theme={theme}
      value={selectedValue}
      onChange={(event) => void handleChange(event.target.value)}
      disabled={updateMutation.isPending}
      style={{
        width: '100%',
        minWidth: 0,
        fontSize: theme.font.sizeSm,
        padding: '4px 8px',
      }}
    >
      <option value="">—</option>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </Select>
  );
};
