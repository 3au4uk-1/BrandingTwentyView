import type { MouseEvent, ReactNode } from 'react';

import { getOpportunityLinkButtonLabel } from 'src/constants/opportunity-links';

import type { LineItemStage } from 'src/constants/stages';

import { Chip } from '../Chip';
import { DealStageSelect } from '../editors/DealStageSelect';
import { LinkCell } from '../editors/LinkCell';
import { RichTextPopover } from '../editors/RichTextPopover';
import { StageSelect } from '../editors/StageSelect';
import { TimePickerModal } from '../editors/TimePickerModal';
import { useTheme } from '../theme/ThemeContext';
import { EMPTY_VALUE } from '../theme/tokens';
import { ChevronRightIcon } from '../ui/Icons';
import type { FieldDescriptor } from '../metadata/types';
import type { LineItemRow } from '../types';

import { DealSummaryChips } from '../DealsTable/DealSummaryChips';

import { openRecordSidePanel } from '../utils/open-record-side-panel';

import { formatReadOnlyValue } from './format-read-only-value';

export type FieldOverrideProps = {
  field: string;
  recordId: string;
  value: unknown;
  variant?: 'parent' | 'child';
  lineItems?: LineItemRow[];
  isExpanded?: boolean;
  companyName?: string;
  row?: Record<string, unknown>;
  opportunityLinkFields?: FieldDescriptor[];
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

  const handleOpenRecord = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    void openRecordSidePanel('opportunity', recordId);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, minWidth: 0 }}>
      {canExpand ? (
        <button
          type="button"
          data-expand-btn
          onClick={() => onToggleExpand?.(recordId)}
          style={{
            border: 'none',
            background: 'transparent',
            padding: '2px',
            width: '22px',
            minWidth: '22px',
            height: '22px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isExpanded ? colors.accentText : colors.textMuted,
            cursor: 'pointer',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease, color 0.12s ease, background-color 0.12s ease',
            flexShrink: 0,
          }}
          aria-label={isExpanded ? 'Свернуть позиции' : 'Развернуть позиции'}
        >
          <ChevronRightIcon size={14} color="currentColor" />
        </button>
      ) : (
        <span style={{ width: '22px', minWidth: '22px' }} />
      )}
      <button
        type="button"
        onClick={handleOpenRecord}
        title={name}
        style={{
          minWidth: 0,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontWeight: font.weightMedium,
          color: colors.accentText,
          border: 'none',
          background: 'transparent',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
          fontFamily: 'inherit',
          fontSize: 'inherit',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </button>
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

const LinksCell = ({ row, opportunityLinkFields }: FieldOverrideProps) => {
  const theme = useTheme();
  const { colors, font, spacing } = theme;

  if (!row || !opportunityLinkFields?.length) {
    return EMPTY_VALUE;
  }

  const links = opportunityLinkFields
    .map((field) => {
      const linkValue = row[field.field] as { primaryLinkUrl?: string } | undefined;
      const url = linkValue?.primaryLinkUrl?.trim();
      if (!url) return null;

      const button = getOpportunityLinkButtonLabel(field.field, field.label);
      return { field: field.field, url, button };
    })
    .filter((link): link is NonNullable<typeof link> => link !== null);

  if (!links.length) {
    return EMPTY_VALUE;
  }

  return (
    <div style={{ display: 'inline-flex', gap: spacing.xs }}>
      {links.map(({ field, url, button }) => (
        <a
          key={field}
          href={url}
          target="_blank"
          rel="noreferrer"
          title={button.title}
          data-link-chip
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '26px',
            height: '26px',
            borderRadius: theme.radius.sm,
            border: `1px solid ${colors.border}`,
            backgroundColor: colors.bgTertiary,
            color: colors.textSecondary,
            textDecoration: 'none',
            fontSize: font.sizeXs,
            fontWeight: font.weightSemibold,
            transition: 'background-color 0.12s ease, border-color 0.12s ease, color 0.12s ease',
          }}
        >
          {button.shortLabel}
        </a>
      ))}
    </div>
  );
};

const AmountChipCell = ({ value }: FieldOverrideProps) => {
  const theme = useTheme();
  const amountText = formatReadOnlyValue('CURRENCY', value);
  return amountText === EMPTY_VALUE ? amountText : <Chip text={amountText} color="gray" theme={theme} />;
};

const OplataChipCell = ({ value }: FieldOverrideProps) => {
  const theme = useTheme();
  const oplataText = typeof value === 'string' ? value : EMPTY_VALUE;
  return <Chip text={oplataText || EMPTY_VALUE} color={value ? 'green' : 'gray'} theme={theme} />;
};

export const renderFieldOverride = (props: FieldOverrideProps): ReactNode | null => {
  const { field, recordId, value, variant, lineItems, isExpanded, companyName } = props;

  switch (field) {
    case 'name':
      return variant === 'parent' ? <ParentNameCell {...props} /> : <ChildNameCell {...props} />;
    case 'stage':
      if (variant === 'parent') {
        return (
          <DealStageSelect
            recordId={recordId}
            value={value as string | null | undefined}
            stageZakreplen={
              typeof props.row?.stageZakreplen === 'boolean' ? props.row.stageZakreplen : null
            }
          />
        );
      }

      return (
        <StageSelect
          objectName="dealLineItem"
          recordId={recordId}
          value={value as LineItemStage | null | undefined}
        />
      );
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
    case 'kommentariyDlyaPechati':
      return (
        <RichTextPopover
          itemId={recordId}
          field="kommentariyDlyaPechati"
          value={typeof value === 'string' ? value : undefined}
        />
      );
    case 'vremyaGotovnostiPechati':
      return (
        <TimePickerModal
          objectName="dealLineItem"
          recordId={recordId}
          fieldName="vremyaGotovnostiPechati"
          value={typeof value === 'string' ? value : null}
        />
      );
    case 'summary':
      return isExpanded ? EMPTY_VALUE : <DealSummaryChips items={lineItems ?? []} />;
    case 'companyName':
      return companyName ?? EMPTY_VALUE;
    case 'links':
      return <LinksCell {...props} />;
    case 'amount':
      return <AmountChipCell {...props} />;
    case 'oplata':
      return <OplataChipCell {...props} />;
    default:
      return null;
  }
};
