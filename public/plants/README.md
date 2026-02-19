Drop your plant stage images in this folder.

Preferred names (in order):

1. `plant-stage-1.png` - seedling
2. `plant-stage-2.png` - sprout
3. `plant-stage-3.png` - leafy
4. `plant-stage-4.png` - blooming
5. `plant-stage-5.png` - thriving
6. `plant-stage-6.png` - flowering (used at top stage when fully watered)

The app will also auto-try alternate names/extensions in `/public/plants`, such as:

- `stage1.png`, `stage-1.jpg`, `plant1.webp`, `seedling.png`
- `stage2.png`, `sprout.jpg`
- `stage3.png`, `leafy.jpeg`
- `stage4.png`, `blooming.webp`
- `stage5.png`, `thriving.png`
- `stage6.png`, `flowering.png`

Supported image extensions: `.png`, `.webp`, `.jpg`, `.jpeg`.

If none are found, the app falls back to the built-in SVG illustration.
