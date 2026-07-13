import { useState } from 'react';

import { APP_DISPLAY_NAME } from 'src/constants/universal-identifiers';

import { useTheme } from '../theme/ThemeContext';
import { Button } from '../ui/Button';
import { ChevronDownIcon } from '../ui/Icons';
import { Input } from '../ui/Input';
import type { DealBoardViewRecord } from '../types';

type MobileToolbarProps = {
  activeView?: DealBoardViewRecord;
  totalCount?: number;
  search: string;
  onSearchChange: (value: string) => void;
  onOpenViewSheet: () => void;
  onOpenSettingsSheet: () => void;
};

export const MobileToolbar = ({
  activeView,
  totalCount,
  search,
  onSearchChange,
  onOpenViewSheet,
  onOpenSettingsSheet,
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
      <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm }}>
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
          variant="ghost"
          size="sm"
          onClick={() => setSearchExpanded((value) => !value)}
          aria-label="Поиск"
          style={{ minWidth: 44, minHeight: 44 }}
        >
          🔍
        </Button>
        <Button
          theme={theme}
          variant="ghost"
          size="sm"
          onClick={onOpenSettingsSheet}
          aria-label="Настройки"
          style={{ minWidth: 44, minHeight: 44 }}
        >
          ≡
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
