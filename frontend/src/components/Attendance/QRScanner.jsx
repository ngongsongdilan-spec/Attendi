/**
 * QRScanner — student check-in modal.
 *
 * Scans a checkpoint QR with the device camera (html5-qrcode) or accepts a
 * manual code when the camera is unavailable or blocked.  The scanned token is
 * posted to the API; identity is never sent — the backend credits only the
 * authenticated student, and only the checkpoint's own student can redeem
 * that checkpoint's code (BR-039).
 *
 * @module components/Attendance/QRScanner
 */

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CheckCircle2, Keyboard, X, Loader2 } from 'lucide-react';
import { scanAttendance } from '../../api/attendance';

const ERROR_HINTS = {
  TOKEN_EXPIRED: 'This QR code has expired. Ask your lecturer for a fresh one.',
  TOKEN_ALREADY_USED: 'This code has already been used.',
  INVALID_TOKEN: 'That is not a valid attendance code.',
  TOKEN_STUDENT_MISMATCH: 'This QR code belongs to a different student.',
  NOT_ELIGIBLE: 'You are not eligible for this class.',
  SESSION_EXPIRED: 'This attendance session has ended.',
  ALREADY_MARKED: 'You are already marked for this session.',
  RATE_LIMITED: 'Too many attempts — wait a minute and try again.',
  UNAUTHENTICATED: 'Session expired. Please log in again.',
};

const QRScanner = ({ user, onClose, onScanned }) => {
  const scannerRef = useRef(null);
  const containerRef = useRef(null);
  const [mode, setMode] = useState('camera');
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const stopCamera = async () => {
    if (scannerRef.current) {
      try {
        await scannerRef.current.stop();
      } catch {
        // Already stopped.
      }
      try {
        scannerRef.current.clear();
      } catch {
        // Element may already be cleared.
      }
      scannerRef.current = null;
    }
  };

  useEffect(() => {
    let mounted = true;
    if (mode !== 'camera') return undefined;

    setScanning(true);
    setCameraError('');

    const start = async () => {
      try {
        const scanner = new Html5Qrcode(containerRef.current.id, { verbose: false });
        scannerRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 240, height: 240 } },
          async (decodedText) => {
            if (!mounted) return;
            setScanning(false);
            await stopCamera();
            await handleScan(decodedText);
          },
          () => {
            // Per-frame decode noise is ignored; failures surface on start.
          }
        );
        if (mounted) setScanning(false);
      } catch (err) {
        if (!mounted) return;
        setScanning(false);
        setCameraError(
          'Could not start the camera. Permission may be blocked or the device has no camera — use the manual code instead.'
        );
        setMode('manual');
      }
    };
    start();

    return () => {
      mounted = false;
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const handleScan = async (token) => {
    const trimmed = (token || '').trim();
    if (!trimmed) return;
    setError('');
    setResult(null);
    try {
      const data = await scanAttendance(trimmed);
      setResult({
        success: true,
        time: new Date().toLocaleTimeString(),
        raw: data,
      });
      onScanned && onScanned(data);
    } catch (err) {
      setResult(null);
      setError(ERROR_HINTS[err.code] || err.message || 'Could not scan that code.');
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    await handleScan(manualCode);
  };

  const switchToManual = async () => {
    await stopCamera();
    setMode('manual');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#0F0B3D]">Check in</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-[#47464F] hover:text-[#0F0B3D]"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {result ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <CheckCircle2 size={40} className="text-[#166534]" />
            <p className="font-semibold text-[#0F0B3D]">You&apos;re marked present!</p>
            {result.time && <p className="text-sm text-[#47464F]">Recorded at {result.time}</p>}
            <button
              type="button"
              onClick={onClose}
              className="mt-2 rounded-lg bg-[#0F0B3D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#3F35B5]"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            <div className="mb-3 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setCameraError('');
                  setMode('camera');
                }}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  mode === 'camera'
                    ? 'bg-[#0F0B3D] text-white'
                    : 'border border-[#E5E5F0] text-[#47464F]'
                }`}
              >
                <Camera size={15} /> Camera
              </button>
              <button
                type="button"
                onClick={switchToManual}
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                  mode === 'manual'
                    ? 'bg-[#0F0B3D] text-white'
                    : 'border border-[#E5E5F0] text-[#47464F]'
                }`}
              >
                <Keyboard size={15} /> Type the code
              </button>
            </div>

            {mode === 'camera' && !cameraError && (
              <>
                <div className="relative overflow-hidden rounded-xl bg-black">
                  <div
                    id="fet-qr-reader"
                    ref={containerRef}
                    className="min-h-[280px] w-full"
                  />
                  {scanning && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 text-sm text-white">
                      <span className="flex items-center gap-2">
                        <Loader2 size={18} className="animate-spin" /> Starting camera…
                      </span>
                    </div>
                  )}
                </div>
                <p className="mt-2 text-center text-xs text-[#47464F]">
                  Point your camera at the QR code on the check-in screen.
                </p>
              </>
            )}

            {mode === 'manual' && (
              <form onSubmit={handleManualSubmit} className="space-y-3">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Paste or type the attendance code"
                  className="fet-input"
                  autoFocus
                />
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="w-full rounded-lg bg-[#0F0B3D] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[#3F35B5] disabled:opacity-50 transition-colors"
                >
                  Check in
                </button>
              </form>
            )}

            {cameraError && mode === 'manual' && (
              <p className="mt-3 text-sm text-[#B45309]">{cameraError}</p>
            )}
            {error && <p className="mt-3 text-sm text-[#E53935]">{error}</p>}
          </>
        )}
      </div>
    </div>
  );
};

export default QRScanner;