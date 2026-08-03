import { useState, type KeyboardEvent } from 'react';

import { useTheme } from '../theme/ThemeContext';
import { Input } from '../ui/Input';
import { patchOkleykaDealCost } from './api';
import { formatSalaryRub } from './compute';
import { deleteShare, upsertShare } from './shares-api';
import type { OkleykaDealShare } from './shares';

type Props = {
  opportunityId: string;
  salaryEntryId: string;
  share: OkleykaDealShare | null;
  dealShares: OkleykaDealShare[];
  onOptimisticDealCost: (opportunityId: string, nextRub: number | null) => void;
  onRollbackDealCost: (opportunityId: string, prevRub: number | null) => void;
  onPersisted: () => void;
};

const parseDraftRub = (draft: string): { ok: true; rub: number } | { ok: false } => {
  const trimmed = draft.trim().replace(/\s/g, '').replace(',', '.');
  if (!trimmed) return { ok: true, rub: 0 };
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed) || parsed < 0) return { ok: false };
  return { ok: true, rub: parsed };
};

const dealSumAfterEdit = (
  dealShares: OkleykaDealShare[],
  salaryEntryId: string,
  nextAmountRub: number,
): number => {
  let sum = 0;
  for (const row of dealShares) {
    if (row.salaryEntryId === salaryEntryId) {
      sum += nextAmountRub;
    } else {
      sum += row.amountRub;
    }
  }
  if (!dealShares.some((row) => row.salaryEntryId === salaryEntryId) && nextAmountRub > 0) {
    sum += nextAmountRub;
  }
  return sum;
};

export const PersonShareCell = ({
  opportunityId,
  salaryEntryId,
  share,
  dealShares,
  onOptimisticDealCost,
  onRollbackDealCost,
  onPersisted,
}: Props) => {
  const theme = useTheme();
  const { colors, font } = theme;
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayRub = share && share.amountRub > 0 ? share.amountRub : null;
  const draftFromValue = (rub: number | null): string => (rub === null ? '' : String(rub));

  const openEditor = () => {
    setDraftValue(draftFromValue(displayRub));
    setError(null);
    setIsEditing(true);
  };

  const closeEditor = () => {
    setDraftValue(draftFromValue(displayRub));
    setError(null);
    setIsEditing(false);
  };

  const save = async () => {
    if (isSaving) return;

    const parsed = parseDraftRub(draftValue);
    if (!parsed.ok) {
      setError('Некорректная сумма');
      return;
    }

    const nextAmount = parsed.rub;
    const prevAmount = share?.amountRub ?? 0;
    if (nextAmount === prevAmount) {
      setIsEditing(false);
      setError(null);
      return;
    }

    const prevDealSum = dealShares.reduce((sum, row) => sum + row.amountRub, 0);
    const prevDealCost = prevDealSum > 0 ? prevDealSum : null;
    const nextDealSum = dealSumAfterEdit(dealShares, salaryEntryId, nextAmount);
    const nextDealCost = nextDealSum > 0 ? nextDealSum : null;

    setIsSaving(true);
    setError(null);
    onOptimisticDealCost(opportunityId, nextDealCost);

    try {
      if (nextAmount <= 0) {
        if (share) await deleteShare(share.id);
      } else {
        await upsertShare({
          opportunityId,
          salaryEntryId,
          amountRub: nextAmount,
          existingId: share?.id,
        });
      }
      await patchOkleykaDealCost(opportunityId, nextDealCost);
      onPersisted();
      setIsSaving(false);
      setIsEditing(false);
    } catch (saveError) {
      onRollbackDealCost(opportunityId, prevDealCost);
      setIsSaving(false);
      setError(saveError instanceof Error ? saveError.message : 'Ошибка сохранения');
    }
  };

  if (isEditing) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
        <Input
          theme={theme}
          autoFocus
          type="text"
          inputMode="decimal"
          value={draftValue}
          disabled={isSaving}
          onChange={(event) => {
            setDraftValue(event.target.value);
            if (error) setError(null);
          }}
          onBlur={() => void save()}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              void save();
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              closeEditor();
            }
          }}
          style={{ minWidth: 64, padding: '4px 6px', fontSize: font.sizeXs }}
        />
        {isSaving ? (
          <span style={{ color: colors.textMuted, fontSize: font.sizeXs }}>сохранение</span>
        ) : error ? (
          <span style={{ color: colors.danger, fontSize: font.sizeXs }}>{error}</span>
        ) : null}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
      <button
        type="button"
        onClick={openEditor}
        disabled={isSaving}
        style={{
          border: 'none',
          background: 'transparent',
          padding: 0,
          margin: 0,
          cursor: isSaving ? 'wait' : 'pointer',
          color: displayRub === null ? colors.textMuted : colors.text,
          fontSize: font.sizeXs,
          fontWeight: displayRub === null ? font.weightRegular : font.weightMedium,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          textAlign: 'left',
        }}
      >
        {isSaving ? '…' : displayRub === null ? '—' : formatSalaryRub(displayRub)}
      </button>
      {error ? (
        <span style={{ color: colors.danger, fontSize: font.sizeXs }}>{error}</span>
      ) : null}
    </div>
  );
};
