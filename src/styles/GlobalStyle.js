import { createGlobalStyle } from "styled-components"

const GlobalStyle = createGlobalStyle`
  :root {
    color-scheme: light;
    --ink-strong: #111318;
    --ink: #2e3338;
    --ink-muted: #697078;
    --ink-faint: #9aa0a6;
    --paper: #ffffff;
    --paper-raised: #f7f8fa;
    --paper-soft: #f1f3f5;
    --surface: var(--paper-raised);
    --line: rgba(17, 19, 24, 0.1);
    --line-strong: rgba(17, 19, 24, 0.18);
    --dusk: #125de6;
    --dusk-deep: #1446c8;
    --dusk-soft: #e9f1ff;
    --signal: var(--dusk);
    --signal-bright: var(--dusk);
    --signal-deep: var(--dusk-deep);
    --signal-wash: color-mix(in srgb, var(--dusk-soft) 68%, transparent);
    --shadow: none;
    --shadow-hover: none;
    --max-width: 1180px;
    --prose-width: 760px;
    --header-height: 72px;
    --radius-sm: 10px;
    --radius: 18px;
    --radius-lg: 28px;

    /* Backward-compatible aliases used by the existing article template. */
    --color-primary: var(--signal);
    --color-primary-dark: var(--signal-deep);
    --color-text: var(--ink-strong);
    --color-text-light: var(--ink-muted);
    --color-background: var(--paper);
    --color-background-secondary: var(--paper-soft);
    --color-border: var(--line);
    --shadow-lg: var(--shadow-hover);
  }

  *, *::before, *::after { box-sizing: border-box; }

  html {
    color-scheme: light;
    scroll-behavior: smooth;
    scroll-padding-top: calc(var(--header-height) + 1.5rem);
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  body {
    margin: 0;
    min-width: 320px;
    font-family: "Pretendard", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    color: var(--ink);
    background: var(--paper);
    line-height: 1.7;
    transition: background-color 180ms ease, color 180ms ease;
  }

  button, input, textarea { font: inherit; }
  button, a { -webkit-tap-highlight-color: transparent; }
  button { color: inherit; }

  a {
    color: var(--signal);
    text-decoration-thickness: 1px;
    text-underline-offset: 0.2em;
  }

  a:hover { color: var(--signal-deep); }

  :focus-visible {
    outline: 3px solid var(--signal-bright);
    outline-offset: 3px;
    border-radius: 4px;
  }

  ::selection { background: var(--dusk-soft); color: var(--ink-strong); }

  h1, h2, h3, h4, h5, h6 {
    color: var(--ink-strong);
    letter-spacing: -0.035em;
  }

  p { text-wrap: pretty; }
  img { max-width: 100%; height: auto; }

  code {
    font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace;
  }

  @media (max-width: 720px) {
    :root { --header-height: 64px; }
  }

  @media (prefers-reduced-motion: reduce) {
    html { scroll-behavior: auto; }
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }
`

export default GlobalStyle
