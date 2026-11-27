/**
 * Four design directions for the learner experience.
 *
 * Each direction is a set of CSS custom properties plus a type voice, so the
 * same mock screen can be rendered four genuinely different ways. Colours live
 * here rather than in Tailwind because these are alternative palettes being
 * compared — nothing on this page is production styling.
 */

export const DIRECTIONS = [
  {
    id: "editorial",
    name: "Editorial Ledger",
    tagline: "Paper, ink, hairline rules",
    tone: "Warm paper, serif headings, no cards — a well-set contents page.",
    vars: {
      "--rp-bg": "#F2EDE3",
      "--rp-surface": "#FFFCF5",
      "--rp-panel": "#F7F2E7",
      "--rp-ink": "#14120E",
      "--rp-muted": "#6E6455",
      "--rp-line": "#D8CFBD",
      "--rp-accent": "#8A3B12",
      "--rp-accentInk": "#FFF8F1",
      "--rp-second": "#1F3A2E",
      "--rp-secondInk": "#F2EDE3",
      "--rp-glow": "rgba(138,59,18,0.25)",
      "--rp-radius": "3px",
      "--rp-display": "Georgia, 'Iowan Old Style', 'Times New Roman', serif",
      "--rp-body": "'Helvetica Neue', Helvetica, Arial, sans-serif",
      "--rp-label": "'Helvetica Neue', Helvetica, Arial, sans-serif",
    },
  },
  {
    id: "focus",
    name: "Deep Focus",
    tagline: "Charcoal stage, one cool accent",
    tone: "Near-black, monospaced labels, big tabular numbers and a glowing spine.",
    vars: {
      "--rp-bg": "#0D0F12",
      "--rp-surface": "#15181D",
      "--rp-panel": "#1B1F26",
      "--rp-ink": "#F3F5F8",
      "--rp-muted": "#9AA3B2",
      "--rp-line": "#262B34",
      "--rp-accent": "#7C8CFF",
      "--rp-accentInk": "#0B0C10",
      "--rp-second": "#1F2530",
      "--rp-secondInk": "#DCE3F5",
      "--rp-glow": "rgba(124,140,255,0.45)",
      "--rp-radius": "12px",
      "--rp-display": "'Inter', 'Helvetica Neue', Arial, sans-serif",
      "--rp-body": "'Inter', 'Helvetica Neue', Arial, sans-serif",
      "--rp-label": "ui-monospace, 'SF Mono', Menlo, monospace",
    },
  },
  {
    id: "studio",
    name: "Studio Grid",
    tagline: "Poster type, hard shadows",
    tone: "Bright white, cobalt blocks, acid lime accents, thick rules and offset shadows.",
    vars: {
      "--rp-bg": "#FFFFFF",
      "--rp-surface": "#FFFFFF",
      "--rp-panel": "#F2F3F5",
      "--rp-ink": "#0A0A0A",
      "--rp-muted": "#55585F",
      "--rp-line": "#0A0A0A",
      "--rp-accent": "#1F3BFF",
      "--rp-accentInk": "#FFFFFF",
      "--rp-second": "#D8F44A",
      "--rp-secondInk": "#0A0A0A",
      "--rp-glow": "rgba(31,59,255,0.3)",
      "--rp-radius": "0px",
      "--rp-display": "'Helvetica Neue', 'Arial Black', Arial, sans-serif",
      "--rp-body": "'Helvetica Neue', Arial, sans-serif",
      "--rp-label": "'Helvetica Neue', Arial, sans-serif",
    },
  },
  {
    id: "trail",
    name: "Quiet Trail",
    tagline: "Mist, soft cards, dotted path",
    tone: "Sage mist, generous air, rounded cards and a dotted trail of milestones.",
    vars: {
      "--rp-bg": "#EAF0EA",
      "--rp-surface": "#FFFFFF",
      "--rp-panel": "#F3F7F2",
      "--rp-ink": "#17251C",
      "--rp-muted": "#5E7266",
      "--rp-line": "#D3DED3",
      "--rp-accent": "#2E6B4E",
      "--rp-accentInk": "#FFFFFF",
      "--rp-second": "#CBE0D0",
      "--rp-secondInk": "#17251C",
      "--rp-glow": "rgba(46,107,78,0.25)",
      "--rp-radius": "20px",
      "--rp-display": "'Avenir Next', 'Segoe UI', system-ui, sans-serif",
      "--rp-body": "'Avenir Next', 'Segoe UI', system-ui, sans-serif",
      "--rp-label": "'Avenir Next', 'Segoe UI', system-ui, sans-serif",
    },
  },
];

export const directionStyle = (direction) => ({
  ...direction.vars,
  fontFamily: "var(--rp-body)",
  color: "var(--rp-ink)",
  background: "var(--rp-bg)",
});

export const labelStyle = {
  fontFamily: "var(--rp-label)",
  fontSize: 10,
  fontWeight: 600,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: "var(--rp-muted)",
};