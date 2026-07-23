import { useGroupChipMode, type GroupChipMode } from './hooks/useGroupChipMode';
import { useTheme } from './theme/ThemeContext';
import { SegmentControl } from './ui/SegmentControl';

const OPTIONS = [
  { value: 'name' as GroupChipMode, label: 'Имя' },
  { value: 'name+status' as GroupChipMode, label: 'Имя+статус' },
];

export const GroupChipModeToggle = () => {
  const theme = useTheme();
  const { mode, setMode } = useGroupChipMode();

  return (
    <SegmentControl
      theme={theme}
      options={OPTIONS}
      value={mode}
      onChange={setMode}
      ariaLabel="Режим отображения групп"
    />
  );
};
