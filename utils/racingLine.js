/**
 * Racing Line Optimization Algorithm
 * Finds the optimal path through a track to minimize lap time
 */

/**
 * Generate initial heuristic racing line
 * Uses the classic "outside-apex-outside" driving technique
 * 
 * @param {Array} centerline - Array of centerline points {x, y}
 * @returns {Array} Initial racing line points
 */
function initialHeuristicLine(centerline) {
  if (!centerline || centerline.length < 3) return centerline;
  
  const racingLine = [];
  const trackWidth = 3; // Half-width for offset (meters on track)
  
  for (let i = 0; i < centerline.length; i++) {
    const p1 = centerline[Math.max(0, i - 1)];
    const p2 = centerline[i];
    const p3 = centerline[Math.min(centerline.length - 1, i + 1)];
    
    // Calculate the turn direction and sharpness
    const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
    const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
    
    // Cross product to determine turn direction (left vs right)
    const cross = v1.x * v2.y - v1.y * v2.x;
    
    // Calculate angle between vectors
    const angleRad = Math.atan2(cross, v1.x * v2.x + v1.y * v2.y);
    
    // Offset direction based on turn sharpness
    // Tighter turns = more offset toward apex
    const offsetAmount = Math.sin(Math.abs(angleRad) / 2) * trackWidth;
    
    // Get perpendicular direction
    const dir = { x: -v2.y, y: v2.x };
    const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y);
    if (len > 0) {
      dir.x /= len;
      dir.y /= len;
    }
    
    // Apply offset (direction depends on turn direction)
    const sign = cross > 0 ? 1 : -1;
    const offsetPoint = {
      x: p2.x + dir.x * offsetAmount * sign,
      y: p2.y + dir.y * offsetAmount * sign
    };
    
    racingLine.push(offsetPoint);
  }
  
  return racingLine;
}

/**
 * Optimize racing line using iterative gradient descent
 * Adjusts line position to minimize lap time while respecting constraints
 * 
 * @param {Array} racingLine - Current racing line points
 * @param {Object} trackData - Track geometry data
 * @param {number} iterations - Number of optimization iterations
 * @returns {Array} Optimized racing line
 */
function optimizeLine(racingLine, trackData, iterations = 120) {
  // Constrained simulated-annealing optimizer with smoothness and dynamics-aware scoring
  if (!racingLine || racingLine.length < 3) return racingLine;

  const clone = (arr) => JSON.parse(JSON.stringify(arr));
  let best = clone(racingLine);
  let bestScore = scoreLine(best, trackData);

  const iters = Math.max(40, iterations);
  const t0 = 1.0;
  const tEnd = 1e-4;

  // keep endpoints fixed for stability
  const fixedStart = 0;
  const fixedEnd = best.length - 1;

  for (let k = 0; k < iters; k++) {
    const t = t0 * Math.pow(tEnd / t0, k / Math.max(1, iters - 1));

    const candidate = clone(best);

    // Propose perturbations: choose a handful of indices (not endpoints)
    const nPerturb = 1 + Math.floor(3 * t * Math.random());
    for (let p = 0; p < nPerturb; p++) {
      const i = 1 + Math.floor(Math.random() * (candidate.length - 2));
      if (i <= fixedStart || i >= fixedEnd) continue;

      // compute local scale from neighbor distances
      const a = candidate[Math.max(0, i - 1)];
      const b = candidate[i];
      const c = candidate[Math.min(candidate.length - 1, i + 1)];
      const segLen = Math.max(1e-3, (distance(a, b) + distance(b, c)) / 2);

      // perturb along normal and tangent with small magnitude scaled by temperature
      const tx = c.x - a.x;
      const ty = c.y - a.y;
      const tlen = Math.hypot(tx, ty) || 1;
      const nx = -ty / tlen;
      const ny = tx / tlen;

      const mag = segLen * (0.1 + 4 * t); // step magnitude
      const dx = (Math.random() - 0.5) * mag;
      const dy = (Math.random() - 0.5) * (mag * 0.5);

      // combine tangent and normal moves
      const prop = {
        x: b.x + tx / tlen * dx + nx * dy,
        y: b.y + ty / tlen * dx + ny * dy
      };

      // enforce bounds and small step
      if (!isPointInTrackBounds(prop, trackData)) continue;
      if (Math.hypot(prop.x - b.x, prop.y - b.y) > segLen * 2) continue;

      candidate[i] = prop;
    }

    // local smoothing step (light) to promote continuity
    const smoothCandidate = smoothLocal(candidate, 1);

    const score = scoreLine(smoothCandidate, trackData);
    const delta = score - bestScore;

    if (delta < 0 || Math.exp(-delta / Math.max(t, 1e-9)) > Math.random()) {
      best = smoothCandidate;
      bestScore = score;
    }
  }

  // final global smoothing pass to produce continuous driving line
  const finalLine = smoothLine(best, 3);
  return finalLine;
}

