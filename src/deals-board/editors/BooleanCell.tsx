import { useUpdateRecord } from '../hooks/useUpdateRecord';
import type { BoardObjectName } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';

type BooleanCellProps = {
  objectName: BoardObjectName;
  recordId: string;
  fieldName: string;
  value?: boolean | null;
};

export const BooleanCell = ({ objectName, recordId, fieldName, value }: BooleanCellProps) => {
  const theme = useTheme();
  const updateMutation = useUpdateRecord(objectName);
  const checked = value === true;

  const handleChange = async (nextChecked: boolean) => {
    if (nextChecked === checked) return;

    try {
      await updateMutation.mutateAsync({
        id: recordId,
        data: { [fieldName]: nextChecked },
      });
    } catch (error) {
      window.alert(
        `Не удалось сохранить значение.${error instanceof Error ? ` ${error.message}` : ''}`,
      );
    }
  };

  return (
    <input
      type="checkbox"
      checked={checked}
      disabled={updateMutation.isPending}
      onChange={(event) => void handleChange(event.target.checked)}
      style={{
        width: '16px',
        height: '16px',
        cursor: updateMutation.isPending ? 'not-allowed' : 'pointer',
        accentColor: theme.colors.accent,
      }}
    />
  );
};
