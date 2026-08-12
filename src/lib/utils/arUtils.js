/**
 * AR utility functions for Floorish
 * Used by the AR viewer component
 */

/**
 * Check if WebXR AR is supported on this device
 */
export async function checkARSupport() {
  if (!navigator.xr) {
    return {
      supported: false,
      reason: 'WebXR not available in this browser.'
    };
  }

  try {
    const supported = await navigator.xr.isSessionSupported('immersive-ar');
    return {
      supported,
      reason: supported ? null : 'AR sessions not supported on this device.'
    };
  } catch (err) {
    return {
      supported: false,
      reason: `Error checking AR support: ${err.message}`
    };
  }
}

/**
 * Request camera permissions for AR
 */
export async function requestCameraPermission() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    // Stop the stream immediately — we just wanted permission
    stream.getTracks().forEach(track => track.stop());
    return { granted: true };
  } catch (err) {
    return {
      granted: false,
      reason: err.name === 'NotAllowedError' 
        ? 'Camera permission was denied.' 
        : `Camera error: ${err.message}`
    };
  }
}

/**
 * Create a hit-test reticle for AR surface detection
 * @param {THREE} THREE - Three.js library instance
 */
export function createReticle(THREE) {
  const ringGeometry = new THREE.RingGeometry(0.15, 0.2, 32);
  ringGeometry.rotateX(-Math.PI / 2);
  
  const ringMaterial = new THREE.MeshBasicMaterial({
    color: 0x4A8C3F,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.7
  });
  
  const reticle = new THREE.Mesh(ringGeometry, ringMaterial);
  reticle.matrixAutoUpdate = false;
  reticle.visible = false;

  // Add inner dot
  const dotGeometry = new THREE.CircleGeometry(0.05, 16);
  dotGeometry.rotateX(-Math.PI / 2);
  const dotMaterial = new THREE.MeshBasicMaterial({ color: 0xFFFFFF });
  const dot = new THREE.Mesh(dotGeometry, dotMaterial);
  dot.position.y = 0.001;
  reticle.add(dot);

  return reticle;
}

/**
 * Estimate real-world scale from a photo with a reference object
 * @param {ImageData} imageData 
 * @param {Object} reference - { type: 'credit-card' | 'a4-paper' | 'custom', width: number, height: number }
 */
export function estimateScale(imageData, reference) {
  // Reference object real-world sizes in meters
  const referenceSizes = {
    'credit-card': { width: 0.0856, height: 0.054 },
    'a4-paper': { width: 0.297, height: 0.21 },
    'us-letter': { width: 0.2794, height: 0.2159 }
  };

  const refSize = referenceSizes[reference.type] || { width: reference.width || 1, height: reference.height || 1 };

  // This would use OpenCV.js contour detection in production
  // For now, return a default scale factor
  return {
    pixelsPerMeter: 200, // approximate
    referenceSize: refSize
  };
}

/**
 * Convert screen coordinates to AR world position using hit testing
 * @param {XRSession} session 
 * @param {XRRigidTransform} transform 
 * @param {XRReferenceSpace} referenceSpace 
 */
export function screenToWorld(session, transform, referenceSpace) {
  // This would be implemented with the WebXR hit-test API
  return {
    x: transform.position.x,
    y: transform.position.y,
    z: transform.position.z
  };
}

/**
 * Simple collision detection between a point and room walls
 * @param {THREE.Vector3} point 
 * @param {Array<THREE.Vector2>} wallPoints 
 */
export function isInsideRoom(point, wallPoints) {
  // Ray casting algorithm for point-in-polygon
  let inside = false;
  const n = wallPoints.length;
  
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = wallPoints[i].x, yi = wallPoints[i].y;
    const xj = wallPoints[j].x, yj = wallPoints[j].y;
    
    if ((yi > point.z) !== (yj > point.z) &&
        point.x < (xj - xi) * (point.z - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  
  return inside;
}

/**
 * Format distance for display
 * @param {number} meters 
 * @param {string} unit - 'metric' or 'imperial'
 */
export function formatDistance(meters, unit = 'metric') {
  if (unit === 'imperial') {
    const feet = meters * 3.28084;
    if (feet >= 1) {
      return `${feet.toFixed(1)} ft`;
    }
    return `${(feet * 12).toFixed(1)} in`;
  }
  
  if (meters >= 1) {
    return `${meters.toFixed(2)} m`;
  }
  return `${(meters * 100).toFixed(0)} cm`;
}

/**
 * Generate a unique session ID for analytics-free usage tracking
 */
export function generateSessionId() {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}