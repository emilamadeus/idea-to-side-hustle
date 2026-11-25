/*
  Visual identity: "Arbeidstegning" (working drawing).
  Arkade colours on an architect's working drawing: warm grid, crop marks,
  a title block per slide, loud display type, pencil notes in the margin.

  CSS reads the vars below; the WebGL stage reads clear/particles/bloom.
  Fonts are loaded in index.html.
*/
export const theme = {
  name: 'Arbeidstegning',
  display: { family: 'Bricolage Grotesque', weight: 800 },
  mono: 'Space Mono',
  vars: {
    '--bg': '#16100b', '--fg': '#fff3e3', '--muted': '#c9ad92', '--dim': '#74604d',
    '--accent': '#ff5a1f', '--accent-2': '#ffd23f', '--note': '#ff6f9c',
    '--font-display': "'Bricolage Grotesque', system-ui, sans-serif",
    '--font-mono': "'Space Mono', ui-monospace, monospace",
    '--font-note': "'Caveat', cursive",
    '--display-weight': '800', '--display-tracking': '-0.04em', '--note-rotate': '-3deg',
    '--grid-major': 'rgba(255, 160, 80, .10)', '--grid-minor': 'rgba(255, 160, 80, .045)',
    '--deco': 'rgba(255, 190, 120, .55)',
  },
  clear: '#16100b',
  particles: ['#ff7a2f', '#ffd23f'],
  bloom: { strength: 0.32, threshold: 0.6 },
};

export function applyTheme() {
  const root = document.documentElement;
  for (const [k, v] of Object.entries(theme.vars)) root.style.setProperty(k, v);
  return theme;
}
