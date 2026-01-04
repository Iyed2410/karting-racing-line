# Karting Racing Line Optimizer - Technical Documentation

## Architecture Overview

The application follows a **modular, layered architecture**:

```
┌─────────────────────────────────────────┐
│         index.html / UI Layer           │
├─────────────────────────────────────────┤
│         script.js / Controller          │
├─────────────────────────────────────────┤
│  ┌──────────────────────────────────┐   │
│  │    Utility Modules (./utils/)    │   │
│  ├──────────────────────────────────┤   │
│  │ • geometry.js (Math & Points)    │   │
│  │ • physics.js (Speed & Grip)      │   │
│  │ • racingLine.js (Optimization)   │   │
│  │ • uiHelpers.js (Canvas & Input)  │   │
│  └──────────────────────────────────┘   │
├─────────────────────────────────────────┤
│      HTML5 Canvas / DOM APIs            │
├─────────────────────────────────────────┤
│         Browser Runtime (V8/SpiderMonkey)│
└─────────────────────────────────────────┘
```

## Module Responsibilities

### geometry.js
**Pure mathematics for track geometry**

```
Functions:
├── Point Operations
│   ├── distance(p1, p2) → number
│   ├── heading(p1, p2) → radians
│   └── lerp(p1, p2, t) → {x, y}
├── Angle & Curvature
│   ├── angle(p1, p2, p3) → radians
│   ├── curvature(p1, p2, p3) → 1/radius
│   └── radiusOfCurvature(...) → meters
├── Path Operations
│   ├── interpolate(points, res) → smoother array
│   └── trackLength(points) → meters
├── Track Validation
│   ├── trackSelfIntersects(points) → boolean
│   ├── segmentsIntersect(...) → boolean
│   └── pointInPolygon(point, polygon) → boolean
└── Geometry Utilities
    ├── perpendicularOffset(point, dir, dist)
    └── (add more as needed)

Key Algorithm: Catmull-Rom Spline Interpolation
- Smooth curves through multiple points
- C² continuity (smooth derivatives)
- No overshoot behavior
```

### physics.js
**Tire grip and kart dynamics**

```
Class: KartPhysics
├── Properties (Configurable)
│   ├── gripCoefficient: 0.6-1.5
│   ├── weightKg: typical 180
│   ├── maxAcceleration: 5-15 m/s²
│   ├── maxBraking: 5-15 m/s²
│   └── maxDrivingSpeed: 60-100 km/h
│
├── Core Methods
│   ├── maxCornerSpeed(radius) → m/s
│   │   └── Formula: √(μ × g × r)
│   │
│   ├── computeSpeedProfile(segments) → [speeds]
│   │   ├── Forward pass: acceleration limits
│   │   ├── Backward pass: braking limits
│   │   └── Returns: speed per segment
│   │
│   ├── brakingDistance(v1, v2) → meters
│   │   └── Formula: (v₂² - v₁²) / (2a)
│   │
│   ├── accelerationDistance(v1, v2) → meters
│   │
│   ├── lateralGForce(speed, radius) → g-force
│   │
│   └── estimateLapTime(segments) → seconds
│       └── Σ(length[i] / speed[i])
│
└── Setters
    ├── setGripCoefficient(newGrip)
    └── updateParameters(params)

Key Insight: Two-pass speed profile ensures both:
- Acceleration available (forward pass)
- Braking distance available (backward pass)
```

### racingLine.js
**Optimization algorithms for lap time minimization**

