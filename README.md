# LAHORE · A City of Stories

**Har gali mein aik kahani hai.** — *Every street has a story.*

<img width="1840" height="854" alt="image" src="https://github.com/user-attachments/assets/67168c35-2841-464e-b8f3-0f6a0fceee76" />


A tiny-planet exploration game set in Lahore. You arrive as a tourist and walk the Shahi
Guzargah, the royal trail that runs from Delhi Gate past the Wazir Khan Mosque to the Lahore
Fort, the Badshahi Mosque and the Fort Road Food Street. Talk to the people, climb the walls,
ride a Sohrab cycle, row across the Ravi, eat your way down the food street and collect a card
for every place and dish you find.

Built with SvelteKit and Three.js. The whole city is generated from code at load time, so
there are no 3D model files to download.

---

## Run it

```bash
pnpm install
pnpm dev          # http://localhost:5173
```

```bash
pnpm build        # production build
pnpm preview      # serve the build
pnpm check        # typecheck (svelte-check)
```

Needs Node 20+ and a WebGL2 browser.

## Controls

| Key | Action |
| --- | --- |
| **W A S D** / arrows | walk |
| **Shift** | run |
| **Space** | jump |
| **E** | talk, discover, enter a shop |
| **C** | call the Sohrab cycle / put it away |
| **R** | ring the cycle bell |
| **K** | call a boat at the river / step ashore |
| **H** | open your collection |
| **M** | mute |
| **F3** | show fps and triangle count |
| drag | look around |

On a touch screen the left half of the display moves you and a tap jumps.

## What is in the city

**The trail.** Delhi Gate, Shahi Hammam, Wazir Khan Mosque and its calligraphers' bazaar,
Sunehri Masjid, the Kashmiri Bazaar crossroads, Lahore Fort, Hazuri Bagh, Badshahi Mosque and
the Fort Road Food Street — laid out in their real order along a single royal road, with
haveli façades, jharokhas, tangled wires, string lights and about 200 people living on it.

**Beyond the walls.** Minar-e-Pakistan in Greater Iqbal Park, Lahore Junction with its
fortified towers and a Pakistan Railways train at the platform, Gaddafi Stadium with a cricket
match that never ends, Kamran's Baradari on its island in the Ravi, and the Wagah border where
the flag ceremony runs on a loop every evening.

**Getting around.** Press **C** anywhere and a Sohrab roadster appears under you — faster than
walking, with a bell. You cannot swim the Ravi; stand at the water's edge, press **K** and a
boat arrives to row across to the island.

**Food.** Eight famous stalls line the food street, each with its dish modelled on the
counter: Butt Karahi, Nihari House, Phajja Siri Paye, Tikka House, Dum Biryani, Yakhni Pulao,
Golgappay and Malai Lassi. Finish a chat with the cook and you keep that dish's card.

**The collection (H).** 20 cards in two sections, Places and Food of Lahore, each with
photographs, a short history and the story of how it is made or who built it. Talking to
certain people also unlocks "heritage memories".

## Cloudinary

Every collection card shows a real photograph, and Cloudinary is the image and video pipeline
behind them. The game runs without it (photos then load straight from Wikimedia Commons), but
with it every image is transformed, optimised and delivered from Cloudinary's CDN.

### Setup

1. Copy the example file and fill in your values:

   ```bash
   cp .env.example .env
   ```

   ```ini
   PUBLIC_CLOUDINARY_CLOUD_NAME=your-cloud-name     # browser: builds delivery URLs
   PUBLIC_CLOUDINARY_FOLDER=lahore-heritage         # browser: where assets live
   PUBLIC_CLOUDINARY_DELIVERY=upload                # browser: "upload" or "fetch"
   CLOUDINARY_API_KEY=...                           # server only
   CLOUDINARY_API_SECRET=...                        # server only
   ```

   Only the `PUBLIC_*` values ever reach the browser. The key and secret stay on the server
   (used by the seed script, the `/api/heritage` listing and the signed-upload endpoint) and
   `.env` is gitignored.

