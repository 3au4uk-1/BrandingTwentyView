import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

import {
  BANNER_CREW_LOCATION_LABEL,
  BANNER_CREW_LOCATIONS,
  type BannerCrewLocation,
} from 'src/constants/banner-crew';

import { useSuppliers } from '../hooks/useSuppliers';
import type { SupplierRow } from '../suppliers/picker';
import { useTheme } from '../theme/ThemeContext';
import { EMPTY_VALUE } from '../theme/tokens';
import { Button } from '../ui/Button';
import { Input, Select } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { snapMinuteToTen } from '../utils/normalize-print-time';
import { getTodayInputDateMsk } from '../utils/working-days';
import {
  createBannerCrewSlot,
  deleteBannerCrewSlot,
  ensureSlot,
  removeLocationSlot,
  removePersonFromOrder,
  updateBannerCrewSlot,
} from './api';
import { isoToMskParts, mskPartsToIso, validateLocationTimes } from './msk-datetime';
import { findConflicts } from './occupancy';
import type { BannerCrewSlot } from './types';
import { findSlotForTriple } from './upsert';
import { bannerCrewSlotsQueryKey, useBannerCrewSlots } from './useBannerCrewSlots';

type BannerCrewModalProps = {
  opportunityId: string;
  opportunityName: string;
  loadDate?: string | null;
  isOpen: boolean;
  onClose: () => void;
};

type TimeEdge = 'startTime' | 'endTime';

type BlockDraft = {
  date: string;
  startTime: string;
  endTime: string;
};

const BANNERA_CATEGORY = 'BANNERA';
const HOURS = Array.from({ length: 24 }, (_, index) => String(index).padStart(2, '0'));
const MINUTES = ['00', '10', '20', '30', '40', '50'] as const;

const blockKey = (supplierId: string, location: BannerCrewLocation) =>
  `${supplierId}:${location}`;

const formatDealDate = (inputDate: string | null): string => {
  if (!inputDate) return EMPTY_VALUE;
  const [year, month, day] = inputDate.split('-');
  return `${day}.${month}.${year}`;
};

const draftFromSlot = (
  slot: BannerCrewSlot | undefined,
  fallbackDate: string,
): BlockDraft => {
  const start = slot?.startsAt ? isoToMskParts(slot.startsAt) : null;
  const end = slot?.endsAt ? isoToMskParts(slot.endsAt) : null;
  return {
    date: start?.date ?? end?.date ?? fallbackDate,
    startTime: start?.time ?? '',
    endTime: end?.time ?? '',
  };
};

const draftToIso = (draft: BlockDraft): { startsAt: string | null; endsAt: string | null } => ({
  startsAt: draft.date && draft.startTime ? mskPartsToIso(draft.date, draft.startTime) : null,
  endsAt: draft.date && draft.endTime ? mskPartsToIso(draft.date, draft.endTime) : null,
});

const blockError = (draft: BlockDraft): string | null => {
  if (!draft.date && (draft.startTime || draft.endTime)) return 'укажи дату';
  const { startsAt, endsAt } = draftToIso(draft);
  const status = validateLocationTimes(startsAt, endsAt);
  if (status === 'incomplete') return 'укажи начало и конец';
  if (status === 'invalid') return 'конец должен быть позже начала';
  return null;
};

const sameInstant = (left: string | null, right: string | null): boolean => {
  if (left === null || right === null) return left === right;
  return Date.parse(left) === Date.parse(right);
};

const isBlockDirty = (draft: BlockDraft, slot: BannerCrewSlot | undefined): boolean => {
  const { startsAt, endsAt } = draftToIso(draft);
  if (!slot) return startsAt !== null || endsAt !== null;
  return !sameInstant(startsAt, slot.startsAt) || !sameInstant(endsAt, slot.endsAt);
};

