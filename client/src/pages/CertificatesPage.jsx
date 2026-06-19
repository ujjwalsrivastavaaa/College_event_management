import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Award, FileText, Download, Calendar, ExternalLink } from 'lucide-react';

const CertificatesPage = () => {
  const { user } = useAuth();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCertificates = async () => {
    try {
      setLoading(true);
      const res = await api.get('/certificates');
      if (res.data.success) {
        setCertificates(res.data.certificates);
      }
    } catch (err) {
      console.error('Failed to load certificates:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCertificates();
  }, []);

  const handleDownload = (eventId) => {
    const token = localStorage.getItem('token');
    const downloadUrl = `/api/certificates/download/${eventId}/${user._id}?token=${token}`;
    window.open(downloadUrl, '_blank');
  };

  if (loading) {
    return (
      <div className="flex-1 lg:ml-64 min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 lg:ml-64 p-6 lg:p-8 min-h-screen bg-slate-50">
      
      {/* Header Banner */}
      <div className="mb-6 border-b border-slate-200 pb-5">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Award className="h-6 w-6 text-emerald-600" />
          My Academic Credentials
        </h1>
        <p className="text-slate-500 text-xs mt-0.5">Download official university certificates signed by club faculty sponsors.</p>
      </div>

      {certificates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {certificates.map((cert) => {
            const event = cert.eventId;
            if (!event) return null;
            return (
              <div key={cert._id} className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between space-y-4 shadow-sm hover:shadow transition-shadow">
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600 shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">{event.title}</h3>
                    <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-250 px-2 py-0.5 rounded-md uppercase inline-block">
                      {event.clubId?.clubName || 'General Event'}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col gap-1 text-xs text-slate-500 pt-1">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <strong>Event Date:</strong> {new Date(event.date).toLocaleDateString()}
                  </span>
                  <span>
                    <strong>Issued On:</strong> {new Date(cert.issuedAt).toLocaleDateString()}
                  </span>
                </div>

                <div className="pt-3 border-t border-slate-100 flex gap-2">
                  <button
                    onClick={() => handleDownload(event._id)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs rounded transition shadow-sm"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download PDF</span>
                  </button>
                  <button
                    onClick={() => handleDownload(event._id)}
                    className="p-1.5 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-800 border border-slate-300 rounded transition"
                    title="View Credential"
                  >
                    <ExternalLink className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center max-w-md mx-auto shadow-sm space-y-4 mt-8">
          <div className="h-12 w-12 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
            <Award className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-800">No Credentials Awarded</h3>
            <p className="text-slate-500 text-xs leading-relaxed">
              You haven't earned any certificates yet. Register for upcoming events, verify your check-in with the QR scanner at the venue, and check back here to download your certificate.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default CertificatesPage;
