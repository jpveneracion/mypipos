'use client';

import { useState, useCallback } from 'react';
import { Upload, X, Check, AlertCircle, Loader2 } from 'lucide-react';
import { compressProductPhoto, checkImageQuality } from '@/lib/image-compression';
import { createUploadReservation, confirmUploadReservation, cancelUploadReservation } from '@/lib/two-phase-upload';

interface ProductPhotoUploadProps {
  merchantId: string;
  productId?: string;
  onUploadSuccess: (ipfsHash: string) => void;
  currentPhoto?: string;
  disabled?: boolean;
}

interface UploadState {
  stage: 'idle' | 'compressing' | 'uploading' | 'saving' | 'success' | 'error';
  progress: number;
  message: string;
  error?: string;
}

export default function ProductPhotoUpload({
  merchantId,
  productId,
  onUploadSuccess,
  currentPhoto,
  disabled = false,
}: ProductPhotoUploadProps) {
  const [uploadState, setUploadState] = useState<UploadState>({
    stage: 'idle',
    progress: 0,
    message: '',
  });
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [reservationId, setReservationId] = useState<string | null>(null);

  const handleFileSelect = useCallback(async (selectedFile: File) => {
    if (disabled) return;

    try {
      setUploadState({
        stage: 'compressing',
        progress: 20,
        message: 'Optimizing image...',
      });

      // Validate file type
      const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png'];
      if (!ALLOWED_TYPES.includes(selectedFile.type)) {
        throw new Error('Only JPG and PNG images are allowed');
      }

      // Validate file size
      const MAX_SIZE = 10 * 1024 * 1024;
      if (selectedFile.size > MAX_SIZE) {
        throw new Error(`Image too large (${(selectedFile.size / 1024 / 1024).toFixed(1)}MB). Maximum 10MB allowed.`);
      }

      // Check image quality
      const quality = await checkImageQuality(selectedFile);
      console.log('Image quality:', quality);

      // Compress image
      const compressionResult = await compressProductPhoto(selectedFile);
      console.log('Compression result:', compressionResult);

      setFile(compressionResult.file);
      setPreview(URL.createObjectURL(compressionResult.file));

      setUploadState({
        stage: 'idle',
        progress: 0,
        message: `Optimized: ${compressionResult.compression} reduction`,
      });
    } catch (error) {
      console.error('Image processing failed:', error);
      setUploadState({
        stage: 'error',
        progress: 0,
        message: '',
        error: error instanceof Error ? error.message : 'Failed to process image',
      });
    }
  }, [disabled]);

  const handleUpload = useCallback(async () => {
    if (!file || disabled) return;

    try {
      // Create upload reservation
      const reservation = createUploadReservation(merchantId, productId);
      setReservationId(reservation.id);

      setUploadState({
        stage: 'uploading',
        progress: 40,
        message: 'Uploading to IPFS...',
      });

      // Upload to server
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/products/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      console.log('Upload result:', result);

      setUploadState({
        stage: 'saving',
        progress: 80,
        message: 'Saving photo...',
      });

      // Call success callback
      onUploadSuccess(result.ipfsHash);

      // Confirm reservation
      if (reservationId) {
        confirmUploadReservation(reservationId);
      }

      setUploadState({
        stage: 'success',
        progress: 100,
        message: 'Photo saved successfully!',
      });

      // Clear success message after 3 seconds
      setTimeout(() => {
        setUploadState({
          stage: 'idle',
          progress: 0,
          message: '',
        });
      }, 3000);

    } catch (error) {
      console.error('Upload failed:', error);

      // Cancel reservation on error
      if (reservationId) {
        cancelUploadReservation(reservationId);
      }

      setUploadState({
        stage: 'error',
        progress: 0,
        message: '',
        error: error instanceof Error ? error.message : 'Upload failed',
      });
    }
  }, [file, merchantId, productId, onUploadSuccess, disabled, reservationId]);

  const handleClear = useCallback(() => {
    if (preview) {
      URL.revokeObjectURL(preview);
    }
    setFile(null);
    setPreview(null);
    setUploadState({
      stage: 'idle',
      progress: 0,
      message: '',
    });
  }, [preview]);

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
        {preview ? (
          // Preview mode
          <div className="space-y-4">
            <div className="relative">
              <img
                src={preview}
                alt="Product preview"
                className="w-full h-48 object-cover rounded-lg"
              />
              <button
                onClick={handleClear}
                disabled={disabled}
                className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            {/* Upload Progress */}
            {uploadState.stage !== 'idle' && uploadState.stage !== 'error' && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  {uploadState.stage === 'compressing' && <Loader2 size={16} className="animate-spin" />}
                  {uploadState.stage === 'uploading' && <Loader2 size={16} className="animate-spin" />}
                  {uploadState.stage === 'saving' && <Loader2 size={16} className="animate-spin" />}
                  {uploadState.stage === 'success' && <Check size={16} className="text-green-500" />}
                  <span className="text-gray-700 dark:text-gray-300">{uploadState.message}</span>
                </div>

                {uploadState.progress > 0 && uploadState.stage !== 'success' && (
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all"
                      style={{ width: `${uploadState.progress}%` }}
                    />
                  </div>
                )}
              </div>
            )}

            {/* Upload Button */}
            {uploadState.stage === 'idle' && (
              <button
                onClick={handleUpload}
                disabled={disabled}
                className="w-full py-2 px-4 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:opacity-50 font-medium"
              >
                Upload Photo
              </button>
            )}
          </div>
        ) : (
          // Upload mode
          <div className="text-center">
            <input
              type="file"
              id="photo-upload"
              className="hidden"
              accept="image/jpeg,image/jpg,image/png"
              onChange={(e) => {
                const selectedFile = e.target.files?.[0];
                if (selectedFile) {
                  handleFileSelect(selectedFile);
                }
              }}
              disabled={disabled}
            />
            <label
              htmlFor="photo-upload"
              className={`cursor-pointer flex flex-col items-center gap-2 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Upload size={32} className="text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300 font-medium">
                Click to upload product photo
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                JPG or PNG, max 10MB
              </span>
            </label>
          </div>
        )}

        {/* Error Display */}
        {uploadState.stage === 'error' && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <AlertCircle size={16} className="text-red-500" />
            <span className="text-sm text-red-700 dark:text-red-300">{uploadState.error}</span>
          </div>
        )}

        {/* Current Photo Display */}
        {currentPhoto && !preview && (
          <div className="mt-4">
            <span className="text-sm text-gray-600 dark:text-gray-400">Current photo:</span>
            <img
              src={`https://gateway.pinata.cloud/ipfs/${currentPhoto}`}
              alt="Current product"
              className="mt-2 w-full h-48 object-cover rounded-lg"
            />
          </div>
        )}
      </div>
    </div>
  );
}
