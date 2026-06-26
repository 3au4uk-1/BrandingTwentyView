import { useEffect, useMemo, useRef, useState } from 'react';

import { VIEW_VISIBILITY } from 'src/constants/view-visibility';

import type { DealBoardViewRecord } from './types';

type ViewSwitcherProps = {
  views: DealBoardViewRecord[];
  activeViewId?: string;
  colorScheme: 'light' | 'dark';
  onSelectView: (id: string) => void;
  onCreateView: () => void;
};

const sortViews = (views: DealBoardViewRecord[]) =>
  [...(Array.isArray(views) ? views : [])].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return a.name.localeCompare(b.name, 'ru');
  });

export const ViewSwitcher = ({
  views,
  activeViewId,
  colorScheme,
  onSelectView,
  onCreateView,
}: ViewSwitcherProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onMouseDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [isOpen]);

  const sortedViews = useMemo(() => sortViews(views), [views]);
  const activeView =
    sortedViews.find((view) => view.id === activeViewId) ?? sortedViews.find((view) => view.isDefault);
  const personalViews = sortedViews.filter((view) => view.visibility === VIEW_VISIBILITY.PERSONAL);
  const workspaceViews = sortedViews.filter((view) => view.visibility === VIEW_VISIBILITY.WORKSPACE);

  const background = colorScheme === 'dark' ? '#1d1d1d' : '#fff';
  const border = colorScheme === 'dark' ? '#404040' : '#ddd';
  const muted = colorScheme === 'dark' ? '#9a9a9a' : '#666';
  const activeBg = colorScheme === 'dark' ? '#2a2f3a' : '#eef3ff';

  return (
    <div ref={containerRef} style={{ position: 'relative', minWidth: '240px' }}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          border: `1px solid ${border}`,
          backgroundColor: background,
          color: colorScheme === 'dark' ? '#eee' : '#333',
          borderRadius: '8px',
          padding: '6px 10px',
          fontSize: '12px',
          cursor: 'pointer',
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeView?.name ?? 'Выберите view'}
        </span>
        <span aria-hidden>{isOpen ? '▴' : '▾'}</span>
      </button>

      {isOpen ? (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: '100%',
            zIndex: 30,
            border: `1px solid ${border}`,
            borderRadius: '10px',
            backgroundColor: background,
            boxShadow: colorScheme === 'dark' ? '0 8px 20px rgba(0, 0, 0, 0.45)' : '0 8px 20px rgba(0, 0, 0, 0.12)',
            padding: '6px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ padding: '4px 6px', fontSize: '11px', color: muted, fontWeight: 600 }}>Общие</div>
          {workspaceViews.length ? (
            workspaceViews.map((view) => {
              const isActive = view.id === activeView?.id;
              return (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => {
                    onSelectView(view.id);
                    setIsOpen(false);
                  }}
                  style={{
                    width: '100%',
                    border: 'none',
                    backgroundColor: isActive ? activeBg : 'transparent',
                    color: colorScheme === 'dark' ? '#eee' : '#333',
                    textAlign: 'left',
                    padding: '7px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {view.name}
                </button>
              );
            })
          ) : (
            <div style={{ padding: '6px 8px', fontSize: '12px', color: muted }}>Нет общих views</div>
          )}

          <div style={{ marginTop: '6px', padding: '4px 6px', fontSize: '11px', color: muted, fontWeight: 600 }}>
            Личные
          </div>
          {personalViews.length ? (
            personalViews.map((view) => {
              const isActive = view.id === activeView?.id;
              return (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => {
                    onSelectView(view.id);
                    setIsOpen(false);
                  }}
                  style={{
                    width: '100%',
                    border: 'none',
                    backgroundColor: isActive ? activeBg : 'transparent',
                    color: colorScheme === 'dark' ? '#eee' : '#333',
                    textAlign: 'left',
                    padding: '7px 8px',
                    borderRadius: '6px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {view.name}
                </button>
              );
            })
          ) : (
            <div style={{ padding: '6px 8px', fontSize: '12px', color: muted }}>Нет личных views</div>
          )}

          <button
            type="button"
            onClick={() => {
              setIsOpen(false);
              onCreateView();
            }}
            style={{
              width: '100%',
              marginTop: '8px',
              border: `1px dashed ${border}`,
              backgroundColor: 'transparent',
              color: colorScheme === 'dark' ? '#eee' : '#333',
              textAlign: 'center',
              padding: '7px 8px',
              borderRadius: '6px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            + Новый view
          </button>
        </div>
      ) : null}
    </div>
  );
};
