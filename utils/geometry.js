/**
 * Geometry Utilities for Karting Track Analysis
 * Handles point calculations, angles, curvature, and interpolation
 */

/**
 * Calculate Euclidean distance between two points
 * @param {Object} p1 - Point {x, y}
 * @param {Object} p2 - Point {x, y}
 * @returns {number} Distance between points
 */
function distance(p1, p2) {
  const dx = p2.x - p1.x;
  const dy = p2.y - p1.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate angle at point p2 formed by p1-p2-p3
 * @param {Object} p1 - First point {x, y}
 * @param {Object} p2 - Vertex point {x, y}
 * @param {Object} p3 - Third point {x, y}
 * @returns {number} Angle in radians
 */
function angle(p1, p2, p3) {
  const v1 = { x: p1.x - p2.x, y: p1.y - p2.y };
  const v2 = { x: p3.x - p2.x, y: p3.y - p2.y };
  
  const dot = v1.x * v2.x + v1.y * v2.y;
  const mag1 = Math.sqrt(v1.x * v1.x + v1.y * v1.y);
  const mag2 = Math.sqrt(v2.x * v2.x + v2.y * v2.y);
  
  if (mag1 === 0 || mag2 === 0) return 0;
  
  return Math.acos(Math.max(-1, Math.min(1, dot / (mag1 * mag2))));
}

/**
 * Calculate curvature of a segment (inverse of radius)
 * Curvature = 1/radius, used to determine how tight a corner is
 * @param {Object} p1 - First point {x, y}
 * @param {Object} p2 - Middle point {x, y}
 * @param {Object} p3 - Third point {x, y}
 * @returns {number} Curvature (1/radius)
 */
function curvature(p1, p2, p3) {
  const a = distance(p1, p2);
  const b = distance(p2, p3);
  const c = distance(p1, p3);
  
  // Calculate area using Heron's formula
  const s = (a + b + c) / 2;
  const area = Math.sqrt(Math.max(0, s * (s - a) * (s - b) * (s - c)));
  
  // Curvature = 4 * area / (a * b * c)
  if (a === 0 || b === 0 || c === 0) return 0;
  return (4 * area) / (a * b * c);
}

/**
 * Get radius of curvature from three points
 * @param {Object} p1 - First point
 * @param {Object} p2 - Middle point
 * @param {Object} p3 - Third point
 * @returns {number} Radius of curvature
 */
function radiusOfCurvature(p1, p2, p3) {
  const curv = curvature(p1, p2, p3);
  return curv === 0 ? Infinity : 1 / curv;
}

/**
 * Interpolate between two points using Catmull-Rom spline
 * This creates smooth curves through multiple points
 * @param {Array} points - Array of points {x, y}
 * @param {number} resolution - Number of interpolated points per segment
 * @returns {Array} New array with interpolated points
 */
function interpolate(points, resolution = 10) {
  if (points.length < 2) return points;
  
  const result = [];
  
  // Add first point
  result.push(points[0]);
  
  // Interpolate between each pair of points using Catmull-Rom
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    
    for (let t = 0; t < 1; t += 1 / resolution) {
      const t2 = t * t;
      const t3 = t2 * t;
      
      // Catmull-Rom basis functions
      const b0 = -0.5 * t3 + t2 - 0.5 * t;
      const b1 = 1.5 * t3 - 2.5 * t2 + 1;
      const b2 = -1.5 * t3 + 2 * t2 + 0.5 * t;
      const b3 = 0.5 * t3 - 0.5 * t2;
      
      const x = b0 * p0.x + b1 * p1.x + b2 * p2.x + b3 * p3.x;
      const y = b0 * p0.y + b1 * p1.y + b2 * p2.y + b3 * p3.y;
      
      result.push({ x, y });
    }
  }
  
  // Add last point
  result.push(points[points.length - 1]);
  
  return result;
}

/**
 * Linear interpolation between two points
 * @param {Object} p1 - Start point {x, y}
 * @param {Object} p2 - End point {x, y}
 * @param {number} t - Interpolation parameter (0 to 1)
 * @returns {Object} Interpolated point {x, y}
 */
function lerp(p1, p2, t) {
  return {
    x: p1.x + (p2.x - p1.x) * t,
    y: p1.y + (p2.y - p1.y) * t
  };
}

/**
 * Get heading/direction angle from p1 to p2
 * @param {Object} p1 - Start point {x, y}
 * @param {Object} p2 - End point {x, y}
 * @returns {number} Heading in radians (-π to π)
 */
function heading(p1, p2) {
  return Math.atan2(p2.y - p1.y, p2.x - p1.x);
}

/**
 * Check if point is inside a polygon (used for track boundary validation)
 * @param {Object} point - Point to test {x, y}
 * @param {Array} polygon - Array of polygon vertices {x, y}
 * @returns {boolean} True if point is inside polygon
 */
function pointInPolygon(point, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x, yi = polygon[i].y;
    const xj = polygon[j].x, yj = polygon[j].y;
    
    const intersect = ((yi > point.y) !== (yj > point.y)) &&
      (point.x < (xj - xi) * (point.y - yi) / (yj - yi) + xi);
    
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Detect if two line segments intersect
 * @param {Object} p1 - Start of segment 1
 * @param {Object} p2 - End of segment 1
 * @param {Object} p3 - Start of segment 2
 * @param {Object} p4 - End of segment 2
 * @returns {boolean} True if segments intersect
 */
function segmentsIntersect(p1, p2, p3, p4) {
  const ccw = (a, b, c) => (c.y - a.y) * (b.x - a.x) > (b.y - a.y) * (c.x - a.x);
  return ccw(p1, p3, p4) !== ccw(p2, p3, p4) && ccw(p1, p2, p3) !== ccw(p1, p2, p4);
}

/**
 * Check if track self-intersects (invalid track)
 * @param {Array} points - Array of track points
 * @returns {boolean} True if self-intersection detected
 */
function trackSelfIntersects(points) {
  for (let i = 0; i < points.length - 1; i++) {
    for (let j = i + 2; j < points.length - 1; j++) {
      if (segmentsIntersect(points[i], points[i + 1], points[j], points[j + 1])) {
        return true;
      }
    }
  }
  return false;
}

/**
 * Calculate total track length
 * @param {Array} points - Array of track points
 * @returns {number} Total distance
 */
function trackLength(points) {
  let total = 0;
  for (let i = 0; i < points.length - 1; i++) {
    total += distance(points[i], points[i + 1]);
  }
  return total;
}

/**
 * Offset point perpendicular to direction by given distance
 * @param {Object} point - Original point {x, y}
 * @param {Object} direction - Direction vector {x, y}
 * @param {number} offset - Distance to offset (positive = right, negative = left)
 * @returns {Object} Offset point {x, y}
 */
function perpendicularOffset(point, direction, offset) {
  const len = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
  if (len === 0) return point;
  
  const perpX = -direction.y / len;
  const perpY = direction.x / len;
  
  return {
    x: point.x + perpX * offset,
    y: point.y + perpY * offset
  };
}

// Export for Node/Jest testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    distance,
    angle,
    curvature,
    radiusOfCurvature,
    interpolate,
    lerp,
    heading,
    pointInPolygon,
    segmentsIntersect,
    trackSelfIntersects,
    trackLength,
    perpendicularOffset
  };
}
