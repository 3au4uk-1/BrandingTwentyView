export const isOtmenaTransition = (
  previous: string | null | undefined,
  next: string | null | undefined,
): boolean => next === 'OTMENA' && previous !== 'OTMENA';
