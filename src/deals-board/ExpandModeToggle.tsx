import { useExpandMode, type ExpandMode } from './hooks/useExpandMode';
import { useTheme } from './theme/ThemeContext';
import { SegmentControl } from './ui/SegmentControl';

const OPTIONS: { value: ExpandMode; label: string }[] = [
  { value: 'collapsed', label: 'Свёрнуто' },
  { value: 'smart', label: 'Умное' },
  { value: 'expanded', label: 'Развёрнуто' },
];

const MODE_TITLE: Record<ExpandMode, string> = {
  collapsed: 'Все сделки свёрнуты. Раскрыть можно вручную.',
  smart: 'Раскрыты сделки не в «Готово», «Отмена» и «Дубль».',
  expanded: 'Все сделки с позициями развёрнуты.',
};

/** Per-user (localStorage) expand mode: collapsed, smart, or fully expanded. */
export const ExpandModeToggle = () => {
  const theme = useTheme();
  const { mode, setMode } = useExpandMode();

  return (
    <div title={MODE_TITLE[mode]} style={{ flexShrink: 0 }}>
      <SegmentControl
        theme={theme}
        variant="muted"
        options={OPTIONS}
        value={mode}
        onChange={setMode}
        ariaLabel="Режим раскрытия сделок"
      />
    </div>
  );
};
