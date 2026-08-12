/**
 * MediaPipe integration for body tracking in AR mode
 * Enables realistic avatar placement and room-scale interactions
 */

import { FilesetResolver, PoseLandmarker } from '@mediapipe/tasks-vision';

let poseLandmarker = null;
let initialized = false;

/**
 * Initialize MediaPipe Pose Landmarker
 */
export async function initBodyTracking() {
  if (initialized) return poseLandmarker;

  try {
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm'
    );

    poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: 'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task',
        delegate: 'GPU'
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5
    });

    initialized = true;
    return poseLandmarker;
  } catch (err) {
    console.error('MediaPipe initialization failed:', err);
    throw err;
  }
}

/**
 * Detect body pose from video frame
 * @param {HTMLVideoElement} videoElement 
 * @param {number} timestamp 
 */
export async function detectPose(videoElement, timestamp) {
  if (!poseLandmarker) {
    await initBodyTracking();
  }

  const result = poseLandmarker.detectForVideo(videoElement, timestamp);
  
  if (result.landmarks && result.landmarks.length > 0) {
    return processLandmarks(result.landmarks[0]);
  }
  
  return null;
}

/**
 * Process raw landmarks into useful body data
 */
function processLandmarks(landmarks) {
  // Key landmark indices
  const KEYPOINTS = {
    NOSE: 0,
    LEFT_EYE: 1,
    RIGHT_EYE: 2,
    LEFT_SHOULDER: 11,
    RIGHT_SHOULDER: 12,
    LEFT_HIP: 23,
    RIGHT_HIP: 24,
    LEFT_KNEE: 25,
    RIGHT_KNEE: 26,
    LEFT_ANKLE: 27,
    RIGHT_ANKLE: 28
  };

  const getPoint = (index) => ({
    x: landmarks[index].x,
    y: landmarks[index].y,
    z: landmarks[index].z,
    visibility: landmarks[index].visibility
  });

  // Calculate body metrics
  const leftShoulder = getPoint(KEYPOINTS.LEFT_SHOULDER);
  const rightShoulder = getPoint(KEYPOINTS.RIGHT_SHOULDER);
  const leftHip = getPoint(KEYPOINTS.LEFT_HIP);
  const rightHip = getPoint(KEYPOINTS.RIGHT_HIP);

  // Estimate height from landmarks
  const shoulderWidth = Math.abs(rightShoulder.x - leftShoulder.x);
  const torsoHeight = Math.abs(
    (leftShoulder.y + rightShoulder.y) / 2 - (leftHip.y + rightHip.y) / 2
  );
  
  // Rough height estimation based on proportions
  const estimatedHeight = torsoHeight * 3.3; // torso is ~30% of height

  return {
    keypoints: {
      nose: getPoint(KEYPOINTS.NOSE),
      leftEye: getPoint(KEYPOINTS.LEFT_EYE),
      rightEye: getPoint(KEYPOINTS.RIGHT_EYE),
      leftShoulder,
      rightShoulder,
      leftHip,
      rightHip,
      leftKnee: getPoint(KEYPOINTS.LEFT_KNEE),
      rightKnee: getPoint(KEYPOINTS.RIGHT_KNEE),
      leftAnkle: getPoint(KEYPOINTS.LEFT_ANKLE),
      rightAnkle: getPoint(KEYPOINTS.RIGHT_ANKLE)
    },
    metrics: {
      shoulderWidth,
      torsoHeight,
      estimatedHeight,
      // Estimate eye level for AR camera height
      eyeLevel: getPoint(KEYPOINTS.NOSE).y - 0.05
    },
    // Overall tracking confidence
    confidence: landmarks.reduce((sum, lm) => sum + (lm.visibility || 0), 0) / landmarks.length
  };
}

/**
 * Create a simple avatar skeleton in Three.js
 * @param {THREE} THREE - Three.js library
 * @param {Object} poseData - Processed pose data
 */
export function createPoseSkeleton(THREE, poseData) {
  if (!poseData || !poseData.keypoints) return null;

  const skeleton = new THREE.Group();
  const jointRadius = 0.03;
  const boneRadius = 0.015;
  
  const jointMaterial = new THREE.MeshStandardMaterial({ color: 0x4A8C3F });
  const boneMaterial = new THREE.MeshStandardMaterial({ color: 0x8CC97A });

  // Create joints
  const joints = {};
  for (const [name, point] of Object.entries(poseData.keypoints)) {
    if (point.visibility < 0.5) continue;
    
    const sphereGeom = new THREE.SphereGeometry(jointRadius, 8, 8);
    const joint = new THREE.Mesh(sphereGeom, jointMaterial);
    joint.position.set(point.x - 0.5, -point.y + 1, point.z);
    joint.userData = { jointName: name };
    skeleton.add(joint);
    joints[name] = joint;
  }

  // Create bones (connections)
  const boneConnections = [
    ['leftShoulder', 'leftHip'],
    ['rightShoulder', 'rightHip'],
    ['leftHip', 'leftKnee'],
    ['rightHip', 'rightKnee'],
    ['leftKnee', 'leftAnkle'],
    ['rightKnee', 'rightAnkle'],
    ['leftShoulder', 'rightShoulder'],
    ['leftHip', 'rightHip']
  ];

  for (const [from, to] of boneConnections) {
    if (joints[from] && joints[to]) {
      const bone = createBone(THREE, joints[from].position, joints[to].position, boneMaterial);
      skeleton.add(bone);
    }
  }

  return skeleton;
}

/**
 * Create a cylinder bone between two points
 */
function createBone(THREE, start, end, material) {
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  const midPoint = new THREE.Vector3().addVectors(start, end).multiplyScalar(0.5);

  const geometry = new THREE.CylinderGeometry(0.015, 0.015, length, 8);
  const bone = new THREE.Mesh(geometry, material);
  bone.position.copy(midPoint);

  // Align cylinder with direction
  const axis = new THREE.Vector3(0, 1, 0);
  const quaternion = new THREE.Quaternion().setFromUnitVectors(axis, direction.normalize());
  bone.setRotationFromQuaternion(quaternion);

  return bone;
}

/**
 * Clean up MediaPipe resources
 */
export function disposeBodyTracking() {
  if (poseLandmarker) {
    poseLandmarker.close();
    poseLandmarker = null;
  }
  initialized = false;
}