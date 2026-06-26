import { useEffect, useMemo, useRef, useState } from 'react';

import type { ColumnConfig } from './types';

type ColumnPickerProps = {
  target: 'parent' | 'child';
  colorScheme: 'light' | 'dark';
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

export const ColumnPicker = ({ target, colorScheme, columns, onSave }: ColumnPickerProps) => {
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
  const background = colorScheme === 'dark' ? '#1d1d1d' : '#fff';
  const border = colorScheme === 'dark' ? '#404040' : '#ddd';
  const text = colorScheme === 'dark' ? '#eee' : '#333';
  const muted = colorScheme === 'dark' ? '#9a9a9a' : '#666';
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
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        style={{
          border: `1px solid ${border}`,
          borderRadius: '8px',
          padding: '6px 10px',
          fontSize: '12px',
          backgroundColor: background,
          color: text,
          cursor: 'pointer',
        }}
      >
        {triggerLabel}
      </button>

      {isOpen ? (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: '300px',
            border: `1px solid ${border}`,
            borderRadius: '10px',
            backgroundColor: background,
            boxShadow: colorScheme === 'dark' ? '0 8px 20px rgba(0, 0, 0, 0.45)' : '0 8px 20px rgba(0, 0, 0, 0.12)',
            zIndex: 30,
            padding: '10px',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ fontSize: '12px', fontWeight: 600, color: text, marginBottom: '8px' }}>{title}</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '260px', overflow: 'auto' }}>
            {draftColumns.map((column, index) => (
              <div
                key={column.field}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr auto',
                  alignItems: 'center',
                  gap: '8px',
                  border: `1px solid ${border}`,
                  borderRadius: '8px',
                  padding: '6px 8px',
                }}
              >
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', color: text, fontSize: '12px' }}>
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
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => moveColumn(index, -1)}
                    disabled={index === 0 || !canInteract}
                    style={{ fontSize: '11px' }}
                    aria-label={`Поднять ${column.label}`}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveColumn(index, 1)}
                    disabled={index === draftColumns.length - 1 || !canInteract}
                    style={{ fontSize: '11px' }}
                    aria-label={`Опустить ${column.label}`}
                  >
                    ↓
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              marginTop: '10px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <span style={{ fontSize: '11px', color: muted }}>
              Видимых: {draftColumns.filter((column) => column.visible).length}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={() => {
                  setDraftColumns(sortColumns(columns));
                  setIsOpen(false);
                }}
                disabled={!canInteract}
                style={{ fontSize: '11px' }}
              >
                Отмена
              </button>
              <button type="button" onClick={() => void handleSave()} disabled={!canInteract} style={{ fontSize: '11px' }}>
                {isSaving ? 'Сохранение...' : 'Применить'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};
