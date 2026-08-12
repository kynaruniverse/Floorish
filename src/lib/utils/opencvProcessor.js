/**
 * OpenCV.js integration for Floorish Magic Inventory
 * Processes photos into 3D-ready data using edge detection and contour analysis
 */

let cv = null;
let cvLoaded = false;
let cvLoading = false;
let cvLoadPromise = null;

/**
 * Load OpenCV.js dynamically
 */
export async function loadOpenCV() {
  if (cvLoaded) return cv;
  if (cvLoading) return cvLoadPromise;

  cvLoading = true;
  cvLoadPromise = new Promise((resolve, reject) => {
    // Check if already loaded via CDN script tag
    if (window.cv && window.cv.Mat) {
      cv = window.cv;
      cvLoaded = true;
      cvLoading = false;
      resolve(cv);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
    script.async = true;
    
    script.onload = () => {
      // OpenCV.js sets cv on load, but may need initialization
      const checkInterval = setInterval(() => {
        if (window.cv && window.cv.Mat) {
          clearInterval(checkInterval);
          cv = window.cv;
          cvLoaded = true;
          cvLoading = false;
          resolve(cv);
        }
      }, 100);

      // Timeout after 30 seconds
      setTimeout(() => {
        if (!cvLoaded) {
          clearInterval(checkInterval);
          cvLoading = false;
          reject(new Error('OpenCV.js failed to initialize'));
        }
      }, 30000);
    };

    script.onerror = () => {
      cvLoading = false;
      reject(new Error('Failed to load OpenCV.js script'));
    };

    document.head.appendChild(script);
  });

  return cvLoadPromise;
}

/**
 * Process an image for furniture extraction
 * @param {HTMLImageElement|ImageData} imageSource - The image to process
 * @param {Object} options - Processing options
 * @returns {Object} Processed data including contours, edges, and measurements
 */
export async function processFurnitureImage(imageSource, options = {}) {
  const {
    cannyThreshold1 = 50,
    cannyThreshold2 = 150,
    blurKernelSize = 5,
    minContourArea = 500,
    referenceObjectHeight = null, // meters, for scale estimation
    referenceObjectPixels = null  // pixel height of reference in image
  } = options;

  await loadOpenCV();
  if (!cvLoaded) throw new Error('OpenCV not loaded');

  // Convert image to cv.Mat
  let src;
  if (imageSource instanceof HTMLImageElement) {
    src = cv.imread(imageSource);
  } else if (imageSource instanceof ImageData) {
    src = cv.matFromImageData(imageSource);
  } else {
    throw new Error('Unsupported image source type');
  }

  // Create result object
  const result = {
    originalWidth: src.cols,
    originalHeight: src.rows,
    contours: [],
    boundingBox: null,
    edgeImage: null,
    silhouetteImage: null,
    estimatedDimensions: null,
    processingSteps: []
  };

  try {
    // Step 1: Convert to grayscale
    const gray = new cv.Mat();
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY);
    result.processingSteps.push('grayscale');

    // Step 2: Apply Gaussian blur to reduce noise
    const blurred = new cv.Mat();
    const ksize = new cv.Size(blurKernelSize, blurKernelSize);
    cv.GaussianBlur(gray, blurred, ksize, 0);
    result.processingSteps.push('blur');

    // Step 3: Edge detection with Canny
    const edges = new cv.Mat();
    cv.Canny(blurred, edges, cannyThreshold1, cannyThreshold2);
    result.edgeImage = edges;
    result.processingSteps.push('edge-detection');

    // Step 4: Dilate edges to close gaps
    const dilated = new cv.Mat();
    const dilationKernel = cv.Mat.ones(3, 3, cv.CV_8U);
    cv.dilate(edges, dilated, dilationKernel);
    dilationKernel.delete();
    result.processingSteps.push('dilation');

    // Step 5: Find contours
    const contours = new cv.MatVector();
    const hierarchy = new cv.Mat();
    cv.findContours(dilated, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    // Step 6: Filter and process contours
    const validContours = [];
    let largestContour = null;
    let largestArea = 0;

    for (let i = 0; i < contours.size(); i++) {
      const contour = contours.get(i);
      const area = cv.contourArea(contour);

      if (area > minContourArea) {
        // Approximate polygon
        const peri = cv.arcLength(contour, true);
        const approx = new cv.Mat();
        cv.approxPolyDP(contour, approx, 0.02 * peri, true);

        // Bounding rectangle
        const rect = cv.boundingRect(contour);

        validContours.push({
          index: i,
          area,
          perimeter: peri,
          vertices: approx.size().height, // number of vertices
          boundingRect: {
            x: rect.x,
            y: rect.y,
            width: rect.width,
            height: rect.height
          }
        });

        if (area > largestArea) {
          largestArea = area;
          largestContour = {
            contour,
            boundingRect: rect,
            area
          };
        }

        approx.delete();
      }
    }

    result.contours = validContours;

    // Step 7: Create silhouette (mask of the detected object)
    if (largestContour) {
      const mask = cv.Mat.zeros(src.rows, src.cols, cv.CV_8UC1);
      const contourVec = new cv.MatVector();
      contourVec.push_back(largestContour.contour);
      
      // Fill the contour
      const color = new cv.Scalar(255);
      cv.drawContours(mask, contourVec, 0, color, cv.FILLED);
      
      // Apply mask to original
      const silhouette = new cv.Mat();
      src.copyTo(silhouette, mask);
      result.silhouetteImage = silhouette;
      
      // Store bounding box
      result.boundingBox = {
        x: largestContour.boundingRect.x,
        y: largestContour.boundingRect.y,
        width: largestContour.boundingRect.width,
        height: largestContour.boundingRect.height,
        area: largestContour.area
      };

      // Step 8: Estimate dimensions
      result.estimatedDimensions = estimateDimensions(
        largestContour.boundingRect,
        src.rows,
        referenceObjectHeight,
        referenceObjectPixels
      );

      contourVec.delete();
      mask.delete();
      color.delete();
    }

    // Cleanup intermediate Mats
    gray.delete();
    blurred.delete();
    dilated.delete();
    contours.delete();
    hierarchy.delete();

  } catch (err) {
    console.error('OpenCV processing error:', err);
    throw err;
  } finally {
    // Don't delete src — caller may need it for display
  }

  return result;
}

/**
 * Estimate real-world dimensions from pixel measurements
 */
function estimateDimensions(boundingRect, imageHeight, refHeightMeters, refHeightPixels) {
  // Default: assume image represents roughly 2m in height
  const defaultScale = 2.0 / imageHeight;
  
  let pixelsPerMeter;
  if (refHeightMeters && refHeightPixels) {
    pixelsPerMeter = refHeightPixels / refHeightMeters;
  } else {
    pixelsPerMeter = 1 / defaultScale;
  }

  return {
    width: boundingRect.width / pixelsPerMeter,
    height: boundingRect.height / pixelsPerMeter,
    depth: Math.min(boundingRect.width, boundingRect.height) / pixelsPerMeter * 0.8, // estimate depth
    confidence: refHeightMeters ? 'high' : 'low',
    pixelsPerMeter
  };
}

/**
 * Generate a textured 3D mesh from silhouette
 * Uses simple extrusion based on contour shape
 */
export function generate3DData(processingResult) {
  if (!processingResult.boundingBox || !processingResult.estimatedDimensions) {
    return null;
  }

  const { boundingBox, estimatedDimensions, edgeImage } = processingResult;
  
  // Create basic 3D model data
  // This is a simplified box model — in production you'd use
  // the actual contour shape for more accurate geometry
  const modelData = {
    type: 'extruded-box',
    dimensions: estimatedDimensions,
    // Convert edge image to base64 for texture
    textureData: edgeImage ? matToDataURL(edgeImage) : null,
    // Store bounding info for positioning
    anchor: {
      x: boundingBox.x / processingResult.originalWidth,
      y: boundingBox.y / processingResult.originalHeight
    },
    // Simple box geometry (8 vertices, 12 triangles)
    geometry: generateBoxGeometry(estimatedDimensions),
    // UV coordinates for texture mapping
    uvs: generateBoxUVs()
  };

  return modelData;
}

/**
 * Convert cv.Mat to data URL
 */
function matToDataURL(mat) {
  const canvas = document.createElement('canvas');
  canvas.width = mat.cols;
  canvas.height = mat.rows;
  cv.imshow(canvas, mat);
  return canvas.toDataURL('image/png');
}

/**
 * Generate simple box geometry
 */
function generateBoxGeometry(dimensions) {
  const w = dimensions.width / 2;
  const h = dimensions.height / 2;
  const d = dimensions.depth / 2;

  return {
    vertices: [
      // Front face
      -w, -h,  d,   w, -h,  d,   w,  h,  d,  -w,  h,  d,
      // Back face
      -w, -h, -d,  -w,  h, -d,   w,  h, -d,   w, -h, -d,
      // Top face
      -w,  h, -d,  -w,  h,  d,   w,  h,  d,   w,  h, -d,
      // Bottom face
      -w, -h, -d,   w, -h, -d,   w, -h,  d,  -w, -h,  d,
      // Right face
       w, -h, -d,   w,  h, -d,   w,  h,  d,   w, -h,  d,
      // Left face
      -w, -h, -d,  -w, -h,  d,  -w,  h,  d,  -w,  h, -d
    ],
    indices: [
      0,1,2, 0,2,3,    // front
      4,5,6, 4,6,7,    // back
      8,9,10, 8,10,11,  // top
      12,13,14, 12,14,15, // bottom
      16,17,18, 16,18,19, // right
      20,21,22, 20,22,23  // left
    ]
  };
}

/**
 * Generate UV coordinates for box mapping
 */
function generateBoxUVs() {
  // Standard box UV unwrap
  return [
    // Front
    0,0, 1,0, 1,1, 0,1,
    // Back
    0,0, 1,0, 1,1, 0,1,
    // Top
    0,0, 1,0, 1,1, 0,1,
    // Bottom
    0,0, 1,0, 1,1, 0,1,
    // Right
    0,0, 1,0, 1,1, 0,1,
    // Left
    0,0, 1,0, 1,1, 0,1
  ];
}

/**
 * Clean up OpenCV resources
 */
export function disposeOpenCV() {
  // OpenCV.js doesn't have a formal dispose method for the library,
  // but individual Mats should be deleted with .delete()
  cv = null;
  cvLoaded = false;
  cvLoading = false;
}