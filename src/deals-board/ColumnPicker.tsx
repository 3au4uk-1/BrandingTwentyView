import { useEffect, useMemo, useRef, useState } from 'react';

import { useTheme } from './theme/ThemeContext';
import { Button } from './ui/Button';
import type { ColumnConfig } from './types';

type ColumnPickerProps = {
  target: 'parent' | 'child';
  columns: ColumnConfig[];
  onSave: (columns: ColumnConfig[]) => Promise<void>;
};

const normalizeColumns = (columns: ColumnConfig[]) =>
  columns.map((column, index) => ({
    ...column,
    order: index,
  }));

const sortColumns = (columns: ColumnConfig[]) =>
  [...(Array.isArray(columns) ? columns : [])].sort(
    (a, b) => a.order - b.order || a.label.localeCompare(b.label, 'ru'),
  );

export const ColumnPicker = ({ target, columns, onSave }: ColumnPickerProps) => {
  const theme = useTheme();
  const { colors, radius, font, spacing, zIndex } = theme;
  const [isOpen, setIsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draftColumns, setDraftColumns] = useState<ColumnConfig[]>([]);
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

  const canInteract = !isSaving;
  const triggerLabel = useMemo(
    () => (target === 'parent' ? 'Колонки: сделки' : 'Колонки: позиции'),
    [target],
  );

  const moveColumn = (index: number, direction: -1 | 1) => {
    setDraftColumns((previous) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= previous.length) {
        return previous;
      }

      const reordered = [...previous];
      const [moved] = reordered.splice(index, 1);
      reordered.splice(nextIndex, 0, moved);
      return normalizeColumns(reordered);
    });
  };

  const toggleColumn = (index: number, checked: boolean) => {
    setDraftColumns((previous) =>
      previous.map((column, currentIndex) =>
        currentIndex === index ? { ...column, visible: checked } : column,
      ),
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(normalizeColumns(draftColumns));
      setIsOpen(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <Button theme={theme} variant="ghost" size="sm" onClick={() => setIsOpen((prev) => !prev)}>
        {triggerLabel}
      </Button>

      {isOpen ? (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: '320px',
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
              fontSize: font.sizeSm,
              fontWeight: font.weightSemibold,
              color: colors.text,
              marginBottom: spacing.sm,
            }}
          >
            {title}
          </div>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.xs,
              maxHeight: '280px',
              overflow: 'auto',
            }}
          >
            {draftColumns.map((column, index) => (
              <div
                key={column.field}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  alignItems: 'center',
                  gap: spacing.sm,
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
                    color: colors.text,
                    fontSize: font.sizeSm,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={column.visible}
                    onChange={(event) => toggleColumn(index, event.target.checked)}
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
                    onClick={() => moveColumn(index, -1)}
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
                    onClick={() => moveColumn(index, 1)}
                    disabled={index === draftColumns.length - 1 || !canInteract}
                    aria-label={`Опустить ${column.label}`}
                    style={{ padding: '2px 6px', minWidth: '28px' }}
                  >
                    ↓
                  </Button>
                </div>
              </div>
            ))}
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
