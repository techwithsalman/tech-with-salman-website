# Highway Racer 3D — third-party asset attribution

All runtime assets are local. No third-party asset hosts are contacted during gameplay.

## Ferrari 458 Italia

- Creator: **vicent091036**.
- License: **Creative Commons Attribution 4.0 International (CC BY 4.0)**.
- Original model: https://sketchfab.com/models/57bf6cc56931426e87494f554df1dab6
- Distributed source (pinned Three.js release r170): https://raw.githubusercontent.com/mrdoob/three.js/r170/examples/models/gltf/ferrari.glb
- Author attribution in the distributor's example: https://github.com/mrdoob/three.js/blob/r170/examples/webgl_materials_car.html
- Distributor's asset license inventory identifies ferrari.glb as CC BY 4.0: https://github.com/mrdoob/three.js/issues/23089
- License terms: https://creativecommons.org/licenses/by/4.0/
- Local file: models/ferrari-458.glb (original download, unchanged).
- Runtime adaptations: normalized length 4.527 m, facing +Z, revised paint/glass/rim/light materials, separately pivoted wheels, steering-wheel animation and cockpit camera.

The original Sketchfab URL currently returns an unavailable/not-found response; attribution and license evidence are retained through the pinned distributor example and its public license inventory. The model's license is separate from the Three.js code license. Brand names and badges belong to their respective owners; no endorsement is implied.

## Poly Haven environment content — CC0 1.0

- **Asphalt 02**: https://polyhaven.com/a/asphalt_02 — Rob Tuytel.
  Local 1K diffuse, OpenGL normal, and roughness JPEGs, unchanged.
- **Pine Sapling Small**: https://polyhaven.com/a/pine_sapling_small
  Local pines.glb. Three variants retained; meshes simplified to approximately 12%, maps resized to 512 px, geometry compressed with Meshopt.
- **Shrub 01**: https://polyhaven.com/a/shrub_01
  Local shrub.glb. Mesh simplified to approximately 8%, maps resized to 512 px, geometry compressed with Meshopt.
- **Kloofendal 48d Partly Cloudy (Pure Sky)**:
  https://polyhaven.com/a/kloofendal_48d_partly_cloudy_puresky
  Local daylight.hdr, 1K HDR map, unchanged.
- Poly Haven license: https://polyhaven.com/license
- CC0 legal terms: https://creativecommons.org/publicdomain/zero/1.0/

Original download metadata (including source URLs and MD5 hashes) is saved in the development review folder. These CC0 assets allow redistribution and adaptation.

## Libraries

- Three.js 0.170.x and its bundled Meshopt decoder: MIT.
  https://github.com/mrdoob/three.js/blob/r170/LICENSE
  See THREE-LICENSE.txt.
- Draco decoder files copied from the installed Three.js package:
  Apache License 2.0. https://github.com/google/draco/blob/main/LICENSE
  See DRACO-LICENSE.txt.

Architecture, lane markings, barriers, streetlights and sign artwork are created in code for this project. They are procedural modeled scenery, not purchased or scanned architecture.


## AI traffic fleet

Five original CC0 vehicle models by Innerscene: sedan, SUV, sports coupe, cargo van and semi tractor with box trailer. Full source links, hashes, attribution and modifications are in [TRAFFIC-ASSETS.md](TRAFFIC-ASSETS.md) and models/traffic/manifest.json. License text: CC0-1.0.txt.
