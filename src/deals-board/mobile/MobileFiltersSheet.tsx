import { QuickFiltersBar, type QuickFiltersValue } from '../QuickFiltersBar';
import { useTheme } from '../theme/ThemeContext';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';

type MobileFiltersSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  value: QuickFiltersValue;
  onChange: (next: QuickFiltersValue) => void;
  onReset: () => void;
};

export const MobileFiltersSheet = ({
  isOpen,
  onClose,
  value,
  onChange,
  onReset,
}: MobileFiltersSheetProps) => {
  const theme = useTheme();
  const { spacing } = theme;

  return (
    <BottomSheet theme={theme} isOpen={isOpen} title="Фильтры" onClose={onClose} portalTarget="inline">
      <QuickFiltersBar value={value} onChange={onChange} onReset={onReset} />
      <div style={{ display: 'flex', gap: spacing.sm, marginTop: spacing.md }}>
        <Button
          theme={theme}
          variant="ghost"
          size="md"
          onClick={onReset}
          style={{ flex: 1, minHeight: 44 }}
        >
          Сбросить
        </Button>
        <Button
          theme={theme}
          variant="primary"
          size="md"
          onClick={onClose}
          style={{ flex: 1, minHeight: 44 }}
        >
          Применить
        </Button>
      </div>
    </BottomSheet>
  );
};
