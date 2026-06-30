import { useMemo } from 'react';

import { LINE_ITEM_STAGES, type LineItemStage } from 'src/constants/stages';

import { useUpdateLineItem } from '../hooks/useLineItems';
import { useUpdateRecord } from '../hooks/useUpdateRecord';
import type { BoardObjectName } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { ColoredStageSelect } from './ColoredStageSelect';

type StageSelectProps = {
  objectName: BoardObjectName;
  recordId: string;
  value?: LineItemStage | null;
};

export const StageSelect = ({ objectName, recordId, value }: StageSelectProps) => {
  const theme = useTheme();
  const updateLineItemMutation = useUpdateLineItem();
  const updateOpportunityMutation = useUpdateRecord('opportunity');
  const updateMutation =
    objectName === 'dealLineItem' ? updateLineItemMutation : updateOpportunityMutation;
  const selectedValue = useMemo(() => value ?? 'NOVYY', [value]);

  const handleChange = async (nextValue: string) => {
    if (nextValue === selectedValue) return;

    let lastError: unknown;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await updateMutation.mutateAsync({
          id: recordId,
          data: { stage: nextValue as LineItemStage },
        });
        return;
      } catch (error) {
        lastError = error;
      }
    }

    window.alert(
      `Не удалось обновить этап.${lastError instanceof Error ? ` ${lastError.message}` : ''}`,
    );
  };

  return (
    <ColoredStageSelect
      theme={theme}
      stages={LINE_ITEM_STAGES}
      value={selectedValue}
      onChange={(nextValue) => void handleChange(nextValue)}
      disabled={updateMutation.isPending}
      style={{ width: '100%' }}
    />
  );
};
