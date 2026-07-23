import { useEffect, useRef, useState } from 'react';

import { ColumnPicker } from './ColumnPicker';
import { useTheme } from './theme/ThemeContext';
import { Button } from './ui/Button';
import { ChevronDownIcon, SettingsIcon } from './ui/Icons';
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

  useEffect(() => {
    if (!isMenuOpen) return;

    const onMouseDown = (event: MouseEvent) => {
      if (!clusterRef.current?.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };

    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [isMenuOpen]);

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
        style={{ gap: spacing.xs }}
      >
        <SettingsIcon size={14} color={colors.textMuted} />
        Настройки
        <ChevronDownIcon color={colors.textMuted} />
      </Button>

      {isMenuOpen ? (
        <div
          role="menu"
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            minWidth: '220px',
            zIndex: zIndex.dropdown,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.lg,
            backgroundColor: colors.bgElevated,
            boxShadow: colors.shadowLg,
            padding: spacing.xs,
            boxSizing: 'border-box',
          }}
        >
          <button
            type="button"
            role="menuitem"
            disabled={disabled}
            onClick={() => {
              setIsMenuOpen(false);
              onEditView();
            }}
            style={menuItemStyle}
            onMouseEnter={(event) => {
              if (!disabled) {
                event.currentTarget.style.backgroundColor = colors.bgHover;
              }
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Редактировать view
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
            onMouseEnter={(event) => {
              if (!disabled) {
                event.currentTarget.style.backgroundColor = colors.bgHover;
              }
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = 'transparent';
            }}
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
            onMouseEnter={(event) => {
              if (!disabled) {
                event.currentTarget.style.backgroundColor = colors.bgHover;
              }
            }}
            onMouseLeave={(event) => {
              event.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Колонки: позиции
          </button>
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
