# V2.1 — Design & Technical Specification

## Overview
Maze Tile Generator v2.1 extends v2 with a **full-featured tile editor** allowing manual maze construction and individual tile export in PNG/SVG formats, while maintaining backward compatibility with the procedural generator.

## Architecture Layers

### Layer 1: Topology & Connectivity
- **Graph Generation**: Randomized Kruskal's algorithm produces a connected spanning tree
- **Connectivity Rules**: N/E/S/W sockets (binary 4-bit masks: N=1, E=2, S=4, W=8)
- **Validation**: Adjacent tiles must have matching socket pairs (N↔S, E↔W)
- **Pinning System**: Individual tiles can be locked during regeneration to preserve manual edits

### Layer 2: Visual Rendering
- **Tile Rendering**: Canvas-based rendering with theme-agnostic geometry
- **Socket Visualization**: Floor corridors follow N/E/S/W connections
- **Decoration**: Procedural placement constrained to safe zones (8px from corridor edges)
- **Theme Swapping**: Colors and motifs change without affecting connectivity

### Layer 3: Editor State Management
- **Tile Selection**: Click-to-select individual tiles in Editor mode
- **Socket Toggles**: Interactive N/E/S/W buttons to open/close corridors
- **Color Overrides**: Per-tile floor/wall color customization
- **Pin/Lock**: Mark tiles as immutable during regeneration

### Layer 4: History & Undo/Redo
- **History Stack**: Every edit saves complete grid state + metadata
- **Atomic Operations**: Socket changes, color edits, and pins are batched into single history entries
- **Undo/Redo**: Full rollback capability without data loss

## Tile Socket Contract
```
Tile mask = N (1) | E (2) | S (4) | W (8)

Examples:
  15 (1111) = NESW = four-way junction
  5  (0101) = NS   = north-south corridor
  3  (0011) = NE   = corner: north + east
  0  (0000) = wall = no connections
```

## Theme Schema (unchanged from v2)
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

## Editor Features (NEW in v2.1)

### 1. Tile Editor Mode
- **Toggle**: Switch between "Generator" and "Editor" modes via sidebar buttons
- **Selection**: Click any tile to select and edit
- **Visual Feedback**: 
  - Selected tile highlighted in cyan
  - Pinned tiles have yellow border
  - Real-time preview during edits

### 2. Socket Editing
```
Grid Layout (3×3):
  ·  N  ·
  W  ·  E
  ·  S  ·
```
- Click N/E/S/W buttons to toggle corridor connections
- Visual toggle: button border changes from gray to green when open
- Changes apply immediately to canvas preview

### 3. Color Customization
- **Floor Color**: Color picker for walkable area
- **Wall Color**: Color picker for wall/obstruction
- Overrides stored per-tile, stored in history
- Reset to theme default by selecting theme color

### 4. Pin/Lock System
- **Purpose**: Lock tiles during regeneration to preserve manual edits
- **UI**: Checkbox "Зафиксировать тайл"
- **Behavior**: Pinned tiles maintain their mask when generating new maze
- **Visual**: Yellow border on canvas indicates pinned status
- **Export**: Pinned set serialized in JSON project files

### 5. Individual Tile Export
- **PNG Export**: High-quality raster export at configured tile size
- **SVG Export**: Vector export preserving tile geometry
- **Naming**: `tile_<index>_<theme>.{png|svg}`
- **Use Case**: Extract tiles for use in game engines, tile editors, or asset libraries

### 6. History & Undo/Redo
- **History Stack**: Linked list of complete grid snapshots
- **Atomic Commits**: Each edit (socket toggle, color, pin) counts as one history entry
- **Buttons**: Undo/Redo in sidebar with enabled/disabled states
- **Persistence**: History cleared on new project, preserved during single session
- **Limit**: No hard limit, but performance degrades >100 edits (optimize later)

## Export Formats (ENHANCED in v2.1)

### PNG Maze Export
- Full maze grid at specified tile size (128/192/256/384px)
- Named: `maze_<theme>_<seed>.png`

### PNG Single Tile
- Individual tile at configured size
- Named: `tile_<index>_<theme>.png`
- Canvas-based rendering, full decoration

### SVG Single Tile (NEW)
- Vector format preserving tile geometry
- Paths for floor (walkable areas) + walls
- Named: `tile_<index>_<theme>.svg`
- Advantage: Scalable, editable in Inkscape/Illustrator

