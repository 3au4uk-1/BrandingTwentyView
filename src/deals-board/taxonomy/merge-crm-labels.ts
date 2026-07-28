import type { SelectOption } from '../metadata/types';

type LabeledOption = {
  value: string;
  label: string;
  color: string;
};

/**
 * Hybrid taxonomy: app owns values / order / colors; CRM may override labels
 * (Settings → Data Model). Unknown CRM-only values are ignored here so
 * tip→detail rules stay app-owned.
 */
export const mergeAppOptionsWithCrmLabels = <T extends LabeledOption>(
  appOptions: readonly T[],
  crmOptions?: readonly SelectOption[] | null,
): T[] => {
  if (!crmOptions?.length) return [...appOptions];
  const labelByValue = new Map(
    crmOptions.map((option) => [option.value, option.label] as const),
  );
  return appOptions.map((option) => {
    const crmLabel = labelByValue.get(option.value);
    if (!crmLabel || crmLabel === option.label) return option;
    return { ...option, label: crmLabel };
  });
};

/** Extra CRM tipDetail values not in app constants — shown for any tip that has details. */
export const appendUnknownCrmTipDetails = (
  appOptions: readonly LabeledOption[],
  crmOptions: readonly SelectOption[] | null | undefined,
  currentValue?: string | null,
): LabeledOption[] => {
  if (!crmOptions?.length) return [...appOptions];
  const known = new Set(appOptions.map((option) => option.value));
  const extras: LabeledOption[] = [];
  for (const option of crmOptions) {
    if (known.has(option.value)) continue;
    if (currentValue && option.value === currentValue) {
      extras.push({ value: option.value, label: option.label, color: 'gray' });
      known.add(option.value);
    }
  }
  return extras.length ? [...appOptions, ...extras] : [...appOptions];
};