```
Function: initialHeuristicLine(centerline) → [points]
├── Algorithm: Apex-hunting heuristic
├── Process:
│   ├── For each point, calculate turn sharpness
│   ├── Offset in direction of apex
│   ├── Magnitude proportional to turn tightness
│   └── Smooth interpolation between offsets
└── Time Complexity: O(n)

Function: optimizeLine(line, trackData, iterations) → [points]
├── Algorithm: Iterative gradient descent
├── Per-iteration process:
│   ├── Calculate current lap time
│   ├── For each point (except endpoints):
│   │   ├── Try 8 directional moves (small steps)
│   │   ├── Calculate lap time improvement
│   │   └── Keep best improvement
│   ├── Apply all improvements simultaneously
│   └── Check convergence (Δt < 0.001s)
├── Constraints:
│   ├── Stay within track boundaries
│   ├── Respect physics limits
│   └── No self-intersection
├── Time Complexity: O(iterations × n × 8)
└── Typical Runtime: 1-2 seconds (30 iterations)

Function: smoothLine(line, iterations) → [points]
├── Algorithm: Laplacian smoothing
├── Per-iteration:
│   ├── For each internal point:
│   │   └── new_pos = (prev + curr + next) / 3
│   ├── Keep endpoints fixed
│   └── No change after convergence
├── Time Complexity: O(iterations × n)
└── Purpose: Driver comfort, smooth acceleration

Function: findApexes(line) → [indices]
├── Algorithm: Local minimum radius detection
├── Process:
│   ├── For each point, calculate radius
│   ├── Mark if radius < threshold (50m)
│   └── Return indices of apexes
└── Used for: Visualization, analysis

Function: validateRacingLine(line, trackData) → {valid, errors[]}
├── Checks:
│   ├── Minimum length (≥2 points)
│   ├── All points within track bounds
│   ├── No self-intersections
│   └── Speed constraints satisfied
└── Returns: Validation object with error list
```

### uiHelpers.js
**Canvas rendering and event handling**

```
Class: CanvasManager
├── Constructor Setup
│   ├── Canvas element and 2D context
│   ├── High-DPI support (retina scaling)
│   ├── Transform state (scale, pan)
│   └── Drawing state (mode, points)
│
├── Event Handlers
│   ├── Mouse Events
│   │   ├── mousedown → start drawing/panning
│   │   ├── mousemove → draw or pan
│   │   ├── mouseup → end action
│   │   └── wheel → zoom
│   │
│   ├── Touch Events (Mobile)
│   │   ├── touchstart → 1-finger draw / 2-finger pan
│   │   ├── touchmove → draw/pan with multi-touch
│   │   └── touchend → end action
│   │
│   └── Event Helpers
│       ├── getCanvasCoords(e) → {x, y} world coords
│       ├── addTrackPoint(x, y) → append to list
│       └── setupHighDPI() → retina scaling
│
├── Rendering Pipeline
│   ├── render() → main render loop
│   │   ├── Clear canvas (white background)
│   │   ├── Apply transforms (pan, scale)
│   │   ├── drawGrid() → background reference
│   │   ├── drawTrack() → track centerline
│   │   ├── drawRacingLine() → optimized path
│   │   ├── drawApexPoints() → tight corners (optional)
│   │   └── drawSpeedHeatmap() → speed gradient (optional)
│   │
│   └── Draw Functions
│       ├── drawTrack(points) → gray centerline + points
│       ├── drawRacingLine(points) → color by speed
│       ├── drawApexPoints(points) → orange dots
│       ├── drawSpeedHeatmap(points) → speed circles
│       └── drawGrid() → light gray background
│
├── History Management (Undo/Redo)
│   ├── saveToHistory() → append state
│   ├── restoreFromHistory() → load state
│   ├── undo() → go back
│   ├── redo() → go forward
│   └── history[] → array of saved states (max 50)
│
├── File I/O
│   ├── saveTrackJSON() → {trackPoints, racingLine, timestamp}
│   └── loadTrackJSON(data) → restore state
│
└── State Variables
    ├── trackPoints: [] → user-drawn points
    ├── racingLine: [] → optimized line
    ├── showApexes: boolean
    ├── showSpeedHeat: boolean
    ├── scale: number (zoom level)
    ├── panX, panY: number (viewport offset)
    └── history: [] → undo/redo stack

High-DPI Implementation:
- Detect devicePixelRatio (1x, 2x, 3x)
- Scale canvas resolution up
- Scale drawing context back down
- Maintains sharp text and lines on retina
```

