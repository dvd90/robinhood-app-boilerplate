/**
 * The docs site stylesheet: 8-bit arcade cabinet, in the project's own colours.
 *
 * Salmon ground, dark-coral cabinet chrome, warm off-white sheets with notched
 * pixel borders and hard offset shadows, deep orange and gold as the accents. Press Start 2P is reserved for headings,
 * labels and buttons; everything you have to read is Atkinson Hyperlegible,
 * code is IBM Plex Mono. Zero border-radius, zero blur. Single light theme,
 * painted explicitly.
 */
export const CSS = String.raw`
:root {
  color-scheme: light;
  --bg: #f28b6b; --bg-dither: #ee8263;
  --pine: #8a2f12; --pine-deep: #4a1708; --pine-soft: #b5431c;
  --phosphor: #ffb199; --phosphor-soft: #ffe1d6; --phosphor-ink: #c2410c;
  --gold: #ffa62b; --gold-shade: #b86d08; --gold-soft: #fff0d6;
  --surface: #fff8f1; --sunken: #f7ece2; --hover: #fbf1e8; --bone: #fff8f1;
  --ink: #2a1a14; --ink-muted: #5a3f35; --paper-muted: #6e5a52; --paper-faint: #9a867e;
  --rule: #e6d3c6; --rule-strong: #2a1a14;
  --red: #c0392b; --red-soft: #fde3e0;
  --px: 4px;
  --shadow: 8px 8px 0 rgba(74,23,8,.45);
  --shadow-sm: 4px 4px 0 var(--ink);
  --pixel: "Press Start 2P", "Silkscreen", monospace;
  --sans: "Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace;
  --sidebar: 17rem;
  --header: 4rem;
}

*, *::before, *::after { box-sizing: border-box; border-radius: 0 !important; }
html { -webkit-text-size-adjust: 100%; scroll-behavior: smooth; scroll-padding-top: calc(var(--header) + 1.5rem); }
@media (prefers-reduced-motion: reduce) {
  html { scroll-behavior: auto; }
  *, *::before, *::after { animation: none !important; transition-duration: .01ms !important; }
}

body {
  margin: 0; min-height: 100dvh; color: var(--ink);
  background-color: var(--bg);
  background-image: repeating-conic-gradient(var(--bg-dither) 0 25%, var(--bg) 0 50%);
  background-size: 4px 4px;
  font-family: var(--sans); font-size: 17px; line-height: 1.6;
  -webkit-font-smoothing: antialiased;
}
::selection { background: var(--phosphor); color: var(--ink); }
:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }
img, svg { image-rendering: pixelated; shape-rendering: crispEdges; }

/* ── Pixel primitives ─────────────────────────────────── */
/* Notched-corner border: four offset box-shadows leave the corners empty. */
.sheet {
  position: relative; background: var(--surface); color: var(--ink);
  box-shadow: 0 calc(-1 * var(--px)) 0 0 var(--ink), 0 var(--px) 0 0 var(--ink),
              calc(-1 * var(--px)) 0 0 0 var(--ink), var(--px) 0 0 0 var(--ink), var(--shadow);
}
.label { font-family: var(--pixel); font-size: 8px; line-height: 1.6; letter-spacing: .04em; text-transform: uppercase; }

/* ── Backdrop: faint CRT scanlines, kept off the reading surface's contrast ── */
.fx { position: fixed; inset: 0; z-index: 90; pointer-events: none; overflow: hidden; }
.fx span { position: absolute; display: block; }
.fx-scan { inset: 0; background: repeating-linear-gradient(0deg, rgba(0,0,0,.05) 0 1px, transparent 1px 4px); }
.fx-vignette { inset: 0; box-shadow: inset 0 0 140px rgba(7,36,25,.55); }

/* ── Header ───────────────────────────────────────────── */
.site-header {
  position: fixed; top: 0; left: 0; right: 0; z-index: 30; height: var(--header);
  display: flex; align-items: center; gap: 1rem; padding: 0 clamp(1rem,3vw,1.5rem);
  background: var(--pine-deep); border-bottom: var(--px) solid var(--phosphor);
}
.brand { display: inline-flex; align-items: center; gap: .75rem; color: var(--bone);
  font-family: var(--pixel); font-size: 11px; text-decoration: none; text-transform: uppercase; }
.brand-mark { display: grid; place-items: center; flex: none; width: 36px; height: 36px;
  background: var(--surface); border: 3px solid var(--ink); box-shadow: 3px 3px 0 var(--phosphor);
  transition: transform .1s steps(2); }
.brand-mark svg { width: 24px; height: 24px; }
.brand:hover .brand-mark { transform: translate(-2px,-2px); }
.header-tag { padding: .35rem .5rem .25rem; background: var(--gold); color: var(--ink); border: 3px solid var(--ink);
  font-family: var(--pixel); font-size: 8px; text-transform: uppercase; }
.header-links { margin-left: auto; display: flex; align-items: center; gap: .25rem; }
.header-links a { padding: .55rem .6rem .45rem; color: var(--bone); font-family: var(--pixel); font-size: 8px;
  text-transform: uppercase; text-decoration: none; }
.header-links a:hover { background: var(--phosphor); color: var(--ink); }

.nav-toggle { display: none; align-items: center; justify-content: center; width: 36px; height: 36px; padding: 0;
  border: 3px solid var(--ink); background: var(--surface); color: var(--ink); font-size: 1rem; cursor: pointer;
  box-shadow: 3px 3px 0 var(--phosphor); }

/* ── Layout ───────────────────────────────────────────── */
.shell { display: grid; grid-template-columns: var(--sidebar) minmax(0,1fr);
  gap: clamp(1.5rem,4vw,3rem); max-width: 80rem; margin: 0 auto;
  padding: calc(var(--header) + 2.5rem) clamp(1rem,3vw,2rem) 6rem; }

.sidebar { position: sticky; top: calc(var(--header) + 2rem); align-self: start;
  max-height: calc(100dvh - var(--header) - 3.5rem); overflow-y: auto; padding: 1rem;
  scrollbar-width: thin; scrollbar-color: var(--ink) transparent; }
.sidebar::-webkit-scrollbar { width: 8px; }
.sidebar::-webkit-scrollbar-thumb { background: var(--ink); }

.search-wrap { position: relative; margin-bottom: 1rem; }
.search-wrap input { width: 100%; padding: .5rem .6rem .45rem 1.9rem; border: 3px solid var(--ink);
  background: var(--surface); color: var(--ink); font: inherit; font-size: 15px; }
.search-wrap input::placeholder { color: var(--paper-faint); }
.search-wrap input:focus { outline: none; background: var(--gold-soft); }
.search-wrap::before { content: '>'; position: absolute; left: .6rem; top: 50%; transform: translateY(-55%);
  font-family: var(--pixel); font-size: 10px; color: var(--phosphor-ink); pointer-events: none; }
.search-key { position: absolute; right: .5rem; top: 50%; transform: translateY(-50%);
  padding: .15rem .3rem 0; border: 2px solid var(--ink); font-family: var(--pixel); font-size: 8px; pointer-events: none; }
.search-wrap input:focus ~ .search-key { opacity: 0; }

.results { list-style: none; margin: 0 0 1rem; padding: 0; display: none; flex-direction: column; gap: 4px; }
.results.is-open { display: flex; }
.results li a { display: block; padding: .4rem .5rem .35rem; border: 2px solid var(--ink); background: var(--surface);
  color: var(--ink); font-size: 14px; line-height: 1.35; text-decoration: none; }
.results li a:hover, .results li a.is-active { background: var(--ink); color: var(--bone); }
.results .r-doc { display: block; margin-bottom: .25rem; font-family: var(--pixel); font-size: 7px; text-transform: uppercase; color: var(--phosphor-ink); }
.results li a:hover .r-doc { color: var(--phosphor); }
.results .r-empty { padding: .4rem .5rem; color: var(--paper-muted); font-size: 14px; }

.nav-group { margin-bottom: 1.25rem; }
.nav-group > h3 { margin: 0 0 .5rem; padding-bottom: .35rem; border-bottom: 2px solid var(--ink);
  font-family: var(--pixel); font-size: 8px; font-weight: 400; text-transform: uppercase; color: var(--phosphor-ink); }
.nav-group ul { list-style: none; margin: 0; padding: 0; }
.nav-group > ul > li > a { display: block; padding: .3rem .4rem .3rem 1.1rem; position: relative;
  color: var(--ink); font-size: 15px; line-height: 1.3; text-decoration: none; }
.nav-group > ul > li > a::before { content: '>'; position: absolute; left: .1rem; top: .45rem;
  font-family: var(--pixel); font-size: 8px; opacity: 0; }
.nav-group > ul > li > a:hover { background: var(--hover); }
.nav-group > ul > li > a:hover::before { opacity: 1; }
.nav-group > ul > li > a.is-active { background: var(--ink); color: var(--bone); }
.nav-group > ul > li > a.is-active::before { opacity: 1; color: var(--phosphor); animation: blink 1s step-end infinite; }
.sub-nav { margin: .15rem 0 .5rem; display: none; }
.sub-nav.is-open { display: block; }
.sub-nav a { display: block; padding: .15rem .4rem .15rem 1.6rem; color: var(--paper-muted); font-size: 13.5px; line-height: 1.35; text-decoration: none; }
.sub-nav a:hover { color: var(--ink); }
.sub-nav a.is-active { color: var(--phosphor-ink); text-decoration: underline; text-decoration-thickness: 2px; }

/* ── Hero ─────────────────────────────────────────────── */
.hero { margin: 0 0 3rem; }
.eyebrow { display: inline-flex; align-items: center; gap: .6rem; padding: .45rem .7rem .35rem;
  background: var(--pine-deep); color: var(--phosphor); border: 2px solid var(--phosphor);
  font-family: var(--pixel); font-size: 8px; text-transform: uppercase; }
.dot { width: 8px; height: 8px; background: var(--phosphor); flex: none; animation: blink 1.2s step-end infinite; }
.hero h1 { margin: 1.25rem 0 1rem; color: var(--pine-deep); font-family: var(--pixel); font-weight: 400;
  font-size: clamp(18px, 3vw, 30px); line-height: 1.5; text-transform: uppercase; max-width: 24ch;
  text-shadow: 4px 4px 0 var(--bone), 8px 8px 0 var(--pine-soft); }
.hero h1::after { content: '_'; color: var(--pine-deep); animation: blink 1s step-end infinite; }
.hero p { margin: 0 0 1.5rem; color: var(--ink); font-size: 18px; line-height: 1.6; max-width: 58ch; }
.hero-cta { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem; }
.button { display: inline-flex; align-items: center; gap: .5rem; padding: .95rem 1.2rem .8rem;
  border: 3px solid var(--ink); background: var(--surface); color: var(--ink);
  font-family: var(--pixel); font-size: 10px; text-transform: uppercase; text-decoration: none;
  box-shadow: var(--shadow-sm); transition: transform .08s steps(2), box-shadow .08s steps(2); }
.button:hover { transform: translate(-2px,-2px); box-shadow: 6px 6px 0 var(--ink); }
.button:active { transform: translate(2px,2px); box-shadow: 2px 2px 0 var(--ink); }
.button.ghost { background: var(--pine-deep); color: var(--bone); }
.button.orange { background: var(--gold); color: var(--ink); }

.start-strip { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 1.25rem; margin: 0 var(--px); }
.start-tile { display: block; padding: 1rem 1rem .9rem; text-decoration: none; color: var(--ink); }
.start-tile:hover { background: var(--gold-soft); }
.start-num { display: block; margin-bottom: .6rem; font-family: var(--pixel); font-size: 8px; color: var(--phosphor-ink); text-transform: uppercase; }
.start-num b { display: inline-block; margin-right: .5rem; padding: .25rem .35rem .15rem; background: var(--gold); color: var(--ink); border: 2px solid var(--ink); font-weight: 400; }
.start-cmd { display: block; padding: .45rem .55rem .4rem; background: var(--pine-deep); color: var(--phosphor);
  font-family: var(--mono); font-size: 13px; line-height: 1.35; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.start-tile small { display: block; margin-top: .5rem; font-size: 14px; color: var(--paper-muted); }

/* ── Prose ────────────────────────────────────────────── */
.doc { scroll-margin-top: calc(var(--header) + 1.5rem); margin: 0 var(--px) 3.5rem; padding: 2rem clamp(1rem,3vw,2.25rem) 2.25rem; }
.doc-kicker { display: inline-block; margin-bottom: 1rem; padding: .35rem .5rem .25rem; background: var(--pine-deep); color: var(--phosphor);
  font-family: var(--pixel); font-size: 7px; text-transform: uppercase; }

.doc h1, .doc h2, .doc h3, .doc h4 { position: relative; margin: 2.4rem 0 1rem; font-family: var(--pixel); font-weight: 400;
  line-height: 1.6; scroll-margin-top: calc(var(--header) + 1.5rem); color: var(--ink); text-wrap: balance; }
.doc > h1:first-of-type { margin-top: 0; }
.doc h1 { font-size: 17px; text-transform: uppercase; }
.doc h2 { font-size: 12px; padding-top: 1.4rem; border-top: 3px solid var(--ink); text-transform: uppercase; }
.doc h3 { font-size: 10px; color: var(--phosphor-ink); }
.doc h4 { font-size: 9px; color: var(--paper-muted); }
.anchor { position: absolute; left: -1.2rem; width: 1.1rem; color: var(--paper-faint); text-decoration: none; opacity: 0; }
.doc :is(h1,h2,h3,h4):hover .anchor { opacity: 1; }
.anchor:hover { color: var(--gold-shade); }

.doc p, .doc li { color: var(--ink); max-width: 68ch; }
.doc p { margin: 0 0 1rem; }
.doc ul, .doc ol { margin: 0 0 1rem; padding-left: 1.4rem; }
.doc li { margin: .3rem 0; }
.doc ul li::marker { content: '■ '; color: var(--phosphor-ink); font-size: 11px; }
.doc ol li::marker { font-family: var(--pixel); font-size: 9px; color: var(--phosphor-ink); }
.doc a { color: var(--phosphor-ink); text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 3px; }
.doc a:hover { background: var(--phosphor-soft); text-decoration-color: var(--ink); }
.doc strong { color: var(--ink); font-weight: 700; background: var(--gold-soft); padding: 0 .15em; box-decoration-break: clone; }
.doc em { font-style: italic; }
.doc hr { margin: 2rem 0; border: 0; border-top: 3px dashed var(--ink); }
.doc img { max-width: 100%; }

.doc blockquote { margin: 0 0 1.25rem; padding: 1rem 1rem .8rem 1.1rem; background: var(--gold-soft); border: 3px solid var(--gold-shade);
  border-left-width: 12px; color: var(--ink); max-width: 68ch; position: relative; }
.doc blockquote::before { content: '! NOTE'; display: block; margin-bottom: .5rem; font-family: var(--pixel); font-size: 8px; color: var(--gold-shade); }
.doc blockquote p { max-width: none; }
.doc blockquote p:last-child { margin-bottom: 0; }

.doc :not(pre) > code { font-family: var(--mono); font-size: .86em; padding: .1em .35em .05em; background: var(--sunken);
  border: 1px solid var(--rule); color: var(--pine-deep); white-space: nowrap; }
.doc a > code { color: inherit; }

.table-wrap { overflow-x: auto; margin: 0 0 1.4rem; border: 3px solid var(--ink); background: var(--surface); }
.doc table { width: 100%; border-collapse: collapse; font-size: 14.5px; line-height: 1.45; font-variant-numeric: tabular-nums; }
.doc th, .doc td { padding: .55rem .75rem .5rem; text-align: left; border-bottom: 1px solid var(--rule); vertical-align: top; }
.doc td { max-width: 46ch; }
.doc tr:last-child td { border-bottom: 0; }
.doc tbody tr:nth-child(even) td { background: var(--sunken); }
.doc th { background: var(--pine-deep); color: var(--phosphor); font-family: var(--pixel); font-size: 7px; font-weight: 400;
  line-height: 1.7; text-transform: uppercase; white-space: nowrap; border-bottom: 3px solid var(--ink); }
.doc td code { white-space: nowrap; }
.doc input[type=checkbox] { appearance: none; width: 14px; height: 14px; border: 2px solid var(--ink); vertical-align: middle; margin: 0 .3em 0 0; background: var(--surface); }
.doc input[type=checkbox]:checked { background: var(--phosphor); }

/* ── Code blocks ──────────────────────────────────────── */
.code { position: relative; margin: 0 0 1.4rem; border: 3px solid var(--ink); background: var(--pine-deep); box-shadow: 4px 4px 0 var(--ink); }
.code-head { display: flex; align-items: center; justify-content: space-between; gap: .5rem;
  padding: .45rem .5rem .35rem .8rem; background: var(--ink); color: var(--bone); }
.code-lang { font-family: var(--pixel); font-size: 7px; text-transform: uppercase; color: var(--gold); }
.copy { padding: .4rem .5rem .3rem; border: 2px solid var(--bone); background: transparent; color: var(--bone);
  font-family: var(--pixel); font-size: 7px; text-transform: uppercase; cursor: pointer; }
.copy:hover { background: var(--bone); color: var(--ink); }
.copy.is-done { background: var(--phosphor); border-color: var(--phosphor); color: var(--ink); }
.code pre { margin: 0; padding: 1rem 1.1rem; overflow-x: auto; }
.code code { font-family: var(--mono); font-size: 14px; line-height: 1.6; color: #fbeee6; }
.t-comment { color: #c9998a; }
.t-string  { color: #ffd98a; }
.t-keyword { color: var(--gold); }
.t-number  { color: #ffb3d0; }
.t-key     { color: #ffd0b8; }
.t-flag    { color: #ffb3d0; }
.t-deco    { color: #e4b3ff; }

/* ── Footer ───────────────────────────────────────────── */
.site-footer { max-width: 80rem; margin: 0 auto; padding: 0 clamp(1rem,3vw,2rem) 4rem; color: var(--ink); font-size: 15px; }
.site-footer a { color: var(--pine-deep); text-decoration-thickness: 2px; }
.site-footer .label { display: block; margin-bottom: .5rem; color: var(--pine-deep); }

.to-top { position: fixed; right: 1.25rem; bottom: 1.25rem; z-index: 40; display: grid; place-items: center;
  width: 40px; height: 40px; border: 3px solid var(--ink); background: var(--gold); color: var(--ink);
  font-family: var(--pixel); font-size: 10px; cursor: pointer; opacity: 0; pointer-events: none; box-shadow: var(--shadow-sm); }
.to-top.is-visible { opacity: 1; pointer-events: auto; }
.to-top:hover { transform: translate(-2px,-2px); box-shadow: 6px 6px 0 var(--ink); }

@keyframes blink { 50% { opacity: 0; } }

/* ── Responsive ───────────────────────────────────────── */
@media (max-width: 62rem) {
  .shell { grid-template-columns: minmax(0,1fr); }
  .nav-toggle { display: inline-flex; }
  .header-links a:not(:first-child) { display: none; }
  .start-strip { grid-template-columns: 1fr; }
  .sidebar { position: fixed; inset: var(--header) auto 0 0; z-index: 25; width: min(20rem, 86vw);
    max-height: none; height: calc(100dvh - var(--header)); padding: 1.25rem; box-shadow: none;
    border-right: var(--px) solid var(--ink); transform: translateX(-102%); transition: transform .2s steps(4); }
  .sidebar.is-open { transform: none; }
  .scrim { position: fixed; inset: var(--header) 0 0; z-index: 24; background: rgba(7,36,25,.7);
    opacity: 0; pointer-events: none; transition: opacity .2s steps(4); }
  .scrim.is-open { opacity: 1; pointer-events: auto; }
  .anchor { display: none; }
  .hero h1 { text-shadow: 3px 3px 0 var(--bone); }
}
@media (min-width: 62.0625rem) { .scrim { display: none; } }
`;
