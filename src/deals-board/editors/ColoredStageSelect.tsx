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

const getStagePalette = (color: string, theme: ThemeTokens) =>
  getChipPalette((color as ChipColor) || 'gray', theme.colorScheme);

export const ColoredStageSelect = ({
  theme,
  stages,
  value,
  onChange,
  disabled,
  style,
}: ColoredStageSelectProps) => {
  const selectedStage = stages.find((stage) => stage.value === value);
  const selectedPalette = getStagePalette(selectedStage?.color ?? 'gray', theme);

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
        backgroundColor: selectedPalette.bg,
        color: selectedPalette.text,
        borderColor: selectedPalette.text,
        ...style,
      }}
    >
      {stages.map((stage) => {
        const palette = getStagePalette(stage.color, theme);

        return (
          <option
            key={stage.value}
            value={stage.value}
            style={{
              backgroundColor: palette.bg,
              color: palette.text,
            }}
          >
            {stage.label}
          </option>
        );
      })}
    </Select>
  );
};
