import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import {
  OPPORTUNITY_STAGES,
  type OpportunityStage,
} from 'src/constants/stages';

import { useUpdateRecord } from '../hooks/useUpdateRecord';
import { useTheme } from '../theme/ThemeContext';
import { Button } from '../ui/Button';
import { notifyDealCancelled } from '../utils/cancel-otmena-notify';
import { isOtmenaTransition } from '../utils/otmena-transition';
import { syncDealStage } from '../utils/sync-deal-stage';
import { ColoredStageSelect } from './ColoredStageSelect';

type DealStageSelectProps = {
  recordId: string;
  value?: OpportunityStage | string | null;
  stageZakreplen?: boolean | null;
};

export const DealStageSelect = ({
  recordId,
  value,
  stageZakreplen,
}: DealStageSelectProps) => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const updateMutation = useUpdateRecord('opportunity');
  const selectedValue = useMemo(() => value ?? 'NOVYY', [value]);
  const isPinned = stageZakreplen === true;

  const handleChange = async (nextValue: string) => {
    if (nextValue === selectedValue) return;

    try {
      await updateMutation.mutateAsync({
        id: recordId,
        data: { stage: nextValue, stageZakreplen: true },
      });
      if (isOtmenaTransition(selectedValue, nextValue)) {
        notifyDealCancelled();
      }
    } catch (error) {
      window.alert(
        `Не удалось обновить этап.${error instanceof Error ? ` ${error.message}` : ''}`,
      );
    }
  };

  const handleResetAuto = async () => {
    try {
      await updateMutation.mutateAsync({
        id: recordId,
        data: { stageZakreplen: false },
      });
      await syncDealStage(queryClient, recordId);
    } catch (error) {
      window.alert(
        `Не удалось сбросить статус.${error instanceof Error ? ` ${error.message}` : ''}`,
      );
    }
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', width: '100%' }}>
      <ColoredStageSelect
        theme={theme}
        stages={OPPORTUNITY_STAGES}
        value={selectedValue}
        onChange={(nextValue) => void handleChange(nextValue)}
        disabled={updateMutation.isPending}
        appearance="filled"
      />
      {isPinned ? (
        <Button
          theme={theme}
          variant="ghost"
          size="sm"
          title="Сбросить к автоматическому статусу"
          onClick={() => void handleResetAuto()}
          disabled={updateMutation.isPending}
          style={{ padding: '2px 6px', flexShrink: 0 }}
        >
          ↺
        </Button>
      ) : null}
    </div>
  );
};
