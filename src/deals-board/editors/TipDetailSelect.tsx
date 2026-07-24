import { useMemo } from 'react';

import type { LineItemType } from 'src/constants/line-item-types';
import {
  DEFAULT_TIP_DETAIL_BY_TIP,
  getTipDetailOptionsForTip,
  isTipDetailValidForTip,
  type TipDetailValue,
} from 'src/constants/tip-detail';

import { useUpdateLineItem } from '../hooks/useLineItems';
import { useTheme } from '../theme/ThemeContext';
import { EMPTY_VALUE } from '../theme/tokens';
import { ColoredStageSelect } from './ColoredStageSelect';

type TipDetailSelectProps = {
  recordId: string;
  tip?: LineItemType | null;
  value?: TipDetailValue | string | null;
};

export const TipDetailSelect = ({ recordId, tip, value }: TipDetailSelectProps) => {
  const theme = useTheme();
  const updateMutation = useUpdateLineItem();
  const options = useMemo(() => getTipDetailOptionsForTip(tip), [tip]);
  const selectedValue = typeof value === 'string' ? value : '';

  if (options.length === 0) {
    return (
      <span style={{ color: theme.colors.textMuted, fontSize: theme.font.sizeSm }}>—</span>
    );
  }

  const handleChange = async (nextValue: string) => {
    const normalizedNext = nextValue || null;
    if (normalizedNext === (value ?? null)) return;

    try {
      await updateMutation.mutateAsync({
        id: recordId,
        data: { tipDetail: normalizedNext },
      });
    } catch (error) {
      window.alert(
        `Не удалось обновить уточнение.${error instanceof Error ? ` ${error.message}` : ''}`,
      );
    }
  };

  return (
    <ColoredStageSelect
      theme={theme}
      stages={[{ value: '', label: EMPTY_VALUE, color: 'gray' }, ...options]}
      value={
        isTipDetailValidForTip(tip, selectedValue) ? selectedValue : ''
      }
      onChange={(nextValue) => void handleChange(nextValue)}
      disabled={updateMutation.isPending}
      style={{ width: '100%' }}
    />
  );
};

export const nextTipDetailForTipChange = (
  nextTip: string | null,
  currentTipDetail: string | null | undefined,
): string | null => {
  if (!nextTip) return null;
  if (currentTipDetail && isTipDetailValidForTip(nextTip, currentTipDetail)) {
    return currentTipDetail;
  }
  return DEFAULT_TIP_DETAIL_BY_TIP[nextTip as LineItemType] ?? null;
};
