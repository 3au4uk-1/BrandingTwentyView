export const MOBILE_BREAKPOINT = 768;

export type LayoutMode = 'desktop' | 'mobile';

export type ResolveLayoutModeOptions = {
  /** CSS media query matched — used when Twenty widget is wider than the phone viewport. */
  prefersMobile?: boolean;
};

export const resolveLayoutMode = (
  effectiveWidth: number,
  options?: ResolveLayoutModeOptions,
): LayoutMode => {
  if (options?.prefersMobile) return 'mobile';
  if (effectiveWidth <= 0) return 'desktop';
  return effectiveWidth < MOBILE_BREAKPOINT ? 'mobile' : 'desktop';
};
