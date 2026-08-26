import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import { fireBannerPodryadCatchupNotify } from '../api/banner-podryad-catchup';
import { createSupplier, updateSupplier } from '../api/suppliers';
import { useUpdateLineItem } from '../hooks/useLineItems';
import { useSuppliers } from '../hooks/useSuppliers';
import {
  commitSupplierNameGuarded,
  createSupplierCommitInFlightGuard,
} from '../suppliers/commit';
import { createPickerClickGate, scheduleDismissCommit } from '../suppliers/picker-click';
import {
  filterSuppliersForPicker,
  supplierDropdownRows,
  usesBannerPodryadCatchup,
  type SupplierDropdownRow,
} from '../suppliers/picker';
import { displaySupplierCellLabel, normalizeSupplierName } from '../suppliers/supplier-name';
import { useTheme } from '../theme/ThemeContext';
import { Input } from '../ui/Input';
import { resolvePortalContainer, usePortalHost } from '../ui/PortalHostContext';
import {
  readClientRect,
  resolveAnchoredOverlayPosition,
  type RectLike,
} from '../utils/anchored-overlay';
import { measureAnchorInBoard } from '../utils/board-client-origin';

type SupplierComboboxProps = {
  recordId: string;
  tip: string;
  supplierId: string | null;
  supplierName: string | null;
  tipDetail: string | null;
};

const showCrmError = (error: unknown): void => {
  const message = error instanceof Error ? error.message : String(error);
  if (typeof window.alert === 'function') {
    window.alert(message);
    return;
  }
  console.error(message);
};
const LIST_ID_PREFIX = 'supplier-picker-list-';
const LIST_MAX_HEIGHT = 220;

