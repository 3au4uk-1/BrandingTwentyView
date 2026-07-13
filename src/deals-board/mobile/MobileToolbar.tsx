import { useState } from 'react';

import { APP_DISPLAY_NAME } from 'src/constants/universal-identifiers';

import { useTheme } from '../theme/ThemeContext';
import { Button } from '../ui/Button';
import { ChevronDownIcon, SettingsIcon } from '../ui/Icons';
import { Input } from '../ui/Input';
import type { DealBoardViewRecord } from '../types';

type MobileToolbarProps = {
  activeView?: DealBoardViewRecord;
  totalCount?: number;
  search: string;
  onSearchChange: (value: string) => void;
  onOpenViewSheet: () => void;
  onOpenSettingsSheet: () => void;
  onOpenFiltersSheet: () => void;
  activeFilterCount: number;
};

const SearchIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <circle cx="11" cy="11" r="7" stroke={color} strokeWidth="1.8" />
    <path d="M20 20L16.5 16.5" stroke={color} strokeWidth="1.8" strokeLinecap="round" />
  </svg>
);

const FilterIcon = ({ size = 18, color = 'currentColor' }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path
      d="M4 6H20M7 12H17M10 18H14"
      stroke={color}
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

export const MobileToolbar = ({
  activeView,
  totalCount,
  search,
  onSearchChange,
  onOpenViewSheet,
  onOpenSettingsSheet,
  onOpenFiltersSheet,
  activeFilterCount,
}: MobileToolbarProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius, layout } = theme;
  const [searchExpanded, setSearchExpanded] = useState(Boolean(search));

  return (
    <div
      data-mobile-toolbar
      style={{
        position: 'sticky',
        top: 0,
        zIndex: theme.zIndex.dropdown,
        display: 'flex',
        flexDirection: 'column',
        gap: spacing.sm,
        padding: `${spacing.sm} ${spacing.md}`,
        minHeight: layout.toolbarHeight,
        borderBottom: `1px solid ${colors.border}`,
        backgroundColor: colors.bgSecondary,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
        <button
          type="button"
          onClick={onOpenViewSheet}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.xs,
            flex: 1,
            minWidth: 0,
            minHeight: 44,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.md,
            backgroundColor: colors.bg,
            padding: `0 ${spacing.sm}`,
            cursor: 'pointer',
            fontFamily: font.family,
            color: colors.text,
            touchAction: 'manipulation',
          }}
        >
          <span style={{ fontSize: font.sizeXs, color: colors.textMuted, flexShrink: 0 }}>
            {APP_DISPLAY_NAME}
          </span>
          <span
            style={{
              fontSize: font.sizeSm,
              fontWeight: font.weightMedium,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              flex: 1,
              textAlign: 'left',
            }}
          >
            {activeView?.name ?? '…'}
          </span>
          {typeof totalCount === 'number' ? (
            <span style={{ fontSize: font.sizeXs, color: colors.textMuted, flexShrink: 0 }}>
              {totalCount}
            </span>
          ) : null}
          <ChevronDownIcon size={14} color={colors.textMuted} />
        </button>

        <Button
          theme={theme}
          variant={activeFilterCount > 0 ? 'secondary' : 'ghost'}
          size="sm"
          onClick={onOpenFiltersSheet}
          aria-label={activeFilterCount > 0 ? `Фильтры: ${activeFilterCount}` : 'Фильтры'}
          style={{ minWidth: 44, minHeight: 44, position: 'relative' }}
        >
          <FilterIcon color={activeFilterCount > 0 ? colors.accentText : colors.textMuted} />
        </Button>

        <Button
          theme={theme}
          variant="ghost"
          size="sm"
          onClick={() => setSearchExpanded((value) => !value)}
          aria-label="Поиск"
          style={{ minWidth: 44, minHeight: 44 }}
        >
          <SearchIcon color={search ? colors.accentText : colors.textMuted} />
        </Button>

        <Button
          theme={theme}
          variant="ghost"
          size="sm"
          onClick={onOpenSettingsSheet}
          aria-label="Настройки"
          style={{ minWidth: 44, minHeight: 44 }}
        >
          <SettingsIcon size={18} color={colors.textMuted} />
        </Button>
      </div>

      {searchExpanded ? (
        <Input
          theme={theme}
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Поиск…"
          style={{ minHeight: 44 }}
        />
      ) : null}
    </div>
  );
};
