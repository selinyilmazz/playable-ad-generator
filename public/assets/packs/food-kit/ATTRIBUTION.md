# Food Kit — Attribution & License

**Author:** Kenney — https://kenney.nl
**License:** CC0 (Creative Commons Zero / Public Domain)

Per the license file shipped with this pack (`LICENSE.txt`, copied here
unmodified): same CC0 terms as every other pack in this project.

## Important — this is a 3D model pack

Same situation as Car Kit / City Kit Roads / City Kit Industrial:
`Models/` is unusable; the `Previews/` folder's flat PNG renders are the
actual source used.

## Curation — 17 of ~200 preview files used

The pack ships roughly 200 preview files covering dozens of food items
plus multiple cut/sliced/cooked/half variants of each (e.g. `apple`,
`apple-half`; `egg`, `egg-cooked`, `egg-cup`, `egg-half`; `plate`,
`plate-broken`, `plate-deep`, `plate-dinner`, `plate-rectangle`,
`plate-sauerkraut`; several burger/donut/cake variants). Only the plain,
single-item base form of each concept was kept — 17 assets across 4
functional groups:

- **8 raw ingredients** (`collectible`): apple, banana, tomato, carrot,
  egg, cheese, bread, fish — chosen as the smallest set that reads
  clearly as "things to collect/cook with" without redundant sliced/half
  variants of the same item.
- **2 target containers** (`gameObject`, role `target` — same pattern as
  the existing `fruit-puzzle` kit's `basket_red`/`basket_green`): plate,
  cutting board — the two most natural "drop the ingredient here" targets
  in the pack.
- **3 kitchen tools** (`gameObject`): pot, frying pan, cooking knife.
- **4 finished dishes** (`decoration`, LLM-only — not rendered by the
  mock template): burger, pizza, cake, donut — scene-richness props for
  real (LLM) generation, picked over their sliced/multi-variant siblings
  (`burger-cheese`, `burger-double`, `donut-chocolate`, etc.) since one
  representative per dish was enough.

Everything else — the sliced/half/broken/cooked variants, the
gingerbread set, the pineapple/eggplant/sushi items, the multiple plate
shapes, the pizza cutter / cake slicer tool variants — was **not** used;
kept intact in `source/Previews/` for a possible future expansion.

## What's in this folder

- `objects/` — all 17 curated PNGs (collectibles, targets, tools,
  decoration — flat structure, matching this pack's simple category set).
- `source/Previews/` — the complete, unmodified set of all ~200 original
  preview PNGs. `Models/` was deliberately **not** copied (unusable 3D
  source, no future use case here).
- `LICENSE.txt` — the original license document, unmodified.

## Category / role mapping used

| Curated asset | Source file (Previews/) | category | kit role |
|---|---|---|---|
| apple | apple.png | collectible | collectible |
| banana | banana.png | collectible | collectible |
| tomato | tomato.png | collectible | collectible |
| carrot | carrot.png | collectible | collectible |
| egg | egg.png | collectible | collectible |
| cheese | cheese.png | collectible | collectible |
| bread | bread.png | collectible | collectible |
| fish | fish.png | collectible | collectible |
| plate | plate.png | game-object | target |
| cutting-board | cutting-board.png | game-object | target |
| pot | pot.png | game-object | gameObject |
| frying-pan | frying-pan.png | game-object | gameObject |
| cooking-knife | cooking-knife.png | game-object | gameObject |
| burger | burger.png | game-object | decoration |
| pizza | pizza.png | game-object | decoration |
| cake | cake.png | game-object | decoration |
| donut | donut.png | game-object | decoration |

## New "cooking" game kit

This pack is the sole asset source for a brand-new `cooking` kit (see
`server/config/assetKits.js`) — no existing kit's theme matched, so a new
one was created (per Selin's instruction, evaluated as a genuine
gameplay-appropriate case, not padding). `player`/`obstacle` are honestly
`null`: the pack has no character or natural hazard concept, the same
honest gap the existing `fruit-puzzle` kit already has for `enemy`.
