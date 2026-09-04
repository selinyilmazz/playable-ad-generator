# Retro Textures Fantasy Pack — Attribution & License

**Author:** Kenney — https://kenney.nl
**License:** CC0 (Creative Commons Zero / Public Domain)

Per the license file shipped with this pack (`LICENSE.txt`, copied here
unmodified): same CC0 terms as every other pack in this project.

## Not a 3D model pack

Unlike the other 5 new packs this round, this is a plain flat 2D PNG
texture pack — no `Models/` folder, nothing to exclude. All files live
directly under `PNG/`.

## Curation — 3 of 26 files used

The pack ships wall/floor/door textures with many color (sand/stone) and
condition (damaged/depth-shaded/wide/banner) variants of the same few
concepts — 26 files covering essentially 3 ideas (brick wall, wood floor,
wood door) times several finishes. Only one clean representative per
concept was kept: `wall_brick_sand_both.png` (brick wall),
`floor_wood_planks.png` (wood floor), `door_wood.png` (wood door). The
`_stone` color variant, the `_damaged`/`_depth`/`_wide`/`_banner`/
`_small` finish variants, and the door's `_frame`/`_handle`/`_window`/
`_window_lit` sub-parts were **not** used — one flat, unshadowed texture
per concept was sufficient and visually cleanest for this project's flat
`<img>` rendering (the `_depth` variants are actually pre-baked
drop-shadow renders meant for a different, layered rendering approach
this project doesn't use).

## Same enrichment decision as Retro Fantasy Kit

Like `retro-fantasy/` (see that pack's `ATTRIBUTION.md` for the full
reasoning), this pack has no character/creature/collectible content, so
it was **not** built into a standalone kit. Its 3 assets were instead
folded into the already-active `dungeon-rpg` kit's `tile` and
`gameObject` roles — both LLM-only roles the deterministic mock template
never renders, so this carries zero visual-clash risk for the mock demo.

## What's in this folder

- `tiles/` — 2 curated PNGs (brick wall, wood floor).
- `objects/` — 1 curated PNG (wood door).
- `source/PNG/` — the complete, unmodified set of all 26 original PNG
  files.
- `LICENSE.txt` — the original license document, unmodified.

## Category / role mapping used

| Curated asset | Source file (PNG/) | category | kit role (in `dungeon-rpg`) |
|---|---|---|---|
| wall-brick | wall_brick_sand_both.png | tile | tile |
| floor-wood | floor_wood_planks.png | tile | tile |
| door-wood | door_wood.png | game-object | gameObject |