/** Board-local (16,16) is the old overlay fallback — not the cell. */
const isDegenerateAnchor = (box: RectLike | null): boolean =>
  !box || box.width < 2 || (box.left < 40 && box.top < 40);

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

  const selectedLabel = displaySupplierCellLabel(supplierName, tipDetail);
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
  const clickGateRef = useRef(createPickerClickGate());
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
        updateLineItem: (id, data) => {
          const linkedId = data.supplierId;
          const linkedName =
            typeof linkedId === 'string'
              ? (suppliers.find((row) => row.id === linkedId)?.name ??
                normalizeSupplierName(raw))
              : '';
          return updateMutation.mutateAsync({
            id,
            data: {
              supplierId: linkedId,
              supplier:
                typeof linkedId === 'string'
                  ? { id: linkedId, name: linkedName }
                  : null,
            },
          });
        },
      });
      if (result !== 'committed') {
        return;
      }
      if (usesBannerPodryadCatchup(tip)) {
        fireBannerPodryadCatchupNotify(queryClient, recordId);
      }
      await invalidateAfterSelect();
    } catch (error) {
      showCrmError(error);
    }
  };

  const closeAndCommit = (raw: string) => {
    setOpen(false);
    void commit(raw);
  };

  const syncAnchor = () => {
    const root = portalHostRef?.current ?? null;
    setAnchor(measureAnchorInBoard(wrapRef.current, root));
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
      showCrmError(error);
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
      clickGateRef.current.noteOptionChosen();
      const chosen = rows[highlight] ?? rows[0];
      closeAndCommit(rowCommitName(chosen, draft));
    }
  };

  const root = portalHostRef?.current ?? null;
  const rootWidth = root && 'clientWidth' in root ? Number(root.clientWidth) || 0 : 0;
  const rootHeight = root && 'clientHeight' in root ? Number(root.clientHeight) || 0 : 0;
  const overlayWidth = Math.max(anchor?.width ?? 180, 180);
  const placed =
    !isDegenerateAnchor(anchor) && anchor
      ? resolveAnchoredOverlayPosition({
          anchor,
          overlayWidth,
          overlayHeight: Math.min(LIST_MAX_HEIGHT, Math.max(rows.length, 1) * 32 + 8),
          rootWidth: rootWidth || 1200,
          rootHeight: rootHeight || 800,
        })
      : null;

  const portalTarget = resolvePortalContainer('root', portalHostRef);
  const clientBox = readClientRect(wrapRef.current);
  const clientLooksReal = Boolean(
    clientBox && clientBox.width > 8 && (clientBox.left >= 40 || clientBox.top >= 80),
  );
  const useFixedFallback = open && !placed && clientLooksReal && Boolean(portalTarget);
  const useInlineList = open && !placed && !useFixedFallback;
  const { colors, font, radius, spacing, zIndex } = theme;

  const listItems =
    rows.length === 0 ? (
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
        const label = row.kind === 'option' ? row.supplier.name : `Добавить «${row.name}»`;
        return (
          <li
            key={row.kind === 'option' ? row.supplier.id : `create-${row.name}`}
            role="option"
            aria-selected={selected}
            onMouseEnter={() => setHighlight(index)}
            onPointerDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              pickingRef.current = true;
              clickGateRef.current.noteOptionChosen();
              closeAndCommit(rowCommitName(row, draft));
            }}
            onMouseDown={(event) => {
              event.preventDefault();
              event.stopPropagation();
              pickingRef.current = true;
              clickGateRef.current.noteOptionChosen();
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
    );

  const listBoxStyle = {
    margin: 0 as const,
    padding: 4,
    listStyle: 'none' as const,
    boxSizing: 'border-box' as const,
    backgroundColor: colors.bgElevated,
    border: `1px solid ${colors.border}`,
    borderRadius: radius.md,
    boxShadow: colors.shadowLg,
    maxHeight: LIST_MAX_HEIGHT,
    overflowY: 'auto' as const,
  };

  const portaledList =
    open && placed ? (
      <>
        <div
          aria-hidden="true"
          onPointerDown={(event) => {
            event.preventDefault();
            event.stopPropagation();
            pickingRef.current = true;
            scheduleDismissCommit(clickGateRef.current, () => {
              closeAndCommit(draft);
            });
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
            ...listBoxStyle,
            position: 'absolute',
            top: placed.top,
            left: placed.left,
            transform: placed.transform,
            zIndex: zIndex.dropdown + 1,
            width: overlayWidth,
          }}
        >
          {listItems}
        </ul>
      </>
    ) : open && useFixedFallback && clientBox ? (
      <ul
        id={listId}
        role="listbox"
        style={{
          ...listBoxStyle,
          position: 'fixed',
          top: clientBox.bottom,
          left: clientBox.left,
          width: Math.max(clientBox.width, 180),
          zIndex: zIndex.dropdown + 1,
        }}
      >
        {listItems}
      </ul>
    ) : null;

  return (
    <div
      ref={wrapRef}
      style={{
        display: 'flex',
        gap: 4,
        alignItems: 'center',
        minWidth: 0,
        position: 'relative',
        zIndex: open ? zIndex.dropdown + 1 : undefined,
      }}
    >
      <Input
        theme={theme}
        role="combobox"
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        value={draft}
        disabled={busy}
        placeholder="кто едет?"
        onChange={(event) => {
          setDraft(event.target.value);
          clickGateRef.current = createPickerClickGate();
          setOpen(true);
          setHighlight(0);
        }}
        onFocus={() => {
          clickGateRef.current = createPickerClickGate();
          setOpen(true);
        }}
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
      {useInlineList ? (
        <ul
          id={listId}
          role="listbox"
          style={{
            ...listBoxStyle,
            position: 'absolute',
            left: 0,
            top: '100%',
            width: '100%',
            minWidth: 160,
            zIndex: zIndex.dropdown + 1,
          }}
        >
          {listItems}
        </ul>
      ) : null}
      {portaledList && portalTarget ? createPortal(portaledList, portalTarget) : null}
    </div>
  );
};
