import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { createBoardEventsSync } from './board-events-sync';

/** Keeps board caches in sync with other users' changes via a long-poll loop. */
export const useDealsBoardEventsSync = (enabled = true): void => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return;

    const sync = createBoardEventsSync({ queryClient });
    sync.start();

    return () => sync.stop();
  }, [enabled, queryClient]);
};
