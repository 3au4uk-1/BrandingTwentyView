import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';

import { ThemeProvider } from '../theme/ThemeContext';
import { PortalHostProvider } from '../ui/PortalHostContext';
import { assembleBannerDeals } from './banner-deals';
import { BannerCrewCalendar } from './BannerCrewCalendar';
import { BannerCrewGanttView } from './BannerCrewGanttPage';
import { BannerCrewModal } from './BannerCrewModal';
import { buildBannerCalendar } from './calendar-layout';
import {
  buildMonthGrid,
  ganttMonday,
  shiftCalendarView,
  toggleCalendarMode,
  viewForToday,
  type CalendarView,
} from './calendar-nav';
import { fetchBannerLineRecords, fetchBannerOpportunities } from './fetch-banner-deals';
import { mskToday } from './msk-datetime';
import { useBannerCrewSlots } from './useBannerCrewSlots';

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 30_000, retry: 1 } },
});

type OpenDeal = {
  opportunityId: string;
  opportunityName: string;
  loadDate: string | null;
};

const BannerCrewPageInner = () => {
  const [mode, setMode] = useState<'calendar' | 'gantt'>('calendar');
  const [view, setView] = useState<CalendarView>(() => viewForToday('week', mskToday(new Date())));
  const [openDeal, setOpenDeal] = useState<OpenDeal | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const slotsQuery = useBannerCrewSlots();
  const dealsQuery = useQuery({
    queryKey: ['banner-calendar-deals'],
    queryFn: async () => {
      const lines = await fetchBannerLineRecords();
      const ids = [
        ...new Set(
          lines.map((line) => line.opportunityId).filter((id): id is string => Boolean(id)),
        ),
      ];
      const opportunities = await fetchBannerOpportunities(ids);
      return { lines, opportunities };
    },
  });

  if (mode === 'gantt') {
    const shown = view.anchorDate ? buildMonthGrid(view.anchorDate) : undefined;
    return (
      <BannerCrewGanttView
        initialWeekStart={ganttMonday(
          view,
          mskToday(new Date()),
          shown && { year: shown.year, month: shown.month },
        )}
        onShowCalendar={() => setMode('calendar')}
      />
    );
  }

  const model = buildBannerCalendar(
    dealsQuery.data
      ? assembleBannerDeals(dealsQuery.data.opportunities, dealsQuery.data.lines, slotsQuery.data ?? [])
      : [],
  );

  return (
    <PortalHostProvider hostRef={rootRef}>
      <div ref={rootRef} style={{ position: 'relative', height: '100%', minHeight: 0 }}>
        <BannerCrewCalendar
          model={model}
          view={view}
          error={dealsQuery.isError || slotsQuery.isError}
          loading={dealsQuery.isPending || slotsQuery.isPending}
          onShift={(delta) => setView((current) => shiftCalendarView(current, delta))}
          onToday={() => setView((current) => viewForToday(current.mode, mskToday(new Date())))}
          onToggleMode={() => setView((current) => toggleCalendarMode(current))}
          onSelectDate={(date) => setView((current) => ({ ...current, anchorDate: date }))}
          onOpenDeal={(dealId, name, loadDate) =>
            setOpenDeal({ opportunityId: dealId, opportunityName: name, loadDate })
          }
          onShowGantt={() => setMode('gantt')}
        />
        {openDeal ? (
          <BannerCrewModal
            opportunityId={openDeal.opportunityId}
            opportunityName={openDeal.opportunityName}
            loadDate={openDeal.loadDate}
            isOpen
            onClose={() => setOpenDeal(null)}
          />
        ) : null}
      </div>
    </PortalHostProvider>
  );
};

export const BannerCrewPage = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider>
      <BannerCrewPageInner />
    </ThemeProvider>
  </QueryClientProvider>
);