/**
 * Light smoothing applied to interior points only (keeps endpoints)
 */
function smoothLocal(line, iterations = 1) {
  const out = JSON.parse(JSON.stringify(line));
  const n = out.length;
  for (let it = 0; it < iterations; it++) {
    for (let i = 1; i < n - 1; i++) {
      const prev = out[i - 1];
      const cur = out[i];
      const next = out[i + 1];
      // simple centroid move weighted to keep shape
      out[i].x = (prev.x + cur.x * 2 + next.x) / 4;
      out[i].y = (prev.y + cur.y * 2 + next.y) / 4;
    }
  }
  return out;
}

/**
 * Smooth racing line for continuity and driver comfort
 * Applies a Laplacian smoothing filter
 * 
 * @param {Array} racingLine - Input racing line
 * @param {number} iterations - Smoothing iterations (more = smoother)
 * @returns {Array} Smoothed racing line
 */
function smoothLine(racingLine, iterations = 3) {
  // Use Catmull-Rom spline resampling to create a smooth, continuous path
  if (!racingLine || racingLine.length < 3) return racingLine;

  // Number of samples per segment (higher = smoother)
  const samplesPerSegment = 6 * Math.max(1, iterations);
  const out = [];

  // Helper for Catmull-Rom interpolation
  function catmullRom(p0, p1, p2, p3, t) {
    const t2 = t * t;
    const t3 = t2 * t;
    const x = 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * t + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * t2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * t3);
    const y = 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * t + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * t2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * t3);
    return { x, y };
  }

  // For closed tracks, wrap indices; otherwise clamp endpoints
  const closed = false; // maintain as open for user-drawn tracks
  const n = racingLine.length;

  for (let i = 0; i < n - 1; i++) {
    const p0 = i === 0 ? racingLine[i] : racingLine[i - 1];
    const p1 = racingLine[i];
    const p2 = racingLine[i + 1];
    const p3 = i + 2 < n ? racingLine[i + 2] : racingLine[i + 1];

    // sample along this segment
    for (let s = 0; s < samplesPerSegment; s++) {
      const t = s / samplesPerSegment;
      const pt = catmullRom(p0, p1, p2, p3, t);
      // avoid duplicates
      if (out.length === 0 || Math.hypot(out[out.length - 1].x - pt.x, out[out.length - 1].y - pt.y) > 0.1) {
        out.push(pt);
      }
    }
  }

  // add final point
  out.push(racingLine[racingLine.length - 1]);

  return out;
}

/**
 * Calculate lap time for a given racing line
 * Uses physics model to compute speed profile and total time
 * 
 * @param {Array} racingLine - Racing line points
 * @param {Object} trackData - Track information
 * @returns {number} Lap time in seconds
 */
function calculateLapTime(racingLine, trackData) {
  // Build segments and compute realistic speed profile using kart dynamics
  if (!racingLine || racingLine.length < 2) return Infinity;

  const segments = [];
  for (let i = 0; i < racingLine.length - 1; i++) {
    const p1 = racingLine[i];
    const p2 = racingLine[i + 1];
    const p3 = racingLine[Math.min(i + 2, racingLine.length - 1)];

    const segLength = distance(p1, p2);
    const radius = radiusOfCurvature(p1, p2, p3);
    const maxSpeed = kart.maxCornerSpeed(radius);

    segments.push({ length: segLength, maxSpeed: maxSpeed, radius: radius });
  }

  // If kart physics provides a speed profile, use it
  let speeds = [];
  try {
    speeds = kart.computeSpeedProfile(segments);
  } catch (e) {
    // fallback: use maxCornerSpeed per segment
    speeds = segments.map(s => s.maxSpeed || 0.1);
  }

  // assign computed speeds and estimate lap time
  for (let i = 0; i < segments.length; i++) segments[i].speed = speeds[i] || segments[i].maxSpeed || 0.1;
  return kart.estimateLapTime(segments);
}

