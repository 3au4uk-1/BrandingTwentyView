import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { getTipDetailLabel } from 'src/constants/tip-detail';

import { fireBannerPodryadCatchupNotify } from '../api/banner-podryad-catchup';
import { createSupplier, updateSupplier } from '../api/suppliers';
import { useUpdateLineItem } from '../hooks/useLineItems';
import { useSuppliers } from '../hooks/useSuppliers';
import {
  commitSupplierNameGuarded,
  createSupplierCommitInFlightGuard,
} from '../suppliers/commit';
import {
  filterSuppliersForPicker,
  supplierDropdownRows,
  type SupplierDropdownRow,
} from '../suppliers/picker';
import { useTheme } from '../theme/ThemeContext';
import { Input } from '../ui/Input';
import { resolvePortalContainer, usePortalHost } from '../ui/PortalHostContext';
import {
  measureElementInRoot,
  resolveAnchoredOverlayPosition,
  type RectLike,
} from '../utils/anchored-overlay';

type SupplierComboboxProps = {
  recordId: string;
  tip: string;
  supplierId: string | null;
  supplierName: string | null;
  tipDetail: string | null;
};

const LIST_ID_PREFIX = 'supplier-picker-list-';
const LIST_MAX_HEIGHT = 220;

const displayValue = (supplierName: string | null, tipDetail: string | null): string => {
  if (supplierName) return supplierName;
  if (tipDetail) return getTipDetailLabel(tipDetail);
  return '';
};

const rowCommitName = (row: SupplierDropdownRow | undefined, draft: string): string => {
  if (row?.kind === 'option') return row.supplier.name;
  if (row?.kind === 'create') return row.name;
  return draft;
};

