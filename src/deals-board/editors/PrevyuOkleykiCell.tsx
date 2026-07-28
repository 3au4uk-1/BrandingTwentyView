import { type MouseEvent as ReactMouseEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';

import { useTheme } from '../theme/ThemeContext';
import type { LineItemFileRef, LineItemRow } from '../types';
import { openOkleykaDialogForLineItem } from '../utils/open-okleyka-dialog';
import { openRecordSidePanel } from '../utils/open-record-side-panel';
import { findOpportunityInCache } from '../utils/sync-deal-stage';

type PrevyuOkleykiCellProps = {
  itemId: string;
  opportunityId?: string;
  stage?: string | null;
  value?: LineItemFileRef[] | null;
  row?: Record<string, unknown>;
};

/**
 * Preview attachment lives on the native FILES field. Remote DOM cannot open
 * a reliable paste window; Ctrl+V works in the record side panel.
 */
export const PrevyuOkleykiCell = ({
  itemId,
  opportunityId,
  stage,
  value,
  row,
}: PrevyuOkleykiCellProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius } = theme;
  const queryClient = useQueryClient();

  const files = value ?? [];
  const hasPreview = files.length > 0;
  const resolvedOpportunityId =
    opportunityId ||
    (typeof row?.opportunityId === 'string' ? row.opportunityId : undefined);

  const openCard = () => {
    openRecordSidePanel('dealLineItem', itemId);
  };

  const handleOpenOkleyka = (event: ReactMouseEvent) => {
    event.stopPropagation();
    if (!resolvedOpportunityId) return;
    const opportunity = findOpportunityInCache(queryClient, resolvedOpportunityId);
    if (!opportunity) return;
    const lineItem = {
      ...(row as LineItemRow),
      id: itemId,
      opportunityId: resolvedOpportunityId,
      name: typeof row?.name === 'string' ? row.name : '',
      prevyuOkleyki: files,
      stage: stage ?? (typeof row?.stage === 'string' ? row.stage : null),
    } satisfies LineItemRow;
    openOkleykaDialogForLineItem(opportunity, lineItem);
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        minWidth: 0,
      }}
      onClick={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        title="Открыть карточку — Ctrl+V в поле «Превью оклейки»"
        data-prevyu-chip={hasPreview ? 'filled' : 'empty'}
        onClick={openCard}
        style={{
          alignSelf: 'flex-start',
          border: `1px solid ${hasPreview ? colors.success : colors.border}`,
          background: hasPreview ? colors.successMuted : 'transparent',
          color: hasPreview ? colors.success : colors.textMuted,
          borderRadius: radius.pill,
          fontSize: font.sizeSm,
          fontWeight: font.weightSemibold,
          padding: `3px ${spacing.sm}`,
          cursor: 'pointer',
          lineHeight: 1.2,
        }}
      >
        Превью{hasPreview ? ` · ${files.length}` : ''}
      </button>

      {stage === 'OKLEYKA' ? (
        <button
          type="button"
          onClick={handleOpenOkleyka}
          style={{
            alignSelf: 'flex-start',
            border: 'none',
            background: 'transparent',
            color: colors.accent,
            fontSize: font.sizeSm,
            cursor: 'pointer',
            padding: 0,
          }}
        >
          В оклейку…
        </button>
      ) : null}
    </div>
  );
};
