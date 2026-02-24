Drop your plant stage images in this folder.

Style options shown in the app:

- **Free:** 1 style (fixed).
- **Pro:** styles `1`, `2`, `3`, `4`.
- **Premium:** all 10 styles `1`–`10`.

Preferred names (in order):

1. `plant-stage-1.png` - seedling
2. `plant-stage-2.png` - sprout
3. `plant-stage-3.png` - leafy
4. `plant-stage-4.png` - blooming
5. `plant-stage-5.png` - thriving
6. `plant-stage-6.png` - default flowering image

Optional per-style files (Pro: styles 1–4, Premium: styles 1–10):

For each **stage** (1–6) and **style** (1–10), the app looks for e.g.:

- `plant-stage-1-1.png` … `plant-stage-1-10.png` (seedling)
- `plant-stage-2-1.png` … `plant-stage-2-10.png` (sprout)
- `plant-stage-3-1.png` … `plant-stage-3-10.png` (leafy)
- `plant-stage-4-1.png` … `plant-stage-4-10.png` (blooming)
- `plant-stage-5-1.png` … `plant-stage-5-10.png` (thriving)
- `plant-stage-6-1.png` … `plant-stage-6-10.png` (flowering)

**Adding new Premium styles (5–10):**  
Add one image per stage for that style. Example for style `5`:

- `plant-stage-1-5.png`, `plant-stage-2-5.png`, `plant-stage-3-5.png`, `plant-stage-4-5.png`, `plant-stage-5-5.png`, `plant-stage-6-5.png`

Repeat for styles 6, 7, 8, 9, 10. If a stage is missing, the app falls back to the default stage image.

The app will auto-try alternate names/extensions in:

- `/public/plants`
- `/public/plants/backup`

Examples:

- `stage1.png`, `stage-1.jpg`, `plant1.webp`, `seedling.png`
- `stage2.png`, `sprout.jpg`
- `stage3.png`, `leafy.jpeg`
- `stage4.png`, `blooming.webp`
- `stage5.png`, `thriving.png`
- `stage6.png`, `flowering.png`, `plant-stage-6-1.png` … `plant-stage-6-10.png` (and same pattern for stages 1–5)

Supported image extensions: `.png`, `.webp`, `.jpg`, `.jpeg`.

If variant files are missing, the app falls back to the default stage images (no recoloring).
If no stage images are found at all, the app falls back to the built-in SVG illustration.
