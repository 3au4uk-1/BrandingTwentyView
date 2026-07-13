export const MOBILE_BREAKPOINT = 768;

export type LayoutMode = 'desktop' | 'mobile';

export const resolveLayoutMode = (containerWidth: number): LayoutMode => {
  if (containerWidth <= 0) return 'desktop';
  return containerWidth < MOBILE_BREAKPOINT ? 'mobile' : 'desktop';
};
