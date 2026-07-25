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

const getStagePalette = (color: string, scheme: ThemeTokens['colorScheme']) =>
  getChipPalette((color as ChipColor) || 'gray', scheme);

export const ColoredStageSelect = ({
  theme,
  stages,
  value,
  onChange,
  disabled,
  style,
}: ColoredStageSelectProps) => {
  const selectedStage = stages.find((stage) => stage.value === value);
  const selectedPalette = getStagePalette(selectedStage?.color ?? 'gray', theme.colorScheme);
  const { font, radius } = theme;

  return (
    <Select
      theme={theme}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      style={{
        flex: 1,
        minWidth: 0,
        height: 28,
        padding: '0 10px',
        borderRadius: radius.pill,
        border: 'none',
        fontSize: font.sizeXs,
        fontWeight: font.weightSemibold,
        letterSpacing: '-0.015em',
        backgroundColor: selectedPalette.bg,
        color: selectedPalette.text,
        boxShadow: `inset 0 0 0 1px ${selectedPalette.text}22`,
        ...style,
      }}
    >
      {stages.map((stage) => {
        const optionPalette = getStagePalette(stage.color, theme.colorScheme);
        return (
          <option
            key={stage.value}
            value={stage.value}
            style={{
              backgroundColor: theme.colors.bgElevated,
              color: optionPalette.text,
            }}
          >
            {stage.label}
          </option>
        );
      })}
    </Select>
  );
};