export const SupplierCombobox = ({
  recordId,
  tip,
  supplierId,
  supplierName,
  tipDetail,
}: SupplierComboboxProps) => {
  const theme = useTheme();
  const queryClient = useQueryClient();
  const portalHostRef = usePortalHost();
  const updateMutation = useUpdateLineItem();
  const { data: suppliers = [] } = useSuppliers();
  const options = useMemo(
    () => filterSuppliersForPicker(suppliers, tip, supplierId),
    [suppliers, tip, supplierId],
  );

  const selectedLabel = displayValue(supplierName, tipDetail);
  const [draft, setDraft] = useState(selectedLabel);
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [anchor, setAnchor] = useState<RectLike | null>(null);

  useEffect(() => {
    setDraft(selectedLabel);
  }, [selectedLabel]);

  const rows = useMemo(() => supplierDropdownRows(draft, options), [draft, options]);

  useEffect(() => {
    if (highlight >= rows.length) setHighlight(0);
  }, [highlight, rows.length]);
  const listId = `${LIST_ID_PREFIX}${recordId}`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const pickingRef = useRef(false);
  const commitGuardRef = useRef(createSupplierCommitInFlightGuard());
  const busy = updateMutation.isPending;

  const invalidateAfterSelect = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
      queryClient.invalidateQueries({ queryKey: ['lineItems'] }),
      queryClient.invalidateQueries({ queryKey: ['deals-board-page'] }),
    ]);

  const commit = async (raw: string) => {
    try {
      const result = await commitSupplierNameGuarded(commitGuardRef.current, {
        name: raw,
        currentLabel: selectedLabel,
        tip,
        recordId,
        currentSupplierId: supplierId,
        suppliers,
        createSupplier,
        updateSupplier,
        updateLineItem: (id, data) => updateMutation.mutateAsync({ id, data }),
      });
      if (result !== 'committed') {
        return;
      }
      fireBannerPodryadCatchupNotify(queryClient, recordId);
      await invalidateAfterSelect();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : String(error));
    }
  };

  const closeAndCommit = (raw: string) => {
    setOpen(false);
    void commit(raw);
  };

  const syncAnchor = () => {
    const root = portalHostRef?.current ?? null;
    setAnchor(measureElementInRoot(wrapRef.current, root));
  };

  useLayoutEffect(() => {
    if (!open) return;
    syncAnchor();
  }, [open, draft, rows.length, portalHostRef]);

  const hideFromList = async (id: string) => {
    try {
      await updateSupplier(id, { isActive: false });
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : String(error));
    }
  };

  const moveHighlight = (delta: number) => {
    if (rows.length === 0) return;
    setHighlight((current) => (current + delta + rows.length) % rows.length);
  };

  const handleKeyDown = (event: { key: string; preventDefault: () => void }) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      if (!open) setOpen(true);
      else moveHighlight(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      if (!open) setOpen(true);
      else moveHighlight(-1);
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      setDraft(selectedLabel);
      return;
    }
    if (event.key === 'Enter') {
      event.preventDefault();
      const chosen = rows[highlight] ?? rows[0];
      closeAndCommit(rowCommitName(chosen, draft));
    }
  };

  const root = portalHostRef?.current ?? null;
  const rootWidth = root && 'clientWidth' in root ? Number(root.clientWidth) || 0 : 0;
  const rootHeight = root && 'clientHeight' in root ? Number(root.clientHeight) || 0 : 0;
  const overlayWidth = Math.max(anchor?.width ?? 180, 180);
  const placed = anchor
    ? resolveAnchoredOverlayPosition({
        anchor,
        overlayWidth,
        overlayHeight: Math.min(LIST_MAX_HEIGHT, Math.max(rows.length, 1) * 32 + 8),
        rootWidth: rootWidth || 1200,
        rootHeight: rootHeight || 800,
      })
    : { top: 16, left: 16, transform: undefined as string | undefined };

  const portalTarget = resolvePortalContainer('root', portalHostRef);
  const { colors, font, radius, spacing, zIndex } = theme;

  const list = open ? (
    <>
      <div
        aria-hidden="true"
        onPointerDown={(event) => {
          event.preventDefault();
          event.stopPropagation();
          closeAndCommit(draft);
        }}
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: zIndex.dropdown,
        }}
      />
      <ul
        id={listId}
        role="listbox"
        style={{
          position: 'absolute',
          top: placed.top,
          left: placed.left,
          transform: placed.transform,
          zIndex: zIndex.dropdown + 1,
          width: overlayWidth,
          maxHeight: LIST_MAX_HEIGHT,
          overflowY: 'auto',
          margin: 0,
          padding: 4,
          listStyle: 'none',
          boxSizing: 'border-box',
          backgroundColor: colors.bgElevated,
          border: `1px solid ${colors.border}`,
          borderRadius: radius.md,
          boxShadow: colors.shadowLg,
        }}
      >
        {rows.length === 0 ? (
          <li
            style={{
              padding: `${spacing.xs} ${spacing.sm}`,
              color: colors.textMuted,
              fontSize: font.sizeXs,
            }}
          >
            введи имя
          </li>
        ) : (
          rows.map((row, index) => {
            const selected = index === highlight;
            const label =
              row.kind === 'option' ? row.supplier.name : `Добавить «${row.name}»`;
            return (
              <li
                key={row.kind === 'option' ? row.supplier.id : `create-${row.name}`}
                role="option"
                aria-selected={selected}
                onMouseEnter={() => setHighlight(index)}
                onMouseDown={(event) => {
                  event.preventDefault();
                  pickingRef.current = true;
                  closeAndCommit(rowCommitName(row, draft));
                }}
                style={{
                  padding: `${spacing.xs} ${spacing.sm}`,
                  borderRadius: radius.sm,
                  cursor: 'pointer',
                  backgroundColor: selected ? colors.bgHover : 'transparent',
                  color: row.kind === 'create' ? colors.accent : colors.text,
                  fontSize: font.sizeSm,
                  fontWeight: row.kind === 'create' ? font.weightMedium : font.weightNormal,
                }}
              >
                {label}
              </li>
            );
          })
        )}
      </ul>
    </>
  ) : null;

  return (
    <div
      ref={wrapRef}
      style={{ display: 'flex', gap: 4, alignItems: 'center', minWidth: 0 }}
    >
      <Input
        theme={theme}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        value={draft}
        disabled={busy}
        placeholder={options.length === 0 ? 'введи имя' : undefined}
        onChange={(event) => {
          setDraft(event.target.value);
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (pickingRef.current) {
            pickingRef.current = false;
            return;
          }
          setOpen(false);
          void commit(draft);
        }}
        onKeyDown={handleKeyDown}
        style={{ minWidth: 0, flex: 1, padding: '4px 8px' }}
      />
      {supplierId ? (
        <button
          type="button"
          disabled={busy}
          title="убрать из списка"
          onClick={() => void hideFromList(supplierId)}
          style={{
            flexShrink: 0,
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            color: colors.textMuted,
            fontSize: font.sizeXs,
            padding: 0,
            whiteSpace: 'nowrap',
          }}
        >
          убрать из списка
        </button>
      ) : null}
      {list && portalTarget ? createPortal(list, portalTarget) : list}
    </div>
  );
};
