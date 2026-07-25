import type { ThemeTokens } from './tokens';

type GlobalThemeStylesProps = {
  theme: ThemeTokens;
};

export const GlobalThemeStyles = ({ theme }: GlobalThemeStylesProps) => {
  const { colors, font, radius, zIndex } = theme;

  return (
    <style>{`
      [data-deals-board] {
        box-sizing: border-box;
        font-family: ${font.family};
        color: ${colors.text};
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
        text-rendering: optimizeLegibility;
      }

      [data-deals-board] *,
      [data-deals-board] *::before,
      [data-deals-board] *::after {
        box-sizing: border-box;
      }

      [data-deals-board][data-desktop-layout] {
        height: calc(100dvh - 7rem);
        max-height: calc(100dvh - 7rem);
        min-height: 0;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        background-color: ${colors.bg};
      }

      [data-deals-board][data-mobile-layout] {
        height: auto;
        max-height: none;
        min-height: 0;
        overflow: visible;
        background-color: ${colors.bg};
      }

      [data-deals-board-toolbar] {
        min-height: 0;
        flex-shrink: 0;
        background-color: ${colors.bgSecondary};
      }

      [data-deals-board][data-desktop-layout] [data-deals-board-body] {
        min-height: 0;
        flex: 1;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        background-color: ${colors.bg};
      }

      [data-deals-board][data-mobile-layout] [data-deals-board-body] {
        min-height: 0;
        overflow: visible;
        display: block;
      }

      [data-deals-board] button {
        font-family: inherit;
      }

      [data-deals-board] button:not(:disabled):active {
        transform: scale(0.98);
      }

      [data-deals-board] button,
      [data-deals-board] [data-segment-btn],
      [data-deals-board] [data-link-chip],
      [data-deals-board] [data-expand-btn],
      [data-deals-board] [data-field-input] {
        transition-timing-function: cubic-bezier(0.25, 0.1, 0.25, 1);
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
        box-shadow: 0 0 0 3px ${colors.accentMuted};
      }

      [data-deals-board] [data-segment-btn]:not(:disabled):hover {
        background-color: ${colors.bgHover} !important;
      }

      [data-deals-board] [data-segment-btn][data-active="true"] {
        background-color: ${colors.bgElevated} !important;
        color: ${colors.text} !important;
        box-shadow: ${colors.shadow};
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

      [data-layout="mobile"] [data-mobile-toolbar] {
        position: -webkit-sticky;
        position: sticky;
        top: 0;
        z-index: ${zIndex.dropdown};
        background-color: ${colors.bgSecondary};
      }

      [data-layout="mobile"] [data-expand-btn],
      [data-layout="mobile"] [data-list-menu-btn] {
        min-height: 44px;
        min-width: 44px;
      }

      @media (prefers-reduced-motion: reduce) {
        [data-deals-board] button:not(:disabled):active {
          transform: none;
        }
      }
    `}</style>
  );
};
