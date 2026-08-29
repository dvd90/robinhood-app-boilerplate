/**
 * The docs site stylesheet: full retro 8-bit on the ninetofive.works palette.
 *
 * Cornflower-blue dithered ground, paper sheets with pixel (notched) borders and
 * hard offset shadows, a CRT scanline overlay, Press Start 2P for anything that
 * is a label and VT323 for anything you have to read. Zero border-radius, zero
 * blur, zero gradients except the dither and the scanlines. Light only.
 *
 * Readability guard: body copy is VT323 at 20px / 1.35, headings are small
 * Press Start 2P (it is ~2× wider than a normal face), measure is capped.
 */
export const CSS = String.raw`
:root {
  color-scheme: light;
  --bg: #6e97f6; --bg-dither: #6791ef;
  --blue-deep: #174ca3; --blue-dark: #0f3576; --blue-shade: #4a72cf;
  --surface: #fefefe; --sunken: #eceaec; --hover: #f1eff1; --bone: #fefefe;
  --ink: #1b1b1c; --ink-muted: #1d2740; --paper-muted: #55555c; --paper-faint: #83838c;
  --rule: #d3d0d3; --rule-strong: #1b1b1c;
  --orange: #fcb275; --orange-shade: #e99e68;
  --green: #1c7a45; --green-soft: #d8efe1;
  --red: #c02a25; --red-soft: #f8dedd;
  --amber: #a1621b; --amber-soft: #fbeadb;
  --px: 4px;
  --shadow: 8px 8px 0 rgba(20,22,28,.35);
  --shadow-sm: 4px 4px 0 var(--ink);
  --pixel: "Press Start 2P", "Silkscreen", monospace;
  --mono: "VT323", "IBM Plex Mono", ui-monospace, Menlo, monospace;
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
  font-family: var(--mono); font-size: 20px; line-height: 1.35;
  -webkit-font-smoothing: none; image-rendering: pixelated;
}
::selection { background: var(--ink); color: var(--bone); }
:focus-visible { outline: 3px solid var(--orange); outline-offset: 2px; }
img, svg { image-rendering: pixelated; shape-rendering: crispEdges; }

/* ── Pixel primitives ─────────────────────────────────── */
/* Notched-corner border: four offset box-shadows leave the corners empty. */
.sheet {
  position: relative; background: var(--surface); color: var(--ink);
  box-shadow: 0 calc(-1 * var(--px)) 0 0 var(--ink), 0 var(--px) 0 0 var(--ink),
              calc(-1 * var(--px)) 0 0 0 var(--ink), var(--px) 0 0 0 var(--ink), var(--shadow);
}
.label { font-family: var(--pixel); font-size: 8px; line-height: 1.6; letter-spacing: .04em; text-transform: uppercase; }

/* ── Backdrop: CRT scanlines ──────────────────────────── */
.fx { position: fixed; inset: 0; z-index: 90; pointer-events: none; overflow: hidden; }
.fx span { position: absolute; display: block; }
.fx-scan { inset: 0; background: repeating-linear-gradient(0deg, rgba(0,0,0,.11) 0 1px, transparent 1px 3px); mix-blend-mode: multiply; }
.fx-vignette { inset: 0; box-shadow: inset 0 0 120px rgba(15,53,118,.35); }

/* ── Header ───────────────────────────────────────────── */
.site-header {
  position: fixed; top: 0; left: 0; right: 0; z-index: 30; height: var(--header);
  display: flex; align-items: center; gap: 1rem; padding: 0 clamp(1rem,3vw,1.5rem);
  background: var(--bg); border-bottom: var(--px) solid var(--ink);
}
.brand { display: inline-flex; align-items: center; gap: .75rem; color: var(--ink);
  font-family: var(--pixel); font-size: 11px; text-decoration: none; text-transform: uppercase; }
.brand-mark { display: grid; place-items: center; flex: none; width: 36px; height: 36px;
  background: var(--surface); border: 3px solid var(--ink); box-shadow: 3px 3px 0 var(--ink);
  transition: transform .1s steps(2); }
.brand-mark svg { width: 24px; height: 24px; }
.brand:hover .brand-mark { transform: translate(-2px,-2px); }
.header-tag { padding: .35rem .5rem .25rem; background: var(--orange); border: 3px solid var(--ink);
  font-family: var(--pixel); font-size: 8px; text-transform: uppercase; }
.header-links { margin-left: auto; display: flex; align-items: center; gap: .25rem; }
.header-links a { padding: .55rem .6rem .45rem; color: var(--ink); font-family: var(--pixel); font-size: 8px;
  text-transform: uppercase; text-decoration: none; }
.header-links a:hover { background: var(--ink); color: var(--bone); }

.nav-toggle { display: none; align-items: center; justify-content: center; width: 36px; height: 36px; padding: 0;
  border: 3px solid var(--ink); background: var(--surface); color: var(--ink); font-size: 1rem; cursor: pointer;
  box-shadow: 3px 3px 0 var(--ink); }

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
.search-wrap input { width: 100%; padding: .4rem .6rem .3rem 1.9rem; border: 3px solid var(--ink);
  background: var(--surface); color: var(--ink); font: inherit; font-size: 19px; }
.search-wrap input::placeholder { color: var(--paper-faint); }
.search-wrap input:focus { outline: none; background: var(--amber-soft); }
.search-wrap::before { content: '>'; position: absolute; left: .6rem; top: 50%; transform: translateY(-55%);
  font-family: var(--pixel); font-size: 10px; color: var(--ink); pointer-events: none; }
.search-key { position: absolute; right: .5rem; top: 50%; transform: translateY(-50%);
  padding: .15rem .3rem 0; border: 2px solid var(--ink); font-family: var(--pixel); font-size: 8px; pointer-events: none; }
.search-wrap input:focus ~ .search-key { opacity: 0; }

.results { list-style: none; margin: 0 0 1rem; padding: 0; display: none; flex-direction: column; gap: 4px; }
.results.is-open { display: flex; }
.results li a { display: block; padding: .35rem .5rem .25rem; border: 2px solid var(--ink); background: var(--surface);
  color: var(--ink); font-size: 18px; line-height: 1.2; text-decoration: none; }
.results li a:hover, .results li a.is-active { background: var(--ink); color: var(--bone); }
.results .r-doc { display: block; margin-bottom: .2rem; font-family: var(--pixel); font-size: 7px; text-transform: uppercase; color: var(--blue-deep); }
.results li a:hover .r-doc { color: var(--orange); }
.results .r-empty { padding: .4rem .5rem; color: var(--paper-muted); }

.nav-group { margin-bottom: 1.25rem; }
.nav-group > h3 { margin: 0 0 .5rem; padding-bottom: .3rem; border-bottom: 2px solid var(--ink);
  font-family: var(--pixel); font-size: 8px; font-weight: 400; text-transform: uppercase; color: var(--blue-deep); }
.nav-group ul { list-style: none; margin: 0; padding: 0; }
.nav-group > ul > li > a { display: block; padding: .3rem .4rem .2rem 1.1rem; position: relative;
  color: var(--ink); font-size: 19px; line-height: 1.15; text-decoration: none; }
.nav-group > ul > li > a::before { content: '>'; position: absolute; left: .1rem; top: .35rem;
  font-family: var(--pixel); font-size: 8px; opacity: 0; }
.nav-group > ul > li > a:hover { background: var(--hover); }
.nav-group > ul > li > a:hover::before { opacity: 1; }
.nav-group > ul > li > a.is-active { background: var(--ink); color: var(--bone); }
.nav-group > ul > li > a.is-active::before { opacity: 1; color: var(--orange); animation: blink 1s step-end infinite; }
.sub-nav { margin: .15rem 0 .5rem; display: none; }
.sub-nav.is-open { display: block; }
.sub-nav a { display: block; padding: .1rem .4rem .05rem 1.6rem; color: var(--paper-muted); font-size: 17px; line-height: 1.2; text-decoration: none; }
.sub-nav a:hover { color: var(--ink); }
.sub-nav a.is-active { color: var(--blue-deep); text-decoration: underline; text-decoration-thickness: 2px; }

/* ── Hero ─────────────────────────────────────────────── */
.hero { margin: 0 0 3rem; }
.eyebrow { display: inline-flex; align-items: center; gap: .6rem; padding: .45rem .7rem .35rem;
  background: var(--ink); color: var(--bone); font-family: var(--pixel); font-size: 8px; text-transform: uppercase; }
.dot { width: 8px; height: 8px; background: var(--green-soft); flex: none; animation: blink 1.2s step-end infinite; }
.hero h1 { margin: 1.25rem 0 1rem; color: var(--bone); font-family: var(--pixel); font-weight: 400;
  font-size: clamp(18px, 3vw, 30px); line-height: 1.5; text-transform: uppercase; max-width: 24ch;
  text-shadow: 4px 4px 0 var(--blue-deep), 8px 8px 0 var(--blue-dark); }
.hero h1::after { content: '_'; animation: blink 1s step-end infinite; }
.hero p { margin: 0 0 1.5rem; color: var(--ink); font-size: 21px; max-width: 58ch; }
.hero-cta { display: flex; flex-wrap: wrap; gap: 1rem; margin-bottom: 2rem; }
.button { display: inline-flex; align-items: center; gap: .5rem; padding: .95rem 1.2rem .8rem;
  border: 3px solid var(--ink); background: var(--blue-deep); color: var(--bone);
  font-family: var(--pixel); font-size: 10px; text-transform: uppercase; text-decoration: none;
  box-shadow: var(--shadow-sm); transition: transform .08s steps(2), box-shadow .08s steps(2); }
.button:hover { transform: translate(-2px,-2px); box-shadow: 6px 6px 0 var(--ink); }
.button:active { transform: translate(2px,2px); box-shadow: 2px 2px 0 var(--ink); }
.button.ghost { background: var(--surface); color: var(--ink); }
.button.orange { background: var(--orange); color: var(--ink); }

.start-strip { display: grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap: 1.25rem; margin: 0 var(--px); }
.start-tile { display: block; padding: 1rem 1rem .9rem; text-decoration: none; color: var(--ink); }
.start-tile:hover { background: var(--amber-soft); }
.start-num { display: block; margin-bottom: .6rem; font-family: var(--pixel); font-size: 8px; color: var(--blue-deep); text-transform: uppercase; }
.start-num b { display: inline-block; margin-right: .5rem; padding: .25rem .35rem .15rem; background: var(--orange); border: 2px solid var(--ink); font-weight: 400; }
.start-cmd { display: block; padding: .35rem .5rem .25rem; background: var(--blue-dark); color: var(--bone);
  font-size: 17px; line-height: 1.25; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.start-tile small { display: block; margin-top: .5rem; font-size: 17px; color: var(--paper-muted); }

/* ── Prose ────────────────────────────────────────────── */
.doc { scroll-margin-top: calc(var(--header) + 1.5rem); margin: 0 var(--px) 3.5rem; padding: 2rem clamp(1rem,3vw,2.25rem) 2.25rem; }
.doc-kicker { display: inline-block; margin-bottom: 1rem; padding: .35rem .5rem .25rem; background: var(--blue-deep); color: var(--bone);
  font-family: var(--pixel); font-size: 7px; text-transform: uppercase; }

.doc h1, .doc h2, .doc h3, .doc h4 { position: relative; margin: 2.4rem 0 1rem; font-family: var(--pixel); font-weight: 400;
  line-height: 1.55; scroll-margin-top: calc(var(--header) + 1.5rem); color: var(--ink); }
.doc > h1:first-of-type { margin-top: 0; }
.doc h1 { font-size: 17px; text-transform: uppercase; }
.doc h2 { font-size: 12px; padding-top: 1.4rem; border-top: 3px solid var(--ink); text-transform: uppercase; }
.doc h3 { font-size: 10px; color: var(--blue-deep); }
.doc h4 { font-size: 9px; color: var(--paper-muted); }
.anchor { position: absolute; left: -1.2rem; width: 1.1rem; color: var(--paper-faint); text-decoration: none; opacity: 0; }
.doc :is(h1,h2,h3,h4):hover .anchor { opacity: 1; }
.anchor:hover { color: var(--orange-shade); }

.doc p, .doc li { color: var(--ink); max-width: 72ch; }
.doc p { margin: 0 0 1rem; }
.doc ul, .doc ol { margin: 0 0 1rem; padding-left: 1.4rem; }
.doc li { margin: .25rem 0; }
.doc ul li::marker { content: '■ '; color: var(--blue-deep); font-size: 12px; }
.doc ol li::marker { font-family: var(--pixel); font-size: 9px; color: var(--blue-deep); }
.doc a { color: var(--blue-deep); text-decoration: underline; text-decoration-thickness: 2px; text-underline-offset: 3px; }
.doc a:hover { background: var(--ink); color: var(--bone); text-decoration: none; }
.doc strong { color: var(--ink); background: var(--amber-soft); padding: 0 .15em; }
.doc em { font-style: normal; text-decoration: underline; text-decoration-style: dotted; }
.doc hr { margin: 2rem 0; border: 0; border-top: 3px dashed var(--ink); }
.doc img { max-width: 100%; }

.doc blockquote { margin: 0 0 1.25rem; padding: 1rem 1rem .8rem 1.1rem; background: var(--amber-soft); border: 3px solid var(--amber);
  border-left-width: 12px; color: var(--ink); max-width: 72ch; position: relative; }
.doc blockquote::before { content: '! NOTE'; display: block; margin-bottom: .4rem; font-family: var(--pixel); font-size: 8px; color: var(--amber); }
.doc blockquote p { max-width: none; }
.doc blockquote p:last-child { margin-bottom: 0; }

.doc :not(pre) > code { font-family: var(--mono); font-size: .95em; padding: .05em .3em 0; background: var(--sunken);
  border: 2px solid var(--rule); color: var(--blue-dark); white-space: nowrap; }
.doc a > code { color: inherit; }

.table-wrap { overflow-x: auto; margin: 0 0 1.4rem; border: 3px solid var(--ink); background: var(--surface); }
.doc table { width: 100%; border-collapse: collapse; font-size: 18px; line-height: 1.25; }
.doc th, .doc td { padding: .5rem .7rem .4rem; text-align: left; border-bottom: 2px solid var(--rule); vertical-align: top; }
.doc td { max-width: 46ch; }
.doc tr:last-child td { border-bottom: 0; }
.doc tbody tr:nth-child(even) td { background: var(--sunken); }
.doc th { background: var(--blue-deep); color: var(--bone); font-family: var(--pixel); font-size: 7px; font-weight: 400;
  line-height: 1.6; text-transform: uppercase; white-space: nowrap; border-bottom: 3px solid var(--ink); }
.doc td code { white-space: nowrap; }
.doc table input[type=checkbox] { appearance: none; width: 14px; height: 14px; border: 2px solid var(--ink); vertical-align: middle; margin: 0 .3em 0 0; }
.doc input[type=checkbox]:checked { background: var(--green); }

/* ── Code blocks ──────────────────────────────────────── */
.code { position: relative; margin: 0 0 1.4rem; border: 3px solid var(--ink); background: var(--blue-dark); box-shadow: 4px 4px 0 var(--ink); }
.code-head { display: flex; align-items: center; justify-content: space-between; gap: .5rem;
  padding: .4rem .5rem .3rem .8rem; background: var(--ink); color: var(--bone); }
.code-lang { font-family: var(--pixel); font-size: 7px; text-transform: uppercase; color: var(--orange); }
.copy { padding: .35rem .5rem .25rem; border: 2px solid var(--bone); background: transparent; color: var(--bone);
  font-family: var(--pixel); font-size: 7px; text-transform: uppercase; cursor: pointer; }
.copy:hover { background: var(--bone); color: var(--ink); }
.copy.is-done { background: var(--green); border-color: var(--green); color: var(--bone); }
.code pre { margin: 0; padding: .9rem 1rem; overflow-x: auto; }
.code code { font-family: var(--mono); font-size: 18px; line-height: 1.3; color: var(--bone); }
.t-comment { color: #9fb4e6; }
.t-string  { color: #a9e6c1; }
.t-keyword { color: var(--orange); }
.t-number  { color: #ffd98a; }
.t-key     { color: #8fd0ff; }
.t-flag    { color: #ffb3d0; }
.t-deco    { color: #e4b3ff; }

/* ── Footer ───────────────────────────────────────────── */
.site-footer { max-width: 80rem; margin: 0 auto; padding: 0 clamp(1rem,3vw,2rem) 4rem; color: var(--ink); font-size: 18px; }
.site-footer a { color: var(--ink); text-decoration-thickness: 2px; }
.site-footer .label { display: block; margin-bottom: .5rem; color: var(--bone); }

.to-top { position: fixed; right: 1.25rem; bottom: 1.25rem; z-index: 40; display: grid; place-items: center;
  width: 40px; height: 40px; border: 3px solid var(--ink); background: var(--orange); color: var(--ink);
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
  .scrim { position: fixed; inset: var(--header) 0 0; z-index: 24; background: rgba(15,53,118,.6);
    opacity: 0; pointer-events: none; transition: opacity .2s steps(4); }
  .scrim.is-open { opacity: 1; pointer-events: auto; }
  .anchor { display: none; }
  .hero h1 { text-shadow: 3px 3px 0 var(--blue-deep); }
}
@media (min-width: 62.0625rem) { .scrim { display: none; } }
`;
