import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useMemo, useRef, useState } from 'react';

import { useSuppliers } from '../hooks/useSuppliers';
import type { SupplierRow } from '../suppliers/picker';
import { useTheme } from '../theme/ThemeContext';
import { EMPTY_VALUE } from '../theme/tokens';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Modal } from '../ui/Modal';
import { getTodayInputDateMsk } from '../utils/working-days';
import {
  createBannerCrewSlot,
  deleteBannerCrewSlot,
  ensureSlot,
  removePersonFromOrder,
  updateBannerCrewSlot,
} from './api';
import { BANNER_CREW_MODAL_PORTAL_TARGET } from './chip-layout';
import { isoToMskParts } from './msk-datetime';
import { findConflicts, isOccupyingSlot } from './occupancy';
import {
  emptySiteInterval,
  siteDraftFromSlots,
  siteDraftToIso,
  siteIntervalError,
  type SiteIntervalDraft,
} from './site-interval';
import type { BannerCrewSlot } from './types';
import { bannerCrewSlotsQueryKey, useBannerCrewSlots } from './useBannerCrewSlots';

type BannerCrewModalProps = {
  opportunityId: string;
  opportunityName: string;
  loadDate?: string | null;
  isOpen: boolean;
  onClose: () => void;
};

const BANNERA_CATEGORY = 'BANNERA';

const formatDealDate = (inputDate: string | null): string => {
  if (!inputDate) return EMPTY_VALUE;
  const [year, month, day] = inputDate.split('-');
  return `${day}.${month}.${year}`;
};

