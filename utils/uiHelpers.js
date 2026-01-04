/**
 * UI Helper Functions for Canvas Drawing and Event Handling
 * Manages track visualization, touch controls, and rendering
 */

class CanvasManager {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
    this.scale = 1;
    this.panX = 0;
    this.panY = 0;
    
    // Set up high-DPI support for mobile
    this.setupHighDPI();
    
    // Drawing state
    this.isDrawing = false;
    this.trackPoints = [];
    this.racingLine = null;
    this.showApexes = false;
    this.showSpeedHeat = false;
    
    // History for undo/redo
    this.history = [];
    this.historyIndex = -1;
    
    this.setupEventListeners();
  }
  
  /**
   * Set up high DPI (retina) display support
   */
  setupHighDPI() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);
    this.displayWidth = rect.width;
    this.displayHeight = rect.height;
  }
  
  /**
   * Set up all event listeners for touch and mouse
   */
  setupEventListeners() {
    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.handleMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.handleMouseUp(e));
    this.canvas.addEventListener('wheel', (e) => this.handleZoom(e));
    
    // Touch events
    this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e));
    this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e));
    this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
    
    // Pan and zoom tracking
    this.lastX = 0;
    this.lastY = 0;
    this.isPanning = false;
  }
  
  /**
   * Get canvas coordinates from event
   */
  getCanvasCoords(e) {
    const rect = this.canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX || 0) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY || 0) - rect.top;
    
    // Convert to world coordinates
    return {
      x: (x - this.panX) / this.scale,
      y: (y - this.panY) / this.scale
    };
  }
  
  /**
   * Handle mouse down - start drawing or panning
   */
  handleMouseDown(e) {
    if (e.button === 0) {
      // Left click - draw track point
      const coords = this.getCanvasCoords(e);
      this.addTrackPoint(coords.x, coords.y);
      this.isDrawing = true;
    } else if (e.button === 2) {
      // Right click - pan
      this.isPanning = true;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
    }
  }
  
  /**
   * Handle mouse move - draw or pan
   */
  handleMouseMove(e) {
    if (this.isDrawing) {
      const coords = this.getCanvasCoords(e);
      this.addTrackPoint(coords.x, coords.y);
      this.render();
    }
    
    if (this.isPanning) {
      const dx = e.clientX - this.lastX;
      const dy = e.clientY - this.lastY;
      this.panX += dx;
      this.panY += dy;
      this.lastX = e.clientX;
      this.lastY = e.clientY;
      this.render();
    }
  }
  
  /**
   * Handle mouse up
   */
  handleMouseUp(e) {
    this.isDrawing = false;
    this.isPanning = false;
  }
  
  /**
   * Handle touch start
   */
  handleTouchStart(e) {
    if (e.touches.length === 1) {
      const coords = this.getCanvasCoords(e.touches[0]);
      this.addTrackPoint(coords.x, coords.y);
      this.isDrawing = true;
    } else if (e.touches.length === 2) {
      // Two-finger touch for pan
      this.isPanning = true;
      this.lastX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      this.lastY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
    }
  }
  
  /**
   * Handle touch move
   */
  handleTouchMove(e) {
    if (e.touches.length === 1 && this.isDrawing) {
      const coords = this.getCanvasCoords(e.touches[0]);
      this.addTrackPoint(coords.x, coords.y);
      this.render();
    } else if (e.touches.length === 2) {
      // Pan with two fingers
      const currentX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
      const currentY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      this.panX += currentX - this.lastX;
      this.panY += currentY - this.lastY;
      this.lastX = currentX;
      this.lastY = currentY;
      this.render();
    }
  }
  
  /**
   * Handle touch end
   */
  handleTouchEnd(e) {
    this.isDrawing = false;
    this.isPanning = false;
  }
  
  /**
   * Handle mouse wheel zoom
   */
  handleZoom(e) {
    e.preventDefault();
    
    const coords = this.getCanvasCoords(e);
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    
    // Zoom toward mouse position
    this.panX = e.clientX - (e.clientX - this.panX) * factor;
    this.panY = e.clientY - (e.clientY - this.panY) * factor;
    this.scale *= factor;
    this.scale = Math.max(0.1, Math.min(5, this.scale));
    
    this.render();
  }
  
  /**
   * Add a point to track
   * Avoid adding duplicate points too close together
   */
  addTrackPoint(x, y) {
    if (this.trackPoints.length > 0) {
      const last = this.trackPoints[this.trackPoints.length - 1];
      const dist = Math.hypot(x - last.x, y - last.y);
      if (dist < 2) return; // Minimum distance between points
    }
    
    this.trackPoints.push({ x, y });
    this.saveToHistory();
  }
  
  /**
   * Clear track
   */
  clearTrack() {
    this.trackPoints = [];
    this.racingLine = null;
    this.saveToHistory();
    this.render();
  }
  
  /**
   * Undo last action
   */
  undo() {
    if (this.historyIndex > 0) {
      this.historyIndex--;
      this.restoreFromHistory();
      this.render();
    }
  }
  
  /**
   * Redo last undone action
   */
  redo() {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      this.restoreFromHistory();
      this.render();
    }
  }
  
  /**
   * Save current state to history
   */
  saveToHistory() {
    // Remove any future history if we're not at the end
    this.history = this.history.slice(0, this.historyIndex + 1);
    
    // Add new state
    this.history.push({
      trackPoints: JSON.parse(JSON.stringify(this.trackPoints)),
      racingLine: this.racingLine ? JSON.parse(JSON.stringify(this.racingLine)) : null
    });
    
    this.historyIndex = this.history.length - 1;
    
    // Limit history to 50 items
    if (this.history.length > 50) {
      this.history.shift();
      this.historyIndex--;
    }
  }
  
  /**
   * Restore state from history
   */
  restoreFromHistory() {
    if (this.historyIndex >= 0 && this.historyIndex < this.history.length) {
      const state = this.history[this.historyIndex];
      this.trackPoints = JSON.parse(JSON.stringify(state.trackPoints));
      this.racingLine = state.racingLine ? JSON.parse(JSON.stringify(state.racingLine)) : null;
    }
  }
  
  /**
   * Draw the entire canvas
   */
  render() {
    // Clear canvas
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.displayWidth, this.displayHeight);
    
    // Apply transformations
    this.ctx.save();
    this.ctx.translate(this.panX, this.panY);
    this.ctx.scale(this.scale, this.scale);
    
    // Draw grid
    this.drawGrid();
    
    // Draw track centerline
    if (this.trackPoints.length > 0) {
      this.drawTrack(this.trackPoints);
    }
    
    // Draw racing line if generated
    if (this.racingLine && this.racingLine.length > 0) {
      this.drawRacingLine(this.racingLine);
      
      if (this.showApexes) {
        this.drawApexPoints(this.racingLine);
      }
      
      if (this.showSpeedHeat) {
        this.drawSpeedHeatmap(this.racingLine);
      }
    }
    
    this.ctx.restore();
  }
  
  /**
   * Draw background grid
   */
  drawGrid() {
    this.ctx.strokeStyle = '#e0e0e0';
    this.ctx.lineWidth = 0.5;
    
    const gridSize = 20;
    const minX = -this.panX / this.scale;
    const minY = -this.panY / this.scale;
    const maxX = minX + this.displayWidth / this.scale;
    const maxY = minY + this.displayHeight / this.scale;
    
    // Vertical lines
    for (let x = Math.floor(minX / gridSize) * gridSize; x < maxX; x += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(x, minY);
      this.ctx.lineTo(x, maxY);
      this.ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = Math.floor(minY / gridSize) * gridSize; y < maxY; y += gridSize) {
      this.ctx.beginPath();
      this.ctx.moveTo(minX, y);
      this.ctx.lineTo(maxX, y);
      this.ctx.stroke();
    }
  }
  
  /**
   * Draw track centerline
   */
  drawTrack(points) {
    if (points.length < 2) return;
    
    // Smooth the track using interpolation
    const smoothPoints = interpolate(points, 5);
    
    // Draw centerline
    this.ctx.strokeStyle = '#333333';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(smoothPoints[0].x, smoothPoints[0].y);
    
    for (let i = 1; i < smoothPoints.length; i++) {
      this.ctx.lineTo(smoothPoints[i].x, smoothPoints[i].y);
    }
    this.ctx.stroke();
    
    // Draw points
    this.ctx.fillStyle = '#666666';
    for (let point of points) {
      this.ctx.fillRect(point.x - 2, point.y - 2, 4, 4);
    }
  }
  
  /**
   * Draw racing line with speed coloring
   */
  drawRacingLine(points) {
    if (points.length < 2) return;
    
    // Smooth the racing line
    const smoothPoints = interpolate(points, 5);
    
    // Calculate speeds along line for coloring
    const speeds = [];
    for (let i = 0; i < smoothPoints.length - 1; i++) {
      const p1 = smoothPoints[i];
      const p2 = smoothPoints[i + 1];
      const p3 = smoothPoints[Math.min(i + 2, smoothPoints.length - 1)];
      
      const radius = radiusOfCurvature(p1, p2, p3);
      const speed = kart.maxCornerSpeed(radius);
      speeds.push(speed);
    }
    
    const maxSpeed = Math.max(...speeds);
    
    // Draw segments with color gradient based on speed
    for (let i = 0; i < smoothPoints.length - 1; i++) {
      const speed = speeds[i];
      const speedRatio = speed / maxSpeed;
      
      // Red (slow) to green (fast)
      const hue = speedRatio * 120; // 0=red, 120=green
      this.ctx.strokeStyle = `hsl(${hue}, 100%, 50%)`;
      this.ctx.lineWidth = 3;
      
      this.ctx.beginPath();
      this.ctx.moveTo(smoothPoints[i].x, smoothPoints[i].y);
      this.ctx.lineTo(smoothPoints[i + 1].x, smoothPoints[i + 1].y);
      this.ctx.stroke();
    }
  }
  
  /**
   * Draw apex points (tight corners)
   */
  drawApexPoints(points) {
    const apexes = findApexes(points);
    
    this.ctx.fillStyle = '#ff6600';
    for (let idx of apexes) {
      const point = points[idx];
      this.ctx.beginPath();
      this.ctx.arc(point.x, point.y, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }
  
  /**
   * Draw speed heatmap
   */
  drawSpeedHeatmap(points) {
    // Similar to racing line coloring but with stronger visual
    this.ctx.globalAlpha = 0.3;
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const p3 = points[Math.min(i + 2, points.length - 1)];
      
      const radius = radiusOfCurvature(p1, p2, p3);
      const speed = kart.maxCornerSpeed(radius);
      const maxSpeed = 25; // ~90 km/h
      const speedRatio = Math.min(1, speed / maxSpeed);
      
      const hue = speedRatio * 120;
      this.ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      
      this.ctx.beginPath();
      this.ctx.arc(p2.x, p2.y, 5, 0, Math.PI * 2);
      this.ctx.fill();
    }
    this.ctx.globalAlpha = 1;
  }
  
  /**
   * Save track to JSON
   */
  saveTrackJSON() {
    return {
      trackPoints: this.trackPoints,
      racingLine: this.racingLine,
      timestamp: new Date().toISOString()
    };
  }
  
  /**
   * Load track from JSON
   */
  loadTrackJSON(data) {
    if (data.trackPoints) {
      this.trackPoints = JSON.parse(JSON.stringify(data.trackPoints));
    }
    if (data.racingLine) {
      this.racingLine = JSON.parse(JSON.stringify(data.racingLine));
    }
    this.saveToHistory();
    this.render();
  }
}
