import { useMemo } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { LINE_ITEM_STAGES, type LineItemStage } from 'src/constants/stages';

import { updateLineItem } from '../api/line-items';
import { useUpdateLineItem } from '../hooks/useLineItems';
import { useUpdateRecord } from '../hooks/useUpdateRecord';
import type { BoardObjectName } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import type { LineItemRow } from '../types';
import { planStageBandPoryadokPatches } from '../utils/line-item-order';
import { ColoredStageSelect } from './ColoredStageSelect';

type StageSelectProps = {
  objectName: BoardObjectName;
  recordId: string;
  value?: LineItemStage | null;
};

const collectSiblingLineItems = (
  queryClient: ReturnType<typeof useQueryClient>,
  opportunityId: string,
): LineItemRow[] => {
  const byId = new Map<string, LineItemRow>();
  for (const [, items] of queryClient.getQueriesData<LineItemRow[]>({
    queryKey: ['lineItems'],
  })) {
    for (const item of items ?? []) {
      if (item.opportunityId === opportunityId) {
        byId.set(item.id, item);
      }
    }
  }
  return [...byId.values()];
};

export const StageSelect = ({ objectName, recordId, value }: StageSelectProps) => {
  const theme = useTheme();
  const queryClient = useQueryClient();
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

        if (objectName === 'dealLineItem') {
          let opportunityId: string | undefined;
          for (const [, items] of queryClient.getQueriesData<LineItemRow[]>({
            queryKey: ['lineItems'],
          })) {
            const hit = items?.find((item) => item.id === recordId);
            if (hit?.opportunityId) {
              opportunityId = hit.opportunityId;
              break;
            }
          }

          if (opportunityId) {
            const siblings = collectSiblingLineItems(queryClient, opportunityId);
            const patches = planStageBandPoryadokPatches(siblings, recordId, nextValue);
            if (patches.length > 0) {
              await Promise.all(patches.map((patch) => updateLineItem(patch.id, patch.data)));
              await queryClient.invalidateQueries({ queryKey: ['lineItems'] });
            }
          }
        }

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
