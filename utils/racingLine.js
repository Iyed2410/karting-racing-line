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
function optimizeLine(racingLine, trackData, iterations = 50) {
  if (!racingLine || racingLine.length < 3) return racingLine;
  
  let optimizedLine = JSON.parse(JSON.stringify(racingLine)); // Deep copy
  const learningRate = 0.1;
  
  for (let iter = 0; iter < iterations; iter++) {
    // Calculate current lap time
    const currentLapTime = calculateLapTime(optimizedLine, trackData);
    
    // Try small adjustments to each point
    for (let i = 1; i < optimizedLine.length - 1; i++) {
      const original = { x: optimizedLine[i].x, y: optimizedLine[i].y };
      
      let bestTime = currentLapTime;
      let bestDelta = { x: 0, y: 0 };
      
      // Try small movements in 8 directions
      const stepSize = 0.5;
      const directions = [
        { x: stepSize, y: 0 }, { x: -stepSize, y: 0 },
        { x: 0, y: stepSize }, { x: 0, y: -stepSize },
        { x: stepSize, y: stepSize }, { x: stepSize, y: -stepSize },
        { x: -stepSize, y: stepSize }, { x: -stepSize, y: -stepSize }
      ];
      
      for (let dir of directions) {
        // Apply constraint: stay within track boundaries
        const candidate = {
          x: original.x + dir.x * learningRate,
          y: original.y + dir.y * learningRate
        };
        
        if (!isPointInTrackBounds(candidate, trackData)) continue;
        
        optimizedLine[i] = candidate;
        const newTime = calculateLapTime(optimizedLine, trackData);
        
        if (newTime < bestTime) {
          bestTime = newTime;
          bestDelta = { x: dir.x * learningRate, y: dir.y * learningRate };
        }
      }
      
      // Apply best improvement
      optimizedLine[i].x = original.x + bestDelta.x;
      optimizedLine[i].y = original.y + bestDelta.y;
    }
    
    // Early exit if improvement is minimal
    const newLapTime = calculateLapTime(optimizedLine, trackData);
    if (Math.abs(newLapTime - currentLapTime) < 0.001) {
      break;
    }
  }
  
  return optimizedLine;
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
  if (!racingLine || racingLine.length < 3) return racingLine;
  
  let smoothed = JSON.parse(JSON.stringify(racingLine));
  
  for (let iter = 0; iter < iterations; iter++) {
    const newLine = [];
    
    for (let i = 0; i < smoothed.length; i++) {
      if (i === 0 || i === smoothed.length - 1) {
        // Keep endpoints fixed
        newLine.push(smoothed[i]);
      } else {
        // Average with neighbors (Laplacian smoothing)
        const prev = smoothed[i - 1];
        const curr = smoothed[i];
        const next = smoothed[i + 1];
        
        newLine.push({
          x: (prev.x + curr.x + next.x) / 3,
          y: (prev.y + curr.y + next.y) / 3
        });
      }
    }
    
    smoothed = newLine;
  }
  
  return smoothed;
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
  if (!racingLine || racingLine.length < 2) return Infinity;
  
  const segments = [];
  let totalTime = 0;
  
  // Build segments from racing line
  for (let i = 0; i < racingLine.length - 1; i++) {
    const p1 = racingLine[i];
    const p2 = racingLine[i + 1];
    const p3 = racingLine[Math.min(i + 2, racingLine.length - 1)];
    
    const segLength = distance(p1, p2);
    const radius = radiusOfCurvature(p1, p2, p3);
    const maxSpeed = kart.maxCornerSpeed(radius);
    
    segments.push({
      length: segLength,
      speed: maxSpeed,
      radius: radius
    });
    
    if (maxSpeed > 0) {
      totalTime += segLength / maxSpeed;
    }
  }
  
  return totalTime;
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
