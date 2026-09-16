import { useEffect, useMemo, useState } from 'react';

import {
  confirmDealGroup as confirmDealGroupRequest,
  fetchDealGroupSuggestions as fetchDealGroupSuggestionsRequest,
  type ConfirmDealGroupBody,
  type DealGroupSuggestions,
} from './api/crmparser';
import { useTheme } from './theme/ThemeContext';
import type { OpportunityRow } from './types';
import { Button } from './ui/Button';
import { Input, Select } from './ui/Input';
import { Modal } from './ui/Modal';

const EMPTY_SUGGESTIONS: DealGroupSuggestions = { hard: [], soft: [] };

export type LinkDealsModalProps = {
  isOpen: boolean;
  seedOpportunityId: string;
  opportunities: OpportunityRow[];
  onClose: () => void;
  onSaved?: () => void;
  /** Injectable for tests / Storybook. */
  confirmDealGroup?: (body: ConfirmDealGroupBody) => Promise<unknown>;
  fetchSuggestions?: () => Promise<DealGroupSuggestions>;
  initialSuggestions?: DealGroupSuggestions;
  needsManualCanonical?: boolean;
};

export type BuildConfirmDealGroupBodyInput = {
  selectedOppIds: string[];
  name: string;
  nameEdited: boolean;
  canonicalTwentyOppId?: string;
  canonicalBitrixId?: string;
  canonicalSelectedManually: boolean;
};

export const buildConfirmDealGroupBody = (
  input: BuildConfirmDealGroupBodyInput,
): ConfirmDealGroupBody => {
  const body: ConfirmDealGroupBody = {
    twentyOppIds: [...input.selectedOppIds],
  };

  const name = input.name.trim();
  if (name) {
    body.name = name;
    if (input.nameEdited) body.nameLocked = true;
  }

  if (input.canonicalTwentyOppId) {
    body.canonicalTwentyOppId = input.canonicalTwentyOppId;
    if (input.canonicalSelectedManually) body.canonicalLocked = true;
  }

  if (input.canonicalBitrixId) {
    body.canonicalBitrixId = input.canonicalBitrixId;
    if (input.canonicalSelectedManually) body.canonicalLocked = true;
  }

  return body;
};

const candidateOppIds = (candidate: {
  twentyOppIds?: string[];
  dealIds: number[];
}): string[] =>
  candidate.twentyOppIds?.length
    ? candidate.twentyOppIds
    : candidate.dealIds.map((id) => String(id));

const bitrixOptionsForOpp = (opp?: OpportunityRow): Array<{ id: string; label: string }> => {
  if (!opp?.bitrixLink) return [];
  const options: Array<{ id: string; label: string }> = [];
  const primaryUrl = opp.bitrixLink.primaryLinkUrl?.trim();
  if (primaryUrl) {
    const id = primaryUrl.match(/\/(\d+)\/?/)?.[1] ?? primaryUrl;
    options.push({ id, label: opp.bitrixLink.primaryLinkLabel || id });
  }
  for (const link of opp.bitrixLink.secondaryLinks ?? []) {
    const url = link.url?.trim();
    if (!url) continue;
    const id = url.match(/\/(\d+)\/?/)?.[1] ?? url;
    if (options.some((opt) => opt.id === id)) continue;
    options.push({ id, label: link.label || id });
  }
  return options;
};