### script.js
**Application controller and orchestration**

```
Initialization Flow:
1. DOMContentLoaded event fires
2. Create CanvasManager instance
3. Set up all event listeners
4. Initial render
5. Ready for user interaction

Key Functions:

generateRacingLine()
├── Validate track (≥3 points)
├── processTrack() → calculate geometry
├── calculateSegmentSpeeds() → apply physics
├── initialHeuristicLine() → first guess
├── optimizeLine() → improve for 30 iterations
├── smoothLine() → driver-friendly curves
├── validateRacingLine() → check constraints
└── updateUI() → refresh display

processTrack()
├── Validate track isn't self-intersecting
├── Calculate total track length
├── Build segments array with:
│   ├── start/end points
│   ├── length
│   ├── radius of curvature
│   ├── max speed (from physics)
│   └── other metadata

calculateSegmentSpeeds()
├── For each segment:
│   └── maxSpeed = kart.maxCornerSpeed(radius)

updateUI()
├── Update point count display
├── Update track length display
├── Calculate and display lap time
├── Reflects current state

showMessage(text, type)
├── Create temporary notification
├── Color: error (red), success (green), info (orange)
├── Auto-dismiss after 3 seconds
└── Slide animation
```

## Data Structures

### Track Point Object
```javascript
{
  x: number,      // Canvas X coordinate
  y: number       // Canvas Y coordinate
}
```

### Track Segment Object
```javascript
{
  startPoint: {x, y},
  endPoint: {x, y},
  length: number,         // meters
  radius: number,         // meters (Infinity = straight)
  curvature: number,      // 1/radius
  speed: number           // m/s max speed
}
```

### Track Data Object
```javascript
{
  points: [{x, y}, ...],
  length: number,
  boundaries: null,  // optional
  segments: [segment, ...],
  trackWidth: number  // meters
}
```

### Canvas Manager State
```javascript
{
  trackPoints: [{x, y}, ...],
  racingLine: [{x, y}, ...] | null,
  showApexes: boolean,
  showSpeedHeat: boolean,
  scale: number,
  panX: number,
  panY: number,
  history: [state, ...],
  historyIndex: number
}
```

## Algorithm Complexity Analysis

| Operation | Complexity | Typical Time |
|-----------|-----------|--------------|
| Draw point | O(1) | <1ms |
| Interpolate track (res=5) | O(n × res) | 10ms (100 pts) |
| Calculate curvature | O(n) | 5ms (100 pts) |
| Initial heuristic | O(n) | 2ms (100 pts) |
| Optimize (30 iter) | O(30 × n × 8) | 1500ms (100 pts) |
| Smooth (3 iter) | O(3 × n) | 5ms (100 pts) |
| Validate | O(n²) worst | 50ms (100 pts) |
| **Total optimization** | | **1-2 seconds** |

## Performance Optimization Techniques

1. **Canvas Rendering**
   - RequestAnimationFrame for 60 FPS
   - Single render per input event (not per pixel)
   - Transform matrix instead of redrawing points
   - Off-screen rendering optimization available

2. **Geometry Calculations**
   - Pre-calculate curvature (not in loop)
   - Cache radius of curvature results
   - Vectorized operations where possible

3. **Event Handling**
   - Debounce touch events (minimum distance check)
   - Separate drawing from rendering
   - Touch-action: none for performance

4. **Memory Management**
   - Limit undo history to 50 items
   - Reuse arrays instead of creating new ones
   - Garbage collection friendly code

## Browser APIs Used

