import { EMPTY_VALUE } from '../theme/tokens';

const shortDateFormatter = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short' });

const RICH_TEXT_PREVIEW_MAX_LENGTH = 80;

const stripMarkdown = (text: string): string =>
  text
    .replace(/^#+\s+/gm, '')
    .replace(/\*\*(.*?)\*\*/g, '$1')
    .replace(/\*(.*?)\*/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\[(.*?)\]\(.*?\)/g, '$1')
    .replace(/\n+/g, ' ')
    .trim();

const truncateText = (text: string, maxLength: number): string => {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 1).trimEnd()}…`;
};

const formatDateValue = (value: unknown): string => {
  if (typeof value !== 'string' || !value) return EMPTY_VALUE;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return EMPTY_VALUE;

  return shortDateFormatter.format(date);
};

const formatCurrencyValue = (value: unknown): string => {
  if (!value || typeof value !== 'object') return EMPTY_VALUE;

  const { amountMicros, currencyCode } = value as {
    amountMicros?: number;
    currencyCode?: string;
  };

  if (typeof amountMicros !== 'number') return EMPTY_VALUE;

  const amount = amountMicros / 1_000_000;
  return `${amount.toLocaleString('ru-RU')} ${currencyCode ?? ''}`.trim();
};

const formatLinksValue = (value: unknown): string => {
  if (!value || typeof value !== 'object') return EMPTY_VALUE;

  const url = (value as { primaryLinkUrl?: string }).primaryLinkUrl?.trim();
  return url || EMPTY_VALUE;
};

const formatRichTextValue = (value: unknown): string => {
  const raw =
    typeof value === 'string'
      ? value
      : value && typeof value === 'object'
        ? (value as { markdown?: string }).markdown
        : undefined;

  const text = stripMarkdown(raw?.trim() ?? '');
  if (!text) return EMPTY_VALUE;

  return truncateText(text, RICH_TEXT_PREVIEW_MAX_LENGTH);
};

const formatRelationValue = (value: unknown): string => {
  if (!value || typeof value !== 'object') return EMPTY_VALUE;

  const relation = value as { id?: string; name?: string };
  const name = relation.name?.trim();
  if (name) return name;

  const id = relation.id?.trim();
  return id || EMPTY_VALUE;
};

export const formatReadOnlyValue = (fieldType: string | undefined, value: unknown): string => {
  switch (fieldType) {
    case 'CURRENCY':
      return formatCurrencyValue(value);
    case 'LINKS':
      return formatLinksValue(value);
    case 'RICH_TEXT':
      return formatRichTextValue(value);
    case 'RELATION':
      return formatRelationValue(value);
    case 'BOOLEAN':
      if (value === true) return 'Да';
      if (value === false) return 'Нет';
      return EMPTY_VALUE;
    case 'DATE':
    case 'DATE_TIME':
      return formatDateValue(value);
    default:
      if (value === null || value === undefined) return EMPTY_VALUE;
      if (typeof value === 'string') return value.trim() || EMPTY_VALUE;
      if (typeof value === 'number' || typeof value === 'boolean') return String(value);
      return EMPTY_VALUE;
  }
};
