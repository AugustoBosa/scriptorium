# Scriptorium: handwriting generator for pen plotters
[![en](https://img.shields.io/badge/lang-en-red.svg)](README.md) [![pt-br](https://img.shields.io/badge/lang-pt--br-green.svg)](README.pt-br.md)

Free online generator of **single-stroke handwriting** for **pen plotters** (or a 3D printer converted into a plotter). Writes letters, books, D&D grimoires and sigils, and exports **SVG** and **G-code**. Interface in Brazilian Portuguese.

**Use it online:** https://augustobosa.github.io/scriptorium/

The app generates handwriting with a procedural, deterministic hand (same seed, same result), lays out the page and exports SVG and G-code.

- **Each character has its own hand**: single-line fonts mixed and mutated, with per-occurrence variation, fitting, ligatures, slow drift and pen kinematics.
- **Moods** (normal, hurried, angry, tired...) change only the execution; the handwriting stays recognizable.
- **Ornament and arcana**: borders, vines, drop caps, filigree, sigils and an arcane alphabet.

## Workshops

The site has two paths, and the home page (`#inicio`) shows both side by side:

1. **Characters** (who writes): `#personagens`. Everything about the handwriting lives in the character: fonts, seed, mutation, size and line spacing (per profile), identity, execution and the gesture of margin notes. A new character starts in three ways: from a D&D character sheet (`#ficha`), from your own handwriting (`#letra`) or blank.
2. **Write** (what to write): the `#carta`, `#livro`, `#magias` and `#sigilos` workshops. Each one only picks who writes and the profile ("Escrito por …" above the preview) and handles the material: content, paper, margins, alignment, columns and a **letter scale** (1 = the profile size).

The **Continuar** (continue) strip opens the most recent saved materials. Navigation is visible in the header (☰ on mobile). The old `#scroll` and `#grimorio` routes lead to `#magias`.

All workshops share the same panel order: Character, content, Paper, own panel, Table and sheet, Machine. Each type opens with a sample text and its own default scale.

- **Letter** (`#carta`): letter, note or diary. Text markup: `{nota: ...}`, `{~wrong~>right}`, `{_underline_}`, `{o:circle}`. Notes go to their own layer (margin, strike, underline, loop), with their own pen and character. Without a position, a note goes to the notes margin (note and diary) or to the nearest free spot to the word, linked by an arrow. `{nota@direita: ...}` fixes the side (esquerda/left, direita/right, acima/above, abaixo/below) and `{nota@x,y: ...}` fixes the position in mm; the Notes panel lists the notes (side and angle of each), and dragging a note on the preview saves its position. `{nota@direita/30: ...}` or `{nota@/30: ...}` fix the angle. The note gesture (arrow curve, irregularity, tip, slant and rotate to fit) belongs to the annotating character, in the "Notas na margem" section of the editor. The Notes panel only holds who annotates and the pen.
- **Spells** (`#magias`): D&D spells. With "one spell per page" on, each spell becomes a loose scroll; off, spells flow like a grimoire, with or without a decorated separator between them (diamond, asterisks or wave). The marked block comes out in the arcane alphabet, with an optional key. Each spell's sigil encodes level, school, concentration, ritual and components.
- **Book** (`#livro`): columns, running title, page numbers, catchword, rubric, drop cap and border. Uses the same text as Letter and accepts the same markup: loose notes with arrows, corrections, underlines, loops and margin scribbles, without touching pagination, border or drop cap.
- **Sigils** (`#sigilos`): each phrase becomes a seal, a sigil (kamea, wheel or fusion method) or a circle, with a caption. Sigils are laid out in a grid on a sheet.
- **My handwriting** (`#letra`, part of the character flow): the machine plots the collection sheets (sample text per language and loose letters, with corner marks and sheet code) for you to write by hand. Reading the photo and generating the font are the next steps (`workflow/experimentos/fonte-propria/PESQUISA.md`).

## Interface

- **Basic / Advanced**: basic shows the essentials; advanced shows fine tuning and the machine.
- **Live preview**: each control shows a sample on hover or focus. What the control changes appears in red; the rest, in ink. Value controls have a ruler and a 10 mm scale, and values have at most 2 decimal places.
- **Characters**: gallery with specimen and the full handwriting editor (Handwriting, Size and lines, Identity, Execution, Margin notes); the hand in use applies to all workshops.
- **Create character** (`#ficha`): "Da ficha de D&D" opens a D&D 5e character sheet (race, class, background, abilities, alignment, languages). The sheet suggests the handwriting (3 proposals and a mix) and the writing profiles (diary, grimoire, formal letter, one hand per language…); each profile can have its own hand and size. "Reabrir ficha" in the gallery returns to the wizard.
- **Themes**: light (adventurer's handbook) and candle (illuminated grimoire, dark).
- **Saved in the browser**: characters (`writer.personagens`), machine profile (`writer.perfil`), preferences (`writer.ui`) and the work in progress of each workshop (`trabalho.escrita`, `trabalho.sigilos`, `grimorio.estado`), in localStorage. In IndexedDB (`scriptorium`): library materials and the imported `magias.json`. Nothing goes to a server.
- **Library** (`#biblioteca`): "Salvar na biblioteca" saves the work with a name (workshop, text or spells, settings and character). The tab opens, downloads (.json), renames and deletes; "Baixar cópia de tudo" takes characters and materials to another browser. The home page shows the most recent.
- **Table** (Mesa button above the preview): the machine bed seen from above, front at the bottom, with the X0 Y0 origin, how far the pen reaches, the sheet and the text projected where the pen will write. Without imposition, it shows the current page; with imposition, the whole sheet, with the current pass in ink and the others in grey (empty passes are marked and produce no file). "Ampliar" opens the scene full screen.
- **Path**: "mostrar trajeto" on the preview shows air travel, start, end and order of each stroke.
- **Text**: can be typed or imported from a `.txt` of up to 200 KB.

## Machines (`src/maquina/perfis.js`)

- **megaS**: Anycubic i3 Mega S as a plotter, 210 × 210 mm bed. The only profile tested on the hardware.
- **megaSTroca** and **megaSTrocaLado**: Mega S with the automatic pen-change holder (4 slots, magnets; model in `hardware/pen_holder`, branch `hardware-pen-holder`), mounted on the front or on the right side of the head. The pen sits 41.5 mm from the nozzle (pen holder v4), so the usable area drops to 210 × 152.5 mm on the front (A5 landscape fits) and 152.5 × 210 mm on the side (A5 portrait fits); the G-code already accounts for this offset. Experimental: the positions (`troca` in `src/maquina/perfis.js`) are estimates from the 3D model, nothing measured. Each layer's pen goes to the slot of its position in `canetas` (black = slot 1, red = slot 2…). Instead of `M0`, the G-code picks the first pen, swaps between layers and returns the last one.
- **p2s**: Bambu P2S, experimental. Usable window of about 207 × 200 mm. Never tested on the hardware.
- **personalizado**: editable profile, based on megaS.

The maximum paper size is the profile's usable window. Paper larger than the window is blocked on export, with a message. After the header, the pen rises to `zLevantada` before the 1st travel; `zLevantada` must be above `zEscrita`, otherwise the export refuses. A pen change produces `M0` with a warning. Export is per page and per layer (SVG and G-code), or "Todas as páginas" (all pages).

## Papers (`src/materiais/documento.js`)

A3, A4, A5, A6, A7, A8, letter, legal (ofício) and custom, portrait or landscape, with per-side margins. All workshops use the same list; the limit is the machine window.

## Structure

- `src/motor/`: hand, ductus, writing, kinematics.
- `src/ornamento/`: borders, vines, drop caps, filigree.
- `src/arcano/`: alphabet, circle, sigil.
- `src/materiais/`: letter, book, scroll (spells), sigils, notes, document, examples (default text and look of each type).
- `src/maquina/`: profiles, G-code, path optimization, bed imposition.
- `src/letra/`: "My handwriting" collection sheets and sample texts per language (`linguas/`).
- `src/geo.js`: shared geometry (`dist`, `comprimento`, `clamp`, `ret`, `VAO`, `valido`, clipping, hatching). Do not copy these helpers into another file.
- `src/ui/`: interface (DOM and CSS). Outside `src/ui/` the code does not use the DOM. DOM and storage helpers in `src/ui/util.js`.
- `fontes/`: 43 single-stroke fonts (EMS, Hershey, Relief, Mistral, TwinSans). Licenses in `fontes/LICENCAS.md`.
- `dados/`: spell data. Not in git.
- `scripts/gerar-magias.mjs`: builds `dados/magias.json` from 5etools (default: `../../dnd/data/spells`). The translation is `dados/traducao-ptbr.txt` (one `id|Name|Summary` line per spell).
- `test/`: unit tests. `e2e/`: Playwright tests.
- `workflow/`: project board (`QUADRO.md`) and experiments (P2S, own font).
- `PRODUCT.md` and `DESIGN.md`: product and design rules; read before touching the interface.

## Run

Requirement: Node 24 or newer (CI uses 24 LTS). After `npm ci`:

- `npm run dev`: server at `http://localhost:8765/`. The port is fixed (`--strictPort`): if it is busy, the command fails.
- `npm test`: unit tests (`node --test`), with snapshots in `test/*.snapshot`.
- `npm run e2e`: Playwright (Chromium). The `claro` project runs everything; `vela` (dark theme) runs only `visual.spec.js`. Starts `npm run dev` on its own if it is not running.
- `npm run build`: builds `dist/` and copies `fontes/` and `dados/` (if present).
- `npm run golden`: rewrites the snapshots. Use only on purpose and review the diff.

Manual interface checklist: `test/ui-smoke.md`.

## Deploy

`.github/workflows/pages.yml` deploys to GitHub Pages on every push to `main`: `npm ci`, `npm test`, `npm run build` and upload of `dist/`. On pull requests it runs the same tests and build, without deploying. One-time GitHub prerequisite: Settings › Pages › Source = "GitHub Actions". `dados/` does not go to Pages (it is in `.gitignore`); without `dados/magias.json`, the Spells workshop offers to import the JSON or create blank spells.
