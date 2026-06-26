import { useExpandMode } from './hooks/useExpandMode';

type AppSettingsModalProps = {
  isOpen: boolean;
  colorScheme: 'light' | 'dark';
  onClose: () => void;
};

export const AppSettingsModal = ({ isOpen, colorScheme, onClose }: AppSettingsModalProps) => {
  const { mode, setMode } = useExpandMode();

  if (!isOpen) {
    return null;
  }

  const overlayBackground = colorScheme === 'dark' ? 'rgba(0, 0, 0, 0.65)' : 'rgba(20, 24, 30, 0.28)';
  const panelBackground = colorScheme === 'dark' ? '#1f1f1f' : '#fff';
  const border = colorScheme === 'dark' ? '#434343' : '#ddd';
  const text = colorScheme === 'dark' ? '#eee' : '#333';

  return (
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 40,
        backgroundColor: overlayBackground,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Настройки доски"
        onClick={(event) => event.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '420px',
          border: `1px solid ${border}`,
          borderRadius: '12px',
          backgroundColor: panelBackground,
          color: text,
          padding: '14px',
          boxSizing: 'border-box',
          boxShadow: colorScheme === 'dark' ? '0 12px 28px rgba(0, 0, 0, 0.6)' : '0 12px 28px rgba(0, 0, 0, 0.2)',
        }}
      >
        <div style={{ fontSize: '14px', fontWeight: 700 }}>Настройки раскрытия</div>
        <div style={{ marginTop: '10px', fontSize: '12px', opacity: 0.8 }}>
          Выберите, как автоматически раскрывать строки с позициями.
        </div>

        <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="expand-mode"
              checked={mode === 'collapsed'}
              onChange={() => setMode('collapsed')}
            />
            <span>Свёрнуто</span>
          </label>

          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', cursor: 'pointer' }}>
            <input
              type="radio"
              name="expand-mode"
              checked={mode === 'smart'}
              onChange={() => setMode('smart')}
            />
            <span>Умное раскрытие</span>
          </label>
        </div>

        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'flex-end' }}>
          <button type="button" onClick={onClose} style={{ fontSize: '12px' }}>
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
};
