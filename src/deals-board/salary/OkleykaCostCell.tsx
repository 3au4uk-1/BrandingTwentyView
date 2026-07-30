import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

import { useTheme } from '../theme/ThemeContext';
import { Input } from '../ui/Input';
import { patchOkleykaCost } from './api';
import { formatSalaryRub } from './compute';

type Props = {
  lineItemId: string;
  valueRub: number;
  autoFocus?: boolean;
  onOptimistic: (lineItemId: string, nextRub: number) => void;
  onRollback: (lineItemId: string, prevRub: number) => void;
  onMove: (lineItemId: string, direction: 1 | -1) => void;
  onFocusConsumed?: () => void;
};

const parseDraftRub = (draft: string): { ok: true; rub: number | null } | { ok: false } => {
  const trimmed = draft.trim().replace(/\s/g, '').replace(',', '.');
  if (!trimmed) return { ok: true, rub: null };
  const parsed = Number(trimmed);
  if (Number.isNaN(parsed) || parsed < 0) return { ok: false };
  return { ok: true, rub: parsed };
};

export const OkleykaCostCell = ({
  lineItemId,
  valueRub,
  autoFocus,
  onOptimistic,
  onRollback,
  onMove,
  onFocusConsumed,
}: Props) => {
  const theme = useTheme();
  const { colors, font } = theme;
  const skipBlurSaveRef = useRef(false);
  const prevAutoFocusRef = useRef(false);
  const [isEditing, setIsEditing] = useState(false);
  const [draftValue, setDraftValue] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const draftFromValue = (rub: number): string => (rub > 0 ? String(rub) : '');

  const openEditor = () => {
    skipBlurSaveRef.current = false;
    setDraftValue(draftFromValue(valueRub));
    setError(null);
    setIsEditing(true);
  };

  const closeEditor = () => {
    setDraftValue(draftFromValue(valueRub));
    setError(null);
    setIsEditing(false);
  };

  useEffect(() => {
    const becameFocused = autoFocus && !prevAutoFocusRef.current;
    prevAutoFocusRef.current = Boolean(autoFocus);
    if (!becameFocused) return;
    skipBlurSaveRef.current = false;
    setDraftValue(draftFromValue(valueRub));
    setError(null);
    setIsEditing(true);
    onFocusConsumed?.();
  }, [autoFocus, lineItemId, valueRub, onFocusConsumed]);

  const save = async (move?: 1 | -1) => {
    if (isSaving) return;

    const parsed = parseDraftRub(draftValue);
    if (!parsed.ok) {
      setError('Некорректная сумма');
      return;
    }

    const nextRub = parsed.rub === null ? 0 : parsed.rub;
    const prevRub = valueRub;
    if (nextRub === prevRub && parsed.rub !== null) {
      setIsEditing(false);
      setError(null);
      if (move) onMove(lineItemId, move);
      return;
    }

    setIsSaving(true);
    setError(null);
    onOptimistic(lineItemId, nextRub);

    try {
      await patchOkleykaCost(lineItemId, parsed.rub);
      setIsSaving(false);
      setIsEditing(false);
      if (move) onMove(lineItemId, move);
    } catch (saveError) {
      onRollback(lineItemId, prevRub);
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
          onBlur={() => {
            if (skipBlurSaveRef.current) {
              skipBlurSaveRef.current = false;
              return;
            }
            void save();
          }}
          onKeyDown={(event: KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              skipBlurSaveRef.current = true;
              void save(1);
            }
            if (event.key === 'Tab') {
              event.preventDefault();
              skipBlurSaveRef.current = true;
              void save(event.shiftKey ? -1 : 1);
            }
            if (event.key === 'Escape') {
              event.preventDefault();
              skipBlurSaveRef.current = true;
              closeEditor();
            }
          }}
          style={{ minWidth: 72, padding: '4px 8px', fontSize: font.sizeSm }}
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
          color: colors.text,
          fontSize: font.sizeSm,
          fontWeight: font.weightMedium,
          fontVariantNumeric: 'tabular-nums',
          whiteSpace: 'nowrap',
          textAlign: 'left',
        }}
      >
        {isSaving ? '…' : valueRub > 0 ? formatSalaryRub(valueRub) : '—'}
      </button>
      {error ? (
        <span style={{ color: colors.danger, fontSize: font.sizeXs }}>{error}</span>
      ) : null}
    </div>
  );
};
