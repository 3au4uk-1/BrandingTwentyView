import { useEffect, useMemo, useRef, useState } from 'react';

import { VIEW_VISIBILITY } from 'src/constants/view-visibility';

import { useTheme } from './theme/ThemeContext';
import { Button } from './ui/Button';
import { ChevronDownIcon } from './ui/Icons';
import type { DealBoardViewRecord } from './types';

type ViewSwitcherProps = {
  views: DealBoardViewRecord[];
  activeViewId?: string;
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
  onSelectView,
  onCreateView,
}: ViewSwitcherProps) => {
  const theme = useTheme();
  const { colors, radius, font, spacing, zIndex } = theme;
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

  const renderViewButton = (view: DealBoardViewRecord) => {
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
          backgroundColor: isActive ? colors.accentMuted : 'transparent',
          color: isActive ? colors.accentText : colors.text,
          textAlign: 'left',
          padding: '8px 10px',
          borderRadius: radius.sm,
          fontSize: font.sizeSm,
          fontWeight: isActive ? font.weightMedium : font.weightNormal,
          cursor: 'pointer',
          fontFamily: font.family,
        }}
      >
        {view.name}
      </button>
    );
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', minWidth: '220px', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
          border: `1px solid ${colors.border}`,
          backgroundColor: colors.bgElevated,
          color: colors.text,
          borderRadius: radius.md,
          padding: '7px 10px',
          fontSize: font.sizeSm,
          fontWeight: font.weightMedium,
          cursor: 'pointer',
          fontFamily: font.family,
        }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {activeView?.name ?? 'Выберите view'}
        </span>
        <ChevronDownIcon color={colors.textMuted} />
      </button>

      {isOpen ? (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: '100%',
            minWidth: '240px',
            zIndex: zIndex.dropdown,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.lg,
            backgroundColor: colors.bgElevated,
            boxShadow: colors.shadowLg,
            padding: spacing.xs,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              padding: '6px 10px 4px',
              fontSize: font.sizeXs,
              color: colors.textMuted,
              fontWeight: font.weightMedium,
              letterSpacing: '-0.01em',
            }}
          >
            Общие
          </div>
          {workspaceViews.length ? (
            workspaceViews.map(renderViewButton)
          ) : (
            <div style={{ padding: '6px 10px', fontSize: font.sizeSm, color: colors.textMuted }}>
              Нет общих views
            </div>
          )}

          <div
            style={{
              marginTop: spacing.xs,
              padding: '6px 10px 4px',
              fontSize: font.sizeXs,
              color: colors.textMuted,
              fontWeight: font.weightMedium,
              letterSpacing: '-0.01em',
            }}
          >
            Личные
          </div>
          {personalViews.length ? (
            personalViews.map(renderViewButton)
          ) : (
            <div style={{ padding: '6px 10px', fontSize: font.sizeSm, color: colors.textMuted }}>
              Нет личных views
            </div>
          )}

          <div style={{ marginTop: spacing.sm, padding: `0 ${spacing.xs}` }}>
            <Button
              theme={theme}
              variant="secondary"
              size="sm"
              onClick={() => {
                setIsOpen(false);
                onCreateView();
              }}
              style={{ width: '100%', borderStyle: 'dashed' }}
            >
              + Новый view
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
};
