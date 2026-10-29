# AI traffic assets — licensing and provenance

Verified 28 October 2026. All five models are original Innerscene GLBs released under CC0 1.0. They are unbranded nominal-scale visualization models, not manufacturer CAD.

License: https://creativecommons.org/publicdomain/zero/1.0/ — full text in CC0-1.0.txt.

| Class | Original model | Author | License | Triangles near / medium / far | Runtime bytes (all tiers) |
| --- | --- | --- | --- | --- | --- |
| SEDAN | [Graphite four-door sedan](https://www.innerscene.com/tools/library/3d-parts/graphite-four-door-sedan-eed96d12) | Innerscene | CC0-1.0 | 55,603 / 17,125 / 4,937 | 1,076,576 |
| SUV | [Charcoal five-door crossover SUV](https://www.innerscene.com/tools/library/3d-parts/charcoal-five-door-crossover-suv-a1996830) | Innerscene | CC0-1.0 | 55,072 / 17,246 / 4,895 | 1,079,688 |
| SPORTS | [Generic 1990s Japanese-style sports coupe](https://www.innerscene.com/tools/library/3d-parts/generic-1990s-japanese-style-sports-coupe-ace64592) | Innerscene | CC0-1.0 | 42,867 / 14,711 / 4,804 | 807,780 |
| VAN | [High-roof cargo panel van](https://www.innerscene.com/tools/library/3d-parts/high-roof-cargo-panel-van-c4d5145f) | Innerscene | CC0-1.0 | 60,580 / 17,604 / 5,901 | 1,201,176 |
| TRUCK | [Semi tractor and box trailer](https://www.innerscene.com/tools/library/3d-parts/semi-tractor-and-box-trailer-bc0bdac8) | Innerscene | CC0-1.0 | 31,260 / 5,730 / 1,674 | 360,964 |

## Adaptations

The original body, glass, lamp, wheel and trim geometry is retained. Preparation centers each vehicle on the road and orients it to +Z. Original tire/rim/rotor parts are grouped around measured axle pivots; calipers remain attached to the chassis. Static geometry is merged by material. Source PNGs and UVs are retained at up to 256 px in the close LOD; distant LODs use baked mean colors and reduced geometry. All tiers use Meshopt compression. The semi's supplied landing gear is raised for travel, and amber markers keep their own material. Runtime paint, glass and lamp materials are adjusted for the game lighting. No procedural vehicle body is substituted.

## Pinned original downloads

### SEDAN — Graphite four-door sedan

Source page: https://www.innerscene.com/tools/library/3d-parts/graphite-four-door-sedan-eed96d12

Original download: https://www.innerscene.com/api/library/graphite-four-door-sedan-eed96d12/download

Original file SHA-256: `feb0be31d153ddb42dc15ae52a651e214e85ab67e31bec4282b00f9d47c9b597`

Runtime files: `models/traffic/sedan-lod0.glb`, `models/traffic/sedan-lod1.glb`, `models/traffic/sedan-lod2.glb`

### SUV — Charcoal five-door crossover SUV

Source page: https://www.innerscene.com/tools/library/3d-parts/charcoal-five-door-crossover-suv-a1996830

Original download: https://www.innerscene.com/api/library/charcoal-five-door-crossover-suv-a1996830/download

Original file SHA-256: `4c64856d9de12cf713f59e4f5a0a5a1ec49baa3d5c8e0bc6ceb1dfedb7620db4`

Runtime files: `models/traffic/suv-lod0.glb`, `models/traffic/suv-lod1.glb`, `models/traffic/suv-lod2.glb`

### SPORTS — Generic 1990s Japanese-style sports coupe

Source page: https://www.innerscene.com/tools/library/3d-parts/generic-1990s-japanese-style-sports-coupe-ace64592

Original download: https://www.innerscene.com/api/library/generic-1990s-japanese-style-sports-coupe-ace64592/download

Original file SHA-256: `252adf57839e5ad90fd8281455ff366da9e12b0008ae8bf9f316c0728357c25b`

Runtime files: `models/traffic/sports-lod0.glb`, `models/traffic/sports-lod1.glb`, `models/traffic/sports-lod2.glb`

### VAN — High-roof cargo panel van

Source page: https://www.innerscene.com/tools/library/3d-parts/high-roof-cargo-panel-van-c4d5145f

Original download: https://www.innerscene.com/api/library/high-roof-cargo-panel-van-c4d5145f/download

Original file SHA-256: `b0d26a40bdb39c67224259213faafef71f9396c0ba658a1bb68cc1626a34ef36`

Runtime files: `models/traffic/van-lod0.glb`, `models/traffic/van-lod1.glb`, `models/traffic/van-lod2.glb`

### TRUCK — Semi tractor and box trailer

Source page: https://www.innerscene.com/tools/library/3d-parts/semi-tractor-and-box-trailer-bc0bdac8

Original download: https://www.innerscene.com/api/library/semi-tractor-and-box-trailer-bc0bdac8/download

Original file SHA-256: `256082a01b127e469adc932084374fd5fafa46b060facace978010a74c2bc67f`

Runtime files: `models/traffic/truck-lod0.glb`, `models/traffic/truck-lod1.glb`, `models/traffic/truck-lod2.glb`

## Rebuilding

Run `node scripts/fetch-traffic-assets.mjs` to download the pinned originals, or reuse the existing ignored .asset-sources/traffic folder. Download hashes must match the manifest.

Run `node scripts/build-traffic-assets.mjs <toolchain-node_modules-path>` using a toolchain containing @gltf-transform/core, functions and extensions 4.5.1, meshoptimizer 1.2.0 and Sharp. The renderer needs no added npm dependencies.

The developer checkout retains the source pages under .asset-sources/traffic. Public runtime provenance is also recorded in models/traffic/manifest.json. No account, paid download or external CDN is needed during play.

CC0 does not require attribution; creator and source links are provided for transparency.
