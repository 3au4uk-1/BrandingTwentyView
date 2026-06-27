import { useExpandMode, type ExpandMode } from './hooks/useExpandMode';
import { useTheme } from './theme/ThemeContext';
import { SegmentControl } from './ui/SegmentControl';

const OPTIONS = [
  { value: 'smart' as ExpandMode, label: 'Умное' },
  { value: 'collapsed' as ExpandMode, label: 'Свёрнуто' },
];

export const ExpandModeToggle = () => {
  const theme = useTheme();
  const { mode, setMode } = useExpandMode();

  return (
    <SegmentControl
      theme={theme}
      options={OPTIONS}
      value={mode}
      onChange={setMode}
      ariaLabel="Режим раскрытия сделок"
    />
  );
};
