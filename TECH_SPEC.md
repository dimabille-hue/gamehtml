# V2 — Design & Technical Specification

## Tile contract
Each tile is square and exposes four binary edge sockets:
- N = 1
- E = 2
- S = 4
- W = 8

Two neighboring tiles are compatible iff the corresponding sockets are equal.

## Topology
Randomized Kruskal produces a spanning tree, therefore all cells are connected. Optional extra edges create loops.

## Visual contract
The walkable corridor is constructed from the same normalized geometry for every theme. Theme changes only:
- materials/colors
- decorative motifs
- surface noise
- accent lighting

Therefore theme swapping cannot change connectivity.

## Theme schema
```json
{
  "id": "temple",
  "name": "Древний храм",
  "palette": {
    "floor": "#d8c99d",
    "floor2": "#b5a576",
    "wall": "#53634b",
    "wall2": "#202f29",
    "accent": "#e6a633",
    "detail": "#71864e",
    "dark": "#131d19"
  },
  "rules": {
    "walkableWidth": 0.76,
    "decorationSafeMargin": 8,
    "variants": 4
  }
}
```

## Roadmap to production
### v2.1
- ручной tile editor;
- ручное редактирование N/E/S/W;
- pin/lock для отдельных клеток;
- weight для типов тайлов;
- WFC/constraint propagation.

### v2.5
- asset slots для PNG/SVG/WebP;
- edge masks;
- autotiling;
- atlas packing;
- object sockets;
- rarity and biome transitions.

### v3
- импорт PBR textures;
- normal/roughness/height;
- GPU preview;
- 3D preview;
- Unity/Unreal export;
- batch generation;
- deterministic build pipeline.
