import { FREZA_FIELD_GROUP_ID } from 'src/constants/freza-field-group';

import type { LineItemRow } from '../types';
import { SheetQueuePanel } from './SheetQueuePanel';

type FrezaPanelChipProps = {
  item: LineItemRow;
};

/** Twin of print queue — same operator UX; sheet cycle on twentyserver (U/V status). */
export const FrezaPanelChip = ({ item }: FrezaPanelChipProps) => (
  <SheetQueuePanel
    item={item}
    groupId={FREZA_FIELD_GROUP_ID}
    chipLabel="Фреза"
    title="Фреза"
    dataChipAttr="data-freza-chip"
    fields={{
      date: 'dataGotovnostiFrezy',
      time: 'vremyaGotovnostiFrezy',
      comment: 'kommentariyDlyaFrezy',
      vzato: 'vzatoVRabotuFrezy',
      gotovo: 'gotovoFrezy',
    }}
  />
);
