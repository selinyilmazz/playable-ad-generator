# SunnyLand Forest — Attribution & License

**Author:** Luis Zuno (aka "Ansimuz") — https://ansimuz.com
**License:** CC0 (Creative Commons Zero / Public Domain)

Per the license file shipped with this pack (`LICENSE.pdf`, copied here
unmodified from the original download):

> All assets included in this package are licensed under the Creative
> Commons Zero (CC0) license, which means you can use them freely in any
> project, whether personal or commercial, without the need for
> attribution. There are no restrictions on use, modification, or
> redistribution of these assets.

This explicitly covers redistribution of the source files, not just
"use" — so it is safe for Playable Ad Generator to embed these PNGs
inside AI-generated, end-user-facing playable games (compiled output),
not merely to reference them internally. Attribution is not legally
required by CC0, but is included here as a courtesy to the artist.

## What's in this folder

- `characters/`, `enemies/`, `objects/`, `effects/`, `backgrounds/` —
  one curated, single-frame PNG per asset, wired into
  `server/config/assetManifest.js` and used directly by the game
  generation pipeline (mock + real). These are unmodified crops taken
  directly from the original pack — no recompression, no resizing, no
  color/quality changes.
- `source/` — the complete original per-frame sprite sequences,
  combined spritesheets, and environment layers from the pack,
  preserved in full (all animation frames, not just the single frame
  used today) for future animation work.
- `LICENSE.pdf` — the original license document, unmodified.

## Scaling to future packs

Additional professional asset kits should follow this same layout:
`public/assets/packs/<pack-name>/{characters,enemies,objects,effects,
backgrounds}/` for pipeline-ready files, `source/` for full original
fidelity, plus its own `LICENSE.*` / `ATTRIBUTION.md`. This keeps every
pack self-contained and keeps `server/config/assetManifest.js` as the
single place that decides which files are actually used.
