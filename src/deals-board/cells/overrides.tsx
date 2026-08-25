import type { MouseEvent, ReactNode } from 'react';

import { getOpportunityLinkButtonLabel } from 'src/constants/opportunity-links';

import type { BoardStream } from 'src/constants/product-stream';
import { BOARD_STREAM } from 'src/constants/product-stream';

import type { LineItemType } from 'src/constants/line-item-types';
import type { LineItemStage } from 'src/constants/stages';

import { Chip } from '../Chip';
import { LineItemListMenu } from '../LineItemListMenu';
import { useLineItemListStatus } from '../hooks/useLineItemListStatus';
import { isCrmparserConfigured } from '../api/crmparser';
import { DealStageSelect } from '../editors/DealStageSelect';
import { CurrencyAmountCell } from '../editors/CurrencyAmountCell';
import { DatePickerModal } from '../editors/DatePickerModal';
import { LinkCell } from '../editors/LinkCell';
import { PrevyuOkleykiCell } from '../editors/PrevyuOkleykiCell';
import {
  PrintProgressCell,
  shouldRenderPrintProgress,
  type PrintProgressField,
} from '../editors/PrintProgressCell';
import { RichTextPopover } from '../editors/RichTextPopover';
import { StageSelect } from '../editors/StageSelect';
import { TextCell } from '../editors/TextCell';
import { TypeSelect } from '../editors/TypeSelect';
import { TipDetailSelect } from '../editors/TipDetailSelect';
import { SupplierCombobox } from '../editors/SupplierCombobox';
import { usesSupplierPicker } from '../suppliers/picker';
import { TimePickerModal } from '../editors/TimePickerModal';
import { useTheme } from '../theme/ThemeContext';
import { EMPTY_VALUE } from '../theme/tokens';
import { ChevronRightIcon, ExternalLinkIcon } from '../ui/Icons';
import type { FieldDescriptor } from '../metadata/types';
import type { LineItemFileRef, LineItemRow } from '../types';

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
  hideExpandButton?: boolean;
  listMenuPresentation?: 'inline' | 'sheet';
  boardStream?: BoardStream;
  touchFriendly?: boolean;
  visibleFields?: readonly string[];
};

const ParentNameCell = ({
  recordId,
  value,
  isExpanded,
  onToggleExpand,
  hideExpandButton = false,
  touchFriendly = false,
}: FieldOverrideProps) => {
  const theme = useTheme();
  const { colors, font, spacing } = theme;
  const name = typeof value === 'string' ? value : '';

  const handleOpenRecord = (event: MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    void openRecordSidePanel('opportunity', recordId);
  };

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, minWidth: 0 }}>
      {!hideExpandButton ? (
        <button
          type="button"
          data-expand-btn
          onClick={() => onToggleExpand?.(recordId)}
          style={{
            border: 'none',
            background: 'transparent',
            padding: touchFriendly ? '10px' : '2px',
            width: touchFriendly ? '44px' : '22px',
            minWidth: touchFriendly ? '44px' : '22px',
            height: touchFriendly ? '44px' : '22px',
            minHeight: touchFriendly ? '44px' : '22px',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isExpanded ? colors.accentText : colors.textMuted,
            cursor: 'pointer',
            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
            transition: 'transform 0.15s ease, color 0.12s ease, background-color 0.12s ease',
            flexShrink: 0,
            touchAction: touchFriendly ? 'manipulation' : undefined,
          }}
          aria-label={isExpanded ? 'Свернуть позиции' : 'Развернуть позиции'}
        >
          <ChevronRightIcon size={14} color="currentColor" />
        </button>
      ) : null}
      <span
        title={name}
        style={{
          minWidth: 0,
          flex: 1,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          fontWeight: font.weightMedium,
          color: colors.text,
          userSelect: 'text',
          cursor: 'text',
          textAlign: 'left',
          fontFamily: 'inherit',
          fontSize: 'inherit',
          whiteSpace: 'nowrap',
        }}
      >
        {name}
      </span>
      <button
        type="button"
        onClick={handleOpenRecord}
        title="Открыть карточку"
        aria-label="Открыть карточку сделки"
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
          color: colors.accentText,
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        <ExternalLinkIcon size={12} color="currentColor" />
      </button>
    </div>
  );
};

