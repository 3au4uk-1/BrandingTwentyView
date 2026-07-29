import { PRINT_FIELD_GROUP_ID } from 'src/constants/print-field-group';

import type { LineItemRow } from '../types';
import { SheetQueuePanel } from './SheetQueuePanel';

type PrintPanelChipProps = {
  item: LineItemRow;
};

export const PrintPanelChip = ({ item }: PrintPanelChipProps) => (
  <SheetQueuePanel
    item={item}
    groupId={PRINT_FIELD_GROUP_ID}
    chipLabel="Печать пленки"
    title="Печать пленки"
    dataChipAttr="data-print-chip"
    fields={{
      date: 'dataGotovnostiPechati',
      time: 'vremyaGotovnostiPechati',
      comment: 'kommentariyDlyaPechati',
      vzato: 'vzatoVRabotu',
      gotovo: 'gotovo',
      plenka: true,
      restoration: 'restavraciyaPechati',
    }}
  />
);