/**
 * Score a candidate line: lap time + smoothness/deviation penalties
 */
function scoreLine(racingLine, trackData) {
  // Hard invalid checks
  if (!racingLine || racingLine.length < 2) return 1e9;
  if (trackSelfIntersects(racingLine)) return 1e9;

  for (let pt of racingLine) {
    if (!isPointInTrackBounds(pt, trackData)) return 1e9;
  }

  const lapTime = calculateLapTime(racingLine, trackData);

  // smoothness penalty: sum squared curvature (1/radius)
  let smoothPenalty = 0;
  for (let i = 0; i < racingLine.length - 2; i++) {
    const r = radiusOfCurvature(racingLine[i], racingLine[i + 1], racingLine[i + 2]);
    const inv = r === 0 || r === Infinity ? 0 : 1 / Math.max(1e-3, Math.abs(r));
    smoothPenalty += inv * inv;
  }

  // deviation penalty: encourage staying near center if provided
  let devPenalty = 0;
  if (trackData && trackData.centerline && trackData.centerline.length) {
    for (let pt of racingLine) {
      // nearest centerline distance (fast approximate)
      let best = Infinity;
      for (let c of trackData.centerline) {
        best = Math.min(best, distance(pt, c));
      }
      devPenalty += best * best;
    }
    devPenalty = devPenalty / racingLine.length;
  }

  const alpha = 0.15; // smoothness weight
  const beta = 0.001; // deviation weight

  return lapTime + alpha * smoothPenalty + beta * devPenalty;
}

/**
 * Check if a point is within track boundaries
 * @param {Object} point - Point to test {x, y}
 * @param {Object} trackData - Track boundary data
 * @returns {boolean} True if within bounds
 */
function isPointInTrackBounds(point, trackData) {
  if (!trackData || !trackData.boundaries) return true;
  
  // Simple bounding box check
  for (let boundary of trackData.boundaries) {
    if (pointInPolygon(point, boundary)) {
      return false; // Point is outside track
    }
  }
  
  return true;
}

/**
 * Generate apex points (turning points) along racing line
 * Apexes are local minimum radius points where turning is tightest
 * 
 * @param {Array} racingLine - Racing line points
 * @returns {Array} Apex point indices
 */
function findApexes(racingLine) {
  const apexes = [];
  
  if (racingLine.length < 3) return apexes;
  
  for (let i = 1; i < racingLine.length - 1; i++) {
    const p1 = racingLine[i - 1];
    const p2 = racingLine[i];
    const p3 = racingLine[i + 1];
    
    const radius = radiusOfCurvature(p1, p2, p3);
    
    // Apex is where radius is small (tight corner)
    if (radius < 50) { // Arbitrary threshold for "tight" corner
      apexes.push(i);
    }
  }
  
  return apexes;
}

/**
 * Validate racing line meets all constraints
 * @param {Array} racingLine - Racing line to validate
 * @param {Object} trackData - Track data with boundaries
 * @returns {Object} Validation result {valid: boolean, errors: []}
 */
function validateRacingLine(racingLine, trackData) {
  const errors = [];
  
  if (!racingLine || racingLine.length < 2) {
    errors.push("Racing line too short");
    return { valid: false, errors };
  }
  
  // Check all points within bounds
  for (let i = 0; i < racingLine.length; i++) {
    if (!isPointInTrackBounds(racingLine[i], trackData)) {
      errors.push(`Point ${i} outside track bounds`);
    }
  }
  
  // Check for self-intersections
  if (trackSelfIntersects(racingLine)) {
    errors.push("Racing line self-intersects");
  }
  
  return {
    valid: errors.length === 0,
    errors: errors
  };
}
