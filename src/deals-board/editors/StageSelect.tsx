import { useMemo } from 'react';

import { LINE_ITEM_STAGES, type LineItemStage } from 'src/constants/stages';

import { useUpdateLineItem } from '../hooks/useLineItems';

type StageSelectProps = {
  itemId: string;
  value?: LineItemStage | null;
  colorScheme: 'light' | 'dark';
};

export const StageSelect = ({ itemId, value, colorScheme }: StageSelectProps) => {
  const updateMutation = useUpdateLineItem();
  const selectedValue = useMemo(() => value ?? 'NOVYY', [value]);

  const handleChange = async (nextValue: string) => {
    if (nextValue === selectedValue) return;

    let lastError: unknown;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        await updateMutation.mutateAsync({
          id: itemId,
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
    <select
      value={selectedValue}
      onChange={(event) => void handleChange(event.target.value)}
      disabled={updateMutation.isPending}
      style={{
        width: '100%',
        minWidth: 0,
        fontSize: '11px',
        borderRadius: '4px',
        border: `1px solid ${colorScheme === 'dark' ? '#444' : '#d9d9d9'}`,
        padding: '2px 6px',
        background: colorScheme === 'dark' ? '#262626' : '#fff',
        color: colorScheme === 'dark' ? '#ececec' : '#222',
      }}
    >
      {LINE_ITEM_STAGES.map((stage) => (
        <option key={stage.value} value={stage.value}>
          {stage.label}
        </option>
      ))}
    </select>
  );
};
