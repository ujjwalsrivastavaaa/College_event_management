import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Calendar,
  Users,
  Award,
  Plus,
  QrCode,
  Check,
  Search,
  UserCheck,
  Trash2,
  X,
  FileText,
  ClipboardList,
  Camera,
  Trash2 as TrashIcon,
  Upload
} from 'lucide-react';

// Map URL path to tab name
const PATH_TO_TAB = {
  '/clubhead': 'overview',
  '/clubhead/events': 'events',
  '/clubhead/members': 'members',
};
const TAB_TO_PATH = {
  'overview': '/clubhead',
  'events': '/clubhead/events',
  'members': '/clubhead/members',
};

const ClubHeadDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = PATH_TO_TAB[location.pathname] ?? 'overview';
  const setActiveTab = (tab) => navigate(TAB_TO_PATH[tab] ?? '/clubhead');
  const [myClub, setMyClub] = useState(null);
  const [clubLoading, setClubLoading] = useState(true);
  const [logoLoading, setLogoLoading] = useState(false);
  const fileInputRef = React.useRef(null);

  // Events & Members States
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [membersLoading, setMembersLoading] = useState(false);

  // Create Event Form Modal State
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: '',
    description: '',
    date: '',
    venue: '',
    maxParticipants: 100,
  });

  // Selected Event for QR/Attendance View
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [qrCodeData, setQrCodeData] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [otpExpiry, setOtpExpiry] = useState(0);
  const [attendanceReport, setAttendanceReport] = useState([]);
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [manualCheckinEmail, setManualCheckinEmail] = useState('');

  const [feedback, setFeedback] = useState({ message: '', type: '' });

  const showFeedback = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
  };

  // Fetch Club details
  const fetchClubDetails = async () => {
    try {
      setClubLoading(true);
      const res = await api.get('/clubs/my-club');
      if (res.data.success) {
        setMyClub(res.data.club);
      }
    } catch (err) {
      console.error('Club check error:', err.message);
    } finally {
      setClubLoading(false);
    }
  };

  // Handle Logo Upload
  const handleLogoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !myClub) return;

    try {
      setLogoLoading(true);
      const formData = new FormData();
      formData.append('image', file);

      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (uploadRes.data.success) {
        const updateRes = await api.put(`/clubs/${myClub._id}/logo`, {
          logo: uploadRes.data.url,
        });

        if (updateRes.data.success) {
          setMyClub(updateRes.data.club);
          showFeedback('Club logo updated successfully');
        }
      }
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Failed to upload logo', 'error');
    } finally {
      setLogoLoading(false);
    }
  };

  // Handle Logo Delete
  const handleDeleteLogo = async () => {
    if (!myClub || !window.confirm('Are you sure you want to remove the club logo?')) return;
    try {
      setLogoLoading(true);
      const res = await api.delete(`/clubs/${myClub._id}/logo`);
      if (res.data.success) {
        setMyClub(res.data.club);
        showFeedback('Club logo removed');
      }
    } catch (err) {
      showFeedback('Failed to remove logo', 'error');
    } finally {
      setLogoLoading(false);
    }
  };

  // Fetch Club events
  const fetchClubEvents = async (clubId) => {
    try {
      setEventsLoading(true);
      const res = await api.get(`/events?clubId=${clubId}&limit=50`);
      if (res.data.success) {
        setEvents(res.data.events);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEventsLoading(false);
    }
  };

  // Fetch Club members
  const fetchClubMembers = async (clubId) => {
    try {
      setMembersLoading(true);
      const res = await api.get(`/clubs/${clubId}/members`);
      if (res.data.success) {
        setMembers(res.data.members);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setMembersLoading(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Are you sure you want to remove this member from the club?')) return;
    try {
      const res = await api.delete(`/clubs/${myClub._id}/members/${userId}`);
      if (res.data.success) {
        alert('Member removed successfully.');
        fetchClubMembers(myClub._id);
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to remove member');
    }
  };

  useEffect(() => {
    fetchClubDetails();
  }, []);

  useEffect(() => {
    if (myClub) {
      fetchClubEvents(myClub._id);
      fetchClubMembers(myClub._id);
    }
  }, [myClub]);

  // Handle Event Creation
  const handleCreateEvent = async (e) => {
    e.preventDefault();
    if (!myClub) return;
    try {
      const res = await api.post('/events', {
        ...eventForm,
        clubId: myClub._id,
      });
      if (res.data.success) {
        showFeedback(res.data.message);
        setIsEventModalOpen(false);
        setEventForm({ title: '', description: '', date: '', venue: '', maxParticipants: 100 });
        fetchClubEvents(myClub._id);
      }
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Failed to create event', 'error');
    }
  };

  // Handle Event Deletion
  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Delete this event? This action is irreversible.')) return;
    try {
      const res = await api.delete(`/events/${eventId}`);
      if (res.data.success) {
        showFeedback(res.data.message);
        fetchClubEvents(myClub._id);
        if (selectedEvent?._id === eventId) setSelectedEvent(null);
      }
    } catch (err) {
      showFeedback('Failed to delete event', 'error');
    }
  };

  // Open QR Code Scanner view & fetch attendance
  const handleOpenAttendance = (event) => {
    setSelectedEvent(event);
    setQrCodeData(null);
    setAttendanceReport([]);
  };

  // Manual check-in handler
  const handleManualCheckin = async (e) => {
    e.preventDefault();
    if (!selectedEvent || !manualCheckinEmail.trim()) return;
    try {
      const res = await api.post(`/attendance/event/${selectedEvent._id}/manual-checkin`, {
        studentEmail: manualCheckinEmail.trim(),
      });
      if (res.data.success) {
        showFeedback(res.data.message);
        setManualCheckinEmail('');
        fetchAttendanceReport(selectedEvent._id);
      }
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Failed to check in student', 'error');
    }
  };

  // Periodically refresh dynamic QR Code and attendance report when an event is selected
  useEffect(() => {
    if (!selectedEvent) return;

    const refreshQRAndReport = async () => {
      try {
        const qrRes = await api.get(`/attendance/event/${selectedEvent._id}/qrcode`);
        if (qrRes.data.success) {
          setQrCodeData(qrRes.data.qrCode);
          setOtpCode(qrRes.data.otp || '');
          setOtpExpiry(qrRes.data.otpExpiresIn || 0);
        }
      } catch (err) {
        console.error('Failed to refresh QR code:', err);
      }
      fetchAttendanceReport(selectedEvent._id);
    };

    // Trigger immediate load
    refreshQRAndReport();

    const interval = setInterval(refreshQRAndReport, 15000); // sync every 15 seconds

    return () => clearInterval(interval);
  }, [selectedEvent]);

  const fetchAttendanceReport = async (eventId) => {
    try {
      setAttendanceLoading(true);
      const res = await api.get(`/attendance/event/${eventId}/report`);
      if (res.data.success) {
        setAttendanceReport(res.data.report);
      }
    } catch (err) {
      console.error('Failed to load attendance report:', err);
    } finally {
      setAttendanceLoading(false);
    }
  };

  if (clubLoading) {
    return (
      <div className="flex-1 lg:ml-64 min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="h-8 w-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // Not a club head, or request is pending
  if (!myClub) {
    return (
      <div className="flex-1 lg:ml-64 p-6 lg:p-8 min-h-screen bg-slate-50 flex flex-col justify-center items-center">
        <div className="bg-white border border-slate-200 shadow-sm max-w-md rounded-lg p-6 text-center space-y-4">
          <h2 className="text-xl font-bold text-slate-800">Proposal Pending</h2>
          <p className="text-slate-500 text-xs leading-relaxed">
            You do not currently manage an active student club. If you proposed a club, please wait for an administrator to review and approve the proposal.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 lg:ml-64 p-6 lg:p-8 min-h-screen bg-slate-50">
      
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{myClub.clubName}</h1>
          <p className="text-slate-500 text-xs mt-0.5">Faculty Sponsor: Dr. {myClub.facultyCoordinator}</p>
        </div>
        
        <div className="flex items-center gap-3 w-full md:w-auto">
          {feedback.message && (
            <div className={`px-3 py-1.5 rounded-md border text-xs font-semibold animate-fade-in shrink-0 ${
              feedback.type === 'error' 
                ? 'bg-red-50 border-red-200 text-red-700' 
                : 'bg-emerald-50 border-emerald-200 text-emerald-700'
            }`}>
              {feedback.message}
            </div>
          )}
          <button
            onClick={() => setIsEventModalOpen(true)}
            className="academic-btn-primary flex items-center gap-1.5 text-xs ml-auto md:ml-0"
          >
            <Plus className="h-4 w-4" />
            <span>Schedule Event</span>
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto whitespace-nowrap bg-white rounded-md border p-1 shadow-sm max-w-sm">
        {['overview', 'events', 'members'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 font-semibold text-xs capitalize rounded-md transition-all ${
              activeTab === tab
                ? 'bg-slate-100 text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab === 'overview' ? 'Overview' : tab === 'events' ? 'Manage Events' : 'Club Members'}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Analytics Overview Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white border border-slate-200/80 rounded-lg p-5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Club Members</span>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{members.length}</h3>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Approved students</span>
              </div>
              <div className="h-10 w-10 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
                <Users className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-lg p-5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Events Hosted</span>
                <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{events.length}</h3>
                <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">Upcoming: {events.filter(e => e.status === 'upcoming').length}</span>
              </div>
              <div className="h-10 w-10 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
                <Calendar className="h-5 w-5" />
              </div>
            </div>

            <div className="bg-white border border-slate-200/80 rounded-lg p-5 flex items-center justify-between shadow-sm">
              <div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">QR check-in</span>
                <h3 className="text-2xl font-extrabold text-emerald-600 mt-1">Enabled</h3>
                <span className="text-[10px] text-slate-500 mt-0.5 block">Dynamic 15s rotation</span>
              </div>
              <div className="h-10 w-10 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
                <QrCode className="h-5 w-5" />
              </div>
            </div>
          </div>

          {/* Logo and Description summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2 bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">Club Mission statement</h4>
              <p className="text-slate-600 text-xs leading-relaxed">{myClub.description}</p>
            </div>
            
            <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm flex flex-col items-center">
              <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 w-full border-b border-slate-100 pb-2">Club Branding</h4>
              
              <div className="relative group mb-4">
                <div className="h-20 w-20 rounded-lg bg-emerald-50 border-2 border-emerald-100 flex items-center justify-center font-bold text-emerald-700 text-2xl overflow-hidden shrink-0">
                  {myClub.logo ? (
                    <img src={myClub.logo.startsWith('http') ? myClub.logo : `http://localhost:5000${myClub.logo}`} alt="Club Logo" className="h-full w-full object-cover" />
                  ) : (
                    myClub.clubName.charAt(0).toUpperCase()
                  )}
                </div>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoLoading}
                  className="absolute -bottom-2 -right-2 h-7 w-7 bg-emerald-600 rounded-full border-2 border-white text-white flex items-center justify-center shadow hover:bg-emerald-700 transition"
                  title="Upload new logo"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={handleLogoUpload}
                />
              </div>

              <div className="flex gap-2 w-full mt-auto">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={logoLoading}
                  className="flex-1 flex justify-center items-center gap-1.5 px-2 py-1.5 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-700 rounded text-xs font-semibold transition"
                >
                  <Upload className="h-3 w-3" />
                  {logoLoading ? '...' : 'Upload'}
                </button>
                
                {myClub.logo && (
                  <button
                    onClick={handleDeleteLogo}
                    disabled={logoLoading}
                    className="flex justify-center items-center px-2 py-1.5 border border-red-200 hover:bg-red-50 text-red-600 rounded transition"
                    title="Remove Logo"
                  >
                    <TrashIcon className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MANAGE EVENTS TAB */}
      {activeTab === 'events' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 items-start">
          {/* Events list */}
          <div className="xl:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Scheduled Events</h4>
            {eventsLoading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-16 bg-white border border-slate-200 rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : events.length > 0 ? (
              events.map((e) => (
                <div
                  key={e._id}
                  onClick={() => handleOpenAttendance(e)}
                  className={`bg-white border rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer hover:border-slate-300 shadow-sm ${
                    selectedEvent?._id === e._id ? 'ring-1 ring-emerald-500 border-emerald-500' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-1">
                    <h5 className="font-bold text-slate-900 text-sm">{e.title}</h5>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-slate-500">
                      <span>Venue: {e.venue}</span>
                      <span>Date: {new Date(e.date).toLocaleDateString()}</span>
                      <span>Limit: {e.maxParticipants} slots</span>
                    </div>
                  </div>
                  
                  <div className="flex gap-2 items-center w-full sm:w-auto justify-end">
                    <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border shrink-0 ${
                      e.status === 'upcoming' 
                        ? 'bg-blue-50 border-blue-200 text-blue-700' 
                        : e.status === 'completed'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                        : 'bg-slate-100 border-slate-200 text-slate-500'
                    }`}>
                      {e.status}
                    </span>
                    <button
                      onClick={(evt) => { evt.stopPropagation(); navigate(`/clubhead/attendance/${e._id}`); }}
                      className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold border border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-700 rounded transition shrink-0"
                      title="View Attendance Report"
                    >
                      <ClipboardList className="h-3.5 w-3.5" />
                      Report
                    </button>
                    <button
                      onClick={(evt) => { evt.stopPropagation(); handleDeleteEvent(e._id); }}
                      className="p-1.5 border border-red-200 bg-white text-red-600 hover:bg-red-50 rounded transition"
                      title="Cancel Event"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-slate-400 text-xs">
                No events scheduled. Use the 'Schedule Event' button above to create one.
              </div>
            )}
          </div>

          {/* Attendance / QR Generator Panel */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Check-in Console</h4>
            
            {selectedEvent ? (
              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-sm">
                <div className="border-b border-slate-100 pb-3">
                  <h5 className="font-bold text-slate-900 text-sm">{selectedEvent.title}</h5>
                  <p className="text-slate-500 text-[10px] mt-0.5">Time-based rotating code active.</p>
                </div>

                {/* OTP Code Display */}
                {otpCode && (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-md p-3 text-center">
                    <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider block mb-1">Student Check-in Code</span>
                    <div className="text-3xl font-black text-emerald-800 tracking-[0.3em] font-mono">{otpCode}</div>
                    <span className="text-[9px] text-emerald-600 mt-1 block">
                      Expires in ~{otpExpiry}s · Auto-refreshes
                    </span>
                    <p className="text-[9px] text-slate-500 mt-1.5">
                      Tell students to enter this code on their phone
                    </p>
                  </div>
                )}

                {/* QR Code Container */}
                {qrCodeData ? (
                  <div className="text-center space-y-2.5">
                    <div className="bg-white p-2 rounded-md inline-block border border-slate-200 shadow-sm">
                      <img src={qrCodeData} alt="Attendance QR Code" className="h-36 w-36" />
                    </div>
                    <p className="text-[9px] text-emerald-700 font-bold tracking-wider animate-pulse flex items-center justify-center gap-1">
                      <QrCode className="h-3.5 w-3.5" />
                      ROTATES EVERY 15 SECONDS
                    </p>
                  </div>
                ) : (
                  <div className="h-36 flex items-center justify-center text-xs text-slate-400">
                    Generating QR code...
                  </div>
                )}

                {/* Manual Check-in Form */}
                <form onSubmit={handleManualCheckin} className="space-y-2 pt-2 border-t border-slate-100">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wide block">Manual Student Check-In</label>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      required
                      placeholder="student@college.edu"
                      value={manualCheckinEmail}
                      onChange={(e) => setManualCheckinEmail(e.target.value)}
                      className="academic-input flex-1 py-1.5 text-xs"
                    />
                    <button
                      type="submit"
                      className="px-3 bg-slate-800 hover:bg-slate-900 active:bg-black text-white font-semibold text-xs rounded-md transition"
                    >
                      Check In
                    </button>
                  </div>
                </form>

                {/* Attendance Report List */}
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Present List</span>
                    <span>{attendanceReport.filter(r => r.present).length} Attended</span>
                  </div>

                  {attendanceLoading ? (
                    <div className="space-y-1">
                      <div className="h-7 bg-slate-100 rounded animate-pulse"></div>
                    </div>
                  ) : attendanceReport.length > 0 ? (
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-0.5">
                      {attendanceReport.map((student) => (
                        <div key={student._id} className="flex justify-between items-center border border-slate-100 bg-slate-50/50 px-2.5 py-1.5 rounded-md text-xs">
                          <div>
                            <span className="font-semibold text-slate-900 block">{student.name}</span>
                            <span className="text-[9px] text-slate-400">{student.email}</span>
                          </div>
                          {student.present ? (
                            <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md uppercase">
                              Present
                            </span>
                          ) : (
                            <span className="text-[9px] font-semibold text-slate-400 uppercase">
                              Booked
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-slate-400 text-[10px]">
                      No student registrations for this event.
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-lg p-5 text-center text-slate-400 text-xs">
                Select an event from the list on the left to show the attendance scanner controls.
              </div>
            )}
          </div>
        </div>
      )}

      {/* CLUB MEMBERS TAB */}
      {activeTab === 'members' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-sm">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-3">Club Membership List</h4>
          {membersLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded animate-pulse"></div>
              ))}
            </div>
          ) : members.length > 0 ? (
            <div className="academic-table-container">
              <table className="academic-table">
                <thead>
                  <tr>
                    <th>Student Name</th>
                    <th>Email Address</th>
                    <th>Portal Role</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((m) => (
                    <tr key={m._id}>
                      <td className="font-semibold text-slate-900">{m.name}</td>
                      <td className="text-slate-500">{m.email}</td>
                      <td className="text-slate-400 text-xs">Registered Member</td>
                      <td className="text-right">
                        <button
                          onClick={() => handleRemoveMember(m._id)}
                          className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-650 rounded text-[10px] font-bold border border-red-200 transition shadow-sm"
                        >
                          Remove Member
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center text-slate-400 text-xs py-6">
              No student members registered in this club yet.
            </div>
          )}
        </div>
      )}

      {/* CREATE EVENT MODAL */}
      {isEventModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-5 space-y-4 relative shadow-md animate-slide-up">
            <button
              onClick={() => setIsEventModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Schedule New Club Event</h3>
              <p className="text-slate-500 text-[10px] mt-0.5">Please provide schedule coordinates for the event.</p>
            </div>

            <form onSubmit={handleCreateEvent} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wide block">Event Title</label>
                <input
                  type="text"
                  required
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  placeholder="e.g. Guest Lecture"
                  className="academic-input text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wide block">Description</label>
                <textarea
                  required
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  placeholder="Event syllabus, details, and coordinators..."
                  rows={2}
                  className="academic-input text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wide block">Date & Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={eventForm.date}
                    onChange={(e) => setEventForm({ ...eventForm, date: e.target.value })}
                    className="academic-input text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wide block">Venue</label>
                  <input
                    type="text"
                    required
                    value={eventForm.venue}
                    onChange={(e) => setEventForm({ ...eventForm, venue: e.target.value })}
                    placeholder="e.g. Lab 4"
                    className="academic-input text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wide block">Max Participants</label>
                <input
                  type="number"
                  required
                  value={eventForm.maxParticipants}
                  onChange={(e) => setEventForm({ ...eventForm, maxParticipants: parseInt(e.target.value) || 100 })}
                  placeholder="100"
                  className="academic-input text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs rounded-md shadow-sm transition"
              >
                Schedule Event
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClubHeadDashboard;
