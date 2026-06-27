import type { ReactNode } from 'react';

import type { LineItemStage } from 'src/constants/stages';

import { LinkCell } from '../editors/LinkCell';
import { RichTextPopover } from '../editors/RichTextPopover';
import { StageSelect } from '../editors/StageSelect';
import { useTheme } from '../theme/ThemeContext';
import { EMPTY_VALUE } from '../theme/tokens';
import { ChevronRightIcon } from '../ui/Icons';
import type { LineItemRow } from '../types';

import { DealSummaryChips } from '../DealsTable/DealSummaryChips';

export type FieldOverrideProps = {
  field: string;
  recordId: string;
  value: unknown;
  variant?: 'parent' | 'child';
  lineItems?: LineItemRow[];
  isExpanded?: boolean;
  companyName?: string;
  tonyLink?: { primaryLinkUrl?: string };
  bitrixLink?: { primaryLinkUrl?: string };
  onToggleExpand?: (id: string) => void;
};

const ParentNameCell = ({
  recordId,
  value,
  lineItems,
  isExpanded,
  onToggleExpand,
}: FieldOverrideProps) => {
  const theme = useTheme();
  const { colors, font, spacing } = theme;
  const canExpand = (lineItems?.length ?? 0) > 0;
  const name = typeof value === 'string' ? value : '';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, minWidth: 0 }}>
      {canExpand ? (
        <button
          type="button"
          onClick={() => onToggleExpand?.(recordId)}
          style={{
            border: 'none',
            background: 'transparent',
            padding: 0,
            width: '20px',
            minWidth: '20px',
            height: '20px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.textMuted,
            cursor: 'pointer',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease',
          }}
          aria-label={isExpanded ? 'Свернуть позиции' : 'Развернуть позиции'}
        >
          <ChevronRightIcon size={14} color={colors.textSecondary} />
        </button>
      ) : (
        <span style={{ width: '20px', minWidth: '20px' }} />
      )}
      <span
        style={{
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontWeight: font.weightMedium,
          color: colors.text,
        }}
      >
        {name}
      </span>
    </div>
  );
};

const ChildNameCell = ({ value }: FieldOverrideProps) => {
  const theme = useTheme();
  const { colors, font } = theme;
  const name = typeof value === 'string' ? value : '';

  return (
    <span style={{ fontWeight: font.weightMedium, color: colors.text }}>{name}</span>
  );
};

const LinksCell = ({ tonyLink, bitrixLink }: FieldOverrideProps) => {
  const theme = useTheme();
  const { colors, font, spacing } = theme;
  const tonyUrl = tonyLink?.primaryLinkUrl;
  const bitrixUrl = bitrixLink?.primaryLinkUrl;

  return (
    <div style={{ display: 'inline-flex', gap: spacing.xs }}>
      {tonyUrl ? (
        <a
          href={tonyUrl}
          target="_blank"
          rel="noreferrer"
          title="Tony"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: theme.radius.sm,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.bgElevated,
            color: colors.textSecondary,
            textDecoration: 'none',
            fontSize: font.sizeXs,
            fontWeight: font.weightSemibold,
          }}
        >
          T
        </a>
      ) : null}
      {bitrixUrl ? (
        <a
          href={bitrixUrl}
          target="_blank"
          rel="noreferrer"
          title="Bitrix"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '24px',
            height: '24px',
            borderRadius: theme.radius.sm,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.bgElevated,
            color: colors.textSecondary,
            textDecoration: 'none',
            fontSize: font.sizeXs,
            fontWeight: font.weightSemibold,
          }}
        >
          B
        </a>
      ) : null}
      {!tonyUrl && !bitrixUrl ? EMPTY_VALUE : null}
    </div>
  );
};

export const renderFieldOverride = (props: FieldOverrideProps): ReactNode | null => {
  const { field, recordId, value, variant, lineItems, isExpanded, companyName } = props;

  switch (field) {
    case 'name':
      return variant === 'parent' ? <ParentNameCell {...props} /> : <ChildNameCell {...props} />;
    case 'stage':
      return <StageSelect itemId={recordId} value={value as LineItemStage | null | undefined} />;
    case 'ssylkaNaMakety':
      return (
        <LinkCell
          itemId={recordId}
          value={value as { primaryLinkUrl?: string; primaryLinkLabel?: string } | undefined}
        />
      );
    case 'plenka':
      return (
        <RichTextPopover
          itemId={recordId}
          field="plenka.markdown"
          value={(value as { markdown?: string } | undefined)?.markdown}
        />
      );
    case 'kommentariy':
      return (
        <RichTextPopover
          itemId={recordId}
          field="kommentariy"
          value={typeof value === 'string' ? value : undefined}
        />
      );
    case 'summary':
      return isExpanded ? EMPTY_VALUE : <DealSummaryChips items={lineItems ?? []} />;
    case 'companyName':
      return companyName ?? EMPTY_VALUE;
    case 'links':
      return <LinksCell {...props} />;
    default:
      return null;
  }
};
