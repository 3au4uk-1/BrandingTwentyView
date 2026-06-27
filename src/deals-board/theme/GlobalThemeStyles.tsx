import type { ThemeTokens } from './tokens';

type GlobalThemeStylesProps = {
  theme: ThemeTokens;
};

export const GlobalThemeStyles = ({ theme }: GlobalThemeStylesProps) => {
  const { colors, radius } = theme;

  return (
    <style>{`
      [data-deals-board] button:not(:disabled):active {
        transform: scale(0.98);
      }

      [data-deals-board] [data-btn-variant="primary"]:not(:disabled):hover {
        background-color: ${colors.accentHover} !important;
        border-color: ${colors.accentHover} !important;
      }

      [data-deals-board] [data-btn-variant="secondary"]:not(:disabled):hover {
        background-color: ${colors.bgHover} !important;
        border-color: ${colors.borderStrong} !important;
      }

      [data-deals-board] [data-btn-variant="ghost"]:not(:disabled):hover {
        background-color: ${colors.bgHover} !important;
        color: ${colors.text} !important;
      }

      [data-deals-board] [data-btn-variant="danger"]:not(:disabled):hover {
        background-color: ${colors.dangerMuted} !important;
      }

      [data-deals-board] [data-field-input]:focus {
        outline: none;
        border-color: ${colors.accent} !important;
        box-shadow: 0 0 0 2px ${colors.accentMuted};
      }

      [data-deals-board] [data-segment-btn]:not(:disabled):hover {
        background-color: ${colors.bgHover} !important;
      }

      [data-deals-board] [data-segment-btn][data-active="true"] {
        background-color: ${colors.accentMuted} !important;
        color: ${colors.accentText} !important;
      }

      [data-deals-board] [data-link-chip]:hover {
        border-color: ${colors.borderStrong} !important;
        background-color: ${colors.bgHover} !important;
        color: ${colors.text} !important;
      }

      [data-deals-board] [data-expand-btn]:hover {
        color: ${colors.text} !important;
        background-color: ${colors.bgHover} !important;
        border-radius: ${radius.sm};
      }

      @media (prefers-reduced-motion: reduce) {
        [data-deals-board] button:not(:disabled):active {
          transform: none;
        }
      }
    `}</style>
  );
};
