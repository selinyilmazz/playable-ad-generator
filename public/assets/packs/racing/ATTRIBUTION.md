# Racing Pack — Attribution & License

**Author:** Kenney Vleugels — https://kenney.nl
**License:** CC0 (Creative Commons Zero / Public Domain)

Per the license file shipped with this pack (`LICENSE.txt`, copied here
unmodified from the original download):

> License: (Creative Commons Zero, CC0) —
> http://creativecommons.org/publicdomain/zero/1.0/
> This content is free to use in personal, educational and commercial
> projects. Support us by crediting Kenney or www.kenney.nl (not mandatory)

Same terms as the SunnyLand Forest and Kenney Space Shooter packs: no
restriction on use, modification, or redistribution, so embedding these
PNGs inside AI-generated, end-user-facing playable games (compiled output)
is safe. Attribution isn't required, but is included here as a courtesy.

## Curation — 15 of ~423 files used

The original pack ships 423 PNGs across `Cars/` (50: 5 body shapes × 5
colors × 2 sizes), `Characters/` (17 — generic top-down pedestrian heads,
not vehicle-related), `Motorcycles/` (5), `Objects/` (39), and `Tiles/`
(3 road surfaces × 90 modular pieces + 3 plain ground types × 14 pieces —
a full tilemap system). Only a small, curated subset was selected for the
`racing` game kit (see `server/config/assetKits.js` and
`server/config/packs/racing.js`), following the same "small, coherent,
hand-picked set" approach as the other two active packs — not a bulk
import.

`Characters/` (12 pedestrian heads + 5 helmeted `racer_*` icons) was
reviewed and **not used**: none of it represents a vehicle, a track
hazard, or scenery relevant to a driving/racing mechanic — including it
would have been padding, not gameplay value.

Of the 90-piece road tileset, only **3 representative pieces** were taken
(straight, one clean curve, and one checkered finish-line tile) — enough
for the generation pipeline (mock template's existing ground-strip
rendering, and the LLM's own free-form layout code) to build a track,
without importing an entire modular tilemap the project has no tilemap
engine to consume. The Dirt road / Sand road surface variants and the
plain Dirt/Grass/Sand ground tiles were **not** used in this pass (kept
available in `source/` for a possible future "off-road track" theme).

No coin/gem/star-style collectible, no nitro/shield power-up icon, and no
speedometer/dashboard UI icon exist anywhere in this pack — despite an
earlier planning estimate in `assetPacks.js` (`PLANNED_PACKS_RAW`)
guessing at `powerup: 2` and `ui: 1`. That estimate was written before the
actual pack was inspected; the real pack was checked file-by-file and
these roles are honestly left `null` (see `missingRoles` on the kit)
rather than force-fitting an unrelated icon into those slots.

## What's in this folder

- `characters/` — 5 curated vehicle PNGs (2 player cars, 2 traffic cars,
  1 motorcycle). Filed under `characters/` to match this project's
  existing convention (`category: "vehicle"` maps to the `CHARACTERS`
  asset group in `assetManifest.js`, same as how the other packs' player
  ships live under `characters/` despite not being literal humans).
- `objects/` — hazards (`cone.png`, `oil-slick.png`, `barrier.png`) and
  scene decoration (`tree-large.png`, `tribune.png`, `tent.png`).
- `effects/` — `skidmark.png` (drift/skid visual).
- `tiles/` — 3 road pieces (`road-straight.png`, `road-curve.png`,
  `road-finish-line.png`) — the first real use of the `"tile"` asset
  category that was prepared (but unused) since Round 18.
- `source/` — the complete, unmodified original pack (all 423 PNGs plus
  the spritesheets and vector source) preserved in full for future
  expansion of this kit — nothing beyond what's listed above was cropped
  or altered, this is a straight copy.
- `LICENSE.txt` — the original license document, unmodified.

## Category / role mapping used

| Curated asset | Source file | category | kit role |
|---|---|---|---|
| car-player-red / car-player-blue | car_red_1 / car_blue_1 | vehicle | player |
| car-traffic-yellow / car-traffic-green | car_yellow_3 / car_green_4 | vehicle | obstacle |
| motorcycle-black | motorcycle_black | vehicle | obstacle |
| cone | cone_straight | obstacle | obstacle |
| oil-slick | oil | obstacle | obstacle |
| barrier | barrier_white_race | obstacle | obstacle |
| road-straight | road_asphalt01 | tile | platform |
| road-curve | road_asphalt02 | tile | tile |
| road-finish-line | road_asphalt43 | tile | tile |
| skidmark | skidmark_long_1 | effect | effect |
| tree-large | tree_large | game-object | decoration |
| tribune | tribune_full | game-object | decoration |
| tent | tent_red_large | game-object | decoration |

Note: `car-player-*` and `car-traffic-*` deliberately use two **different**
car body shapes (not just different colors of the same shape) so the
player's vehicle stays visually distinguishable from traffic/opponent
vehicles at a glance — directly supporting the hazard/interaction
legibility principle already in `systemPrompt.js` (Round 22, "GAMEPLAY
INFORMATION & FEEDBACK").

This follows the same scaling pattern as `packs/sunnyland-forest/` and
`packs/kenney-space-shooter/`: curated category folders for
pipeline-ready files, `source/` for full original fidelity, plus its own
`LICENSE.txt` / `ATTRIBUTION.md`.
