'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

export default function BarcodeScanner({ onScan, onClose }: BarcodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [usePiCompatibility, setUsePiCompatibility] = useState(false);
  const [scannerInitialized, setScannerInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameraSupported, setCameraSupported] = useState(true);

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
    onClose();
  };

  // Check camera support on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hasCamera = navigator.mediaDevices && 'getUserMedia' in navigator.mediaDevices;
      setCameraSupported(hasCamera);

      if (!hasCamera) {
        setError('Camera access is not supported in this browser. Please use the file upload method below.');
      }
    }
  }, []);

  // Initialize scanner when scanning state changes
  useEffect(() => {
    if (scanning && !scannerInitialized && cameraSupported) {
      const initializeScanner = async () => {
        try {
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
            },
            () => {}
          );
          setScannerInitialized(true);
          setError(null);
        } catch (err: any) {
          console.error('Error initializing scanner:', err);
          const errorMsg = err?.message || 'Failed to start camera';
          if (errorMsg.includes('Camera streaming not supported') || errorMsg.includes('NotAllowedError')) {
            setError('Camera access denied or not supported. Please check permissions or use file upload.');
          } else {
            setError('Failed to start camera: ' + errorMsg);
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
      <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl max-w-md w-full p-6 shadow-2xl border-2 border-purple-500">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Scan Barcode/QR</h2>
          <button onClick={handleScannerClose} className="text-purple-300 hover:text-white text-2xl font-bold">×</button>
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
          <div className="mb-4 p-3 bg-red-900/50 border border-red-500 rounded-lg">
            <p className="text-red-200 text-sm font-semibold mb-2">⚠️ Camera Error</p>
            <p className="text-red-300 text-xs">{error}</p>
            <button
              onClick={() => setError(null)}
              className="mt-2 text-xs text-red-400 hover:text-red-200 underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {scanning ? (
          <div className="space-y-4">
            {usePiCompatibility && (
              <p className="text-yellow-500 text-xs text-center mb-2">⚡ Running in Pi Browser Compatibility Mode</p>
            )}
            <div className="bg-black rounded-xl overflow-hidden border border-purple-500">
              <div id="pi-scanner-region" className="w-full h-64" />
            </div>
            <div className="flex items-center justify-center gap-2 text-purple-300">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span>Scanning...</span>
            </div>
            <button
              onClick={async () => {
                await stopScanner();
                setScanning(false);
              }}
              className="w-full py-2 rounded-lg bg-red-600 text-white text-sm font-semibold hover:bg-red-700"
            >
              Stop Scanner
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <button
              onClick={openNativeScanner}
              disabled={scanning || !cameraSupported}
              className="w-full px-4 py-6 rounded-xl bg-green-700 border border-dashed border-green-500 text-white text-sm text-center hover:bg-green-600 hover:border-green-400 transition-colors flex flex-col items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Camera className="w-6 h-6" />
              {scanning ? 'Starting Scanner...' :
               !cameraSupported ? '📷 Camera Not Available' :
               '📱 Live Scanner (Recommended)'}
            </button>

            <div className="text-center text-purple-300 text-sm">
              or
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-6 rounded-xl bg-purple-800 border border-dashed border-purple-600 text-purple-200 text-sm text-center hover:border-purple-400 hover:text-purple-300 transition-colors flex flex-col items-center gap-2"
            >
              <Camera className="w-6 h-6" />
              📷 Camera Method
            </button>
          </div>
        )}

        <div className="mt-4 p-3 bg-purple-800/50 border border-purple-600 rounded-lg text-sm">
          <p className="font-semibold mb-1 text-purple-200">💡 Scanning Tips:</p>
          <ul className="text-xs space-y-1 text-purple-300">
            <li>• Ensure good lighting on the barcode</li>
            <li>• Hold camera steady and parallel to barcode</li>
            <li>• Works with standard UPC, EAN, and QR codes</li>
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
      alert('Failed to scan barcode. Please try again.');
    }
  }
}