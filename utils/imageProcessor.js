/**
 * Image Processing Module for Track Import
 * Analyzes track images and extracts track boundaries
 */

class ImageProcessor {
  constructor(imageData) {
    this.imageData = imageData;
    this.data = imageData.data;
    this.width = imageData.width;
    this.height = imageData.height;
  }

  /**
   * Extract track points from image using edge detection
   * @returns {Array} Array of {x, y} points representing track centerline
   */
  extractTrackPoints() {
    // Convert to grayscale and find dark pixels (track)
    const binary = this.toBinary();
    
    // Find track edges
    const edges = this.findEdges(binary);
    
    // Trace centerline from edges
    const centerline = this.traceCenterline(edges);
    
    // Smooth and simplify points
    const simplified = this.simplifyPath(centerline, 5);
    
    return simplified;
  }

  /**
   * Convert image to binary (dark = track, light = grass)
   */
  toBinary() {
    const binary = new Uint8ClampedArray(this.width * this.height);
    
    // Calculate histogram to find best threshold
    const histogram = new Array(256).fill(0);
    let maxLuminance = 0;
    let minLuminance = 255;
    
    for (let i = 0; i < this.data.length; i += 4) {
      const r = this.data[i];
      const g = this.data[i + 1];
      const b = this.data[i + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      
      histogram[Math.floor(luminance)]++;
      maxLuminance = Math.max(maxLuminance, luminance);
      minLuminance = Math.min(minLuminance, luminance);
    }
    
    // Use Otsu's method for threshold (or simple midpoint)
    const threshold = (minLuminance + maxLuminance) / 2;
    
    for (let i = 0; i < this.data.length; i += 4) {
      const r = this.data[i];
      const g = this.data[i + 1];
      const b = this.data[i + 2];
      const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
      
      // Dark pixels are track (1), lighter are grass (0)
      binary[i / 4] = luminance < threshold ? 1 : 0;
    }
    
    return binary;
  }

  /**
   * Find edges of track using simpler method for line drawings
   */
  findEdges(binary) {
    const edges = new Uint8ClampedArray(this.width * this.height);
    
    // For simple line drawings, just use the binary directly (they're already edges)
    // Apply light dilation/erosion to clean up
    for (let y = 0; y < this.height; y++) {
      for (let x = 0; x < this.width; x++) {
        const idx = y * this.width + x;
        
        if (binary[idx] === 1) {
          // Check if this pixel is near an edge (has a non-track neighbor)
          let isEdge = false;
          for (let dy = -1; dy <= 1; dy++) {
            for (let dx = -1; dx <= 1; dx++) {
              const nx = x + dx;
              const ny = y + dy;
              if (nx < 0 || nx >= this.width || ny < 0 || ny >= this.height) {
                isEdge = true;
                break;
              }
              const nIdx = ny * this.width + nx;
              if (binary[nIdx] === 0) {
                isEdge = true;
                break;
              }
            }
            if (isEdge) break;
          }
          
          edges[idx] = isEdge ? 1 : 0;
        }
      }
    }
    
    return edges;
  }

  /**
   * Trace centerline by finding middle points between track edges
   */
  traceCenterline(edges) {
    const centerline = [];
    const visited = new Set();
    
    // Find starting point (any edge pixel)
    let startIdx = -1;
    for (let i = 0; i < edges.length; i++) {
      if (edges[i] === 1) {
        startIdx = i;
        break;
      }
    }
    
    if (startIdx === -1) return [];
    
    // Trace along edges, sampling points
    let currentIdx = startIdx;
    let steps = 0;
    const maxSteps = this.width * this.height;
    const sampleRate = Math.max(3, Math.floor(Math.sqrt(this.width * this.height) / 50)); // Adaptive sampling
    
    while (steps < maxSteps) {
      if (visited.has(currentIdx)) break;
      visited.add(currentIdx);
      
      const x = currentIdx % this.width;
      const y = Math.floor(currentIdx / this.width);
      
      // Sample every Nth pixel to reduce point count
      if (steps % sampleRate === 0) {
        centerline.push({ x, y });
      }
      
      // Find next edge pixel (8-neighbor search with preference for straight continuation)
      let foundNext = false;
      
      // Try to find an unvisited neighbor
      for (let radius = 1; radius <= 2 && !foundNext; radius++) {
        for (let dy = -radius; dy <= radius; dy++) {
          for (let dx = -radius; dx <= radius; dx++) {
            if (dx === 0 && dy === 0) continue;
            
            const nx = x + dx;
            const ny = y + dy;
            const nIdx = ny * this.width + nx;
            
            if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height && 
                edges[nIdx] === 1 && !visited.has(nIdx)) {
              currentIdx = nIdx;
              foundNext = true;
              break;
            }
          }
          if (foundNext) break;
        }
      }
      
      if (!foundNext) break;
      steps++;
    }
    
    return centerline.length > 0 ? centerline : [];
  }

