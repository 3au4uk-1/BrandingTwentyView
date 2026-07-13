import { useMemo } from 'react';

import { VIEW_VISIBILITY } from 'src/constants/view-visibility';

import { useTheme } from '../theme/ThemeContext';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import type { DealBoardViewRecord } from '../types';

type MobileViewSwitcherSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  views: DealBoardViewRecord[];
  activeViewId?: string;
  onSelectView: (id: string) => void;
  onCreateView: () => void;
};

const sortViews = (views: DealBoardViewRecord[]) =>
  [...views].sort((a, b) => {
    if (a.isDefault && !b.isDefault) return -1;
    if (!a.isDefault && b.isDefault) return 1;
    return a.name.localeCompare(b.name, 'ru');
  });

export const MobileViewSwitcherSheet = ({
  isOpen,
  onClose,
  views,
  activeViewId,
  onSelectView,
  onCreateView,
}: MobileViewSwitcherSheetProps) => {
  const theme = useTheme();
  const { colors, radius, font, spacing } = theme;
  const sorted = useMemo(() => sortViews(views), [views]);
  const personal = sorted.filter((view) => view.visibility === VIEW_VISIBILITY.PERSONAL);
  const workspace = sorted.filter((view) => view.visibility === VIEW_VISIBILITY.WORKSPACE);

  const renderButton = (view: DealBoardViewRecord) => {
    const isActive = view.id === activeViewId;

    return (
      <button
        key={view.id}
        type="button"
        onClick={() => {
          onSelectView(view.id);
          onClose();
        }}
        style={{
          width: '100%',
          minHeight: 44,
          border: 'none',
          backgroundColor: isActive ? colors.accentMuted : 'transparent',
          color: isActive ? colors.accentText : colors.text,
          textAlign: 'left',
          padding: `${spacing.sm} ${spacing.md}`,
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
    <BottomSheet theme={theme} isOpen={isOpen} title="Views" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        {workspace.length > 0 ? (
          <div>
            <div style={{ fontSize: font.sizeXs, color: colors.textMuted, marginBottom: spacing.xs }}>
              Общие
            </div>
            {workspace.map(renderButton)}
          </div>
        ) : null}
        {personal.length > 0 ? (
          <div>
            <div style={{ fontSize: font.sizeXs, color: colors.textMuted, marginBottom: spacing.xs }}>
              Личные
            </div>
            {personal.map(renderButton)}
          </div>
        ) : null}
        <div style={{ width: '100%' }}>
          <Button
            theme={theme}
            variant="secondary"
            size="md"
            onClick={() => {
              onCreateView();
              onClose();
            }}
            style={{ minHeight: 44, width: '100%' }}
          >
            + Новый view
          </Button>
        </div>
      </div>
    </BottomSheet>
  );
};
