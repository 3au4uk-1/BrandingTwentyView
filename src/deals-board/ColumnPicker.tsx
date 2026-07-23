import { useEffect, useMemo, useRef, useState } from 'react';

import { useTheme } from './theme/ThemeContext';
import { Button } from './ui/Button';
import type { ColumnConfig, ColumnGroupConfig } from './types';
import {
  assignColumnGroup,
  createGroup,
  deleteGroup,
  moveColumnWithinGroup,
  moveGroup,
} from './utils/column-picker-groups';

type ColumnPickerProps = {
  target: 'parent' | 'child';
  columns: ColumnConfig[];
  groups?: ColumnGroupConfig[];
  onSave: (columns: ColumnConfig[], groups: ColumnGroupConfig[]) => Promise<void>;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
};

const EMPTY_GROUPS: ColumnGroupConfig[] = [];

const normalizeColumns = (columns: ColumnConfig[]) =>
  columns.map((column, index) => ({
    ...column,
    order: index,
  }));

const sortColumns = (columns: ColumnConfig[]) =>
  [...(Array.isArray(columns) ? columns : [])].sort(
    (a, b) => a.order - b.order || a.label.localeCompare(b.label, 'ru'),
  );

const sortGroups = (groups: ColumnGroupConfig[]) =>
  [...(Array.isArray(groups) ? groups : [])].sort(
    (a, b) => a.order - b.order || a.name.localeCompare(b.name, 'ru'),
  );

