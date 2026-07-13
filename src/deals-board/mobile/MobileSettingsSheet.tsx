import { ColumnPicker } from '../ColumnPicker';
import { ExpandModeToggle } from '../ExpandModeToggle';
import { useTheme } from '../theme/ThemeContext';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import type { ColumnConfig, DealBoardViewRecord } from '../types';

type MobileSettingsSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  activeView?: DealBoardViewRecord;
  parentColumns: ColumnConfig[];
  childColumns: ColumnConfig[];
  showAll: boolean;
  onEditView: () => void;
  onParentColumnsSave: (columns: ColumnConfig[]) => void;
  onChildColumnsSave: (columns: ColumnConfig[]) => void;
  onShowAllChange: (showAll: boolean) => void;
};

export const MobileSettingsSheet = ({
  isOpen,
  onClose,
  activeView,
  parentColumns,
  childColumns,
  showAll,
  onEditView,
  onParentColumnsSave,
  onChildColumnsSave,
  onShowAllChange,
}: MobileSettingsSheetProps) => {
  const theme = useTheme();
  const { spacing, font, colors } = theme;

  return (
    <BottomSheet theme={theme} isOpen={isOpen} title="Настройки" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
        <div>
          <div style={{ fontSize: font.sizeXs, color: colors.textMuted, marginBottom: spacing.xs }}>
            Режим раскрытия
          </div>
          <ExpandModeToggle />
        </div>
        <div>
          <div style={{ fontSize: font.sizeXs, color: colors.textMuted, marginBottom: spacing.xs }}>
            Колонки сделок
          </div>
          <ColumnPicker target="parent" columns={parentColumns} onSave={onParentColumnsSave} />
        </div>
        <div>
          <div style={{ fontSize: font.sizeXs, color: colors.textMuted, marginBottom: spacing.xs }}>
            Колонки позиций
          </div>
          <ColumnPicker target="child" columns={childColumns} onSave={onChildColumnsSave} />
        </div>
        <div style={{ width: '100%' }}>
          <Button
            theme={theme}
            variant="secondary"
            size="md"
            disabled={!activeView}
            onClick={() => {
              onEditView();
              onClose();
            }}
            style={{ minHeight: 44, width: '100%' }}
          >
            Редактировать view
          </Button>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, minHeight: 44 }}>
          <input
            type="checkbox"
            checked={showAll}
            onChange={(event) => onShowAllChange(event.target.checked)}
          />
          <span style={{ fontSize: font.sizeSm }}>Показать все сделки</span>
        </label>
      </div>
    </BottomSheet>
  );
};
