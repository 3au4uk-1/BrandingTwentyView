import { useRef, useState } from 'react';

import {
  isDefaultLineItemHiddenByFilters,
  type LineItemQueryFilters,
} from '../api/line-items';
import { useCreateLineItem } from '../hooks/useLineItems';
import type { FieldDescriptor } from '../metadata/types';
import { useTheme } from '../theme/ThemeContext';
import { Button } from '../ui/Button';
import type { ColumnConfig, ColumnGroupConfig, LineItemRow } from '../types';
import { MobileLineItemRow } from './MobileLineItemRow';

type MobileLineItemListProps = {
  opportunityId: string;
  items: LineItemRow[];
  columns: ColumnConfig[];
  groups: ColumnGroupConfig[];
  descriptorByField: Map<string, FieldDescriptor>;
  filters?: LineItemQueryFilters;
};

export const MobileLineItemList = ({
  opportunityId,
  items,
  columns,
  groups,
  descriptorByField,
  filters,
}: MobileLineItemListProps) => {
  const theme = useTheme();
  const { colors, font, spacing } = theme;
  const createLineItem = useCreateLineItem();
  const isCreatingRef = useRef(false);
  const [statusMessage, setStatusMessage] = useState<{
    kind: 'warning' | 'error';
    text: string;
  } | null>(null);
  const isHiddenByFilters = isDefaultLineItemHiddenByFilters(filters);

  const handleCreate = async () => {
    if (isCreatingRef.current) return;
    isCreatingRef.current = true;
    setStatusMessage(null);

    try {
      await createLineItem.mutateAsync(opportunityId);
      if (isHiddenByFilters) {
        setStatusMessage({
          kind: 'warning',
          text: 'Создано, но скрыто текущим фильтром',
        });
      }
    } catch (error) {
      setStatusMessage({
        kind: 'error',
        text: error instanceof Error ? error.message : 'Не удалось создать позицию',
      });
    } finally {
      isCreatingRef.current = false;
    }
  };

  return (
    <div style={{ marginTop: spacing.md }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: spacing.sm,
          marginBottom: spacing.xs,
        }}
      >
        <div
          style={{
            fontSize: font.sizeXs,
            fontWeight: font.weightSemibold,
            color: colors.textMuted,
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          Позиции · {items.length}
        </div>
        <Button
          theme={theme}
          variant="ghost"
          size="sm"
          onClick={() => void handleCreate()}
          disabled={createLineItem.isPending}
          aria-label="Добавить позицию"
          style={{ minHeight: 44, touchAction: 'manipulation' }}
        >
          {createLineItem.isPending ? 'Создание…' : '+ Позиция'}
        </Button>
      </div>

      {statusMessage ? (
        <p
          style={{
            margin: `0 0 ${spacing.xs}`,
            fontSize: font.sizeXs,
            color: statusMessage.kind === 'error' ? colors.danger : colors.warning,
          }}
        >
          {statusMessage.text}
        </p>
      ) : null}

      {items.length === 0 ? (
        <p style={{ margin: 0, fontSize: font.sizeSm, color: colors.textMuted }}>
          Нет позиций
        </p>
      ) : (
        <div
          style={{
            border: `1px solid ${colors.borderSubtle}`,
            borderRadius: theme.radius.md,
            backgroundColor: theme.colors.bg,
            padding: `0 ${spacing.sm}`,
          }}
        >
          {items.map((item, index) => (
            <MobileLineItemRow
              key={item.id}
              item={item}
              columns={columns}
              groups={groups}
              descriptorByField={descriptorByField}
              isLast={index === items.length - 1}
            />
          ))}
        </div>
      )}
    </div>
  );
};
