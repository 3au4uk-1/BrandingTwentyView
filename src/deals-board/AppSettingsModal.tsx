import { useExpandMode } from './hooks/useExpandMode';
import { useTheme } from './theme/ThemeContext';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';

type AppSettingsModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export const AppSettingsModal = ({ isOpen, onClose }: AppSettingsModalProps) => {
  const theme = useTheme();
  const { mode, setMode } = useExpandMode();
  const { font, spacing, colors, radius } = theme;

  return (
    <Modal
      theme={theme}
      isOpen={isOpen}
      title="Настройки раскрытия"
      description="Выберите, как автоматически раскрывать строки с позициями."
      onClose={onClose}
      footer={
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            padding: spacing.md,
            borderTop: `1px solid ${colors.borderSubtle}`,
            backgroundColor: colors.bgSecondary,
          }}
        >
          <Button theme={theme} variant="primary" size="sm" onClick={onClose}>
            Готово
          </Button>
        </div>
      }
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing.sm }}>
        {(
          [
            { value: 'collapsed' as const, label: 'Свёрнуто', hint: 'Все сделки свёрнуты по умолчанию' },
            { value: 'smart' as const, label: 'Умное раскрытие', hint: 'Раскрывать сделки с активными позициями' },
          ] as const
        ).map((option) => {
          const isSelected = mode === option.value;

          return (
            <label
              key={option.value}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: spacing.sm,
                padding: spacing.md,
                borderRadius: radius.md,
                border: `1px solid ${isSelected ? colors.accent : colors.border}`,
                backgroundColor: isSelected ? colors.accentMuted : colors.bg,
                cursor: 'pointer',
              }}
            >
              <input
                type="radio"
                name="expand-mode"
                checked={isSelected}
                onChange={() => setMode(option.value)}
                style={{ marginTop: '2px' }}
              />
              <span>
                <span
                  style={{
                    display: 'block',
                    fontSize: font.sizeSm,
                    fontWeight: font.weightMedium,
                    color: colors.text,
                  }}
                >
                  {option.label}
                </span>
                <span style={{ display: 'block', fontSize: font.sizeXs, color: colors.textMuted, marginTop: '2px' }}>
                  {option.hint}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </Modal>
  );
};
