import { useEffect, useMemo, useState } from 'react';

import {
  DEFAULT_CHILD_COLUMNS,
  DEFAULT_PARENT_COLUMNS,
} from 'src/constants/column-definitions';

import { useCreateDealBoardView, useUpdateDealBoardView } from './hooks/useDealBoardViews';
import type { DealBoardViewRecord } from './types';

type ViewSettingsModalProps = {
  isOpen: boolean;
  colorScheme: 'light' | 'dark';
  initialView?: DealBoardViewRecord;
  onClose: () => void;
  onSaved?: (view: DealBoardViewRecord) => void;
};

export const ViewSettingsModal = ({
  isOpen,
  colorScheme,
  initialView,
  onClose,
  onSaved,
}: ViewSettingsModalProps) => {
  const createViewMutation = useCreateDealBoardView();
  const updateViewMutation = useUpdateDealBoardView();
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<'personal' | 'workspace'>('personal');

  useEffect(() => {
    if (!isOpen) return;

    setName(initialView?.name ?? '');
    setVisibility(initialView?.visibility ?? 'personal');
  }, [initialView, isOpen]);

  const isPending = createViewMutation.isPending || updateViewMutation.isPending;
  const title = useMemo(() => (initialView ? 'Редактировать view' : 'Новый view'), [initialView]);

  const handleSave = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      window.alert('Укажите название view');
      return;
    }

    try {
      if (initialView) {
        const updated = await updateViewMutation.mutateAsync({
          id: initialView.id,
          data: {
            name: trimmedName,
            visibility,
          },
        });
        onSaved?.(updated);
      } else {
        const created = await createViewMutation.mutateAsync({
          name: trimmedName,
          visibility,
          parentColumns: DEFAULT_PARENT_COLUMNS,
          childColumns: DEFAULT_CHILD_COLUMNS,
          filters: {},
          sort: [],
          isDefault: false,
        });
        onSaved?.(created);
      }
      onClose();
    } catch (error) {
      window.alert(
        `Не удалось сохранить view.${error instanceof Error ? ` ${error.message}` : ''}`,
      );
    }
  };

  if (!isOpen) {
    return null;
  }

  const overlayBackground = colorScheme === 'dark' ? 'rgba(0, 0, 0, 0.65)' : 'rgba(20, 24, 30, 0.28)';
  const panelBackground = colorScheme === 'dark' ? '#1f1f1f' : '#fff';
  const border = colorScheme === 'dark' ? '#434343' : '#ddd';
  const text = colorScheme === 'dark' ? '#eee' : '#333';

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        backgroundColor: overlayBackground,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '420px',
          border: `1px solid ${border}`,
          borderRadius: '12px',
          backgroundColor: panelBackground,
          color: text,
          padding: '14px',
          boxSizing: 'border-box',
          boxShadow: colorScheme === 'dark' ? '0 12px 28px rgba(0, 0, 0, 0.6)' : '0 12px 28px rgba(0, 0, 0, 0.2)',
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 700 }}>{title}</div>

        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span>Название</span>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Например, Продажи Q3"
              style={{
                borderRadius: '8px',
                border: `1px solid ${border}`,
                backgroundColor: colorScheme === 'dark' ? '#171717' : '#fff',
                color: text,
                padding: '7px 9px',
                fontSize: '12px',
              }}
            />
          </label>

          <label style={{ fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <span>Видимость</span>
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value as 'personal' | 'workspace')}
              style={{
                borderRadius: '8px',
                border: `1px solid ${border}`,
                backgroundColor: colorScheme === 'dark' ? '#171717' : '#fff',
                color: text,
                padding: '7px 9px',
                fontSize: '12px',
              }}
            >
              <option value="personal">Личный</option>
              <option value="workspace">Общий</option>
            </select>
          </label>
        </div>

        <div style={{ marginTop: '14px', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <button type="button" onClick={onClose} disabled={isPending} style={{ fontSize: '12px' }}>
            Отмена
          </button>
          <button type="button" onClick={() => void handleSave()} disabled={isPending} style={{ fontSize: '12px' }}>
            {isPending ? 'Сохранение...' : 'Сохранить'}
          </button>
        </div>
      </div>
    </div>
  );
};