2. Upload the card photographs once:

   ```bash
   pnpm cloudinary:seed
   ```

### How Cloudinary is used

**Seeding** (`scripts/cloudinary-seed.ts`). For every photo in the card data it uploads the
Wikimedia Commons original to `lahore-heritage/<landmark>/<slot>`, tagged and stamped with the
caption, author, licence and source page as contextual metadata. For each card's main photo it
also *eagerly* generates the Ken Burns film and an optimised crop so the first visitor never
waits on a transform.

**Delivery** (`src/lib/lahore/heritage/cloudinary.ts`). Every URL is built from the public
cloud name — the browser never sees a secret. Each image carries `f_auto` (serve WebP/AVIF when
the browser supports it) and `q_auto` (automatic quality). On top of that:

- **Responsive crops** — collection thumbnails and the card hero are requested at seven widths
  (`srcset`), cropped with `c_fill,g_auto` so Cloudinary keeps the interesting part of the frame.
- **Locked teasers** — undiscovered places show the same photo through `e_grayscale,e_blur:900`,
  so you get a hint without a spoiler.
- **LQIP** — a tiny `e_blur:400` placeholder streams in first, then the full image.
- **Heritage films** — the back of a card plays a short MP4 that Cloudinary renders from the
  still photo with `e_zoompan` (a Ken Burns pan-and-zoom), delivered `f_auto:video,q_auto`.
- **Shareable postcard** — Cloudinary composes a captioned, bordered postcard entirely with
  transformation layers (`l_text`, `bo_`), no image editor involved.

**Server endpoints** (`src/routes/api/heritage/`). `/api/heritage` uses the Admin/Search API to
list any extra images a curator tagged in the Media Library, so they appear in the collection
without a code change. `/api/heritage/sign` issues a signed upload so visitors can contribute
their own photos.

### Delivery modes

- `PUBLIC_CLOUDINARY_DELIVERY=upload` (default) serves the assets you seeded.
- `PUBLIC_CLOUDINARY_DELIVERY=fetch` skips seeding and has Cloudinary pull each Commons original
  on demand and cache it. This needs "Fetched URL" left unrestricted in the Cloudinary console
  (Settings → Security).

## How it is built

```
src/
  lib/
    lahore/
      core/        maths, tuning constants, the planet frame (trail ↔ sphere)
      geometry/    the Builder: boxes, arches, domes, stairs, lathes, merlons
      world/       ground, streets, bazaars, and one file per landmark
      characters/  rigs, outfits, NPC crowd, the player, cycle and boat
      controls/    capsule physics, follow camera, input
      render/      palette, toon material, outline + LUT post pass, decor atlas
      game/        the game loop, dialogues, cricket match, Wagah ceremony
      heritage/    card data and the Cloudinary delivery layer
      ui/          title screen, HUD, cards, collection
    engine/        shared renderer helpers (KTX2 loading, water, skinning)
    server/        server-only Cloudinary client
  routes/          the page, plus the heritage API endpoints
static/
  game/            audio, character rigs, LUT and noise textures
  draco/           Draco decoder for the character meshes
scripts/
  cloudinary-seed.ts
```

Each landmark is authored on a flat local frame and then bent onto the sphere, while slender
things such as minarets, domes and trees stay upright. Static geometry is merged per chunk
into two draw calls plus one BVH collider. Characters are skinned meshes sharing a palette
texture, and anything past the planet's horizon is hidden and stops animating.

Rendering is a single custom toon material (palette lookup, HSV shadow tint, line dissolve
near the camera) followed by one fullscreen pass that paints the sky, draws depth and
surface-ID outlines, and applies a 32³ colour lookup table.

## Credits

Photographs on the cards come from Wikimedia Commons contributors and are credited
individually, with their licence, on the card itself and in [ATTRIBUTION.md](ATTRIBUTION.md).
Bundled audio, character rigs and lookup textures are third-party assets, also listed there.

Project code is MIT licensed — see [LICENSE](LICENSE).
