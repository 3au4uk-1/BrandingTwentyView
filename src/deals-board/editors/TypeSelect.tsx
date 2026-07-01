import { LINE_ITEM_TYPES, type LineItemType } from 'src/constants/line-item-types';

import { useUpdateLineItem } from '../hooks/useLineItems';
import { useTheme } from '../theme/ThemeContext';
import { EMPTY_VALUE } from '../theme/tokens';
import { ColoredStageSelect } from './ColoredStageSelect';

type TypeSelectProps = {
  recordId: string;
  value?: LineItemType | null;
};

export const TypeSelect = ({ recordId, value }: TypeSelectProps) => {
  const theme = useTheme();
  const updateMutation = useUpdateLineItem();
  const selectedValue = value ?? '';

  const handleChange = async (nextValue: string) => {
    const normalizedNext = nextValue || null;
    if (normalizedNext === (value ?? null)) return;

    let lastError: unknown;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await updateMutation.mutateAsync({
          id: recordId,
          data: { tip: normalizedNext },
        });
        return;
      } catch (error) {
        lastError = error;
      }
    }

    window.alert(
      `Не удалось обновить тип.${lastError instanceof Error ? ` ${lastError.message}` : ''}`,
    );
  };

  return (
    <ColoredStageSelect
      theme={theme}
      stages={[{ value: '', label: EMPTY_VALUE, color: 'gray' }, ...LINE_ITEM_TYPES]}
      value={selectedValue}
      onChange={(nextValue) => void handleChange(nextValue)}
      disabled={updateMutation.isPending}
      style={{ width: '100%' }}
    />
  );
};
