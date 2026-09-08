import React, { useState, useEffect } from 'react';
import { useAppContext } from '../../context/AppContext';
import { QrCode, RefreshCw, Clock, Users } from 'lucide-react';

const StationQR = ({ session, user }) => {
  const { updateSessionToken } = useAppContext();
  const [timeLeft, setTimeLeft] = useState(10);
  const [token, setToken] = useState(session?.token || 'TOKEN-XXXX');

  useEffect(() => {
    if (!session) return;

    const timer = setInterval(() => {
      const remaining = Math.max(0, Math.round((session.tokenExpiresAt - Date.now()) / 1000));
      setTimeLeft(remaining);
      
      if (remaining === 0) {
        // Generate new token
        updateSessionToken(session.id);
        // Update local token
        const updatedSession = JSON.parse(localStorage.getItem('fet_attendance_sessions') || '[]')
          .find(s => s.id === session.id);
        if (updatedSession) {
          setToken(updatedSession.token);
        }
        setTimeLeft(10);
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [session, updateSessionToken]);

  const handleRefresh = () => {
    updateSessionToken(session.id);
    const updatedSession = JSON.parse(localStorage.getItem('fet_attendance_sessions') || '[]')
      .find(s => s.id === session.id);
    if (updatedSession) {
      setToken(updatedSession.token);
      setTimeLeft(10);
    }
  };

  return (
    <div className="mt-4 p-4 bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6] rounded-xl text-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Users size={18} />
          <span className="font-semibold">YOU ARE A QR STATION</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={16} />
          <span className="font-mono font-bold">{timeLeft}s</span>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 text-center">
        <div className="inline-block p-4 bg-white rounded-xl border-2 border-[#8B5CF6]">
          <QrCode size={120} className="text-[#1E1B4B]" />
        </div>
        <p className="text-[#47464F] font-mono text-sm mt-2">{token}</p>
        <p className="text-xs text-[#47464F] mt-1">Students scan this QR to mark attendance</p>
      </div>

      <div className="flex items-center justify-between mt-4">
        <p className="text-sm text-white/80">
          {timeLeft > 0 ? `Token expires in ${timeLeft}s` : '⏰ Token expired'}
        </p>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm font-medium transition-colors"
        >
          <RefreshCw size={16} />
          Refresh QR
        </button>
      </div>

      <p className="text-xs text-white/60 mt-3 text-center">
        Your device is currently acting as an attendance station
      </p>
    </div>
  );
};

export default StationQR;