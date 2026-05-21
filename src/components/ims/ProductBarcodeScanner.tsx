'use client';

import { useState, useRef, useEffect } from 'react';
import { Camera, X, Loader2 } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';

interface ProductBarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose: () => void;
}

interface PhotoFile {
  file: File;
  preview: string;
}

export default function ProductBarcodeScanner({ onScan, onClose }: ProductBarcodeScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [usePiCompatibility, setUsePiCompatibility] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const ua = navigator.userAgent;
      const isPiBrowser = ua.includes('PiBrowser');
      const hasNativeSupport = 'BarcodeDetector' in window;

      if (isPiBrowser || !hasNativeSupport) {
        console.log('Pi Browser or missing hardware API detected. Using JS compatibility mode.');
        setUsePiCompatibility(true);
      }
    }
  }, []);

  const startHtml5QrcodeScanner = async () => {
    try {
      // First check if camera access is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API not available in this browser');
      }

      setScanning(true);

      const scannerId = 'pi-scanner-region';
      const scanner = new Html5Qrcode(scannerId);
      scannerRef.current = scanner;

      // Try with simplified camera config for better compatibility
      await scanner.start(
        { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 200, height: 200 },
          aspectRatio: 1.0
        },
        (decodedText) => {
          // Barcode detected successfully
          scanner.stop();
          setScanning(false);
          onScan(decodedText);
        },
        (errorMessage) => {
          // Suppress continuous frame errors in WebView
        }
      );

      // Auto-stop after 30 seconds
      setTimeout(() => {
        if (scanner.isScanning) {
          scanner.stop();
          setScanning(false);
          alert('No barcode detected within 30 seconds. Try again.');
        }
      }, 30000);

    } catch (error) {
      console.error('Camera access error:', error);
      setScanning(false);

      // More helpful error message
      if (error instanceof Error) {
        if (error.message.includes('Permission')) {
          alert('Camera permission denied. Please allow camera access and try again, or use the Camera Method below.');
        } else if (error.message.includes('API')) {
          alert('Camera not available in this browser. Please use the Camera Method below.');
        } else {
          alert('Camera access failed: ' + error.message + '\n\nPlease try the Camera Method below.');
        }
      } else {
        alert('Camera access failed. Please try the Camera Method below.');
      }
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setScanning(true);

      const html5QrCode = new Html5Qrcode('pi-file-scanner');

      try {
        const decodedText = await html5QrCode.scanFile(file, true);
        setScanning(false);
        onScan(decodedText);
      } catch (scanError) {
        throw new Error('No barcode detected in image');
      }

    } catch (error) {
      console.error('File scan error:', error);
      const manualBarcode = prompt('Failed to detect barcode automatically. Please enter the barcode manually:', '');
      if (manualBarcode && manualBarcode.trim()) {
        onScan(manualBarcode.trim());
      }
      setScanning(false);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current?.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (err) {
        console.error('Error stopping scanner:', err);
      }
    }
  };

  const handleScannerClose = async () => {
    await stopScanner();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-[9999] p-4">
      <div className="bg-gradient-to-br from-purple-900 to-indigo-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl border-2 border-purple-500">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-xl font-bold text-white">📷 Scan Product Barcode</h2>
            <p className="text-sm text-purple-200">Add products to inventory via camera</p>
          </div>
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
              onClick={startHtml5QrcodeScanner}
              disabled={scanning}
              className="w-full px-4 py-6 rounded-xl bg-green-700 border border-dashed border-green-500 text-white text-sm text-center hover:bg-green-600 hover:border-green-400 transition-colors flex flex-col items-center gap-2 disabled:opacity-50"
            >
              <Camera className="w-6 h-6" />
              📱 Live Scanner
            </button>

            <div className="text-center text-purple-300 text-sm">
              or
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full px-4 py-6 rounded-xl bg-purple-800 border border-dashed border-purple-600 text-purple-200 text-sm text-center hover:border-purple-400 hover:text-purple-300 transition-colors flex flex-col items-center gap-2"
            >
              <Camera className="w-6 h-6" />
              📷 Camera Method (More Reliable)
            </button>

            <div className="text-center text-purple-300 text-sm">
              or
            </div>

            <button
              onClick={() => {
                const manualBarcode = prompt('Enter barcode number manually:', '');
                if (manualBarcode && manualBarcode.trim()) {
                  onScan(manualBarcode.trim());
                }
              }}
              className="w-full px-4 py-4 rounded-xl bg-indigo-800 border border-dashed border-indigo-600 text-indigo-200 text-sm text-center hover:border-indigo-400 hover:text-indigo-300 transition-colors flex flex-col items-center gap-2"
            >
              🖐️ Manual Entry
            </button>

            {usePiCompatibility && (
              <p className="text-yellow-500 text-xs text-center">
                💡 Pi Browser: Use Manual Entry if scanning fails
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onClose}
                className="bg-purple-800 text-purple-200 py-3 rounded-lg font-semibold hover:bg-purple-700"
              >
                ❌ Cancel
              </button>
            </div>

            <div id="pi-file-scanner" className="hidden" />
          </div>
        )}

        <div className="mt-4 p-3 bg-purple-800/50 border border-purple-600 rounded-lg text-sm">
          <p className="font-semibold mb-1 text-purple-200">💡 Best Practices for Scanning:</p>
          <ul className="text-xs space-y-1 text-purple-300">
            <li>• Ensure good lighting on the barcode</li>
            <li>• Hold camera steady and parallel to barcode</li>
            <li>• Works with standard UPC, EAN, and QR codes</li>
          </ul>
        </div>
      </div>
    </div>
  );
}