### Sprite Sheet
- 5×6 grid (15 forms × 4 variants per form)
- Size: 5×tileSize × 6×tileSize
- Named: `spritesheet_<theme>.png`

### JSON Topology
- Grid masks + metadata
- **NEW**: Includes pinned set + color overrides
- Named: `maze_<theme>_<seed>.json`
```json
{
  "version": "2.1",
  "theme": "temple",
  "seed": "481729",
  "gridSize": 16,
  "tileSize": 192,
  "masks": [0, 1, 5, 12, ...],
  "pinned": [0, 5, 10],
  "overrides": [[3, {"floor": "#ff00ff", "wall": "#00ff00"}], ...]
}
```

### Project File
- Complete session state including editor history
- Named: `project_<timestamp>.json`
- **NEW fields**:
  - `pinned`: Array of pinned tile indices
  - `overrides`: Array of [index, {floor, wall}] pairs
  - Preserves all Editor changes

## Validation (unchanged from v2)
- **Stitch Validation**: All adjacent tiles have matching sockets
- **Connectivity**: All tiles must be reachable from tile 0
- **Output**: Green checkmark if valid, error summary if not

## Technical Implementation Details

### State Structure
```javascript
{
  theme: "temple",           // Current theme
  grid: [0,1,5,12,...],      // Tile masks (n*n array)
  meta: {...},               // Generation metadata
  zoom: 1.0,                 // Viewport zoom
  
  mode: "gen|edit",          // Current mode
  selectedTile: 42,          // Currently selected tile index (or null)
  pinnedTiles: Set<number>,  // Tile indices that are locked
  tileOverrides: Map<number, {floor, wall}>, // Color overrides per tile
  
  editHistory: [...],        // Stack of complete snapshots
  historyIndex: 0            // Current position in history
}
```

### Canvas Rendering Pipeline
```
render() {
  1. Fill background with theme.dark
  2. For each tile in grid:
     a. Get base mask from grid[i]
     b. Look up color overrides from tileOverrides
     c. Call tile(canvas, x, y, size, mask, theme, seed, details, overrides)
     d. Draw border (yellow if pinned, cyan if selected)
  3. Apply zoom to canvas element dimensions
  4. Validate connectivity
}
```

### History Management
```javascript
saveHistory() {
  // Snapshot current state and add to stack
  editHistory = editHistory.slice(0, historyIndex+1)  // Discard redo stack
  editHistory.push({grid, pinned, overrides})
  historyIndex++
}

undo() {
  historyIndex--
  restore(editHistory[historyIndex])
  render()
}

redo() {
  historyIndex++
  restore(editHistory[historyIndex])
  render()
}
```

## Roadmap: Future Phases

### Phase 2.2: Constraint Propagation
- Wave Function Collapse (WFC) for auto-fill
- Constraint solver for socket compatibility
- "Fill region" operation with automatic connectivity

### Phase 2.5: Advanced Export
- Asset slot mapping (PNG/SVG/WebP per socket type)
- Edge masks for texture blending
- Autotiling support
- Atlas packing optimization

### Phase 3.0: Production Pipeline
- Batch generation and export
- Deterministic seed management
- PBR texture import (normal maps, roughness)
- GPU-accelerated 3D preview
- Unity/Unreal direct export
- Performance optimizations for large grids (50×50+)

## Performance Notes
- **Current Limits**: 24×24 grid at 384px tiles runs smoothly on modern hardware
- **Bottleneck**: Canvas rendering at high zoom; consider tile caching for 32×32+
- **History Stack**: Each entry stores full grid copy (~50KB per 16×16 grid); consider delta encoding after 20+ entries
- **Decoration**: Procedural placement is O(1) per tile; no rendering bottleneck

## Backward Compatibility
- v2.1 reads v2 JSON files (ignores new fields)
- v2.1 PNG exports compatible with v2 sprite systems
- Generator mode unchanged; Editor is purely additive feature
- All v2 themes work without modification

## Notes for Developers
- Canvas rendering uses `roundRect()` (requires modern browsers)
- RNG uses FNV-1a hash + PCG for deterministic seeding
- Decoration objects are not serialized; regenerated from seed on load
- Socket toggles use bitwise operations for compact storage
- Color picker exports as hex; convert to RGB if needed for other formats
