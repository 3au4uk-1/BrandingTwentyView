import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useState, type MouseEvent } from 'react';

import { Chip } from '../Chip';
import { useTheme } from '../theme/ThemeContext';
import { BannerCrewModal } from './BannerCrewModal';
import { buildBannerCrewChipModel } from './chip-model';
import { lineItemsForOpportunity } from './line-items-for-opportunity';
import { useBannerCrewSlots } from './useBannerCrewSlots';

type BannerCrewChipLineItem = {
  id?: string;
  opportunityId?: string | null;
  tip?: string | null;
};

type BannerCrewChipProps = {
  opportunityId: string;
  opportunityName: string;
  loadDate?: string | null;
  lineItems: BannerCrewChipLineItem[];
};

export const BannerCrewChip = ({
  opportunityId,
  opportunityName,
  loadDate,
  lineItems,
}: BannerCrewChipProps) => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const { data: allSlots = [] } = useBannerCrewSlots();

  const slots = useMemo(
    () => allSlots.filter((slot) => slot.opportunityId === opportunityId),
    [allSlots, opportunityId],
  );

  const dealLineItems = useMemo(() => {
    const cacheLists = queryClient
      .getQueriesData<BannerCrewChipLineItem[]>({ queryKey: ['lineItems'] })
      .map(([, items]) => items);
    return lineItemsForOpportunity(cacheLists, opportunityId, lineItems);
  }, [lineItems, opportunityId, queryClient]);

  const model = buildBannerCrewChipModel({
    lineItems: dealLineItems,
    slots,
    allSlotsForConflicts: allSlots,
  });

  if (model === null) return null;

  const openModal = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    setIsOpen(true);
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        onPointerDown={(event) => event.stopPropagation()}
        style={{
          border: 'none',
          background: 'transparent',
          padding: 0,
          cursor: 'pointer',
          flexShrink: 1,
          minWidth: 0,
          maxWidth: '100%',
          display: 'inline-flex',
        }}
      >
        <Chip text={model.text} color={model.color} theme={theme} />
      </button>
      <BannerCrewModal
        opportunityId={opportunityId}
        opportunityName={opportunityName}
        loadDate={loadDate}
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
};
