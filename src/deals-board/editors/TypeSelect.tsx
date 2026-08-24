import {
  LINE_ITEM_TYPES,
  LINE_ITEM_TYPES_FOR_PICKER,
  type LineItemType,
} from 'src/constants/line-item-types';

import { useUpdateLineItem } from '../hooks/useLineItems';
import { useObjectFields } from '../metadata/useObjectFields';
import { nextSupplierOnTipChange } from '../suppliers/picker';
import { useTheme } from '../theme/ThemeContext';
import { EMPTY_VALUE } from '../theme/tokens';
import { mergeAppOptionsWithCrmLabels } from '../taxonomy/merge-crm-labels';
import { ColoredStageSelect } from './ColoredStageSelect';
import { nextTipDetailForTipChange } from './TipDetailSelect';

type TypeSelectProps = {
  recordId: string;
  value?: LineItemType | null;
  tipDetail?: string | null;
  supplierId?: string | null;
  supplierCategory?: string | null;
};

export const TypeSelect = ({
  recordId,
  value,
  tipDetail,
  supplierId,
  supplierCategory,
}: TypeSelectProps) => {
  const theme = useTheme();
  const updateMutation = useUpdateLineItem();
  const { data: fields } = useObjectFields('dealLineItem');
  const selectedValue = value ?? '';

  const tipField = fields?.find((field) => field.field === 'tip');
  const baseOptions =
    value === 'NE_NASHE' ? LINE_ITEM_TYPES : LINE_ITEM_TYPES_FOR_PICKER;
  const pickerOptions = mergeAppOptionsWithCrmLabels(baseOptions, tipField?.options);

  const handleChange = async (nextValue: string) => {
    const normalizedNext = (nextValue || null) as LineItemType | null;
    if (normalizedNext === (value ?? null)) return;

    const nextDetail = nextTipDetailForTipChange(normalizedNext, tipDetail);

    try {
      await updateMutation.mutateAsync({
        id: recordId,
        data: {
          tip: normalizedNext,
          tipDetail: nextDetail,
          supplierId: nextSupplierOnTipChange({
            nextTip: normalizedNext,
            currentSupplierId: supplierId ?? null,
            currentSupplierCategory: supplierCategory ?? null,
          }),
        },
      });
    } catch (error) {
      window.alert(
        `Не удалось обновить категорию.${error instanceof Error ? ` ${error.message}` : ''}`,
      );
    }
  };

  return (
    <ColoredStageSelect
      theme={theme}
      stages={[{ value: '', label: EMPTY_VALUE, color: 'gray' }, ...pickerOptions]}
      value={selectedValue}
      onChange={(nextValue) => void handleChange(nextValue)}
      disabled={updateMutation.isPending}
      style={{ width: '100%' }}
    />
  );
};
