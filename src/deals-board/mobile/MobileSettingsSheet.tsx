import type { BoardStream } from 'src/constants/product-stream';

import { ColumnPicker } from '../ColumnPicker';
import { ExpandModeToggle } from '../ExpandModeToggle';
import { GroupChipModeToggle } from '../GroupChipModeToggle';
import { ParserLabelFilter } from '../ParserLabelFilter';
import { useTheme } from '../theme/ThemeContext';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import type { ColumnConfig, ColumnGroupConfig, DealBoardViewRecord } from '../types';

type MobileSettingsSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  activeView?: DealBoardViewRecord;
  parentColumns: ColumnConfig[];
  childColumns: ColumnConfig[];
  onEditView: () => void;
  onParentColumnsSave: (columns: ColumnConfig[], groups: ColumnGroupConfig[]) => Promise<void>;
  onChildColumnsSave: (columns: ColumnConfig[], groups: ColumnGroupConfig[]) => Promise<void>;
  boardStream?: BoardStream;
};

export const MobileSettingsSheet = ({
  isOpen,
  onClose,
  activeView,
  parentColumns,
  childColumns,
  onEditView,
  onParentColumnsSave,
  onChildColumnsSave,
  boardStream,
}: MobileSettingsSheetProps) => {
  const theme = useTheme();
  const { spacing, font, colors } = theme;

  return (
    <BottomSheet theme={theme} isOpen={isOpen} title="Настройки" onClose={onClose} portalTarget="inline">
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.lg }}>
        <div>
          <div style={{ fontSize: font.sizeXs, color: colors.textMuted, marginBottom: spacing.xs }}>
            Режим раскрытия
          </div>
          <ExpandModeToggle />
        </div>
        <ParserLabelFilter boardStream={boardStream} />
        <div>
          <div style={{ fontSize: font.sizeXs, color: colors.textMuted, marginBottom: spacing.xs }}>
            Отображение групп
          </div>
          <GroupChipModeToggle />
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
          <ColumnPicker
            target="child"
            columns={childColumns}
            groups={activeView?.childGroups ?? []}
            onSave={onChildColumnsSave}
          />
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
      </div>
    </BottomSheet>
  );
};
