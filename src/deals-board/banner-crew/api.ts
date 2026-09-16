import { RestApiClient } from 'twenty-client-sdk/rest';

import type { BannerCrewLocation } from 'src/constants/banner-crew';

import { extractRestPageInfo, normalizeRestListResponse } from '../api/rest-list';
import type { BannerCrewSlot } from './types';
import { findSlotForTriple } from './upsert';

const ENDPOINT = '/rest/bannerCrewSlots';
const LIST_KEY = 'bannerCrewSlots';
const PAGE_LIMIT = 200;

const readNestedRecord = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : null;

const readString = (value: unknown): string | null =>
  typeof value === 'string' ? value : null;

export const slotDisplayName = (
  supplierName: string,
  location: BannerCrewLocation,
): string => `${supplierName} · ${location === 'BASE' ? 'база' : 'объект'}`;

export const normalizeBannerCrewSlot = (raw: unknown): BannerCrewSlot | null => {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  if (typeof record.id !== 'string') return null;

  const location = record.location;
  if (location !== 'SITE' && location !== 'BASE') return null;

  const opportunity = readNestedRecord(record.opportunity);
  const supplier = readNestedRecord(record.supplier);

  return {
    id: record.id,
    opportunityId: readString(record.opportunityId) ?? readString(opportunity?.id) ?? null,
    opportunityName: readString(opportunity?.name),
    opportunityStage: readString(opportunity?.stage),
    supplierId: readString(record.supplierId) ?? readString(supplier?.id) ?? null,
    supplierName: readString(supplier?.name),
    location,
    startsAt: readString(record.startsAt),
    endsAt: readString(record.endsAt),
  };
};

export const fetchBannerCrewSlots = async (): Promise<BannerCrewSlot[]> => {
  const client = new RestApiClient();
  const all: BannerCrewSlot[] = [];
  let after: string | undefined;
  do {
    const response = await client.get<unknown>(ENDPOINT, {
      query: { limit: PAGE_LIMIT, depth: 1, ...(after ? { after } : {}) },
    });
    const page = normalizeRestListResponse<unknown>(response, LIST_KEY)
      .map(normalizeBannerCrewSlot)
      .filter((slot): slot is BannerCrewSlot => slot !== null);
    all.push(...page);
    const pageInfo = extractRestPageInfo(response);
    after = pageInfo.hasNextPage && pageInfo.endCursor ? String(pageInfo.endCursor) : undefined;
  } while (after);
  return all;
};

export const createBannerCrewSlot = async (input: {
  opportunityId: string;
  supplierId: string;
  location: BannerCrewLocation;
  startsAt: string | null;
  endsAt: string | null;
  name: string;
}): Promise<void> => {
  const client = new RestApiClient();
  await client.post<unknown>(ENDPOINT, input);
};

export const updateBannerCrewSlot = async (
  id: string,
  patch: Partial<{ startsAt: string | null; endsAt: string | null; name: string }>,
): Promise<void> => {
  const client = new RestApiClient();
  await client.patch<unknown>(`${ENDPOINT}/${id}`, patch);
};

export const deleteBannerCrewSlot = async (id: string): Promise<void> => {
  const client = new RestApiClient();
  await client.delete<unknown>(`${ENDPOINT}/${id}`);
};

export const ensureSlot = async (args: {
  slots: BannerCrewSlot[];
  opportunityId: string;
  supplierId: string;
  supplierName: string;
  location: BannerCrewLocation;
  startsAt: string | null;
  endsAt: string | null;
  create: typeof createBannerCrewSlot;
  update: typeof updateBannerCrewSlot;
}): Promise<void> => {
  const name = slotDisplayName(args.supplierName, args.location);
  const existing = findSlotForTriple(
    args.slots,
    args.opportunityId,
    args.supplierId,
    args.location,
  );
  if (existing) {
    await args.update(existing.id, {
      startsAt: args.startsAt,
      endsAt: args.endsAt,
      name,
    });
    return;
  }
  await args.create({
    opportunityId: args.opportunityId,
    supplierId: args.supplierId,
    location: args.location,
    startsAt: args.startsAt,
    endsAt: args.endsAt,
    name,
  });
};

export const removePersonFromOrder = async (args: {
  slots: BannerCrewSlot[];
  opportunityId: string;
  supplierId: string;
  remove: typeof deleteBannerCrewSlot;
}): Promise<void> => {
  const matching = args.slots.filter(
    (s) => s.opportunityId === args.opportunityId && s.supplierId === args.supplierId,
  );
  for (const match of matching) {
    await args.remove(match.id);
  }
};

export const removeLocationSlot = async (args: {
  slots: BannerCrewSlot[];
  opportunityId: string;
  supplierId: string;
  location: BannerCrewLocation;
  remove: typeof deleteBannerCrewSlot;
}): Promise<void> => {
  const existing = findSlotForTriple(
    args.slots,
    args.opportunityId,
    args.supplierId,
    args.location,
  );
  if (!existing) return;
  await args.remove(existing.id);
};