export const LinkDealsModal = ({
  isOpen,
  seedOpportunityId,
  opportunities,
  onClose,
  onSaved,
  confirmDealGroup = confirmDealGroupRequest,
  fetchSuggestions = fetchDealGroupSuggestionsRequest,
  initialSuggestions,
  needsManualCanonical = false,
}: LinkDealsModalProps) => {
  const theme = useTheme();
  const { colors, font, spacing, radius } = theme;

  const oppById = useMemo(() => {
    const map = new Map<string, OpportunityRow>();
    for (const opp of opportunities) {
      map.set(opp.id, opp);
      for (const child of opp.childSmetas ?? []) {
        map.set(child.id, child);
      }
    }
    return map;
  }, [opportunities]);

  const seedOpp = oppById.get(seedOpportunityId);
  const [selectedIds, setSelectedIds] = useState<string[]>(() =>
    seedOpportunityId ? [seedOpportunityId] : [],
  );
  const [name, setName] = useState(seedOpp?.name ?? '');
  const [nameEdited, setNameEdited] = useState(false);
  const [canonicalTwentyOppId, setCanonicalTwentyOppId] = useState(seedOpportunityId);
  const [canonicalBitrixId, setCanonicalBitrixId] = useState(
    () => bitrixOptionsForOpp(seedOpp)[0]?.id ?? '',
  );
  const [canonicalSelectedManually, setCanonicalSelectedManually] = useState(false);
  const [search, setSearch] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [manualCanonicalRequired, setManualCanonicalRequired] = useState(needsManualCanonical);
  const [suggestions, setSuggestions] = useState<DealGroupSuggestions>(
    initialSuggestions ?? EMPTY_SUGGESTIONS,
  );
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const seed = opportunities.find((opp) => opp.id === seedOpportunityId);
    setSelectedIds(seedOpportunityId ? [seedOpportunityId] : []);
    setName(seed?.name ?? '');
    setNameEdited(false);
    setCanonicalTwentyOppId(seedOpportunityId);
    setCanonicalBitrixId(bitrixOptionsForOpp(seed)[0]?.id ?? '');
    setCanonicalSelectedManually(false);
    setSearch('');
    setError(null);
    setIsSaving(false);
    setManualCanonicalRequired(needsManualCanonical);
    setSuggestions(initialSuggestions ?? EMPTY_SUGGESTIONS);
    setSuggestionsError(null);

    if (initialSuggestions) {
      setSuggestionsLoading(false);
      return;
    }

    let cancelled = false;
    setSuggestionsLoading(true);
    void fetchSuggestions()
      .then((payload) => {
        if (cancelled) return;
        setSuggestions(payload);
      })
      .catch((err) => {
        if (cancelled) return;
        setSuggestions(EMPTY_SUGGESTIONS);
        setSuggestionsError(err instanceof Error ? err.message : String(err));
      })
      .finally(() => {
        if (!cancelled) setSuggestionsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [
    fetchSuggestions,
    initialSuggestions,
    isOpen,
    needsManualCanonical,
    opportunities,
    seedOpportunityId,
  ]);

  useEffect(() => {
    if (!isOpen || nameEdited) return;
    const canonical = oppById.get(canonicalTwentyOppId);
    setName(canonical?.name ?? seedOpp?.name ?? '');
  }, [canonicalTwentyOppId, isOpen, nameEdited, oppById, seedOpp?.name]);

  const searchHits = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return opportunities
      .filter((opp) => !selectedIds.includes(opp.id))
      .filter(
        (opp) =>
          opp.name.toLowerCase().includes(q) || opp.id.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [opportunities, search, selectedIds]);

  const canonicalBitrixOptions = bitrixOptionsForOpp(oppById.get(canonicalTwentyOppId));

  const addOpp = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev : [...prev, id]));
    setSearch('');
  };

  const removeOpp = (id: string) => {
    setSelectedIds((prev) => prev.filter((item) => item !== id));
  };

  const applyCandidate = (oppIds: string[]) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      for (const id of oppIds) next.add(id);
      return [...next];
    });
  };

  const handleSave = async () => {
    if (selectedIds.length < 2) {
      setError('Выберите хотя бы две сметы');
      return;
    }
    if (manualCanonicalRequired && !canonicalTwentyOppId) {
      setError('Выберите канон: две сметы с оплатой');
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const body = buildConfirmDealGroupBody({
        selectedOppIds: selectedIds,
        name,
        nameEdited,
        canonicalTwentyOppId: canonicalTwentyOppId || undefined,
        canonicalBitrixId: canonicalBitrixId || undefined,
        canonicalSelectedManually:
          canonicalSelectedManually || manualCanonicalRequired,
      });
      await confirmDealGroup(body);
      onSaved?.();
      onClose();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('canonical_required')) {
        setManualCanonicalRequired(true);
        setError('Выберите канон: две сметы с оплатой');
      } else {
        setError(message);
      }
    } finally {
      setIsSaving(false);
    }
  };

  const renderCandidateSection = (
    tier: 'hard' | 'soft',
    title: string,
    candidates: DealGroupSuggestions['hard'],
  ) => (
    <div data-candidate-tier={tier} style={{ marginTop: spacing.md }}>
      <div
        style={{
          fontSize: font.sizeXs,
          fontWeight: font.weightSemibold,
          color: colors.textMuted,
          marginBottom: spacing.xs,
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        }}
      >
        {title}
      </div>
      {candidates.length === 0 ? (
        <div style={{ fontSize: font.sizeSm, color: colors.textMuted }}>Нет кандидатов</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.xs }}>
          {candidates.map((candidate, index) => {
            const ids = candidateOppIds(candidate);
            const labels = ids
              .map((id) => oppById.get(id)?.name ?? id)
              .join(' · ');
            return (
              <button
                key={`${tier}-${candidate.reason}-${index}`}
                type="button"
                onClick={() => applyCandidate(ids)}
                style={{
                  textAlign: 'left',
                  border: `1px solid ${colors.borderSubtle}`,
                  borderRadius: radius.md,
                  backgroundColor: colors.bgSecondary,
                  padding: `${spacing.sm} ${spacing.md}`,
                  cursor: 'pointer',
                  fontFamily: font.family,
                  fontSize: font.sizeSm,
                  color: colors.text,
                }}
              >
                <div style={{ fontWeight: font.weightSemibold }}>{labels}</div>
                <div style={{ color: colors.textMuted, fontSize: font.sizeXs }}>
                  {candidate.reason}
                  {candidate.conflict ? ' · конфликт' : ''}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <Modal
      theme={theme}
      isOpen={isOpen}
      title="Связать сделки"
      description="Соберите сметы в одну работу. Запись группы идёт через парсер — без тихого merge."
      onClose={onClose}
      portalTarget="root"
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
          <Button theme={theme} variant="ghost" size="sm" onClick={onClose} disabled={isSaving}>
            Отмена
          </Button>
          <Button
            theme={theme}
            variant="primary"
            size="sm"
            onClick={() => void handleSave()}
            disabled={isSaving}
          >
            Связать
          </Button>
        </div>
      }
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.md,
          maxHeight: 420,
          overflow: 'auto',
        }}
      >
        <div>
          <div style={{ fontSize: font.sizeXs, color: colors.textMuted, marginBottom: spacing.xs }}>
            Выбрано
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: spacing.xs }}>
            {selectedIds.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => removeOpp(id)}
                style={{
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.pill,
                  backgroundColor: colors.accentMuted,
                  color: colors.accentText,
                  padding: '2px 8px',
                  fontSize: font.sizeXs,
                  cursor: 'pointer',
                  fontFamily: font.family,
                }}
                title="Убрать"
              >
                {oppById.get(id)?.name ?? id} ×
              </button>
            ))}
          </div>
        </div>

        {suggestionsLoading ? (
          <div style={{ fontSize: font.sizeSm, color: colors.textMuted }}>
            Загрузка подсказок…
          </div>
        ) : null}
        {suggestionsError ? (
          <div style={{ fontSize: font.sizeSm, color: colors.warning }}>
            Подсказки не загрузились: {suggestionsError}
          </div>
        ) : null}

        {renderCandidateSection('hard', 'Жёсткие совпадения', suggestions.hard)}
        {renderCandidateSection('soft', 'Мягкие совпадения', suggestions.soft)}

        <div>
          <div style={{ fontSize: font.sizeXs, color: colors.textMuted, marginBottom: spacing.xs }}>
            Поиск сметы
          </div>
          <Input
            theme={theme}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Название или id…"
          />
          {searchHits.length > 0 ? (
            <div style={{ marginTop: spacing.xs, display: 'flex', flexDirection: 'column', gap: 4 }}>
              {searchHits.map((opp) => (
                <button
                  key={opp.id}
                  type="button"
                  onClick={() => addOpp(opp.id)}
                  style={{
                    textAlign: 'left',
                    border: 'none',
                    background: 'transparent',
                    padding: '4px 0',
                    cursor: 'pointer',
                    color: colors.accentText,
                    fontFamily: font.family,
                    fontSize: font.sizeSm,
                  }}
                >
                  {opp.name}
                </button>
              ))}
            </div>
          ) : null}
        </div>

        <div>
          <div style={{ fontSize: font.sizeXs, color: colors.textMuted, marginBottom: spacing.xs }}>
            Имя родителя
          </div>
          <Input
            theme={theme}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setNameEdited(true);
            }}
          />
        </div>

        <div>
          <div style={{ fontSize: font.sizeXs, color: colors.textMuted, marginBottom: spacing.xs }}>
            Канон-смета
          </div>
          <Select
            theme={theme}
            value={canonicalTwentyOppId}
            onChange={(event) => {
              setCanonicalTwentyOppId(event.target.value);
              setCanonicalSelectedManually(true);
              const nextBits = bitrixOptionsForOpp(oppById.get(event.target.value));
              setCanonicalBitrixId(nextBits[0]?.id ?? '');
            }}
          >
            {selectedIds.map((id) => (
              <option key={id} value={id}>
                {oppById.get(id)?.name ?? id}
              </option>
            ))}
          </Select>
          {manualCanonicalRequired ? (
            <div style={{ marginTop: spacing.xs, fontSize: font.sizeXs, color: colors.danger }}>
              Выберите канон: две сметы с оплатой
            </div>
          ) : null}
        </div>

        <div>
          <div style={{ fontSize: font.sizeXs, color: colors.textMuted, marginBottom: spacing.xs }}>
            Канон Bitrix
          </div>
          <Select
            theme={theme}
            value={canonicalBitrixId}
            onChange={(event) => {
              setCanonicalBitrixId(event.target.value);
              setCanonicalSelectedManually(true);
            }}
          >
            <option value="">Авто</option>
            {canonicalBitrixOptions.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label}
              </option>
            ))}
          </Select>
        </div>

        {error ? (
          <div style={{ fontSize: font.sizeSm, color: colors.danger }}>{error}</div>
        ) : null}
      </div>
    </Modal>
  );
};
