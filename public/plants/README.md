Drop your plant stage images in this folder.

Style options shown in the app:

- `1`, `2`, `3`, and `4` (image-only selectors, no text labels)

Preferred names (in order):

1. `plant-stage-1.png` - seedling
2. `plant-stage-2.png` - sprout
3. `plant-stage-3.png` - leafy
4. `plant-stage-4.png` - blooming
5. `plant-stage-5.png` - thriving
6. `plant-stage-6.png` - default flowering image

Optional stage-6 goal variants (for Garden mode):

- `plant-stage-6-1.png` - style 1 flower
- `plant-stage-6-2.png` - style 2 flower
- `plant-stage-6-3.png` - style 3 flower
- `plant-stage-6-4.png` - style 4 flower

Optional per-style files for *every* stage:

- `plant-stage-1-1.png`, `plant-stage-1-2.png`, `plant-stage-1-3.png`, `plant-stage-1-4.png`
- `plant-stage-2-1.png`, `plant-stage-2-2.png`, `plant-stage-2-3.png`, `plant-stage-2-4.png`
- ...same pattern through stage 6.

The app will also auto-try alternate names/extensions in:

- `/public/plants`
- `/public/plants/backup`
- `/public/plants/back-up`
- `/public/plants/back up`

Examples:

- `stage1.png`, `stage-1.jpg`, `plant1.webp`, `seedling.png`
- `stage2.png`, `sprout.jpg`
- `stage3.png`, `leafy.jpeg`
- `stage4.png`, `blooming.webp`
- `stage5.png`, `thriving.png`
- `stage6.png`, `flowering.png`, `plant-stage-6-1.png`, `plant-stage-6-2.png`, `plant-stage-6-3.png`, `plant-stage-6-4.png`

Supported image extensions: `.png`, `.webp`, `.jpg`, `.jpeg`.

If variant files are missing, the app falls back to the default stage images (no recoloring).
If no stage images are found at all, the app falls back to the built-in SVG illustration.
