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

const getStageAccent = (color: string, scheme: ThemeTokens['colorScheme']) =>
  getChipPalette((color as ChipColor) || 'gray', scheme).text;

export const ColoredStageSelect = ({
  theme,
  stages,
  value,
  onChange,
  disabled,
  style,
}: ColoredStageSelectProps) => {
  const selectedStage = stages.find((stage) => stage.value === value);
  const selectedAccent = getStageAccent(selectedStage?.color ?? 'gray', theme.colorScheme);
  const { colors, font } = theme;

  return (
    <Select
      theme={theme}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      style={{
        flex: 1,
        minWidth: 0,
        fontSize: font.sizeSm,
        padding: '4px 8px',
        fontWeight: font.weightMedium,
        letterSpacing: '-0.01em',
        backgroundColor: colors.bgInset,
        color: selectedAccent,
        borderColor: colors.borderSubtle,
        ...style,
      }}
    >
      {stages.map((stage) => (
        <option
          key={stage.value}
          value={stage.value}
          style={{
            backgroundColor: colors.bgElevated,
            color: getStageAccent(stage.color, theme.colorScheme),
          }}
        >
          {stage.label}
        </option>
      ))}
    </Select>
  );
};
