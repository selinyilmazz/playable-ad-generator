# Particle Pack — Attribution & License

**Author:** Kenney Vleugels — https://kenney.nl
(Additional credit in the pack's own `LICENSE.txt` for filter templates:
Indigo Ray, Craig Nisbet, Zoltan Erdokovy, Heliagon, ThreeDee, Killst4r,
Tim2501.)
**License:** CC0 (Creative Commons Zero / Public Domain)

Per the license file shipped with this pack (`LICENSE.txt`, copied here
unmodified): same CC0 terms as every other pack in this project.

## Not a 3D model pack

Plain flat 2D PNG particle sprites — no 3D models involved.

## Curation — 5 of 195 files used, shared across multiple kits

The pack ships ~80 distinct particle types, each exported both against a
transparent background and a black background, plus rotated-angle
variants of several (195 files total). Dumping this whole pack into one
kit was explicitly avoided (per instruction section 5F) — instead, 5
genuinely cross-kit-usable effects were picked from the **transparent**
variant set (the correct one for this project's `<img>`-over-scene
rendering; the black-background variants were not used):

- `hit-impact` (from `scorch_02.png`) — a generic hit/impact scorch mark.
- `magic-glow` (from `magic_02.png`) — a soft radial glow, reads as
  "magic"/"pickup" sparkle.
- `smoke-puff` (from `smoke_03.png`) — a soft grey smoke puff.
- `spark-burst` (from `spark_02.png`) — a sharp radial spark burst.
- `star-sparkle` (from `star_04.png`) — a 4-point star sparkle.

The other ~75 particle types (fire, rain, bubbles, leaves, various smoke/
spark/star/magic angle and shape variants, trace/trail particles, etc.)
were **not** used — kept intact in `source/PNG (Transparent)/` for future
expansion.

## Architecture — no new concept, reused the existing multi-kit pattern

This project already had exactly one precedent for one physical asset
being used by more than one kit: `legacy-core.js`'s `sparkle` effect,
which carries `compatibleGameTypes: ["endless-runner", "fruit-puzzle"]`
and is referenced by id from both kits' `effect` role. The 5 particles
here follow that **exact same pattern** — no new architecture, no new
field, nothing invented:

| Asset | Used by kit(s) | Reasoning |
|---|---|---|
| `particle_hit_impact` | `dungeon-rpg`, `city` | combat hit / vehicle-obstacle collision |
| `particle_magic_glow` | `dungeon-rpg` | potion/magic pickup glow |
| `particle_smoke_puff` | `city`, `cooking` | construction/vehicle smoke; cooking steam |
| `particle_spark_burst` | `city` | electrical/collision spark |
| `particle_star_sparkle` | `cooking` | recipe-complete / success sparkle |

`server/config/assetKits.js`'s per-kit `roles.effect` arrays reference
these same ids directly — `assetKits.test.js`'s existing cross-consistency
test (every manifest asset's `compatibleGameTypes` entries must actually
appear in that kit's roles) validates this automatically, exactly as it
already did for `sparkle`.

## What's in this folder

- `effects/` — 5 curated PNGs.
- `source/PNG (Transparent)/` — all 80 non-rotated transparent-background
  PNG files from the original pack (the rotated-angle sub-variants and the
  black-background export were not copied — not a source this project's
  rendering pipeline would ever need).
- `LICENSE.txt` — the original license document, unmodified.

## Category / role mapping used

| Curated asset | Source file (PNG (Transparent)/) | category |
|---|---|---|
| hit-impact | scorch_02.png | effect |
| magic-glow | magic_02.png | effect |
| smoke-puff | smoke_03.png | effect |
| spark-burst | spark_02.png | effect |
| star-sparkle | star_04.png | effect |