export const beginBusy = (ref: { current: boolean }): boolean => {
  if (ref.current) return false;
  ref.current = true;
  return true;
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
  const [siteDraft, setSiteDraft] = useState<SiteIntervalDraft>(emptySiteInterval(''));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isBusy, setIsBusy] = useState(false);
  const busyRef = useRef(false);
  const seededForOpen = useRef<string | null>(null);

  const slots = useMemo(() => slotsQuery.data ?? [], [slotsQuery.data]);
  const orderSlots = useMemo(
    () => slots.filter((slot) => slot.opportunityId === opportunityId),
    [slots, opportunityId],
  );
  const slotsById = useMemo(
    () => new Map(slots.map((slot) => [slot.id, slot])),
    [slots],
  );

  const dealDate = useMemo(
    () => (loadDate ? (isoToMskParts(loadDate)?.date ?? null) : null),
    [loadDate],
  );
  const fallbackDate = dealDate ?? getTodayInputDateMsk();

  const isLoading = slotsQuery.isLoading || suppliersQuery.isLoading;

  useEffect(() => {
    if (!isOpen) {
      seededForOpen.current = null;
      return;
    }
    if (isLoading) return;
    if (seededForOpen.current === opportunityId) return;
    seededForOpen.current = opportunityId;
    const assigned = new Set(
      orderSlots
        .map((slot) => slot.supplierId)
        .filter((id): id is string => id !== null),
    );
    setSelectedIds(assigned);
    setSiteDraft(siteDraftFromSlots(orderSlots, fallbackDate));
  }, [fallbackDate, isLoading, isOpen, opportunityId, orderSlots]);

  const people = useMemo(() => {
    return (suppliersQuery.data ?? [])
      .filter(
        (row) => row.category === BANNERA_CATEGORY && (row.isActive || selectedIds.has(row.id)),
      )
      .sort((a, b) => a.name.localeCompare(b.name, 'ru-RU'));
  }, [selectedIds, suppliersQuery.data]);

  const siteOccupying = useMemo(
    () => slots.filter((slot) => slot.location === 'SITE' && isOccupyingSlot(slot)),
    [slots],
  );
  const conflicts = useMemo(() => findConflicts(siteOccupying), [siteOccupying]);

  const conflictLabelsForOrder = (): string[] => {
    const names: string[] = [];
    for (const slot of orderSlots) {
      if (slot.location !== 'SITE' || !isOccupyingSlot(slot)) continue;
      for (const otherId of conflicts.get(slot.id) ?? []) {
        const name = slotsById.get(otherId)?.opportunityName?.trim() || 'другая сделка';
        if (!names.includes(name)) names.push(name);
      }
    }
    return names;
  };

  const readCachedSlots = (): BannerCrewSlot[] =>
    queryClient.getQueryData<BannerCrewSlot[]>(bannerCrewSlotsQueryKey) ?? slots;

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
      busyRef.current = false;
      setIsBusy(false);
    }
  };

  const setPersonSelected = (id: string, next: boolean) => {
    setSelectedIds((current) => {
      const copy = new Set(current);
      if (next) copy.add(id);
      else copy.delete(id);
      return copy;
    });
  };

  const togglePerson = (person: SupplierRow, next: boolean) => {
    if (!beginBusy(busyRef)) return;
    setPersonSelected(person.id, next);

    if (next) {
      const { startsAt, endsAt } = siteDraftToIso(siteDraft);
      void runWrite(
        () =>
          ensureSlot({
            slots: readCachedSlots(),
            opportunityId,
            supplierId: person.id,
            supplierName: person.name,
            location: 'SITE',
            startsAt,
            endsAt,
            create: createBannerCrewSlot,
            update: updateBannerCrewSlot,
          }),
        false,
      );
      return;
    }

    void runWrite(
      () =>
        removePersonFromOrder({
          slots: readCachedSlots(),
          opportunityId,
          supplierId: person.id,
          remove: deleteBannerCrewSlot,
        }),
      false,
    );
  };

  const handleSave = () => {
    const error = siteIntervalError(siteDraft);
    if (error) {
      window.alert(`Проверьте время монтажа — ${error}`);
      return;
    }
    if (!beginBusy(busyRef)) return;

    const { startsAt, endsAt } = siteDraftToIso(siteDraft);

    void runWrite(async () => {
      const assigned = new Set(
        readCachedSlots()
          .filter((slot) => slot.opportunityId === opportunityId && slot.supplierId)
          .map((slot) => slot.supplierId as string),
      );
      for (const supplierId of assigned) {
        if (selectedIds.has(supplierId)) continue;
        await removePersonFromOrder({
          slots: readCachedSlots(),
          opportunityId,
          supplierId,
          remove: deleteBannerCrewSlot,
        });
        await queryClient.invalidateQueries({ queryKey: bannerCrewSlotsQueryKey });
      }
      for (const person of people) {
        if (!selectedIds.has(person.id)) continue;
        await ensureSlot({
          slots: readCachedSlots(),
          opportunityId,
          supplierId: person.id,
          supplierName: person.name,
          location: 'SITE',
          startsAt,
          endsAt,
          create: createBannerCrewSlot,
          update: updateBannerCrewSlot,
        });
        await queryClient.invalidateQueries({ queryKey: bannerCrewSlotsQueryKey });
      }
    }, true);
  };

  const applyDealDates = () => {
    if (!dealDate) return;
    setSiteDraft((current) => ({
      ...current,
      startDate: dealDate,
      endDate: dealDate,
    }));
  };

  const fieldStyle = { flex: 1, minWidth: 0, padding: '5px 8px' };
  const overlapNames = conflictLabelsForOrder();
  const intervalError = siteIntervalError(siteDraft);

  return (
    <Modal
      theme={theme}
      isOpen={isOpen}
      title={opportunityName}
      description={`Монтаж баннера · дата сделки ${formatDealDate(dealDate)}`}
      onClose={onClose}
      portalTarget={BANNER_CREW_MODAL_PORTAL_TARGET}
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
        <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.md }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: spacing.sm,
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
              Монтаж на объекте
            </span>
            <label style={{ fontSize: font.sizeXs, color: colors.textMuted }}>Начало</label>
            <div style={{ display: 'flex', gap: spacing.xs }}>
              <Input
                theme={theme}
                type="date"
                value={siteDraft.startDate}
                disabled={isBusy}
                aria-label="Дата начала"
                onChange={(event) =>
                  setSiteDraft((current) => ({ ...current, startDate: event.target.value }))
                }
                style={fieldStyle}
              />
              <Input
                theme={theme}
                type="text"
                inputMode="numeric"
                placeholder="23:50"
                value={siteDraft.startTime}
                disabled={isBusy}
                aria-label="Время начала"
                onChange={(event) =>
                  setSiteDraft((current) => ({ ...current, startTime: event.target.value }))
                }
                style={fieldStyle}
              />
            </div>
            <label style={{ fontSize: font.sizeXs, color: colors.textMuted }}>Конец</label>
            <div style={{ display: 'flex', gap: spacing.xs }}>
              <Input
                theme={theme}
                type="date"
                value={siteDraft.endDate}
                disabled={isBusy}
                aria-label="Дата конца"
                onChange={(event) =>
                  setSiteDraft((current) => ({ ...current, endDate: event.target.value }))
                }
                style={fieldStyle}
              />
              <Input
                theme={theme}
                type="text"
                inputMode="numeric"
                placeholder="08:00"
                value={siteDraft.endTime}
                disabled={isBusy}
                aria-label="Время конца"
                onChange={(event) =>
                  setSiteDraft((current) => ({ ...current, endTime: event.target.value }))
                }
                style={fieldStyle}
              />
            </div>
            <Button
              theme={theme}
              variant="ghost"
              size="sm"
              disabled={isBusy || !dealDate}
              onClick={applyDealDates}
            >
              Как у сделки
            </Button>
            {intervalError ? (
              <span style={{ fontSize: font.sizeXs, color: colors.danger }}>
                {intervalError}
              </span>
            ) : null}
            {overlapNames.length > 0 ? (
              <span style={{ fontSize: font.sizeXs, color: colors.warning }}>
                Пересечение: {overlapNames.join(', ')}
              </span>
            ) : null}
          </div>

          <div style={{ maxHeight: '36vh', overflowY: 'auto' }}>
            {people.map((person) => {
              const active = selectedIds.has(person.id);
              return (
                <div
                  key={person.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: spacing.sm,
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
                      flex: 1,
                      fontSize: font.sizeSm,
                      color: colors.text,
                      cursor: 'pointer',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={active}
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
                    <Button
                      theme={theme}
                      variant="ghost"
                      size="sm"
                      onClick={() => togglePerson(person, false)}
                    >
                      Убрать
                    </Button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </Modal>
  );
};
