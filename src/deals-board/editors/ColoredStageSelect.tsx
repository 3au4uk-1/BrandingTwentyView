import type { CSSProperties } from 'react';

import { getChipPalette, type ChipColor } from '../Chip';
import type { ThemeTokens } from '../theme/tokens';
import { Select } from '../ui/Input';

type StageOption = {
  value: string;
  label: string;
  color: string;
};

type ColoredStageSelectProps = {
  theme: ThemeTokens;
  stages: ReadonlyArray<StageOption>;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  style?: CSSProperties;
};

const SELECT_SURFACE = {
  background: '#18181b',
  border: '#3f3f46',
} as const;

const getStageAccent = (color: string) =>
  getChipPalette((color as ChipColor) || 'gray', 'dark').text;

export const ColoredStageSelect = ({
  theme,
  stages,
  value,
  onChange,
  disabled,
  style,
}: ColoredStageSelectProps) => {
  const selectedStage = stages.find((stage) => stage.value === value);
  const selectedAccent = getStageAccent(selectedStage?.color ?? 'gray');

  return (
    <Select
      theme={theme}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      style={{
        flex: 1,
        minWidth: 0,
        fontSize: theme.font.sizeSm,
        padding: '4px 8px',
        fontWeight: theme.font.weightMedium,
        colorScheme: 'dark',
        backgroundColor: SELECT_SURFACE.background,
        color: selectedAccent,
        borderColor: SELECT_SURFACE.border,
        ...style,
      }}
    >
      {stages.map((stage) => (
        <option
          key={stage.value}
          value={stage.value}
          style={{
            backgroundColor: SELECT_SURFACE.background,
            color: getStageAccent(stage.color),
          }}
        >
          {stage.label}
        </option>
      ))}
    </Select>
  );
};