const ChildNameCell = ({
  value,
  recordId,
  listMenuPresentation,
  boardStream = BOARD_STREAM.BRANDING,
}: FieldOverrideProps) => {
  const theme = useTheme();
  const { data: listStatus } = useLineItemListStatus(recordId);
  const showListMenu = isCrmparserConfigured();
  const name = typeof value === 'string' ? value : '';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
      <div style={{ minWidth: 0, flex: 1 }}>
        <TextCell
          objectName="dealLineItem"
          recordId={recordId}
          fieldName="name"
          value={name}
        />
      </div>
      {listStatus?.restorationMatch ? (
        <Chip text="реставрация · 0 ₽" color="yellow" theme={theme} />
      ) : null}
      {listStatus?.blacklisted ? <Chip text="блеклист" color="red" theme={theme} /> : null}
      {listStatus?.decorBlacklisted ? (
        <Chip text="блеклист декор" color="red" theme={theme} />
      ) : null}
      {listStatus?.mkBlacklisted ? <Chip text="блеклист МК" color="red" theme={theme} /> : null}
      {listStatus?.podryadMatch ? <Chip text="подряд" color="blue" theme={theme} /> : null}
      {listStatus?.bannerMatch ? <Chip text="баннер" color="green" theme={theme} /> : null}
      {showListMenu && recordId ? (
        <LineItemListMenu
          lineItemId={recordId}
          listStatus={listStatus}
          boardStream={boardStream}
          presentation={listMenuPresentation ?? 'inline'}
        />
      ) : null}
    </div>
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
    case 'tip':
      if (variant !== 'child') return null;

      return (
        <TypeSelect
          recordId={recordId}
          value={value as LineItemType | null | undefined}
          tipDetail={
            typeof props.row?.tipDetail === 'string' ? props.row.tipDetail : null
          }
          supplierId={
            typeof props.row?.supplierId === 'string'
              ? props.row.supplierId
              : typeof (props.row?.supplier as { id?: string } | undefined)?.id ===
                  'string'
                ? (props.row.supplier as { id: string }).id
                : null
          }
          supplierCategory={
            typeof (props.row?.supplier as { category?: string } | undefined)
              ?.category === 'string'
              ? (props.row.supplier as { category: string }).category
              : typeof props.row?.tip === 'string'
                ? props.row.tip
                : null
          }
        />
      );
    case 'tipDetail':
      if (variant !== 'child') return null;
      {
        const tip =
          typeof props.row?.tip === 'string' ? (props.row.tip as LineItemType) : null;
        if (usesSupplierPicker(tip)) {
          return (
            <SupplierCombobox
              recordId={recordId}
              tip={tip}
              supplierId={
                typeof props.row?.supplierId === 'string'
                  ? props.row.supplierId
                  : typeof (props.row?.supplier as { id?: string } | undefined)?.id ===
                      'string'
                    ? (props.row.supplier as { id: string }).id
                    : null
              }
              supplierName={
                typeof (props.row?.supplier as { name?: string } | undefined)?.name ===
                'string'
                  ? (props.row.supplier as { name: string }).name
                  : null
              }
            />
          );
        }
        return (
          <TipDetailSelect
            recordId={recordId}
            tip={tip}
            value={typeof value === 'string' ? value : null}
          />
        );
      }
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
    case 'prevyuOkleyki':
      return (
        <PrevyuOkleykiCell
          itemId={recordId}
          opportunityId={
            typeof props.row?.opportunityId === 'string'
              ? props.row.opportunityId
              : undefined
          }
          stage={
            typeof props.row?.stage === 'string' || props.row?.stage === null
              ? (props.row.stage as string | null)
              : undefined
          }
          value={value as LineItemFileRef[] | null | undefined}
          row={props.row}
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
    case 'loadDate':
      if (variant !== 'parent') return null;

      return (
        <DatePickerModal
          objectName="opportunity"
          recordId={recordId}
          fieldName="loadDate"
          value={typeof value === 'string' ? value : null}
          emphasized
        />
      );
    case 'summary':
      return isExpanded ? EMPTY_VALUE : <DealSummaryChips items={lineItems ?? []} />;
    case 'companyName':
      return companyName ?? EMPTY_VALUE;
    case 'links':
      return <LinksCell {...props} />;
    case 'amount':
      if (variant === 'child') {
        return (
          <CurrencyAmountCell
            objectName="dealLineItem"
            recordId={recordId}
            fieldName="amount"
            value={value as { amountMicros?: number; currencyCode?: string } | null | undefined}
          />
        );
      }
      return <AmountChipCell {...props} />;
    case 'oplata':
      return <OplataChipCell {...props} />;
    case 'vzatoVRabotu':
    case 'gotovo': {
      const visibleFields = props.visibleFields ?? [field];
      if (!shouldRenderPrintProgress(field as PrintProgressField, visibleFields)) return null;

      const showBoth =
        visibleFields.includes('vzatoVRabotu') && visibleFields.includes('gotovo');

      return (
        <PrintProgressCell
          recordId={recordId}
          vzatoVRabotu={props.row?.vzatoVRabotu === true}
          gotovo={props.row?.gotovo === true}
          mode={showBoth ? 'full' : field === 'vzatoVRabotu' ? 'vzato' : 'gotovo'}
        />
      );
    }
    default:
      return null;
  }
};
