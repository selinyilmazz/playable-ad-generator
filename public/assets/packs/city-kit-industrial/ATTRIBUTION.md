# City Kit Industrial 2.0 — Attribution & License

**Author:** Kenney — https://kenney.nl
**License:** CC0 (Creative Commons Zero / Public Domain)

Per the license file shipped with this pack (`LICENSE.txt`, copied here
unmodified): same CC0 terms as every other pack in this project.

## Important — this is a 3D model pack

Same situation as Car Kit / City Kit Roads: `Models/` (FBX/GLB/OBJ +
Textures) is unusable by this project's 2D `<img>`-based rendering; the
`Previews/` folder's flat PNG renders are the actual source used.

## Curation — 4 of 24 preview files used

The pack ships 20 buildings (`building-a.png` … `building-t.png`) plus 3
shipping-container color variants and 1 water tower (24 previews total).
A contact-sheet comparison of all 20 buildings (`buildings_check.png`,
generated during inspection) showed most are close height/massing
variations of the same few silhouettes rather than 20 genuinely distinct
structures. Only 4 visually-distinct objects were kept: one office-style
building silhouette (`building-a`), one factory-style silhouette
(`building-e`), the water tower, and one shipping container — enough
variety for scene decoration without importing 20 near-duplicate
buildings that would mostly look interchangeable in a small playable-ad
canvas.

## Why this pack does NOT feed the existing "racing" kit

Same reasoning as Car Kit / City Kit Roads — visual style match with
those two, mismatch with Racing's 2D top-down sprites. Feeds the new
`city` kit as background/scenery decoration.

## What's in this folder

- `objects/` — 4 curated building/industrial PNGs, all used as
  `decoration` (mock does not render this role; LLM-only, same pattern as
  every other kit's decoration role).
- `source/Previews/` — the complete, unmodified set of all 24 original
  preview PNGs (all 20 buildings + 3 container variants + water tower),
  preserved for a possible future expansion. `Models/` was deliberately
  **not** copied (unusable 3D source, no future use case here).
- `LICENSE.txt` — the original license document, unmodified.

## Category / role mapping used

| Curated asset | Source file (Previews/) | category | kit role |
|---|---|---|---|
| building-office | building-a.png | game-object | decoration |
| building-factory | building-e.png | game-object | decoration |
| water-tower | water-tower.png | game-object | decoration |
| shipping-container | shipping-container-a.png | game-object | decoration |
