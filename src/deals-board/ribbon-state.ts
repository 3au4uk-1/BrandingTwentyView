export type RibbonTab = 'display' | 'labels' | 'board';

export const toggleRibbonTab = (
  current: RibbonTab | null,
  clicked: RibbonTab,
): RibbonTab | null => (current === clicked ? null : clicked);

export type DisplayDotInput = {
  expandMode: 'collapsed' | 'smart' | 'expanded';
  typeSectionsEnabled: boolean;
  groupChipMode: 'name' | 'name+status';
};

export const isDisplayTabDirty = (input: DisplayDotInput): boolean =>
  input.expandMode !== 'smart' ||
  input.typeSectionsEnabled ||
  input.groupChipMode !== 'name+status';

export const isLabelsTabDirty = (hiddenCount: number): boolean => hiddenCount > 0;

export const isLabelsTabAvailable = (
  labelCount: number,
  parserConfigured: boolean,
): boolean => parserConfigured && labelCount > 0;

export const resolveOpenRibbonTab = (
  current: RibbonTab | null,
  labelsAvailable: boolean,
): RibbonTab | null => (current === 'labels' && !labelsAvailable ? null : current);
