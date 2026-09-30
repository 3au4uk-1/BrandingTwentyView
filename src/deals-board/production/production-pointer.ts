import type { ProductionColumnId } from './board';

/** Remote DOM nodes are elements, but `closest` is missing there. */
export type PointerNode = {
  nodeType?: number;
  tagName?: string;
  nodeName?: string;
  parentElement?: PointerNode | null;
  getAttribute?: (name: string) => string | null;
};

const TEXT_NODE = 3;
const INTERACTIVE = new Set(['button', 'a', 'input', 'textarea', 'select']);

const elementOf = (target: PointerNode | null | undefined): PointerNode | null => {
  if (!target) return null;
  if (target.nodeType === TEXT_NODE) return target.parentElement ?? null;
  return target;
};

const tagOf = (node: PointerNode): string => (node.tagName || node.nodeName || '').toLowerCase();

export const isProductionInteractiveTarget = (target: PointerNode | null | undefined): boolean => {
  let current = elementOf(target);
  for (let depth = 0; current && depth < 12; depth += 1) {
    if (INTERACTIVE.has(tagOf(current))) return true;
    current = current.parentElement ?? null;
  }
  return false;
};

export const readProductionColumnId = (
  target: PointerNode | null | undefined,
): ProductionColumnId | null => {
  let current = elementOf(target);
  for (let depth = 0; current && depth < 40; depth += 1) {
    const id = current.getAttribute?.('data-production-column') ?? null;
    if (id === 'ne-vzyato' || id === 'v-rabote' || id === 'gotovo') return id;
    current = current.parentElement ?? null;
  }
  return null;
};
