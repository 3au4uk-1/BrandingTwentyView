import { useState } from 'react';

import { BOARD_STREAM, type BoardStream } from 'src/constants/product-stream';

import { isCrmparserConfigured } from './api/crmparser';
import { ColumnPicker } from './ColumnPicker';
import { ExpandModeToggle } from './ExpandModeToggle';
import { GroupChipModeToggle } from './GroupChipModeToggle';
import { useExpandMode } from './hooks/useExpandMode';
import { useGroupChipMode } from './hooks/useGroupChipMode';
import { useParserLabelFilter } from './hooks/useParserLabelFilter';
import { useTypeSections } from './hooks/useTypeSections';
import { ParserLabelFilter } from './ParserLabelFilter';
import {
  isDisplayTabDirty,
  isLabelsTabAvailable,
  isLabelsTabDirty,
  type RibbonTab,
} from './ribbon-state';
import { useTheme } from './theme/ThemeContext';
import { TypeSectionsToggle } from './TypeSectionsToggle';
import { Button } from './ui/Button';
import type { ColumnConfig, ColumnGroupConfig } from './types';
import { parserLabelsForBoard } from './utils/parser-label-filter';

const TAB_LABEL: Record<RibbonTab, string> = {
  display: 'Отображение',
  labels: 'Ярлыки',
  board: 'Доска',
};

type RibbonTabButtonsProps = {
  openTab: RibbonTab | null;
  boardStream?: BoardStream;
  onToggle: (tab: RibbonTab) => void;
};

export const RibbonTabButtons = ({ openTab, boardStream, onToggle }: RibbonTabButtonsProps) => {
  const theme = useTheme();
  const { colors, font } = theme;
  const { mode } = useExpandMode();
  const { enabled } = useTypeSections();
  const { mode: groupChipMode } = useGroupChipMode();
  const { hiddenIds } = useParserLabelFilter();
  const stream = boardStream ?? BOARD_STREAM.BRANDING;
  const labelsAvailable = isLabelsTabAvailable(
    parserLabelsForBoard(stream).length,
    isCrmparserConfigured(),
  );
  const dirty: Record<RibbonTab, boolean> = {
    display: isDisplayTabDirty({
      expandMode: mode,
      typeSectionsEnabled: enabled,
      groupChipMode,
    }),
    labels: isLabelsTabDirty(hiddenIds.size),
    board: false,
  };
  const tabs: RibbonTab[] = labelsAvailable
    ? ['display', 'labels', 'board']
    : ['display', 'board'];

  return (
    <div role="tablist" aria-label="Настройки доски" style={{ display: 'inline-flex', flexShrink: 0 }}>
      {tabs.map((tab) => {
        const selected = openTab === tab;
        return (
          <button
            key={tab}
            type="button"
            role="tab"
            data-ribbon-tab={tab}
            aria-selected={selected}
            onClick={() => onToggle(tab)}
            style={{
              border: 'none',
              borderBottom: `2px solid ${selected ? colors.accent : 'transparent'}`,
              background: 'transparent',
              cursor: 'pointer',
              padding: '6px 8px',
              fontFamily: font.family,
              fontSize: font.sizeXs,
              fontWeight: font.weightSemibold,
              color: selected ? colors.accent : colors.textSecondary,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              whiteSpace: 'nowrap',
            }}
          >
            {TAB_LABEL[tab]}
            {dirty[tab] ? (
              <span
                aria-hidden
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: colors.accent,
                  flexShrink: 0,
                }}
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
};

export type BoardRibbonProps = {
  openTab: RibbonTab;
  boardStream?: BoardStream;
  settingsDisabled?: boolean;
  onEditView: () => void;
  parentColumns: ColumnConfig[];
  childColumns: ColumnConfig[];
  childGroups: ColumnGroupConfig[];
  onParentColumnsSave: (columns: ColumnConfig[]) => Promise<void>;
  onChildColumnsSave: (columns: ColumnConfig[], groups: ColumnGroupConfig[]) => Promise<void>;
  onLinkDeals?: () => void;
};

export const BoardRibbon = ({
  openTab,
  boardStream,
  settingsDisabled = false,
  onEditView,
  parentColumns,
  childColumns,
  childGroups,
  onParentColumnsSave,
  onChildColumnsSave,
  onLinkDeals,
}: BoardRibbonProps) => {
  const theme = useTheme();
  const { colors, spacing } = theme;
  const [parentPickerOpen, setParentPickerOpen] = useState(false);
  const [childPickerOpen, setChildPickerOpen] = useState(false);

  return (
    <div
      role="tabpanel"
      data-board-ribbon={openTab}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: spacing.sm,
        flexWrap: 'nowrap',
        overflowX: 'auto',
        minHeight: 40,
        minWidth: 0,
        padding: `4px 0 0`,
        borderTop: `1px solid ${colors.borderSubtle}`,
      }}
    >
      {openTab === 'display' ? (
        <>
          <ExpandModeToggle />
          <TypeSectionsToggle />
          <GroupChipModeToggle />
        </>
      ) : null}
      {openTab === 'labels' ? <ParserLabelFilter boardStream={boardStream} /> : null}
      {openTab === 'board' ? (
        <>
          <Button
            theme={theme}
            variant="secondary"
            size="sm"
            disabled={settingsDisabled}
            onClick={onEditView}
          >
            Название view
          </Button>
          <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
            <Button
              theme={theme}
              variant="secondary"
              size="sm"
              disabled={settingsDisabled}
              onClick={() => setParentPickerOpen(true)}
            >
              Колонки сделок
            </Button>
            <ColumnPicker
              target="parent"
              columns={parentColumns}
              open={parentPickerOpen}
              onOpenChange={setParentPickerOpen}
              hideTrigger
              onSave={(columns) => onParentColumnsSave(columns)}
            />
          </span>
          <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0 }}>
            <Button
              theme={theme}
              variant="secondary"
              size="sm"
              disabled={settingsDisabled}
              onClick={() => setChildPickerOpen(true)}
            >
              Колонки позиций
            </Button>
            <ColumnPicker
              target="child"
              columns={childColumns}
              groups={childGroups}
              open={childPickerOpen}
              onOpenChange={setChildPickerOpen}
              hideTrigger
              onSave={(columns, groups) => onChildColumnsSave(columns, groups)}
            />
          </span>
          {onLinkDeals ? (
            <Button theme={theme} variant="secondary" size="sm" onClick={onLinkDeals}>
              Связать сделки
            </Button>
          ) : null}
        </>
      ) : null}
    </div>
  );
};