  /**
   * Simplify path by reducing point count using Douglas-Peucker algorithm
   */
  simplifyPath(points, tolerance) {
    if (points.length <= 2) return points;
    
    // Use a simpler approach: just reduce consecutive points that are very close
    const simplified = [points[0]];
    
    for (let i = 1; i < points.length; i++) {
      const lastPoint = simplified[simplified.length - 1];
      const dist = Math.sqrt(
        (points[i].x - lastPoint.x) ** 2 + 
        (points[i].y - lastPoint.y) ** 2
      );
      
      if (dist >= tolerance) {
        simplified.push(points[i]);
      }
    }
    
    // Ensure we have the last point
    if (simplified[simplified.length - 1] !== points[points.length - 1]) {
      simplified.push(points[points.length - 1]);
    }
    
    return simplified;
  }

  /**
   * Calculate perpendicular distance from point to line
   */
  perpendicularDistance(point, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    
    if (dx === 0 && dy === 0) {
      return Math.sqrt(
        (point.x - lineStart.x) ** 2 + 
        (point.y - lineStart.y) ** 2
      );
    }
    
    const t = Math.max(0, Math.min(1,
      ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) /
      (dx * dx + dy * dy)
    ));
    
    const projX = lineStart.x + t * dx;
    const projY = lineStart.y + t * dy;
    
    return Math.sqrt(
      (point.x - projX) ** 2 + 
      (point.y - projY) ** 2
    );
  }

  /**
   * Calculate perpendicular distance from point to line
   */
  perpendicularDistance(point, lineStart, lineEnd) {
    const dx = lineEnd.x - lineStart.x;
    const dy = lineEnd.y - lineStart.y;
    
    if (dx === 0 && dy === 0) {
      return Math.sqrt(
        (point.x - lineStart.x) ** 2 + 
        (point.y - lineStart.y) ** 2
      );
    }
    
    const t = Math.max(0, Math.min(1,
      ((point.x - lineStart.x) * dx + (point.y - lineStart.y) * dy) /
      (dx * dx + dy * dy)
    ));
    
    const projX = lineStart.x + t * dx;
    const projY = lineStart.y + t * dy;
    
    return Math.sqrt(
      (point.x - projX) ** 2 + 
      (point.y - projY) ** 2
    );
  }

  /**
   * Scale and normalize extracted points to canvas coordinates
   */
  normalizePoints(points, canvasWidth, canvasHeight) {
    if (points.length === 0) return [];
    
    // Find bounds
    let minX = points[0].x;
    let maxX = points[0].x;
    let minY = points[0].y;
    let maxY = points[0].y;
    
    for (const p of points) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }
    
    const imgWidth = maxX - minX;
    const imgHeight = maxY - minY;
    
    // Scale with padding (90% of canvas)
    const padding = 0.05;
    const scaleX = (canvasWidth * (1 - 2 * padding)) / imgWidth;
    const scaleY = (canvasHeight * (1 - 2 * padding)) / imgHeight;
    const scale = Math.min(scaleX, scaleY);
    
    // Normalize
    const normalized = points.map(p => ({
      x: (p.x - minX) * scale + canvasWidth * padding,
      y: (p.y - minY) * scale + canvasHeight * padding
    }));
    
    return normalized;
  }
}

// Export for use in script.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = ImageProcessor;
}
