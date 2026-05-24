'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
  mode?: 'product' | 'customer';
}

export default function BarcodeScanner({ onScan, onClose, mode = 'product' }: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [usePiCompatibility, setUsePiCompatibility] = useState(false);
  const [scannerInitialized, setScannerInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraSupported, setCameraSupported] = useState(true);
  const [cameraFailed, setCameraFailed] = useState(false);

  const isCustomerMode = mode === 'customer';
  const scannerTitle = isCustomerMode ? 'Scan Customer QR Code' : 'Scan Product Barcode';
  const scannerHint = isCustomerMode ? 'Scan customer Pi Network QR code to identify them' : 'Scan product barcode to add to cart';

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
    setScannerInitialized(false);
  };

  const handleScannerClose = async () => {
    await stopScanner();
    setError(null);
    setCameraFailed(false);
    onClose();
  };

  // Check camera support and HTTPS on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const isSecureContext = window.isSecureContext || window.location.protocol === 'http:' && window.location.hostname === 'localhost';
      const hasCamera = navigator.mediaDevices && 'getUserMedia' in navigator.mediaDevices;
      setCameraSupported(hasCamera && isSecureContext);

      if (!hasCamera) {
        setError('Camera access is not supported in this browser. Please use the file upload method below.');
        setCameraFailed(true);
      } else if (!isSecureContext) {
        setError('Camera access requires HTTPS or localhost. Please use the file upload method below.');
        setCameraFailed(true);
      }
    }
  }, []);

  // Initialize scanner when scanning state changes
  useEffect(() => {
    if (scanning && !scannerInitialized && cameraSupported) {
      const initializeScanner = async () => {
        try {
          setCameraFailed(false);
          const html5QrCode = new Html5Qrcode("pi-scanner-region");
          scannerRef.current = html5QrCode;

          const config = {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          };

          await html5QrCode.start(
            { facingMode: "environment" },
            config,
            (decodedText: string) => {
              onScan(decodedText);
              stopScanner();
              setScanning(false);
              setError(null);
              setCameraFailed(false);
            },
            () => {}
          );
          setScannerInitialized(true);
          setError(null);
          setCameraFailed(false);
        } catch (err: any) {
          console.error('Error initializing scanner:', err);
          const errorMsg = err?.message || 'Failed to start camera';

          if (errorMsg.includes('Camera streaming not supported') ||
              errorMsg.includes('NotAllowedError') ||
              errorMsg.includes('Permission denied') ||
              errorMsg.includes('NotFoundError')) {
            setError('⚠️ Camera access failed. Please: 1) Allow camera permissions, 2) Use HTTPS/localhost, or 3) Try file upload below.');
            setCameraFailed(true);
          } else if (errorMsg.includes('NotAllowedError')) {
            setError('⚠️ Camera permission denied. Please allow camera access or use the file upload method below.');
            setCameraFailed(true);
          } else {
            setError('⚠️ Camera error: ' + errorMsg + '. Please try the file upload method below.');
            setCameraFailed(true);
          }
          setScanning(false);
          setScannerInitialized(false);
        }
      };

      // Small delay to ensure DOM is ready
      setTimeout(initializeScanner, 100);
    }

    // Cleanup on unmount
    return () => {
      if (scannerRef.current?.isScanning) {
        scannerRef.current.stop().catch(console.error);
      }
    };
  }, [scanning, scannerInitialized, cameraSupported]);

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999] p-4">
      <div className="bg-linear-to-r from-primary-900 to-secondary-900 rounded-2xl max-w-md w-full p-6 shadow-strong border-2 border-primary-500">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">{scannerTitle}</h2>
          <button onClick={handleScannerClose} className="text-primary-300 hover:text-white text-2xl font-bold">×</button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-error-900/50 border border-red-500 rounded-lg">
            <p className="text-error200 text-sm font-semibold mb-2">⚠️ Camera Error</p>
            <p className="text-error300 text-xs">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-xs text-error400 hover:text-error200 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {scanning ? (
          <div className="space-y-4">
            {usePiCompatibility && (
              <p className="text-warning-500 text-xs text-center mb-2">⚡ Running in Pi Browser Compatibility Mode</p>
            )}
            <div className="bg-black rounded-xl overflow-hidden border border-primary-500">
              <div id="pi-scanner-region" className="w-full h-64" />
            </div>
            <div className="flex items-center justify-center gap-2 text-primary-300">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Starting camera...</span>
            </div>
            <button
              onClick={async () => {
                await stopScanner();
                setScanning(false);
              }}
              className="w-full py-2 rounded-lg bg-error-600 text-white text-sm font-semibold hover:bg-error-700"
            >
              Cancel & Try File Upload
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Show file upload first if camera failed */}
            {cameraFailed ? (
              <>
                <div className="bg-yellow-900/30 border border-yellow-600 rounded-lg p-3 text-center">
                  <p className="text-warning-200 text-sm font-semibold mb-2">📷 Camera Not Available</p>
                  <p className="text-warning-300 text-xs">Use file upload to scan barcodes from images</p>
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-6 rounded-xl bg-success-700 border border-dashed border-green-500 text-white text-sm text-center hover:bg-success-600 hover:border-green-400 transition-colors flex flex-col items-center gap-2"
                >
                  <Camera className="w-6 h-6" />
                  📷 Upload Barcode Image (Recommended)
                </button>

                <button
                  onClick={() => {
                    setError(null);
                    setCameraFailed(false);
                    openNativeScanner();
                  }}
                  className="w-full px-4 py-3 rounded-xl bg-gray-700 border border-gray-600 text-gray-300 text-xs text-center hover:bg-gray-600 transition-colors"
                >
                  🔄 Retry Camera Access
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={openNativeScanner}
                  disabled={scanning || !cameraSupported}
                  className="w-full px-4 py-6 rounded-xl bg-success-700 border border-dashed border-green-500 text-white text-sm text-center hover:bg-success-600 hover:border-green-400 transition-colors flex flex-col items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Camera className="w-6 h-6" />
                  {scanning ? 'Starting Scanner...' :
                   !cameraSupported ? '📷 Camera Not Available' :
                   '📱 Live Scanner (Recommended)'}
                </button>

                <div className="text-center text-primary-300 text-sm">
                  or
                </div>

                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full px-4 py-6 rounded-xl bg-primary-800 border border-dashed border-primary-600 text-primary-200 text-sm text-center hover:border-primary-400 hover:text-primary-300 transition-colors flex flex-col items-center gap-2"
                >
                  <Camera className="w-6 h-6" />
                  📷 Upload Barcode Image
                </button>
              </>
            )}
          </div>
        )}

        <div className="mt-4 p-3 bg-primary-800/50 border border-primary-600 rounded-lg text-sm">
          <p className="font-semibold mb-1 text-primary-200">💡 {isCustomerMode ? 'Customer Scanning Tips:' : 'Scanning Tips:'}</p>
          <ul className="text-xs space-y-1 text-primary-300">
            {isCustomerMode ? (
              <>
                <li>• Scan customer's Pi Network QR code from their app</li>
                <li>• QR code contains their Pi username for identification</li>
                <li>• Customer will be linked to this sale</li>
                <li>• Ensure good lighting for clear QR code detection</li>
              </>
            ) : (
              <>
                <li>• For camera: Allow permissions and use HTTPS/localhost</li>
                <li>• For file upload: Take clear photo of barcode</li>
                <li>• Works with standard UPC, EAN, and QR codes</li>
                <li>• Ensure good lighting and hold camera steady</li>
              </>
            )}
          </ul>
        </div>
      </div>
    </div>
  );

  function openNativeScanner() {
    setUsePiCompatibility(true);
    setScanning(true);
  }

  async function handleFileSelect(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const html5QrCode = new Html5Qrcode("file-scanner-" + Date.now());
      const decodedText = await html5QrCode.scanFile(file, true);
      onScan(decodedText);
      onClose();
    } catch (err) {
      console.error('Error scanning file:', err);
      alert('Failed to scan barcode from image. Please ensure the barcode is clearly visible and try again.');
    }
  }
}