/**
 * Image compression utilities for product photos
 * Simplified from myPiAtlas for POS workflow
 * Target: JPEG 85%, 10MB input → 5MB output
 */

import imageCompression from 'browser-image-compression';

export interface CompressionResult {
  file: File;
  originalSize: number;
  compressedSize: number;
  compression: string;
}

export interface ImageQuality {
  resolution: 'low' | 'medium' | 'high' | 'ultra';
  megapixels: number;
  width: number;
  height: number;
  recommendedAction: string;
}

/**
 * Compress product photo for IPFS upload
 * Settings: JPEG 85%, max 10MB input, target 5MB output
 */
export async function compressProductPhoto(file: File): Promise<CompressionResult> {
  const originalSize = file.size;

  // Validate file type
  const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
  if (!ALLOWED_TYPES.includes(file.type)) {
    throw new Error('Only JPG and PNG images are allowed');
  }

  // Validate file size (10MB max)
  const MAX_SIZE = 10 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    throw new Error(`Image too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Maximum 10MB allowed.`);
  }

  // Compression settings: JPEG 85%, target 5MB
  const options = {
    maxSizeMB: 5,
    maxWidthOrHeight: 2048, // Reasonable max dimensions
    useWebWorker: true,
    fileType: 'image/jpeg',
    initialQuality: 0.85, // JPEG 85% quality
  };

  try {
    const compressedFile = await imageCompression(file, options);

    return {
      file: compressedFile,
      originalSize,
      compressedSize: compressedFile.size,
      compression: `${((1 - compressedFile.size / originalSize) * 100).toFixed(0)}%`,
    };
  } catch (error) {
    throw new Error(`Image compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Check image quality for product photos
 */
export function checkImageQuality(file: File): Promise<ImageQuality> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const megapixels = (img.width * img.height) / 1_000_000;

      let resolution: 'low' | 'medium' | 'high' | 'ultra';
      let recommendedAction: string;

      if (megapixels < 0.5) {
        resolution = 'low';
        recommendedAction = 'Low resolution - consider using a higher quality photo';
      } else if (megapixels < 2) {
        resolution = 'medium';
        recommendedAction = 'Good quality for product photos';
      } else if (megapixels < 8) {
        resolution = 'high';
        recommendedAction = 'Excellent quality';
      } else {
        resolution = 'ultra';
        recommendedAction = 'Very high quality - we will optimize it';
      }

      resolve({
        resolution,
        megapixels: Math.round(megapixels * 10) / 10,
        width: img.width,
        height: img.height,
        recommendedAction
      });
    };

    img.onerror = () => {
      resolve({
        resolution: 'low',
        megapixels: 0,
        width: 0,
        height: 0,
        recommendedAction: 'Unable to determine image quality'
      });
    };

    img.src = URL.createObjectURL(file);
  });
}