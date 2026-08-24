import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import { getTipDetailLabel } from 'src/constants/tip-detail';

import { createSupplier, updateSupplier } from '../api/suppliers';
import { useUpdateLineItem } from '../hooks/useLineItems';
import { useSuppliers } from '../hooks/useSuppliers';
import { commitSupplierName, shouldCommitSupplierName } from '../suppliers/commit';
import { filterSuppliersForPicker } from '../suppliers/picker';
import { useTheme } from '../theme/ThemeContext';
import { Input } from '../ui/Input';

type SupplierComboboxProps = {
  recordId: string;
  tip: string;
  supplierId: string | null;
  supplierName: string | null;
  tipDetail: string | null;
};

const displayValue = (supplierName: string | null, tipDetail: string | null): string => {
  if (supplierName) return supplierName;
  if (tipDetail) return getTipDetailLabel(tipDetail);
  return '';
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
  const updateMutation = useUpdateLineItem();
  const { data: suppliers = [] } = useSuppliers();
  const options = useMemo(
    () => filterSuppliersForPicker(suppliers, tip, supplierId),
    [suppliers, tip, supplierId],
  );

  const selectedLabel = displayValue(supplierName, tipDetail);
  const [draft, setDraft] = useState(selectedLabel);

  useEffect(() => {
    setDraft(selectedLabel);
  }, [selectedLabel]);

  const listId = `supplier-picker-${recordId}`;
  const busy = updateMutation.isPending;

  const invalidateAfterSelect = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
      queryClient.invalidateQueries({ queryKey: ['lineItems'] }),
      queryClient.invalidateQueries({ queryKey: ['deals-board-page'] }),
    ]);

  const commit = async (raw: string) => {
    if (!shouldCommitSupplierName(raw, selectedLabel)) {
      return;
    }

    try {
      await commitSupplierName({
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
      await invalidateAfterSelect();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : String(error));
    }
  };

  const hideFromList = async (id: string) => {
    try {
      await updateSupplier(id, { isActive: false });
      await queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'center', minWidth: 0 }}>
      <Input
        theme={theme}
        list={listId}
        value={draft}
        disabled={busy}
        placeholder={options.length === 0 ? 'введи имя' : undefined}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={() => void commit(draft)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            void commit(draft);
          }
        }}
        style={{ minWidth: 0, flex: 1, padding: '4px 8px' }}
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option.id} value={option.name} />
        ))}
      </datalist>
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
            color: theme.colors.textMuted,
            fontSize: theme.font.sizeXs,
            padding: 0,
            whiteSpace: 'nowrap',
          }}
        >
          убрать из списка
        </button>
      ) : null}
    </div>
  );
};
