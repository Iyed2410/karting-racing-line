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

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', initializeApp);

/**
 * Initialize the application
 */
function initializeApp() {
  // Initialize canvas manager
  const canvas = document.getElementById('trackCanvas');
  canvasManager = new CanvasManager(canvas);
  
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
      document.getElementById('trackWidthValue').textContent = width.toFixed(1);
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
    
    // Step 4: Optimize line
    const optimizedLine = optimizeLine(initialLine, trackData, 30);
    infoText.textContent = 'Smoothing racing line...';
    
    // Step 5: Smooth the line
    canvasManager.racingLine = smoothLine(optimizedLine, 2);
    
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
  
  // Update track length
  if (canvasManager.trackPoints.length > 1) {
    trackData.length = trackLength(canvasManager.trackPoints);
    document.getElementById('trackLen').textContent = trackData.length.toFixed(1) + 'm';
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

// Export functions for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateRacingLine,
    processTrack,
    calculateSegmentSpeeds,
    updateUI
  };
}
