# Car Kit — Attribution & License

**Author:** Kenney — https://kenney.nl
**License:** CC0 (Creative Commons Zero / Public Domain)

Per the license file shipped with this pack (`LICENSE.txt`, copied here
unmodified from the original download):

> License: (Creative Commons Zero, CC0) —
> http://creativecommons.org/publicdomain/zero/1.0/
> You can use this content for personal, educational, and commercial
> purposes. Support by crediting 'Kenney' or 'www.kenney.nl' (not a
> requirement)

Same terms as every other active pack in this project: no restriction on
use, modification, or redistribution, so embedding these PNGs inside
AI-generated, end-user-facing playable games (compiled output) is safe.

## Important — this is a 3D model pack

The original ZIP ships `Models/{FBX,GLB,OBJ} format/` plus
`Models/Textures/` — full 3D model files. This project renders flat
`<img>` 2D sprites only; 3D models are entirely unusable here. The pack
also ships a `Previews/` folder: individual, descriptively-named, flat
128x128 PNG renders of every model (a consistent "Kenney low-poly 3D toy"
isometric/perspective-shaded look). **These preview PNGs are what was
actually used** — nothing from `Models/` was touched.

## Curation — 6 of 50 preview files used

The pack ships 50 vehicle previews (sedans, SUVs, trucks, vans, taxis,
police cars, ambulances, a garbage truck, a delivery truck, several bus
variants, etc.). Only 6 were selected: 1 plain sedan (player car) + 5
visually-distinct emergency/utility/civic vehicle types (taxi, police,
ambulance, van, garbage truck) as traffic/obstacle vehicles. The
remaining ~44 previews (bus variants, additional sedan color/body
variants, pickup trucks, etc.) were **not** used — they would have been
palette/body-shape padding on top of an already-sufficient obstacle
variety, not genuinely new gameplay value.

## Why this pack does NOT feed the existing "racing" kit

Car Kit's "Kenney low-poly 3D toy" rendered/shaded visual style is
noticeably different from the existing `racing` kit's 2D top-down sprite
style (Kenney Racing Pack). Mixing the two inside one kit would create a
visible style clash in generated games. Instead, Car Kit feeds a brand
new, internally-consistent `city` kit (see `server/config/assetKits.js`)
together with City Kit Roads and City Kit Industrial — all three share the
same "3D toy" preview-render look, so the `city` kit stays visually
coherent on its own.

## What's in this folder

- `characters/` — 6 curated vehicle PNGs. Filed under `characters/` to
  match this project's existing convention (`category: "vehicle"` maps to
  the `CHARACTERS` asset group, same as Racing pack's player cars).
- `source/Previews/` — the complete, unmodified set of all 50 original
  preview PNGs, preserved for future expansion of the `city` kit.
  `Models/` (FBX/GLB/OBJ + Textures, 6-15MB, entirely unusable by this
  project's 2D rendering pipeline) was deliberately **not** copied into
  `source/` — there is no future use case for raw 3D model files here.
- `LICENSE.txt` — the original license document, unmodified.

## Category / role mapping used

| Curated asset | Source file (Previews/) | category | kit role |
|---|---|---|---|
| sedan | sedan.png | vehicle | player |
| taxi | taxi.png | vehicle | obstacle |
| police | police.png | vehicle | obstacle |
| ambulance | ambulance.png | vehicle | obstacle |
| van | van.png | vehicle | obstacle |
| garbage-truck | garbage-truck.png | vehicle | obstacle |

This follows the same scaling pattern as `packs/racing/` and
`packs/tiny-dungeon/`: a curated category folder for pipeline-ready
files, `source/` for original fidelity (previews only, per above), plus
its own `LICENSE.txt` / `ATTRIBUTION.md`.
