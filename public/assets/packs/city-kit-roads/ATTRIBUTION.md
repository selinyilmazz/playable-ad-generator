# City Kit Roads — Attribution & License

**Author:** Kenney — https://kenney.nl
**License:** CC0 (Creative Commons Zero / Public Domain)

Per the license file shipped with this pack (`LICENSE.txt`, copied here
unmodified): same CC0 terms as every other pack in this project — free
for personal, educational and commercial use, no restriction on
modification or redistribution, attribution not required.

## Important — this is a 3D model pack

Same situation as Car Kit: the ZIP ships `Models/{FBX,GLB,OBJ} format/` +
`Models/Textures/` (unusable — this project only renders flat 2D `<img>`
sprites) and a `Previews/` folder of flat PNG renders, which is the
actual source used here.

## Curation — 9 of ~95 preview files used

The full pack is a modular road-tile system: dozens of straight/curve/
intersection/slant/roundabout/driveway/barrier-variant road pieces, plus
signs and street furniture (~95 preview files total). Building/importing
the entire modular tilemap was explicitly out of scope (this project has
no tilemap engine to consume it, and it would be pure padding for a
demo). Only 9 representative pieces were picked:

- 3 road tiles: one straight piece, one curve, one 4-way intersection —
  enough for the mock template's existing ground-strip rendering and the
  LLM's own free-form layout code to build a believable street, without
  importing the dozens of barrier/slant/roundabout variants.
- 6 street objects: 2 hazards (construction cone, construction barrier)
  used as `obstacle`; 2 interactive street furniture (traffic light, stop
  sign) used as `gameObject`; 2 background props (dumpster, electricity
  pole) used as `decoration`.

Everything else — the ~40+ barrier-line road variants, the highway signs,
the empty/warning/street sign blanks, the alternate pavement-curve
texture — was **not** used; it's kept intact in `source/Previews/` for a
possible future expansion, but including it now would have been padding,
not gameplay value.

## Why this pack does NOT feed the existing "racing" kit

Same reasoning as Car Kit (see that pack's `ATTRIBUTION.md`): City Kit
Roads' "Kenney low-poly 3D toy" rendered style visually clashes with the
existing `racing` kit's 2D top-down sprite style. It instead feeds the
new `city` kit together with Car Kit and City Kit Industrial.

## What's in this folder

- `tiles/` — 3 road pieces (straight, curve, intersection).
- `objects/` — 2 hazards, 2 interactive signals, 2 decoration props.
- `source/Previews/` — the complete, unmodified set of all ~95 original
  preview PNGs. `Models/` was deliberately **not** copied (same reasoning
  as Car Kit — unusable 3D source, no future use case here).
- `LICENSE.txt` — the original license document, unmodified.

## Category / role mapping used

| Curated asset | Source file (Previews/) | category | kit role |
|---|---|---|---|
| road-straight | road-straight.png | tile | platform |
| road-curve | road-curve.png | tile | tile |
| road-intersection | road-intersection.png | tile | tile |
| construction-cone | construction-cone.png | obstacle | obstacle |
| construction-barrier | construction-barrier.png | obstacle | obstacle |
| traffic-light | traffic-light.png | game-object | gameObject |
| road-sign-stop | road-sign-stop.png | game-object | gameObject |
| dumpster | dumpster.png | game-object | decoration |
| electricity-pole | electricity-pole.png | game-object | decoration |
