import type { InputHTMLAttributes, TextareaHTMLAttributes } from 'react';

import type { ThemeTokens } from '../theme/tokens';

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  theme: ThemeTokens;
};

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  theme: ThemeTokens;
};

const baseFieldStyle = (theme: ThemeTokens) => ({
  width: '100%',
  boxSizing: 'border-box' as const,
  fontFamily: theme.font.family,
  fontSize: theme.font.sizeSm,
  color: theme.colors.text,
  backgroundColor: theme.colors.bgElevated,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: theme.radius.md,
  padding: '7px 10px',
  outline: 'none',
});

export const Input = ({ theme, style, ...props }: InputProps) => (
  <input
    data-field-input
    style={{
      ...baseFieldStyle(theme),
      transition: 'border-color 0.12s ease, box-shadow 0.12s ease',
      ...style,
    }}
    {...props}
  />
);

export const Textarea = ({ theme, style, ...props }: TextareaProps) => (
  <textarea
    style={{
      ...baseFieldStyle(theme),
      resize: 'vertical',
      minHeight: '96px',
      ...style,
    }}
    {...props}
  />
);

export const Select = ({
  theme,
  style,
  children,
  ...props
}: InputHTMLAttributes<HTMLSelectElement> & { theme: ThemeTokens; children: React.ReactNode }) => (
  <select
    data-field-input
    style={{
      ...baseFieldStyle(theme),
      cursor: 'pointer',
      transition: 'border-color 0.12s ease, box-shadow 0.12s ease',
      ...style,
    }}
    {...props}
  >
    {children}
  </select>
);
