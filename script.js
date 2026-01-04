/**
 * Main Application Controller for Karting Racing Line Optimizer
 * Coordinates canvas, physics, and racing line optimization
 */

// Global state
let canvasManager;
let trackData = {
  points: [],
  length: 0,
  boundaries: null,
  segments: []
};
// Simulation controller
let raceSimulator;
// Units: 'metric' (meters, km/h) or 'imperial' (feet, mph)
let units = 'metric';

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

/**
 * Initialize the application
 */
function initializeApp() {
  // Initialize canvas manager
  const canvas = document.getElementById('trackCanvas');
  const overlay = document.getElementById('overlayCanvas');
  canvasManager = new CanvasManager(canvas, overlay);
  // Simulation helper
  raceSimulator = new RaceSimulator(canvasManager);
  
  // Set up event listeners for all controls
  setupControlListeners();
  
  // Initial render
  canvasManager.render();
  
  console.log('✓ Karting Racing Line Optimizer initialized');
}

/**
 * Set up all control event listeners
 */
function setupControlListeners() {
  try {
    // Track controls
    document.getElementById('clearBtn').addEventListener('click', () => {
      if (confirm('Clear all track points?')) {
        canvasManager.clearTrack();
        updateUI();
      }
    });
    
    document.getElementById('undoBtn').addEventListener('click', () => {
      canvasManager.undo();
      updateUI();
    });
    
    document.getElementById('redoBtn').addEventListener('click', () => {
      canvasManager.redo();
      updateUI();
    });
    
    // File operations
    document.getElementById('loadTrackBtn').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          try {
            const data = JSON.parse(event.target.result);
            canvasManager.loadTrackJSON(data);
            updateUI();
            showMessage('Track loaded successfully!', 'success');
          } catch (err) {
            showMessage('Error loading track: ' + err.message, 'error');
          }
        };
        reader.readAsText(file);
      }
    });
    
    document.getElementById('saveTrackBtn').addEventListener('click', () => {
      if (canvasManager.trackPoints.length === 0) {
        showMessage('No track to save!', 'warning');
        return;
      }
      
      const data = canvasManager.saveTrackJSON();
      const json = JSON.stringify(data, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `track_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showMessage('Track saved!', 'success');
    });
    
    // Physics sliders
  const gripSlider = document.getElementById('gripSlider');
  if (gripSlider) {
    gripSlider.addEventListener('input', (e) => {
      const grip = parseFloat(e.target.value);
      document.getElementById('gripValue').textContent = grip.toFixed(2);
      kart.setGripCoefficient(grip);
      if (canvasManager.racingLine) {
        canvasManager.render();
        updateUI();
      }
    });
  }
  
  const trackWidthSlider = document.getElementById('trackWidthSlider');
  if (trackWidthSlider) {
    trackWidthSlider.addEventListener('input', (e) => {
      const width = parseFloat(e.target.value);
      document.getElementById('trackWidthValue').textContent = units === 'metric' ? width.toFixed(1) : (width * 3.28084).toFixed(1);
      trackData.trackWidth = width;
    });
  }
  
  const accelSlider = document.getElementById('accelSlider');
  if (accelSlider) {
    accelSlider.addEventListener('input', (e) => {
      const accel = parseFloat(e.target.value);
      document.getElementById('accelValue').textContent = accel.toFixed(1);
      kart.maxAcceleration = accel;
      if (canvasManager.racingLine && canvasManager.trackPoints.length > 2) {
        calculateSegmentSpeeds();
        const initialLine = initialHeuristicLine(canvasManager.trackPoints);
        canvasManager.racingLine = smoothLine(optimizeLine(initialLine, trackData, 30), 2);
        canvasManager.render();
        updateUI();
      }
    });
  }
  
  const brakeSlider = document.getElementById('brakeSlider');
  if (brakeSlider) {
    brakeSlider.addEventListener('input', (e) => {
      const brake = parseFloat(e.target.value);
      document.getElementById('brakeValue').textContent = brake.toFixed(1);
      kart.maxBraking = brake;
      if (canvasManager.racingLine && canvasManager.trackPoints.length > 2) {
        calculateSegmentSpeeds();
        const initialLine = initialHeuristicLine(canvasManager.trackPoints);
        canvasManager.racingLine = smoothLine(optimizeLine(initialLine, trackData, 30), 2);
        canvasManager.render();
        updateUI();
      }
    });
  }
  
  // Image upload handler
  const uploadImageBtn = document.getElementById('uploadImageBtn');
  if (uploadImageBtn) {
    uploadImageBtn.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            processTrackImage(img);
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      }
    });
  }
  
  // Racing line generation
  document.getElementById('optimizeBtn').addEventListener('click', generateRacingLine);
  
  // Visualization toggles
  document.getElementById('showApexes').addEventListener('change', (e) => {
    canvasManager.showApexes = e.target.checked;
    if (canvasManager.racingLine) {
      canvasManager.render();
    }
  });
  
  document.getElementById('showSpeedHeat').addEventListener('change', (e) => {
    canvasManager.showSpeedHeat = e.target.checked;
    if (canvasManager.racingLine) {
      canvasManager.render();
    }
  });

  // Simulation / playback controls
  const playPauseBtn = document.getElementById('playPauseBtn');
  const stepBtn = document.getElementById('stepBtn');
  const playbackSpeed = document.getElementById('playbackSpeed');
  const playbackSpeedVal = document.getElementById('playbackSpeedVal');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const fitBtn = document.getElementById('fitBtn');

  if (playbackSpeed && playbackSpeedVal) {
    playbackSpeed.addEventListener('input', (e) => {
      const v = parseFloat(e.target.value);
      playbackSpeedVal.textContent = v.toFixed(2) + 'x';
      if (raceSimulator) raceSimulator.setSpeedMultiplier(v);
    });
  }

  if (playPauseBtn) {
    playPauseBtn.addEventListener('click', () => {
      if (!raceSimulator) return;
      if (raceSimulator.isPlaying) {
        raceSimulator.pause();
        playPauseBtn.textContent = '▶️ Play';
      } else {
        raceSimulator.start();
        playPauseBtn.textContent = '⏸️ Pause';
      }
    });
  }

  if (stepBtn) {
    stepBtn.addEventListener('click', () => {
      if (!raceSimulator) return;
      raceSimulator.stepOnce();
    });
  }

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      canvasManager.scale = Math.min(5, canvasManager.scale * 1.2);
      canvasManager.render();
    });
  }
  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      canvasManager.scale = Math.max(0.1, canvasManager.scale * 0.8);
      canvasManager.render();
    });
  }
  if (fitBtn) {
    fitBtn.addEventListener('click', () => {
      // reset pan/scale to fit track roughly
      canvasManager.scale = 1;
      canvasManager.panX = 0;
      canvasManager.panY = 0;
      canvasManager.render();
    });
  }

  // WebGL / edit / unit controls
  const useWebGL = document.getElementById('useWebGL');
  const editMode = document.getElementById('editMode');
  const deletePointBtn = document.getElementById('deletePointBtn');
  const unitToggleBtn = document.getElementById('unitToggleBtn');

  if (useWebGL) {
    useWebGL.addEventListener('change', (e) => {
      canvasManager.useWebGL = e.target.checked;
      canvasManager.setupHighDPI();
      canvasManager.render();
    });
  }

  if (editMode) {
    editMode.addEventListener('change', (e) => {
      canvasManager.setEditMode(!!e.target.checked);
    });
  }

  if (deletePointBtn) {
    deletePointBtn.addEventListener('click', () => {
      // delete nearest point to center or last selected
      if (!canvasManager) return;
      // if draggingPoint available delete it
      if (canvasManager.draggingPoint != null && canvasManager.draggingPoint >= 0) {
        canvasManager.trackPoints.splice(canvasManager.draggingPoint, 1);
        canvasManager.draggingPoint = null;
        canvasManager.saveToHistory();
        canvasManager.render();
        updateUI();
        return;
      }
      // otherwise remove last point
      if (canvasManager.trackPoints.length > 0) {
        canvasManager.trackPoints.pop();
        canvasManager.saveToHistory();
        canvasManager.render();
        updateUI();
      }
    });
  }

  if (unitToggleBtn) {
    unitToggleBtn.addEventListener('click', () => {
      units = units === 'metric' ? 'imperial' : 'metric';
      unitToggleBtn.textContent = 'Units: ' + (units === 'metric' ? 'Metric' : 'Imperial');
      updateUI();
    });
  }

  } catch (error) {
    console.error('Error setting up controls:', error);
  }
}

/**
 * Generate optimal racing line for current track
 */
function generateRacingLine() {
  if (canvasManager.trackPoints.length < 3) {
    showMessage('Draw at least 3 points to generate a racing line', 'warning');
    return;
  }
  
  const btn = document.getElementById('optimizeBtn');
  const infoBox = document.getElementById('optimizeInfo');
  const infoText = document.getElementById('optimizeText');
  
  try {
    btn.disabled = true;
    btn.classList.add('processing');
    infoBox.style.display = 'block';
    infoText.textContent = 'Analyzing track geometry...';
    
    // Step 1: Process track
    processTrack();
    infoText.textContent = 'Calculating physics limits...';
    
    // Step 2: Calculate segment speeds based on curvature
    calculateSegmentSpeeds();
    infoText.textContent = 'Generating initial racing line...';
    
    // Step 3: Generate initial heuristic line
    const initialLine = initialHeuristicLine(canvasManager.trackPoints);
    infoText.textContent = 'Optimizing racing line...';
    
      // Step 4: Optimize line (use Web Worker if available)
      infoText.textContent = 'Optimizing racing line... (this may take a moment)';
      let optimizedLine = null;
      const iterations = 30;

      const runOptimizeSync = () => {
        optimizedLine = optimizeLine(initialLine, trackData, iterations);
        proceedAfterOptimize(optimizedLine);
      };

      const proceedAfterOptimize = (optimized) => {
        infoText.textContent = 'Smoothing racing line...';

        // Step 5: Smooth the line
        canvasManager.racingLine = smoothLine(optimized, 2);

        // Update simulator profile
        if (raceSimulator) {
          raceSimulator.updateProfile();
          raceSimulator.currentDist = 0;
        }

        // Validate result
        const validation = validateRacingLine(canvasManager.racingLine, trackData);
        if (!validation.valid) {
          console.warn('Racing line validation warnings:', validation.errors);
        }

        infoText.textContent = '✓ Racing line generated successfully!';
        setTimeout(() => {
          infoBox.style.display = 'none';
        }, 2000);

        canvasManager.render();
        updateUI();
        console.log('✓ Racing line generated');
      };

      // Try worker
      if (window.Worker) {
        try {
          const worker = new Worker('utils/optimizeWorker.js');
          worker.onmessage = (ev) => {
            const data = ev.data;
            if (data && data.success) {
              proceedAfterOptimize(data.optimized);
            } else {
              console.warn('Worker optimize failed, falling back:', data && data.error);
              runOptimizeSync();
            }
            worker.terminate();
          };
          worker.onerror = (err) => {
            console.error('Worker error:', err);
            worker.terminate();
            runOptimizeSync();
          };
          worker.postMessage({ action: 'optimize', initialLine, trackData, iterations });
        } catch (err) {
          console.warn('Could not start worker, optimizing synchronously:', err);
          runOptimizeSync();
        }
        return; // worker will call proceedAfterOptimize
      } else {
        runOptimizeSync();
      }
  } catch (error) {
    console.error('Error generating racing line:', error);
    infoText.textContent = '✗ Error: ' + error.message;
    showMessage('Error generating racing line: ' + error.message, 'error');
  } finally {
    btn.disabled = false;
    btn.classList.remove('processing');
  }
}

/**
 * Process track: calculate geometry and create segments
 */
function processTrack() {
  const points = canvasManager.trackPoints;
  
  if (points.length < 2) {
    throw new Error('Not enough points');
  }
  
  // Check for self-intersection
  if (trackSelfIntersects(points)) {
    console.warn('⚠ Track contains self-intersection');
  }
  
  // Calculate track length
  trackData.length = trackLength(points);
  
  // Create segments with geometry data
  trackData.segments = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];
    
    const segLen = distance(p1, p2);
    const radius = radiusOfCurvature(p1, p2, p3);
    
    trackData.segments.push({
      startPoint: p1,
      endPoint: p2,
      length: segLen,
      radius: radius,
      curvature: radius === Infinity ? 0 : 1 / radius,
      speed: kart.maxCornerSpeed(radius)
    });
  }
}

/**
 * Calculate speed limit for each segment based on physics
 */
function calculateSegmentSpeeds() {
  for (let segment of trackData.segments) {
    // Speed limited by grip and radius
    const maxSpeed = kart.maxCornerSpeed(segment.radius);
    segment.speed = maxSpeed;
  }
}
/**
 * Process track image and extract track points
 */
function processTrackImage(img) {
  showMessage('Processing image...', 'info');
  
  // Create canvas for image processing
  const canvas = document.createElement('canvas');
  canvas.width = img.width;
  canvas.height = img.height;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  
  // Extract image data
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  
  // Process with ImageProcessor
  const processor = new ImageProcessor(imageData);
  let trackPoints = processor.extractTrackPoints();
  
  console.log('Extracted points from image:', trackPoints.length);
  
  // Normalize to canvas size
  const canvasElement = document.getElementById('trackCanvas');
  trackPoints = processor.normalizePoints(trackPoints, canvasElement.width, canvasElement.height);
  
  console.log('Normalized points:', trackPoints.length);
  
  if (trackPoints.length < 3) {
    console.error('Not enough track points detected. Points:', trackPoints.length);
    showMessage('Could not detect track. Try a clearer image with higher contrast.', 'error');
    return;
  }
  
  // Load extracted points
  canvasManager.trackPoints = trackPoints;
  canvasManager.saveToHistory();
  
  // Auto-generate racing line
  setTimeout(() => {
    generateRacingLine();
    showMessage('Track imported! Racing line generated.', 'success');
  }, 100);
}

/**
 * Update UI elements with current state
 */
function updateUI() {
  // Update point count
  document.getElementById('pointCount').textContent = canvasManager.trackPoints.length;
  // Update track width display according to units
  const twEl = document.getElementById('trackWidthValue');
  if (twEl) {
    const w = trackData.trackWidth || parseFloat(document.getElementById('trackWidthSlider').value || 6);
    twEl.textContent = units === 'metric' ? w.toFixed(1) : (w * 3.28084).toFixed(1);
  }
  
  // Update track length
  if (canvasManager.trackPoints.length > 1) {
    trackData.length = trackLength(canvasManager.trackPoints);
    document.getElementById('trackLen').textContent = formatDistance(trackData.length);
  } else {
    document.getElementById('trackLen').textContent = '0m';
  }
  
  // Update lap time
  if (canvasManager.racingLine && canvasManager.racingLine.length > 1) {
    const lapTime = calculateLapTime(canvasManager.racingLine, trackData);
    document.getElementById('lapTime').textContent = 
      lapTime === Infinity ? '--' : lapTime.toFixed(2) + 's';
  } else {
    document.getElementById('lapTime').textContent = '--';
  }
}

function formatDistance(meters) {
  if (units === 'metric') return meters.toFixed(1) + ' m';
  // imperial - feet
  const feet = meters * 3.28084;
  return feet.toFixed(1) + ' ft';
}

/**
 * Show temporary message to user
 */
function showMessage(text, type = 'info') {
  // Create message element
  const message = document.createElement('div');
  message.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 16px 24px;
    background: ${type === 'error' ? '#ff3333' : type === 'success' ? '#00cc66' : '#ff9900'};
    color: white;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
    font-weight: 600;
    z-index: 1000;
    animation: slideIn 0.3s ease;
  `;
  message.textContent = text;
  document.body.appendChild(message);
  
  // Auto remove after 3 seconds
  setTimeout(() => {
    message.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => message.remove(), 300);
  }, 3000);
}

/**
 * Add CSS animations
 */
(function() {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideIn {
      from {
        transform: translateX(400px);
        opacity: 0;
      }
      to {
        transform: translateX(0);
        opacity: 1;
      }
    }
    @keyframes slideOut {
      from {
        transform: translateX(0);
        opacity: 1;
      }
      to {
        transform: translateX(400px);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
})();

/**
 * Simple race simulator that animates a car along the generated racing line
 */
class RaceSimulator {
  constructor(canvasManager) {
    this.cm = canvasManager;
    this.isPlaying = false;
    this.speedMultiplier = 1;
    this.currentDist = 0; // meters along line
    this.lastTime = null;
    this.totalLength = 0;
    this.cumulative = [];
  }

  updateProfile() {
    const line = this.cm.racingLine;
    if (!line || line.length < 2) {
      this.totalLength = 0;
      this.cumulative = [];
      return;
    }

    // compute cumulative distances
    this.cumulative = [0];
    let acc = 0;
    for (let i = 1; i < line.length; i++) {
      const a = line[i - 1];
      const b = line[i];
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      acc += d;
      this.cumulative.push(acc);
    }
    this.totalLength = acc;
    if (this.currentDist > this.totalLength) this.currentDist = 0;
  }

  setSpeedMultiplier(m) {
    this.speedMultiplier = m;
  }

  start() {
    if (this.isPlaying) return;
    this.updateProfile();
    if (this.totalLength <= 0) return;
    this.isPlaying = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.frame.bind(this));
  }

  pause() {
    this.isPlaying = false;
    this.lastTime = null;
  }

  stepOnce() {
    // advance small fixed time step
    this.updateProfile();
    if (this.totalLength <= 0) return;
    const dt = 0.2; // seconds
    this.advanceByTime(dt);
    this.drawCurrent();
  }

  frame(ts) {
    if (!this.isPlaying) return;
    const dt = (ts - this.lastTime) / 1000;
    this.lastTime = ts;
    this.advanceByTime(dt);
    this.drawCurrent();
    requestAnimationFrame(this.frame.bind(this));
  }

  advanceByTime(dt) {
    if (!this.cm.racingLine || this.cm.racingLine.length < 2) return;
    // estimate speed at current point using curvature-based corner speed
    const pos = this.getPositionData(this.currentDist);
    const radius = pos.radius || Infinity;
    const baseSpeed = kart.maxCornerSpeed(radius); // m/s
    const travel = baseSpeed * dt * this.speedMultiplier;
    this.currentDist += travel;
    // loop
    if (this.currentDist > this.totalLength) this.currentDist -= this.totalLength;
  }

  getPositionData(dist) {
    const line = this.cm.racingLine;
    if (!line || line.length < 2) return { x: 0, y: 0, idx: 0, t: 0, radius: Infinity };
    // clamp
    if (dist <= 0) return { x: line[0].x, y: line[0].y, idx: 0, t: 0, radius: Infinity };
    if (dist >= this.totalLength) {
      const last = line[line.length - 1];
      return { x: last.x, y: last.y, idx: line.length - 1, t: 0, radius: Infinity };
    }

    // find segment
    let i = 1;
    while (i < this.cumulative.length && this.cumulative[i] < dist) i++;
    const a = line[i - 1];
    const b = line[i];
    const segStart = this.cumulative[i - 1];
    const segLen = this.cumulative[i] - segStart || 1e-6;
    const t = (dist - segStart) / segLen;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;

    // estimate radius using neighbors
    const p1 = line[Math.max(0, i - 2)];
    const p2 = a;
    const p3 = b;
    const radius = radiusOfCurvature(p1 || p2, p2, p3 || p2);

    return { x, y, idx: i - 1, t, radius };
  }

  drawCurrent() {
    // render base canvas then overlay car
    this.cm.render();

    const pos = this.getPositionData(this.currentDist);
    const ctx = this.cm.overlayCtx || this.cm.ctx;

    ctx.save();
    // account for pan/zoom transform already used in render
    ctx.translate(this.cm.panX, this.cm.panY);
    ctx.scale(this.cm.scale, this.cm.scale);

    // compute heading from local segment
    const line = this.cm.racingLine;
    const a = line[Math.max(0, pos.idx)];
    const b = line[Math.min(line.length - 1, pos.idx + 1)];
    const angle = Math.atan2(b.y - a.y, b.x - a.x);

    // draw car as triangle
    ctx.translate(pos.x, pos.y);
    ctx.rotate(angle);
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.moveTo(8, 0);
    ctx.lineTo(-6, 4);
    ctx.lineTo(-6, -4);
    ctx.closePath();
    ctx.fill();
    // draw speed near the car
    ctx.fillStyle = '#000000';
    ctx.font = '12px sans-serif';
    ctx.rotate(-angle);
    const baseSpeed = kart.maxCornerSpeed(pos.radius || Infinity); // m/s
    let speedText = '';
    if (units === 'metric') {
      speedText = (baseSpeed * 3.6).toFixed(1) + ' km/h';
    } else {
      speedText = (baseSpeed * 2.23694).toFixed(1) + ' mph';
    }
    ctx.fillText(speedText, 10, -8);

    ctx.restore();
  }
}

/**
 * Mobile orientation change handler
 */
window.addEventListener('orientationchange', () => {
  setTimeout(() => {
    canvasManager.setupHighDPI();
    canvasManager.render();
  }, 100);
});

/**
 * Handle window resize
 */
window.addEventListener('resize', () => {
  canvasManager.setupHighDPI();
  canvasManager.render();
});

// Keyboard shortcuts: Space = play/pause, +/- zoom, f = fit
window.addEventListener('keydown', (e) => {
  if (!canvasManager) return;
  if (e.code === 'Space') {
    e.preventDefault();
    if (raceSimulator) {
      if (raceSimulator.isPlaying) {
        raceSimulator.pause();
        const btn = document.getElementById('playPauseBtn');
        if (btn) btn.textContent = '▶️ Play';
      } else {
        raceSimulator.start();
        const btn = document.getElementById('playPauseBtn');
        if (btn) btn.textContent = '⏸️ Pause';
      }
    }
  } else if (e.key === '+') {
    canvasManager.scale = Math.min(5, canvasManager.scale * 1.2);
    canvasManager.render();
  } else if (e.key === '-') {
    canvasManager.scale = Math.max(0.1, canvasManager.scale * 0.8);
    canvasManager.render();
  } else if (e.key.toLowerCase() === 'f') {
    canvasManager.scale = 1;
    canvasManager.panX = 0;
    canvasManager.panY = 0;
    canvasManager.render();
  }
});

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateRacingLine,
    processTrack,
    calculateSegmentSpeeds,
    updateUI
  };
}
