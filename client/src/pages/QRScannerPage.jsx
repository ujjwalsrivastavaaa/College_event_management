import React, { useState, useEffect, useRef } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import api from '../services/api';
import {
  QrCode, CheckCircle, RefreshCw, XCircle,
  KeyRound, Loader, ChevronDown,
} from 'lucide-react';

const QRScannerPage = () => {
  const [mode, setMode] = useState('otp'); // 'otp' | 'camera'
  const [apiResponse, setApiResponse] = useState({ success: null, message: '', alreadyMarked: false });
  const [loading, setLoading] = useState(false);

  // OTP state
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  // Camera scanner ref
  const scannerRef = useRef(null);

  // Fetch events the student is registered for
  useEffect(() => {
    const fetchRegisteredEvents = async () => {
      try {
        const res = await api.get('/events/my/registrations');
        if (res.data.success && res.data.registrations) {
          // Each registration has a populated eventId with full event details
          const evts = res.data.registrations
            .map(r => r.eventId)
            .filter(Boolean);
          setEvents(evts);
        }
      } catch (err) {
        // Fallback: fetch all upcoming events
        try {
          const res2 = await api.get('/events?limit=50');
          if (res2.data.success) setEvents(res2.data.events || []);
        } catch (e) {
          console.error('Failed to fetch events:', e);
        }
      }
    };
    fetchRegisteredEvents();
  }, []);

  // ── Camera Scanner ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (mode !== 'camera') {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
        scannerRef.current = null;
      }
      return;
    }

    const scannerId = 'qr-reader';
    const scanner = new Html5QrcodeScanner(
      scannerId,
      { fps: 10, qrbox: { width: 220, height: 220 }, aspectRatio: 1.0, showTorchButtonIfSupported: true },
      false
    );

    scanner.render(
      async (decodedText) => {
        scanner.clear().catch(() => {});
        await submitQRScan(decodedText);
      },
      () => {}
    );

    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(() => {});
      }
    };
  }, [mode]);

  // ── QR scan submit ──────────────────────────────────────────────────────────
  const submitQRScan = async (qrPayload) => {
    try {
      setLoading(true);
      setApiResponse({ success: null, message: '', alreadyMarked: false });
      const res = await api.post('/attendance/scan', { qrPayload });
      setApiResponse({
        success: res.data.success,
        message: res.data.message,
        alreadyMarked: res.data.alreadyMarked || false,
      });
    } catch (err) {
      setApiResponse({
        success: false,
        message: err.response?.data?.message || 'QR scan failed. Code may have expired.',
        alreadyMarked: false,
      });
    } finally {
      setLoading(false);
    }
  };

  // ── OTP submit ──────────────────────────────────────────────────────────────
  const handleOTPSubmit = async (e) => {
    e.preventDefault();
    const otp = otpDigits.join('');
    if (!selectedEventId || otp.length !== 6) return;

    try {
      setLoading(true);
      setApiResponse({ success: null, message: '', alreadyMarked: false });
      const res = await api.post('/attendance/verify-otp', {
        eventId: selectedEventId,
        otp,
      });
      setApiResponse({
        success: res.data.success,
        message: res.data.message,
        alreadyMarked: res.data.alreadyMarked || false,
      });
    } catch (err) {
      setApiResponse({
        success: false,
        message: err.response?.data?.message || 'OTP verification failed.',
        alreadyMarked: false,
      });
    } finally {
      setLoading(false);
    }
  };

  // ── OTP digit input handlers ──────────────────────────────────────────────
  const handleDigitChange = (index, value) => {
    if (!/^\d?$/.test(value)) return; // only allow single digit
    const newDigits = [...otpDigits];
    newDigits[index] = value;
    setOtpDigits(newDigits);
    // Auto-focus next
    if (value && index < 5) {
      otpRefs[index + 1].current?.focus();
    }
  };

  const handleDigitKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs[index - 1].current?.focus();
    }
  };

  const handleDigitPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newDigits = [...otpDigits];
    for (let i = 0; i < 6; i++) {
      newDigits[i] = pasted[i] || '';
    }
    setOtpDigits(newDigits);
    // Focus last filled or first empty
    const focusIdx = Math.min(pasted.length, 5);
    otpRefs[focusIdx]?.current?.focus();
  };

  const handleReset = () => {
    setApiResponse({ success: null, message: '', alreadyMarked: false });
    setOtpDigits(['', '', '', '', '', '']);
    setSelectedEventId('');
  };

  return (
    <div className="flex-1 lg:ml-64 p-6 lg:p-8 min-h-screen bg-slate-50">

      {/* Header */}
      <div className="mb-6 border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <QrCode className="h-6 w-6 text-emerald-600" />
          Verify Attendance
        </h1>
        <p className="text-slate-500 text-xs mt-0.5">
          Enter the 6-digit check-in code shown by your coordinator, or scan the QR code.
        </p>
      </div>

      <div className="max-w-md mx-auto space-y-4">

        {/* Mode Toggle */}
        <div className="flex bg-slate-100 p-1 rounded-md border border-slate-200/50">
          <button
            onClick={() => setMode('otp')}
            className={`flex-1 py-1.5 text-xs font-bold rounded transition-all flex items-center justify-center gap-1.5 ${
              mode === 'otp' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            Enter Code
          </button>
          <button
            onClick={() => setMode('camera')}
            className={`flex-1 py-1.5 text-xs font-bold rounded transition-all flex items-center justify-center gap-1.5 ${
              mode === 'camera' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <QrCode className="h-3.5 w-3.5" />
            Scan QR
          </button>
        </div>

        {/* Loading */}
        {loading && (
          <div className="bg-white border border-slate-200 rounded-lg p-8 text-center shadow-sm space-y-3">
            <Loader className="h-8 w-8 text-emerald-600 animate-spin mx-auto" />
            <p className="text-slate-600 text-sm font-medium">Verifying attendance…</p>
          </div>
        )}

        {/* Result Card */}
        {apiResponse.message && (
          <div className={`p-6 rounded-lg border text-center space-y-3 bg-white shadow-sm ${
            apiResponse.success ? 'border-emerald-200' : 'border-red-200'
          }`}>
            <div className="flex justify-center">
              {apiResponse.success
                ? <CheckCircle className="h-10 w-10 text-emerald-500" />
                : <XCircle className="h-10 w-10 text-red-500" />}
            </div>
            <h4 className="font-bold text-slate-900">
              {apiResponse.success
                ? (apiResponse.alreadyMarked ? 'Already Checked In' : 'Attendance Marked! ✓')
                : 'Check-In Failed'}
            </h4>
            <p className="text-xs text-slate-600 leading-relaxed">{apiResponse.message}</p>
            {apiResponse.success && !apiResponse.alreadyMarked && (
              <p className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 rounded-md px-3 py-2 border border-emerald-200">
                🎓 Your certificate is now available under "My Credentials"
              </p>
            )}
            <button
              onClick={handleReset}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 border border-slate-300 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 rounded-md transition"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Try Again
            </button>
          </div>
        )}

        {/* ── OTP Mode ────────────────────────────────────────────────────── */}
        {mode === 'otp' && !loading && !apiResponse.message && (
          <form onSubmit={handleOTPSubmit} className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4">
            {/* Event selector */}
            <div>
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-1.5">
                Select Your Event
              </label>
              <div className="relative">
                <select
                  value={selectedEventId}
                  onChange={(e) => setSelectedEventId(e.target.value)}
                  required
                  className="w-full appearance-none bg-white border border-slate-300 rounded-md px-3 py-2 pr-8 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Choose event…</option>
                  {events.map((ev) => (
                    <option key={ev._id} value={ev._id}>
                      {ev.title} — {new Date(ev.date).toLocaleDateString()}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2.5 top-2.5 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* 6-digit OTP input */}
            <div>
              <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wider block mb-2">
                Enter 6-Digit Code
              </label>
              <div className="flex justify-center gap-2" onPaste={handleDigitPaste}>
                {otpDigits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={otpRefs[idx]}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleDigitKeyDown(idx, e)}
                    className="w-11 h-12 text-center text-xl font-black text-slate-800 border border-slate-300 rounded-md bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition"
                  />
                ))}
              </div>
              <p className="text-[10px] text-slate-400 text-center mt-2">
                Ask your event coordinator for this code
              </p>
            </div>

            <button
              type="submit"
              disabled={otpDigits.join('').length !== 6 || !selectedEventId || loading}
              className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs rounded-md shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Verify & Check In
            </button>
          </form>
        )}

        {/* ── Camera Mode ─────────────────────────────────────────────────── */}
        {mode === 'camera' && !loading && !apiResponse.message && (
          <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-3">
            <p className="text-center text-xs text-slate-400">
              Point your camera at the event QR code.
            </p>
            <div id="qr-reader" className="overflow-hidden rounded-md border border-slate-200 bg-slate-50" />

            <div className="bg-amber-50 border border-amber-200 rounded-md p-3 text-[10px] text-amber-800 leading-relaxed">
              <strong>Camera not opening?</strong> Mobile browsers require HTTPS for camera access.
              Switch to <strong>"Enter Code"</strong> mode instead — your coordinator will display a
              6-digit code you can type in.
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QRScannerPage;
