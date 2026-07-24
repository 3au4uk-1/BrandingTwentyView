import type { LineItemRow } from '../types';

const normalize = (value: string | null | undefined): string =>
  (value || '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Machine / автомат Хватайка (not branding of it). */
export const isHvataykaEquipmentName = (name: string | null | undefined): boolean => {
  const n = normalize(name);
  if (!n.includes('хватайк')) return false;
  if (n.includes('брендинг') || n.includes('оклейк')) return false;
  return n.includes('автомат') || n.includes('хватайка');
};

/** Sibling that means the machine will be branded / wrapped. */
export const isHvataykaBrandingSiblingName = (name: string | null | undefined): boolean => {
  const n = normalize(name);
  if (!n.includes('хватайк')) return false;
  if (n.includes('брендинг')) return true;
  if (n.includes('оклейк') && (n.includes('корпус') || n.includes('хватайк'))) return true;
  return false;
};

const COMMENT_MARK = 'будет Брендинг';

export const appendBrandingComment = (kommentariy: string | null | undefined): string => {
  const current = (kommentariy || '').trim();
  if (normalize(current).includes(normalize(COMMENT_MARK))) return current;
  return current ? `${current}\n${COMMENT_MARK}` : COMMENT_MARK;
};

export type HvataykaPatch = {
  id: string;
  data: { stage: 'GOTOVO'; kommentariy: string };
};

/**
 * If the deal has a branding sibling for Хватайка, mark equipment rows GOTOVO
 * and ensure comment contains «будет Брендинг».
 */
export const planHvataykaAutomation = (siblings: LineItemRow[]): HvataykaPatch[] => {
  const hasBranding = siblings.some((item) => isHvataykaBrandingSiblingName(item.name));
  if (!hasBranding) return [];

  const patches: HvataykaPatch[] = [];
  for (const item of siblings) {
    if (!isHvataykaEquipmentName(item.name)) continue;
    if (item.stage === 'GOTOVO' || item.stage === 'OTMENA') {
      const nextComment = appendBrandingComment(item.kommentariy);
      if (nextComment !== (item.kommentariy || '').trim()) {
        patches.push({
          id: item.id,
          data: { stage: 'GOTOVO', kommentariy: nextComment },
        });
      }
      continue;
    }
    patches.push({
      id: item.id,
      data: {
        stage: 'GOTOVO',
        kommentariy: appendBrandingComment(item.kommentariy),
      },
    });
  }
  return patches;
};
