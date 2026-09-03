# Kenney Space Shooter (Remastered) — Attribution & License

**Author:** Kenney Vleugels — https://kenney.nl
**License:** CC0 (Creative Commons Zero / Public Domain)

Per the license file shipped with this pack (`LICENSE.txt`, copied here
unmodified from the original download):

> License (CC0) — http://creativecommons.org/publicdomain/zero/1.0/
> You may use these graphics in personal and commercial projects.
> Credit (Kenney or www.kenney.nl) would be nice but is not mandatory.

Same terms as the SunnyLand Forest pack: no restriction on use,
modification, or redistribution, so embedding these PNGs inside
AI-generated, end-user-facing playable games (compiled output) is safe.
Attribution isn't required, but is included here as a courtesy.

## Two source ZIPs reviewed — only one used

Selin supplied two packs to review together: **Space Shooter (Remastered)**
and **Space Shooter Extension**. Both are CC0, both from Kenney, and both
share the same clean flat-vector sci-fi art direction (confirmed visually,
side by side — no style clash). Only **Remastered** was actually
integrated: it already fully covers every category asked for (player
ships, enemy ships, lasers, asteroids, explosions/shield/spark effects,
power-ups, backgrounds) with a cohesive, single-source look. The
Extension pack (astronauts, space stations, building modules, missiles,
rocket parts — ~250 files) wasn't needed for this kit and was left out
entirely, rather than mixing in a few extra files from a second source
just to use it. It's a legitimate, same-license option if this kit is
expanded later (e.g. dedicated missiles, a station backdrop).

## What's in this folder

- `characters/`, `enemies/`, `objects/`, `effects/`, `backgrounds/` — one
  curated PNG per asset, wired into `server/config/assetManifest.js` and
  used directly by the game generation pipeline (mock + real). Unmodified
  crops taken directly from the original pack — no recompression,
  resizing, or color changes. Two sprites were re-labelled by their real
  visual role rather than their source folder name (same practice as the
  original 39-asset manifest's `fireball`/`sparkle` notes): `Lasers/
  laserRed09.png` is an impact-burst shape, not a bolt, so it's filed as
  `effects/explosion.png`; the two "engine flame" sprite sequences
  (`fire00–19`) were reviewed and NOT used, since they read as a ship's
  engine trail, not a hit/death explosion — using them as "explosion"
  would have been a mislabel.
- `source/` — the complete original PNG set (all ship color variants, all
  16 rotation/impact frames per laser color, all 5 enemy tiers per color,
  all damage states, power-up icon variants, UI) preserved in full for
  future expansion of this kit — nothing beyond what's listed above was
  cropped or altered, this is a straight copy.
- `LICENSE.txt` — the original license document, unmodified.

## Category mapping used in `server/config/assetManifest.js`

| Curated asset | Source file | category |
|---|---|---|
| player-falcon/interceptor/vanguard | playerShip1_blue / playerShip2_green / playerShip3_red | character |
| enemy-red/blue/green/heavy/ufo | enemyRed2 / enemyBlue2 / enemyGreen2 / enemyBlack4 / ufoRed | enemy |
| laser-blue/red/green | laserBlue01 / laserRed01 / laserGreen03 | projectile |
| asteroid-large/medium/small | meteorBrown_big1 / meteorGrey_med2 / meteorBrown_tiny2 | obstacle |
| explosion/shield/spark | laserRed09 / shield2 / star2 | effect |
| powerup-rapidfire/shield/star | powerupBlue_bolt / powerupGreen_shield / powerupYellow_star | collectible |
| deep-space/nebula-blue | darkPurple / blue | background |

This follows the same scaling pattern as `packs/sunnyland-forest/`:
`public/assets/packs/<pack-name>/{characters,enemies,objects,effects,
backgrounds}/` for pipeline-ready files, `source/` for full original
fidelity, plus its own `LICENSE.*` / `ATTRIBUTION.md`.
