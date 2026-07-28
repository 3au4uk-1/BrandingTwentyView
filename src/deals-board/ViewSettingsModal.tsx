import { useEffect, useMemo, useState } from 'react';

import {
  DEFAULT_CHILD_COLUMNS,
  DEFAULT_PARENT_COLUMNS,
} from 'src/constants/column-definitions';
import { VIEW_VISIBILITY, type ViewVisibility } from 'src/constants/view-visibility';
import type { BoardKind } from 'src/constants/product-stream';

import { useCreateDealBoardView, useUpdateDealBoardView } from './hooks/useDealBoardViews';
import { useTheme } from './theme/ThemeContext';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Input';
import { Modal } from './ui/Modal';
import type { DealBoardFilters, DealBoardViewRecord } from './types';

type ViewSettingsModalProps = {
  isOpen: boolean;
  boardKind: BoardKind;
  initialView?: DealBoardViewRecord;
  filtersToPersist?: DealBoardFilters;
  onClose: () => void;
  onSaved?: (view: DealBoardViewRecord) => void;
};

export const ViewSettingsModal = ({
  isOpen,
  boardKind,
  initialView,
  filtersToPersist,
  onClose,
  onSaved,
}: ViewSettingsModalProps) => {
  const theme = useTheme();
  const { font, spacing, colors } = theme;
  const createViewMutation = useCreateDealBoardView();
  const updateViewMutation = useUpdateDealBoardView();
  const [name, setName] = useState('');
  const [visibility, setVisibility] = useState<ViewVisibility>(VIEW_VISIBILITY.PERSONAL);

  useEffect(() => {
    if (!isOpen) return;

    setName(initialView?.name ?? '');
    setVisibility(initialView?.visibility ?? VIEW_VISIBILITY.PERSONAL);
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
            ...(filtersToPersist ? { filters: filtersToPersist } : {}),
          },
        });
        onSaved?.(updated);
      } else {
        const created = await createViewMutation.mutateAsync({
          name: trimmedName,
          visibility,
          boardKind,
          parentColumns: DEFAULT_PARENT_COLUMNS,
          childColumns: DEFAULT_CHILD_COLUMNS,
          childGroups: [],
          filters: filtersToPersist ?? {},
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

  return (
    <Modal
      theme={theme}
      isOpen={isOpen}
      title={title}
      description="Настройте название и видимость представления для команды."
      onClose={onClose}
      footer={
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: spacing.sm,
            padding: spacing.md,
            borderTop: `1px solid ${colors.borderSubtle}`,
            backgroundColor: colors.bgSecondary,
          }}
        >
          <Button theme={theme} variant="ghost" size="sm" onClick={onClose} disabled={isPending}>
            Отмена
          </Button>
          <Button theme={theme} variant="primary" size="sm" onClick={() => void handleSave()} disabled={isPending}>
            {isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
        <label style={{ fontSize: font.sizeSm, display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
          <span style={{ fontWeight: font.weightMedium, color: colors.text }}>Название</span>
          <Input
            theme={theme}
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Например, Продажи Q3"
          />
        </label>

        <label style={{ fontSize: font.sizeSm, display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
          <span style={{ fontWeight: font.weightMedium, color: colors.text }}>Видимость</span>
          <Select
            theme={theme}
            value={visibility}
            onChange={(event) => setVisibility(event.target.value as ViewVisibility)}
          >
            <option value={VIEW_VISIBILITY.PERSONAL}>Личный</option>
            <option value={VIEW_VISIBILITY.WORKSPACE}>Общий</option>
          </Select>
        </label>
      </div>
    </Modal>
  );
};
