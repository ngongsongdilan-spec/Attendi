import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { QrCode, X, CheckCircle, AlertCircle, Clock } from 'lucide-react';

const QRScanner = ({ session, user, onClose, onScan }) => {
  const { recordAttendance } = useAppContext();
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [manualCode, setManualCode] = useState('');

  const handleSimulateScan = () => {
    if (!session) {
      setError('No active session');
      return;
    }

    if (Date.now() > session.tokenExpiresAt) {
      setError('QR code expired. Please scan the current QR code.');
      return;
    }

    if (Date.now() > session.sessionExpiresAt) {
      setError('Session has expired.');
      return;
    }

    setScanning(true);
    setError('');

    setTimeout(() => {
      const response = recordAttendance(session.id, user?.matricule || 'FE24A389', 'QR Scan');
      
      if (response.success) {
        setResult({
          success: true,
          course: session.courseCode,
          className: session.className,
          time: new Date().toLocaleTimeString(),
          status: 'PRESENT',
        });
        onScan && onScan(response);
      } else {
        setError(response.error);
      }
      setScanning(false);
    }, 1500);
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualCode) {
      setError('Please enter the attendance code');
      return;
    }
    
    if (manualCode === session?.token) {
      handleSimulateScan();
    } else {
      setError('Invalid attendance code. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="fet-card bg-white rounded-2xl shadow-modal max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-text-primary">Scan QR Code</h3>
          <button onClick={onClose} className="p-1 hover:bg-page-bg rounded-lg">
            <X size={24} className="text-text-secondary" />
          </button>
        </div>

        {/* Result */}
        {result?.success ? (
          <div className="text-center py-6">
            <CheckCircle size={64} className="mx-auto text-success mb-4" />
            <h4 className="text-xl font-bold text-success">Attendance Recorded</h4>
            <p className="text-text-secondary mt-2">Course: {result.course}</p>
            <p className="text-text-secondary">Class: {result.className}</p>
            <p className="text-text-secondary">Time: {result.time}</p>
            <p className="text-text-secondary">Status: <span className="font-bold text-success">{result.status}</span></p>
            <button
              onClick={onClose}
              className="mt-4 fet-btn-primary"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* QR Scanner Area */}
            <div className="border-2 border-dashed border-border-default rounded-xl p-8 text-center">
              {scanning ? (
                <div className="py-4">
                  <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-text-secondary mt-2">Scanning...</p>
                </div>
              ) : (
                <div>
                  <QrCode size={64} className="mx-auto text-primary" />
                  <p className="text-text-secondary mt-2">Point your camera at the QR code</p>
                  <button
                    onClick={handleSimulateScan}
                    className="mt-4 fet-btn-primary"
                  >
                    Simulate Scan
                  </button>
                </div>
              )}
            </div>

            {/* OR Manual Entry */}
            <div className="mt-4">
              <p className="text-sm text-text-secondary text-center mb-2">OR</p>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Enter attendance code"
                  className="flex-1 fet-input uppercase"
                />
                <button
                  type="submit"
                  className="fet-btn-primary"
                >
                  Submit
                </button>
              </form>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-danger text-sm flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {/* Session Info */}
            {session && (
              <div className="mt-4 p-3 bg-page-bg rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-text-primary">{session.courseCode}</p>
                  <p className="text-xs text-text-secondary">{session.className}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-text-secondary">Token expires</p>
                  <p className="text-sm font-bold text-text-primary" id="scanner-countdown">
                    {Math.max(0, Math.round((session.tokenExpiresAt - Date.now()) / 1000))}s
                  </p>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default QRScanner;