export const ColumnPicker = ({
  target,
  columns,
  groups = EMPTY_GROUPS,
  onSave,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: ColumnPickerProps) => {
  const theme = useTheme();
  const { colors, radius, font, spacing, zIndex } = theme;
  const [internalOpen, setInternalOpen] = useState(false);
  const isOpen = controlledOpen ?? internalOpen;
  const setIsOpen = (next: boolean | ((prev: boolean) => boolean)) => {
    const resolved = typeof next === 'function' ? next(isOpen) : next;
    if (onOpenChange) {
      onOpenChange(resolved);
    } else {
      setInternalOpen(resolved);
    }
  };
  const [isSaving, setIsSaving] = useState(false);
  const [draftColumns, setDraftColumns] = useState<ColumnConfig[]>([]);
  const [draftGroups, setDraftGroups] = useState<ColumnGroupConfig[]>([]);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const title = target === 'parent' ? 'Колонки сделок' : 'Колонки позиций';

  useEffect(() => {
    if (!isOpen) return;

    const onMouseDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', onMouseDown);
    return () => window.removeEventListener('mousedown', onMouseDown);
  }, [isOpen]);

  useEffect(() => {
    setDraftColumns(sortColumns(columns));
  }, [columns]);

  useEffect(() => {
    setDraftGroups(target === 'child' ? sortGroups(groups) : []);
  }, [groups, target]);

  const canInteract = !isSaving;
  const triggerLabel = useMemo(
    () => (target === 'parent' ? 'Колонки: сделки' : 'Колонки: позиции'),
    [target],
  );

  const moveColumn = (field: string, direction: -1 | 1) => {
    setDraftColumns((previous) => {
      if (target === 'child') {
        return moveColumnWithinGroup(previous, field, direction);
      }

      const index = previous.findIndex((column) => column.field === field);
      const nextIndex = index + direction;
      if (index < 0 || nextIndex < 0 || nextIndex >= previous.length) {
        return previous;
      }

      const reordered = [...previous];
      const [moved] = reordered.splice(index, 1);
      reordered.splice(nextIndex, 0, moved);
      return normalizeColumns(reordered);
    });
  };

  const toggleColumn = (field: string, checked: boolean) => {
    setDraftColumns((previous) =>
      previous.map((column) =>
        column.field === field ? { ...column, visible: checked } : column,
      ),
    );
  };

  const reorderGroup = (groupId: string, direction: -1 | 1) => {
    setDraftGroups((previous) => moveGroup(previous, groupId, direction));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(
        normalizeColumns(sortColumns(draftColumns)),
        target === 'child'
          ? sortGroups(draftGroups).map((group, order) => ({ ...group, order }))
          : [],
      );
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  const renderColumn = (column: ColumnConfig, sectionColumns: ColumnConfig[]) => {
    const index = sectionColumns.findIndex((candidate) => candidate.field === column.field);

    return (
      <div
        key={column.field}
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1fr) auto',
          alignItems: 'center',
          gap: spacing.xs,
          border: `1px solid ${colors.borderSubtle}`,
          borderRadius: radius.md,
          padding: '8px 10px',
          backgroundColor: column.visible ? colors.bg : colors.bgTertiary,
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing.sm,
            minWidth: 0,
            color: colors.text,
            fontSize: font.sizeSm,
            cursor: 'pointer',
          }}
        >
          <input
            type="checkbox"
            checked={column.visible}
            onChange={(event) => toggleColumn(column.field, event.target.checked)}
            disabled={!canInteract}
          />
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {column.label}
          </span>
        </label>
        <div style={{ display: 'flex', gap: '2px' }}>
          <Button
            theme={theme}
            variant="ghost"
            size="sm"
            onClick={() => moveColumn(column.field, -1)}
            disabled={index === 0 || !canInteract}
            aria-label={`Поднять ${column.label}`}
            style={{ padding: '2px 6px', minWidth: '28px' }}
          >
            ↑
          </Button>
          <Button
            theme={theme}
            variant="ghost"
            size="sm"
            onClick={() => moveColumn(column.field, 1)}
            disabled={index === sectionColumns.length - 1 || !canInteract}
            aria-label={`Опустить ${column.label}`}
            style={{ padding: '2px 6px', minWidth: '28px' }}
          >
            ↓
          </Button>
        </div>
        {target === 'child' ? (
          <select
            value={column.groupId ?? ''}
            onChange={(event) =>
              setDraftColumns((previous) =>
                assignColumnGroup(previous, column.field, event.target.value || undefined),
              )
            }
            disabled={!canInteract}
            aria-label={`Группа для ${column.label}`}
            style={{
              gridColumn: '1 / -1',
              width: '100%',
              minWidth: 0,
              padding: '5px 7px',
              color: colors.text,
              backgroundColor: colors.bgElevated,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.sm,
              fontSize: font.sizeXs,
            }}
          >
            <option value="">Без группы</option>
            {sortGroups(draftGroups).map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        ) : null}
      </div>
    );
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {hideTrigger ? null : (
        <Button theme={theme} variant="ghost" size="sm" onClick={() => setIsOpen((prev) => !prev)}>
          {triggerLabel}
        </Button>
      )}

      {isOpen ? (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: target === 'child' ? 'min(390px, calc(100vw - 24px))' : '320px',
            border: `1px solid ${colors.border}`,
            borderRadius: radius.lg,
            backgroundColor: colors.bgElevated,
            boxShadow: colors.shadowLg,
            zIndex: zIndex.dropdown,
            padding: spacing.md,
            boxSizing: 'border-box',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: spacing.sm,
            }}
          >
            <div
              style={{
                fontSize: font.sizeSm,
                fontWeight: font.weightSemibold,
                color: colors.text,
              }}
            >
              {title}
            </div>
            {target === 'child' ? (
              <Button
                theme={theme}
                variant="secondary"
                size="sm"
                onClick={() => setDraftGroups((previous) => createGroup(previous))}
                disabled={!canInteract}
              >
                + Группа
              </Button>
            ) : null}
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.sm,
              maxHeight: target === 'child' ? 'min(480px, calc(100vh - 180px))' : '320px',
              overflow: 'auto',
              marginTop: spacing.sm,
            }}
          >
            {target === 'parent'
              ? sortColumns(draftColumns).map((column) =>
                  renderColumn(column, sortColumns(draftColumns)),
                )
              : sortGroups(draftGroups).map((group) => {
                  const orderedGroups = sortGroups(draftGroups);
                  const groupIndex = orderedGroups.findIndex(
                    (candidate) => candidate.id === group.id,
                  );
                  const members = sortColumns(
                    draftColumns.filter((column) => column.groupId === group.id),
                  );
                  return (
                    <section
                      key={group.id}
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: spacing.xs,
                        padding: spacing.xs,
                        border: `1px solid ${colors.border}`,
                        borderRadius: radius.md,
                      }}
                    >
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: spacing.xs }}>
                        <input
                          value={group.name}
                          onChange={(event) =>
                            setDraftGroups((previous) =>
                              previous.map((candidate) =>
                                candidate.id === group.id
                                  ? { ...candidate, name: event.target.value }
                                  : candidate,
                              ),
                            )
                          }
                          disabled={!canInteract}
                          aria-label={`Название группы ${group.name}`}
                          style={{
                            minWidth: 0,
                            padding: '6px 8px',
                            color: colors.text,
                            backgroundColor: colors.bgElevated,
                            border: `1px solid ${colors.border}`,
                            borderRadius: radius.sm,
                            fontSize: font.sizeSm,
                            fontWeight: font.weightSemibold,
                          }}
                        />
                        <div style={{ display: 'flex', gap: '2px' }}>
                          <Button
                            theme={theme}
                            variant="ghost"
                            size="sm"
                            onClick={() => reorderGroup(group.id, -1)}
                            disabled={groupIndex === 0 || !canInteract}
                            aria-label={`Поднять группу ${group.name}`}
                            style={{ padding: '2px 6px', minWidth: '28px' }}
                          >
                            ↑
                          </Button>
                          <Button
                            theme={theme}
                            variant="ghost"
                            size="sm"
                            onClick={() => reorderGroup(group.id, 1)}
                            disabled={groupIndex === orderedGroups.length - 1 || !canInteract}
                            aria-label={`Опустить группу ${group.name}`}
                            style={{ padding: '2px 6px', minWidth: '28px' }}
                          >
                            ↓
                          </Button>
                          <Button
                            theme={theme}
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const next = deleteGroup(draftColumns, draftGroups, group.id);
                              setDraftColumns(next.columns);
                              setDraftGroups(next.groups);
                            }}
                            disabled={!canInteract}
                            aria-label={`Удалить группу ${group.name}`}
                            style={{ padding: '2px 8px' }}
                          >
                            ×
                          </Button>
                        </div>
                      </div>
                      {members.length > 0 ? (
                        members.map((column) => renderColumn(column, members))
                      ) : (
                        <span
                          style={{
                            padding: spacing.xs,
                            color: colors.textMuted,
                            fontSize: font.sizeXs,
                          }}
                        >
                          Нет полей
                        </span>
                      )}
                    </section>
                  );
                })}
            {target === 'child'
              ? (() => {
                  const ungrouped = sortColumns(
                    draftColumns.filter(
                      (column) =>
                        !column.groupId ||
                        !draftGroups.some((group) => group.id === column.groupId),
                    ),
                  );
                  return (
                    <section
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: spacing.xs,
                        padding: spacing.xs,
                        border: `1px solid ${colors.border}`,
                        borderRadius: radius.md,
                      }}
                    >
                      <div
                        style={{
                          padding: `0 ${spacing.xs}`,
                          color: colors.textSecondary,
                          fontSize: font.sizeSm,
                          fontWeight: font.weightSemibold,
                        }}
                      >
                        Без группы
                      </div>
                      {ungrouped.map((column) => renderColumn(column, ungrouped))}
                    </section>
                  );
                })()
              : null}
          </div>

          <div
            style={{
              marginTop: spacing.md,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: font.sizeXs, color: colors.textMuted }}>
              Видимых: {draftColumns.filter((column) => column.visible).length}
            </span>
            <div style={{ display: 'flex', gap: spacing.xs }}>
              <Button
                theme={theme}
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDraftColumns(sortColumns(columns));
                  setDraftGroups(target === 'child' ? sortGroups(groups) : []);
                  setIsOpen(false);
                }}
                disabled={!canInteract}
              >
                Отмена
              </Button>
              <Button theme={theme} variant="primary" size="sm" onClick={() => void handleSave()} disabled={!canInteract}>
                {isSaving ? 'Сохранение...' : 'Применить'}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
