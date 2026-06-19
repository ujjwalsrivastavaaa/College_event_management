import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  Calendar,
  Award,
  Bell,
  CheckCircle,
  FileText,
  MapPin,
  Clock,
  Check,
  ChevronRight
} from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState([]);
  const [certificates, setCertificates] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch registrations
      const regRes = await api.get('/events/my/registrations');
      // Fetch certificates
      const certRes = await api.get('/certificates');
      // Fetch notifications
      const notifRes = await api.get('/notifications');

      if (regRes.data.success) setRegistrations(regRes.data.registrations);
      if (certRes.data.success) setCertificates(certRes.data.certificates);
      if (notifRes.data.success) {
        setNotifications(notifRes.data.notifications);
        setUnreadCount(notifRes.data.unreadCount);
      }
    } catch (err) {
      console.error('Failed to load student dashboard:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleMarkAsRead = async (notifId) => {
    try {
      const res = await api.put(`/notifications/${notifId}/read`);
      if (res.data.success) {
        // Update state locally
        setNotifications(
          notifications.map((n) => (n._id === notifId ? { ...n, isRead: true } : n))
        );
        setUnreadCount(Math.max(0, unreadCount - 1));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const res = await api.put('/notifications/read-all');
      if (res.data.success) {
        setNotifications(notifications.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const isEventAttended = (eventId) => {
    return certificates.some((c) => c.eventId?._id === eventId || c.eventId === eventId);
  };

  const handleDownloadCertificate = (eventId) => {
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
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Student Portal</h1>
        <p className="text-slate-500 text-xs mt-0.5">Welcome back, {user.name}. Register for workshops, track club memberships, and review your credentials.</p>
      </div>

      {/* Metrics Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-slate-200/80 rounded-lg p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Event Bookings</span>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{registrations.length}</h3>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Seats reserved</span>
          </div>
          <div className="h-10 w-10 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
            <Calendar className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-lg p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Certificates Earned</span>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{certificates.length}</h3>
            <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">Approved awards</span>
          </div>
          <div className="h-10 w-10 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
            <Award className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white border border-slate-200/80 rounded-lg p-5 flex items-center justify-between shadow-sm">
          <div>
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Unread Alerts</span>
            <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{unreadCount}</h3>
            <span className="text-[10px] text-slate-500 mt-0.5 block">Inbox notifications</span>
          </div>
          <div className="h-10 w-10 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
            <Bell className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Main dashboard splits */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
        {/* Left Side: Registered Events */}
        <div className="xl:col-span-2 space-y-3">
          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">My Event Registrations</h4>
          
          {registrations.length > 0 ? (
            <div className="space-y-3">
              {registrations.map((reg) => {
                const event = reg.eventId;
                if (!event) return null;
                const attended = isEventAttended(event._id);
                return (
                  <div key={reg._id} className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm">
                    <div className="space-y-1">
                      <h5 className="font-bold text-slate-900 text-sm">{event.title}</h5>
                      
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                        <span className="flex items-center gap-1">
                          <MapPin className="h-3.5 w-3.5 text-slate-400" />
                          {event.venue}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          {new Date(event.date).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                      {attended ? (
                        <button
                          onClick={() => handleDownloadCertificate(event._id)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold rounded transition"
                        >
                          <FileText className="h-3.5 w-3.5" />
                          <span>Get Certificate</span>
                        </button>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded uppercase flex items-center gap-0.5">
                          <Check className="h-3.5 w-3.5 text-slate-500" />
                          Registered
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-400 text-xs">
              You are not registered for any events yet. Click on "Campus Events" in the sidebar to search and register.
            </div>
          )}
        </div>

        {/* Right Side: Notifications Box */}
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-sm">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Bell className="h-4 w-4 text-slate-500" />
              Notifications
            </h4>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-[10px] font-bold text-emerald-600 hover:underline transition"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto space-y-2 pr-0.5">
            {notifications.length > 0 ? (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => !n.isRead && handleMarkAsRead(n._id)}
                  className={`p-3 rounded-md text-xs space-y-1 transition border ${
                    n.isRead
                      ? 'bg-slate-50/50 border-slate-100 text-slate-400'
                      : 'bg-emerald-50/10 border-emerald-100 text-slate-700 cursor-pointer hover:bg-emerald-50/30'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-slate-800">{n.title}</span>
                    {!n.isRead && (
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-600"></span>
                    )}
                  </div>
                  <p className="leading-relaxed text-[11px]">{n.message}</p>
                  <span className="text-[9px] text-slate-400 block pt-0.5">
                    {new Date(n.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-400 text-[11px]">
                Your notifications box is empty.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