| API | Purpose | Fallback |
|-----|---------|----------|
| Canvas 2D | Drawing | Required |
| Touch Events | Mobile input | Mouse events |
| FileReader API | Load JSON | None |
| Blob API | Save JSON | Copy to clipboard |
| devicePixelRatio | Retina display | 1x scaling |
| requestAnimationFrame | Smooth rendering | setTimeout |

## Testing Checklist

### Functional Tests
- [ ] Draw track on desktop (mouse)
- [ ] Draw track on mobile (touch)
- [ ] Zoom canvas (scroll/pinch)
- [ ] Pan canvas (drag/2-finger)
- [ ] Undo/redo operations
- [ ] Clear track
- [ ] Save track to JSON
- [ ] Load track from JSON
- [ ] Generate racing line
- [ ] Toggle apex display
- [ ] Toggle speed heatmap
- [ ] Adjust physics parameters

### Physics Tests
- [ ] Speed increases with grip coefficient
- [ ] Tight curves show red (slow)
- [ ] Straights show green (fast)
- [ ] Lap time updates on parameter change
- [ ] Braking distance calculation correct

### UI Tests
- [ ] Responsive on 320px width
- [ ] Responsive on 1920px width
- [ ] Touch targets ≥44px
- [ ] Button states (hover, active, disabled)
- [ ] Scrolling on mobile
- [ ] Portrait/landscape orientation

### Edge Cases
- [ ] Track with 2 points (should be rejected)
- [ ] Extreme physics values (0.1 to 10 grip)
- [ ] Very tight corners (radius <1m)
- [ ] Very long tracks (1000+ points)
- [ ] Self-intersecting track (warning)
- [ ] Track not closed (should still work)

### Performance Tests
- [ ] Smooth 60 FPS drawing
- [ ] <2s optimization time (30 iterations)
- [ ] <100ms for UI update
- [ ] Memory <10MB typical
- [ ] Smooth zoom/pan

## Code Style Guidelines

```javascript
// Function documentation (JSDoc style)
/**
 * Brief description
 * @param {type} name - Description
 * @returns {type} Description
 */
function myFunction(param1, param2) {
  // Implementation with clear comments
}

// Variable naming
const CONSTANTS_USE_UPPER_CASE = 100;
let mutableVariablesUseLowerCase = 0;
const { x, y } = pointObject; // Destructuring

// Comments explain WHY, not WHAT
// BAD: sum = sum + item  (obvious)
// GOOD: sum += item  // Accumulate for average calculation

// Consistent formatting
// - 2-space indentation
// - No trailing semicolons (but optional)
// - Prefer const > let > var
// - Single quotes for strings
```

## Future Enhancement Ideas

1. **3D Visualization**: WebGL rendering of track profile
2. **Telemetry**: Record and replay simulated lap
3. **AI Driver**: Genetic algorithm for line optimization
4. **Weather Effects**: Tire grip degradation model
5. **Track Import**: Load image and trace points
6. **Multiplayer**: Compare lines via WebSocket
7. **Advanced Physics**: Tire temperature, fuel weight
8. **Export Video**: Record optimization process

## Debugging Tips

### Console Logging
```javascript
console.log('State:', canvasManager.trackPoints);
console.log('Lap time:', calculateLapTime(canvasManager.racingLine, trackData));
console.log('Validation:', validateRacingLine(canvasManager.racingLine, trackData));
```

### Browser DevTools
- **Elements**: Inspect canvas and DOM
- **Console**: Run JS directly
- **Debugger**: Set breakpoints in script.js
- **Performance**: Profile optimization function
- **Network**: Monitor file loading

### Common Bugs & Fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Racing line not showing | racingLine is null | Generate it first |
| Lap time wrong | Speed calculation error | Check physics model |
| Track zooms wrong | Pan/scale math inverted | Check transform matrices |
| Touch not working | Event not prevented | Add preventDefault() |
| Slow on mobile | Too many points | Reduce interpolation |

---

**Document Version**: 1.0  
**Last Updated**: January 4, 2026  
**Maintainers**: Development Team
