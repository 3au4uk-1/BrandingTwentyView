import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'twenty-sdk/front-component';

import { ColumnPicker } from './ColumnPicker';
import { DealsTable } from './DealsTable/DealsTable';
import { useDealBoardViews, useUpdateDealBoardView } from './hooks/useDealBoardViews';
import type { DealBoardViewRecord } from './types';
import { ViewSettingsModal } from './ViewSettingsModal';
import { ViewSwitcher } from './ViewSwitcher';

const queryClient = new QueryClient();

const DealsBoardContent = () => {
  const colorScheme = useColorScheme();
  const viewsQuery = useDealBoardViews();
  const updateViewMutation = useUpdateDealBoardView();
  const [activeViewId, setActiveViewId] = useState<string>();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editViewDraft, setEditViewDraft] = useState<DealBoardViewRecord>();
  const views = viewsQuery.data ?? [];

  const activeView = useMemo(() => {
    if (!views.length) return undefined;
    if (activeViewId) {
      const selected = views.find((view) => view.id === activeViewId);
      if (selected) return selected;
    }
    return views.find((view) => view.isDefault) ?? views[0];
  }, [activeViewId, views]);

  useEffect(() => {
    if (!activeViewId && activeView?.id) {
      setActiveViewId(activeView.id);
    }
  }, [activeView?.id, activeViewId]);

  const saveActiveViewColumns = async (target: 'parent' | 'child', columns: DealBoardViewRecord['parentColumns']) => {
    if (!activeView) return;

    try {
      await updateViewMutation.mutateAsync({
        id: activeView.id,
        data: target === 'parent' ? { parentColumns: columns } : { childColumns: columns },
      });
    } catch (error) {
      window.alert(
        `Не удалось обновить колонки view.${error instanceof Error ? ` ${error.message}` : ''}`,
      );
      throw error;
    }
  };

  return (
    <div
      style={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        backgroundColor: colorScheme === 'dark' ? '#1f1f1f' : '#ffffff',
        color: colorScheme === 'dark' ? '#eee' : '#333',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          padding: '8px 10px',
          borderBottom: `1px solid ${colorScheme === 'dark' ? '#333' : '#eee'}`,
          backgroundColor: colorScheme === 'dark' ? '#1a1a1a' : '#fafafa',
          flexWrap: 'wrap',
        }}
      >
        <ViewSwitcher
          views={views}
          activeViewId={activeView?.id}
          colorScheme={colorScheme}
          onSelectView={setActiveViewId}
          onCreateView={() => setIsCreateModalOpen(true)}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            onClick={() => {
              if (activeView) {
                setEditViewDraft(activeView);
              }
            }}
            disabled={!activeView}
            style={{ fontSize: '12px' }}
          >
            Редактировать view
          </button>
          <ColumnPicker
            target="parent"
            colorScheme={colorScheme}
            columns={activeView?.parentColumns ?? []}
            onSave={(columns) => saveActiveViewColumns('parent', columns)}
          />
          <ColumnPicker
            target="child"
            colorScheme={colorScheme}
            columns={activeView?.childColumns ?? []}
            onSave={(columns) => saveActiveViewColumns('child', columns)}
          />
        </div>
      </div>

      <DealsTable
        colorScheme={colorScheme}
        activeView={activeView}
        isViewLoading={viewsQuery.isLoading || viewsQuery.isSeedingDefault}
      />

      <ViewSettingsModal
        isOpen={isCreateModalOpen}
        colorScheme={colorScheme}
        onClose={() => setIsCreateModalOpen(false)}
        onSaved={(view) => setActiveViewId(view.id)}
      />

      <ViewSettingsModal
        isOpen={Boolean(editViewDraft)}
        initialView={editViewDraft}
        colorScheme={colorScheme}
        onClose={() => setEditViewDraft(undefined)}
        onSaved={(view) => setActiveViewId(view.id)}
      />
    </div>
  );
};

export const DealsBoard = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <DealsBoardContent />
    </QueryClientProvider>
  );
};
