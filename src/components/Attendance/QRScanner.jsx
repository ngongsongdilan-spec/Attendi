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
      setError('⚠️ QR code expired. Please scan the current QR code.');
      return;
    }

    if (Date.now() > session.sessionExpiresAt) {
      setError('⚠️ Session has expired.');
      return;
    }

    setScanning(true);
    setError('');

    // Simulate scan delay
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-[#191C1D]">Scan QR Code</h3>
          <button onClick={onClose} className="p-1 hover:bg-[#EDEEEF] rounded-lg">
            <X size={24} className="text-[#47464F]" />
          </button>
        </div>

        {/* Result */}
        {result?.success ? (
          <div className="text-center py-6">
            <CheckCircle size={64} className="mx-auto text-green-500 mb-4" />
            <h4 className="text-xl font-bold text-green-600">✓ Attendance Recorded</h4>
            <p className="text-[#47464F] mt-2">Course: {result.course}</p>
            <p className="text-[#47464F]">Class: {result.className}</p>
            <p className="text-[#47464F]">Time: {result.time}</p>
            <p className="text-[#47464F]">Status: <span className="font-bold text-green-600">{result.status}</span></p>
            <button
              onClick={onClose}
              className="mt-4 px-6 py-2 bg-[#3B82F6] text-white rounded-xl font-medium hover:bg-[#3B82F6]/90"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* QR Scanner Area */}
            <div className="border-2 border-dashed border-[#C8C5D0] rounded-xl p-8 text-center">
              {scanning ? (
                <div className="py-4">
                  <div className="w-16 h-16 border-4 border-[#3B82F6] border-t-transparent rounded-full animate-spin mx-auto"></div>
                  <p className="text-[#47464F] mt-2">Scanning...</p>
                </div>
              ) : (
                <div>
                  <QrCode size={64} className="mx-auto text-[#3B82F6]" />
                  <p className="text-[#47464F] mt-2">Point your camera at the QR code</p>
                  <button
                    onClick={handleSimulateScan}
                    className="mt-4 px-6 py-2 bg-[#3B82F6] text-white rounded-xl font-medium hover:bg-[#3B82F6]/90"
                  >
                    📸 Simulate Scan
                  </button>
                </div>
              )}
            </div>

            {/* OR Manual Entry */}
            <div className="mt-4">
              <p className="text-sm text-[#47464F] text-center mb-2">OR</p>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <input
                  type="text"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  placeholder="Enter attendance code"
                  className="flex-1 px-4 py-2 border border-[#C8C5D0] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#3B82F6] text-[#191C1D] uppercase"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#8B5CF6] text-white rounded-xl font-medium hover:bg-[#8B5CF6]/90"
                >
                  Submit
                </button>
              </form>
            </div>

            {/* Error */}
            {error && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2">
                <AlertCircle size={18} />
                {error}
              </div>
            )}

            {/* Session Info */}
            {session && (
              <div className="mt-4 p-3 bg-[#EDEEEF] rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-[#191C1D]">{session.courseCode}</p>
                  <p className="text-xs text-[#47464F]">{session.className}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-[#47464F]">Token expires</p>
                  <p className="text-sm font-bold text-[#191C1D]" id="scanner-countdown">
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