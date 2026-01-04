/**
 * Physics Model for Karting - Tire Grip and Speed Calculations
 * Implements tire grip model, acceleration/braking limits, and max corner speeds
 */

/**
 * Kart and tire physics parameters
 * These values are configurable via UI sliders
 */
class KartPhysics {
  constructor() {
    // Tire grip coefficient (0.8-1.2 typical range)
    this.gripCoefficient = 1.0;
    
    // Kart parameters (tuned for typical rental kart)
    this.weightKg = 180; // kart + driver total
    this.maxAcceleration = 8; // m/s² - achievable acceleration
    this.maxBraking = 10; // m/s² - achievable deceleration
    this.maxDrivingSpeed = 70; // km/h = ~19.4 m/s
    
    // Track parameters
    this.trackWidthM = 6; // typical kart track width
    this.gravity = 9.81; // m/s²
  }
  
  /**
   * Calculate maximum speed for a given corner radius
   * Based on: v_max = sqrt(mu * g * r)
   * where mu = grip coefficient, g = gravity, r = radius
   * 
   * @param {number} radiusM - Radius of corner in meters
   * @returns {number} Maximum speed in m/s
   */
  maxCornerSpeed(radiusM) {
    if (radiusM <= 0 || radiusM === Infinity) {
      return this.maxDrivingSpeed / 3.6; // Convert km/h to m/s
    }
    
    // Apply grip coefficient to corner grip
    const lateralAccel = this.gripCoefficient * this.gravity;
    const maxSpeed = Math.sqrt(lateralAccel * radiusM);
    
    // Cap at maximum driving speed
    return Math.min(maxSpeed, this.maxDrivingSpeed / 3.6);
  }
  
  /**
   * Calculate required braking distance from speed v1 to v2
   * Using: distance = (v2² - v1²) / (2 * a)
   * 
   * @param {number} v1 - Initial speed m/s
   * @param {number} v2 - Final speed m/s
   * @returns {number} Required braking distance in meters
   */
  brakingDistance(v1, v2) {
    const dv2 = v2 * v2 - v1 * v1;
    const distance = dv2 / (2 * this.maxBraking);
    return Math.max(0, distance);
  }
  
  /**
   * Calculate required acceleration distance from v1 to v2
   * @param {number} v1 - Initial speed m/s
   * @param {number} v2 - Final speed m/s
   * @returns {number} Required acceleration distance in meters
   */
  accelerationDistance(v1, v2) {
    const dv2 = v2 * v2 - v1 * v1;
    const distance = dv2 / (2 * this.maxAcceleration);
    return Math.max(0, distance);
  }
  
  /**
   * Compute speed profile along track using iterative forward/backward pass
   * This ensures the kart respects acceleration and braking limits
   * 
   * @param {Array} segments - Array of track segments with speed limits
   * @returns {Array} Speed profile for each segment
   */
  computeSpeedProfile(segments) {
    if (!segments || segments.length === 0) return [];
    
    const speeds = new Array(segments.length);
    
    // Forward pass: accelerate where possible
    speeds[0] = 0; // Start from rest
    
    for (let i = 1; i < segments.length; i++) {
      const maxSpeed = segments[i].maxSpeed; // Speed limited by grip
      const prevSpeed = speeds[i - 1];
      const segmentLen = segments[i].length;
      
      // Maximum speed we can achieve given distance and acceleration
      const maxAccelSpeed = Math.sqrt(prevSpeed * prevSpeed + 2 * this.maxAcceleration * segmentLen);
      
      // Take minimum of physics limit and grip limit
      speeds[i] = Math.min(maxSpeed, maxAccelSpeed);
    }
    
    // Backward pass: ensure we can brake in time for upcoming corners
    for (let i = segments.length - 2; i >= 0; i--) {
      const nextSpeed = speeds[i + 1];
      const segmentLen = segments[i].length;
      
      // Maximum speed we can achieve given we need to brake to nextSpeed
      const maxBrakeSpeed = Math.sqrt(nextSpeed * nextSpeed + 2 * this.maxBraking * segmentLen);
      
      speeds[i] = Math.min(speeds[i], maxBrakeSpeed);
    }
    
    return speeds;
  }
  
  /**
   * Calculate lateral g-force experienced at corner
   * @param {number} speedMs - Speed in m/s
   * @param {number} radiusM - Corner radius in meters
   * @returns {number} Lateral g-force (1 = 1g)
   */
  lateralGForce(speedMs, radiusM) {
    if (radiusM <= 0) return 0;
    const lateralAccel = (speedMs * speedMs) / radiusM;
    return lateralAccel / this.gravity;
  }
  
  /**
   * Check if kart can maintain speed through corner
   * @param {number} speedMs - Speed in m/s
   * @param {number} radiusM - Corner radius in meters
   * @returns {boolean} True if grip is sufficient
   */
  canMaintainSpeed(speedMs, radiusM) {
    if (radiusM <= 0 || radiusM === Infinity) return true;
    const maxSpeed = this.maxCornerSpeed(radiusM);
    return speedMs <= maxSpeed;
  }
  
  /**
   * Estimate lap time given speeds and distances
   * @param {Array} segments - Array with length and speed properties
   * @returns {number} Lap time in seconds
   */
  estimateLapTime(segments) {
    let totalTime = 0;
    
    for (let segment of segments) {
      if (segment.speed > 0) {
        totalTime += segment.length / segment.speed;
      }
    }
    
    return totalTime;
  }
  
  /**
   * Update grip coefficient based on track conditions
   * @param {number} newGrip - New grip coefficient (0.8-1.5 range)
   */
  setGripCoefficient(newGrip) {
    this.gripCoefficient = Math.max(0.6, Math.min(1.5, newGrip));
  }
  
  /**
   * Update kart parameters
   * @param {Object} params - Object with properties to update
   */
  updateParameters(params) {
    if (params.weight !== undefined) this.weightKg = params.weight;
    if (params.acceleration !== undefined) this.maxAcceleration = params.acceleration;
    if (params.braking !== undefined) this.maxBraking = params.braking;
    if (params.maxSpeed !== undefined) this.maxDrivingSpeed = params.maxSpeed;
  }
}

// Create global physics instance
const kart = new KartPhysics();
