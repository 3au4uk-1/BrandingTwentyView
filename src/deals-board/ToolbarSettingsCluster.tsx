import { useCallback, useEffect, useRef, useState } from 'react';

import { ColumnPicker } from './ColumnPicker';
import { GroupChipModeToggle } from './GroupChipModeToggle';
import { useOutsideDismiss } from './hooks/useOutsideDismiss';
import { useTheme } from './theme/ThemeContext';
import { Button } from './ui/Button';
import { SettingsIcon } from './ui/Icons';
import type { ColumnConfig, ColumnGroupConfig } from './types';

type ToolbarSettingsClusterProps = {
  disabled?: boolean;
  onEditView: () => void;
  parentColumns: ColumnConfig[];
  childColumns: ColumnConfig[];
  childGroups: ColumnGroupConfig[];
  onParentColumnsSave: (columns: ColumnConfig[]) => Promise<void>;
  onChildColumnsSave: (columns: ColumnConfig[], groups: ColumnGroupConfig[]) => Promise<void>;
};

export const ToolbarSettingsCluster = ({
  disabled = false,
  onEditView,
  parentColumns,
  childColumns,
  childGroups,
  onParentColumnsSave,
  onChildColumnsSave,
}: ToolbarSettingsClusterProps) => {
  const theme = useTheme();
  const { colors, radius, font, spacing, zIndex } = theme;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [parentPickerOpen, setParentPickerOpen] = useState(false);
  const [childPickerOpen, setChildPickerOpen] = useState(false);
  const clusterRef = useRef<HTMLDivElement | null>(null);
  const dismissMenu = useCallback(() => setIsMenuOpen(false), []);
  useOutsideDismiss(isMenuOpen, clusterRef, dismissMenu);

  const menuItemStyle = {
    width: '100%',
    border: 'none',
    backgroundColor: 'transparent',
    color: colors.text,
    textAlign: 'left' as const,
    padding: '8px 10px',
    borderRadius: radius.sm,
    fontSize: font.sizeSm,
    fontWeight: font.weightNormal,
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontFamily: font.family,
    opacity: disabled ? 0.5 : 1,
  };

  return (
    <div
      ref={clusterRef}
      style={{ position: 'relative', display: 'flex', alignItems: 'center', flexShrink: 0 }}
    >
      <Button
        theme={theme}
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={() => setIsMenuOpen((prev) => !prev)}
        aria-expanded={isMenuOpen}
        aria-haspopup="menu"
        aria-label="Настройки доски"
        title="Настройки: view, колонки, группы, отображение"
        style={{ padding: '6px 8px' }}
      >
        <SettingsIcon size={16} color={colors.textMuted} />
      </Button>

      {isMenuOpen ? (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: '260px',
            zIndex: zIndex.dropdown,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.lg,
            backgroundColor: colors.bgElevated,
            boxShadow: colors.shadowLg,
            padding: spacing.sm,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            gap: spacing.xs,
          }}
        >
          <div
            style={{
              fontSize: font.sizeXs,
              fontWeight: font.weightSemibold,
              color: colors.textMuted,
              padding: '2px 10px 6px',
              letterSpacing: '0.02em',
            }}
          >
            Управление доской
          </div>
          <button
            type="button"
            role="menuitem"
            disabled={disabled}
            onClick={() => {
              setIsMenuOpen(false);
              onEditView();
            }}
            style={menuItemStyle}
          >
            Редактировать view / название
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={disabled}
            onClick={() => {
              setIsMenuOpen(false);
              setParentPickerOpen(true);
            }}
            style={menuItemStyle}
          >
            Колонки: сделки
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={disabled}
            onClick={() => {
              setIsMenuOpen(false);
              setChildPickerOpen(true);
            }}
            style={menuItemStyle}
          >
            Колонки / группы: позиции
          </button>
          <div
            style={{
              borderTop: `1px solid ${colors.borderSubtle}`,
              marginTop: 4,
              paddingTop: 8,
              paddingLeft: 10,
              paddingRight: 10,
              paddingBottom: 4,
            }}
          >
            <div
              style={{
                fontSize: font.sizeXs,
                color: colors.textMuted,
                marginBottom: 6,
              }}
            >
              Чипы групп
            </div>
            <GroupChipModeToggle />
          </div>
          <p
            style={{
              margin: '4px 10px 0',
              fontSize: 10,
              color: colors.textMuted,
              lineHeight: 1.35,
            }}
          >
            Цвета строк стадий — в колонке «Стадия». Подписи блоков сводки / внимания
            пока в коде приложения.
          </p>
        </div>
      ) : null}

      <div
        style={{
          position: 'absolute',
          right: 0,
          bottom: 0,
          width: 0,
          height: 0,
          overflow: 'visible',
        }}
      >
        <ColumnPicker
          target="parent"
          columns={parentColumns}
          open={parentPickerOpen}
          onOpenChange={setParentPickerOpen}
          hideTrigger
          onSave={(columns) => onParentColumnsSave(columns)}
        />
        <ColumnPicker
          target="child"
          columns={childColumns}
          groups={childGroups}
          open={childPickerOpen}
          onOpenChange={setChildPickerOpen}
          hideTrigger
          onSave={(columns, groups) => onChildColumnsSave(columns, groups)}
        />
      </div>
    </div>
  );
};