export const BannerCrewModal = ({
  opportunityId,
  opportunityName,
  loadDate,
  isOpen,
  onClose,
}: BannerCrewModalProps) => {
  const theme = useTheme();
  const { colors, font, radius, spacing } = theme;
  const queryClient = useQueryClient();
  const slotsQuery = useBannerCrewSlots();
  const suppliersQuery = useSuppliers();
  const [drafts, setDrafts] = useState<Record<string, BlockDraft>>({});
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    if (isOpen) return;
    setDrafts((current) => (Object.keys(current).length === 0 ? current : {}));
  }, [isOpen]);

  const slots = useMemo(() => slotsQuery.data ?? [], [slotsQuery.data]);
  const orderSlots = useMemo(
    () => slots.filter((slot) => slot.opportunityId === opportunityId),
    [slots, opportunityId],
  );
  const slotsById = useMemo(
    () => new Map(slots.map((slot) => [slot.id, slot])),
    [slots],
  );
  const conflicts = useMemo(() => findConflicts(slots), [slots]);

  const dealDate = useMemo(
    () => (loadDate ? (isoToMskParts(loadDate)?.date ?? null) : null),
    [loadDate],
  );
  const fallbackDate = dealDate ?? getTodayInputDateMsk();

  const people = useMemo(() => {
    const assigned = new Set(
      orderSlots.map((slot) => slot.supplierId).filter((id): id is string => id !== null),
    );
    return (suppliersQuery.data ?? [])
      .filter(
        (row) => row.category === BANNERA_CATEGORY && (row.isActive || assigned.has(row.id)),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'ru-RU'));
  }, [suppliersQuery.data, orderSlots]);

  const isOnOrder = (supplierId: string) =>
    orderSlots.some((slot) => slot.supplierId === supplierId);

  const slotDraft = (supplierId: string, location: BannerCrewLocation): BlockDraft =>
    draftFromSlot(
      findSlotForTriple(slots, opportunityId, supplierId, location),
      fallbackDate,
    );

  const readDraft = (supplierId: string, location: BannerCrewLocation): BlockDraft =>
    drafts[blockKey(supplierId, location)] ?? slotDraft(supplierId, location);

  const writeDraft = (
    supplierId: string,
    location: BannerCrewLocation,
    patch: Partial<BlockDraft>,
  ) => {
    const key = blockKey(supplierId, location);
    const fallback = slotDraft(supplierId, location);
    setDrafts((current) => ({
      ...current,
      [key]: { ...(current[key] ?? fallback), ...patch },
    }));
  };

  const conflictLabels = (slotId: string): string[] => {
    const names = (conflicts.get(slotId) ?? []).map(
      (otherId) => slotsById.get(otherId)?.opportunityName?.trim() || 'другая сделка',
    );
    return Array.from(new Set(names));
  };

  const runWrite = async (write: () => Promise<void>, closeAfter: boolean) => {
    setIsBusy(true);
    try {
      await write();
      await queryClient.invalidateQueries({ queryKey: bannerCrewSlotsQueryKey });
      if (closeAfter) onClose();
    } catch (error) {
      window.alert(
        `Не удалось сохранить слот.${error instanceof Error ? ` ${error.message}` : ''}`,
      );
      await queryClient.invalidateQueries({ queryKey: bannerCrewSlotsQueryKey });
    } finally {
      setIsBusy(false);
    }
  };

  const togglePerson = (person: SupplierRow, next: boolean) => {
    if (next) {
      void runWrite(
        () =>
          ensureSlot({
            slots,
            opportunityId,
            supplierId: person.id,
            supplierName: person.name,
            location: 'SITE',
            startsAt: null,
            endsAt: null,
            create: createBannerCrewSlot,
            update: updateBannerCrewSlot,
          }),
        false,
      );
      return;
    }

    setDrafts((current) => {
      const rest = { ...current };
      for (const location of BANNER_CREW_LOCATIONS) {
        delete rest[blockKey(person.id, location)];
      }
      return rest;
    });
    void runWrite(
      () =>
        removePersonFromOrder({
          slots,
          opportunityId,
          supplierId: person.id,
          remove: deleteBannerCrewSlot,
        }),
      false,
    );
  };

  const handleSave = () => {
    const writes: Array<() => Promise<void>> = [];

    for (const person of people) {
      if (!isOnOrder(person.id)) continue;

      for (const location of BANNER_CREW_LOCATIONS) {
        const slot = findSlotForTriple(slots, opportunityId, person.id, location);
        const draft = readDraft(person.id, location);
        if (!isBlockDirty(draft, slot)) continue;

        const error = blockError(draft);
        if (error) {
          window.alert(
            `Проверьте время: ${person.name} · ${BANNER_CREW_LOCATION_LABEL[location]} — ${error}`,
          );
          return;
        }

        const { startsAt, endsAt } = draftToIso(draft);

        if (startsAt === null && endsAt === null) {
          if (!slot) continue;
          if (location === 'BASE') {
            writes.push(() =>
              removeLocationSlot({
                slots,
                opportunityId,
                supplierId: person.id,
                location,
                remove: deleteBannerCrewSlot,
              }),
            );
          } else {
            writes.push(() => updateBannerCrewSlot(slot.id, { startsAt: null, endsAt: null }));
          }
          continue;
        }

        writes.push(() =>
          ensureSlot({
            slots,
            opportunityId,
            supplierId: person.id,
            supplierName: person.name,
            location,
            startsAt,
            endsAt,
            create: createBannerCrewSlot,
            update: updateBannerCrewSlot,
          }),
        );
      }
    }

    void runWrite(async () => {
      for (const write of writes) {
        await write();
      }
    }, true);
  };

  const selectStyle = {
    width: 'auto',
    padding: '5px 6px',
    fontSize: font.sizeSm,
    fontWeight: font.weightMedium,
    backgroundColor: colors.bgElevated,
    borderColor: colors.borderSubtle,
  };

  const optionStyle = {
    backgroundColor: colors.bgElevated,
    color: colors.text,
  };

  const renderTimeEdge = (
    person: SupplierRow,
    location: BannerCrewLocation,
    edge: TimeEdge,
  ) => {
    const value = readDraft(person.id, location)[edge];
    const hour = value ? value.slice(0, 2) : '';
    const minute = value ? snapMinuteToTen(value.slice(3, 5)) : '00';

    const apply = (nextTime: string) =>
      writeDraft(
        person.id,
        location,
        edge === 'startTime' ? { startTime: nextTime } : { endTime: nextTime },
      );

    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '2px' }}>
        <Select
          theme={theme}
          value={hour}
          disabled={isBusy}
          aria-label={edge === 'startTime' ? 'Час начала' : 'Час конца'}
          onChange={(event) =>
            apply(event.target.value ? `${event.target.value}:${minute}` : '')
          }
          style={selectStyle}
        >
          <option value="" style={optionStyle}>
            {EMPTY_VALUE}
          </option>
          {HOURS.map((item) => (
            <option key={item} value={item} style={optionStyle}>
              {item}
            </option>
          ))}
        </Select>
        <span style={{ color: colors.textMuted }}>:</span>
        <Select
          theme={theme}
          value={minute}
          disabled={isBusy || !hour}
          aria-label={edge === 'startTime' ? 'Минуты начала' : 'Минуты конца'}
          onChange={(event) => apply(`${hour}:${event.target.value}`)}
          style={selectStyle}
        >
          {MINUTES.map((item) => (
            <option key={item} value={item} style={optionStyle}>
              {item}
            </option>
          ))}
        </Select>
      </span>
    );
  };

  const renderBlock = (person: SupplierRow, location: BannerCrewLocation) => {
    const slot = findSlotForTriple(slots, opportunityId, person.id, location);
    const draft = readDraft(person.id, location);
    const error = blockError(draft);
    const overlaps = slot ? conflictLabels(slot.id) : [];

    return (
      <div
        key={location}
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing.xs,
          padding: spacing.sm,
          border: `1px solid ${colors.borderSubtle}`,
          borderRadius: radius.md,
          backgroundColor: colors.bgInset,
        }}
      >
        <span
          style={{
            fontSize: font.sizeXs,
            fontWeight: font.weightMedium,
            color: colors.textSecondary,
          }}
        >
          {BANNER_CREW_LOCATION_LABEL[location]}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
          <Input
            theme={theme}
            type="date"
            value={draft.date}
            disabled={isBusy}
            aria-label="Дата"
            onChange={(event) => writeDraft(person.id, location, { date: event.target.value })}
            style={{ flex: 1, minWidth: 0, padding: '5px 8px' }}
          />
          <Button
            theme={theme}
            variant="ghost"
            size="sm"
            disabled={isBusy || !dealDate}
            onClick={() => writeDraft(person.id, location, { date: dealDate ?? '' })}
          >
            Как у сделки
          </Button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: spacing.xs }}>
          {renderTimeEdge(person, location, 'startTime')}
          <span style={{ color: colors.textMuted }}>–</span>
          {renderTimeEdge(person, location, 'endTime')}
        </div>

        {error ? (
          <span style={{ fontSize: font.sizeXs, color: colors.danger }}>{error}</span>
        ) : null}

        {overlaps.length > 0 ? (
          <span style={{ fontSize: font.sizeXs, color: colors.warning }}>
            Пересечение: {overlaps.join(', ')}
          </span>
        ) : null}
      </div>
    );
  };

  const isLoading = slotsQuery.isLoading || suppliersQuery.isLoading;

  return (
    <Modal
      theme={theme}
      isOpen={isOpen}
      title={opportunityName}
      description={`Монтаж баннера · дата сделки ${formatDealDate(dealDate)}`}
      onClose={onClose}
      portalTarget="body"
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
          <Button theme={theme} variant="ghost" size="sm" onClick={onClose} disabled={isBusy}>
            Отмена
          </Button>
          <Button
            theme={theme}
            variant="primary"
            size="sm"
            onClick={handleSave}
            disabled={isBusy || isLoading}
          >
            {isBusy ? 'Сохранение...' : 'Сохранить'}
          </Button>
        </div>
      }
    >
      {isLoading ? (
        <span style={{ fontSize: font.sizeSm, color: colors.textMuted }}>Загрузка...</span>
      ) : people.length === 0 ? (
        <span style={{ fontSize: font.sizeSm, color: colors.textMuted }}>
          Нет баннерщиков в справочнике.
        </span>
      ) : (
        <div style={{ maxHeight: '52vh', overflowY: 'auto' }}>
          {people.map((person) => {
            const active = isOnOrder(person.id);
            return (
              <div
                key={person.id}
                style={{
                  padding: `${spacing.sm} 0`,
                  borderTop: `1px solid ${colors.borderSubtle}`,
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
                    minWidth: 0,
                    fontSize: font.sizeSm,
                    color: colors.text,
                    cursor: isBusy ? 'not-allowed' : 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={active}
                    disabled={isBusy}
                    onChange={(event) => togglePerson(person, event.target.checked)}
                  />
                  <span
                    style={{
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {person.name}
                  </span>
                  {person.isActive ? null : (
                    <span style={{ fontSize: font.sizeXs, color: colors.textMuted }}>
                      неактивен
                    </span>
                  )}
                </label>

                {active ? (
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: spacing.sm,
                      marginTop: spacing.sm,
                    }}
                  >
                    {BANNER_CREW_LOCATIONS.map((location) => renderBlock(person, location))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
};
