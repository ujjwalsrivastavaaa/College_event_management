import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  Users,
  Compass,
  Calendar,
  Layers,
  Search,
  CheckCircle,
  XCircle,
  TrendingUp,
  UserCheck,
  Filter,
  Trash2,
  ClipboardList,
} from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';

// Map URL path segments to tab names
const PATH_TO_TAB = {
  '/admin': 'overview',
  '/admin/users': 'users',
  '/admin/clubs': 'clubs',
  '/admin/events': 'events',
};
const TAB_TO_PATH = {
  'overview': '/admin',
  'users': '/admin/users',
  'clubs': '/admin/clubs',
  'events': '/admin/events',
};

const AdminDashboard = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = PATH_TO_TAB[location.pathname] ?? 'overview';

  const setActiveTab = (tab) => navigate(TAB_TO_PATH[tab] ?? '/admin');
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Users Tab States
  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [userTotalPages, setUserTotalPages] = useState(1);

  // Clubs Tab States
  const [clubs, setClubs] = useState([]);
  const [clubsLoading, setClubsLoading] = useState(false);

  // Events Tab States
  const [events, setEvents] = useState([]);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventSearch, setEventSearch] = useState('');

  // Notifications feedback
  const [feedback, setFeedback] = useState({ message: '', type: '' });

  const showFeedback = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
  };

  // Fetch Dashboard Stats
  const fetchStats = async () => {
    try {
      setStatsLoading(true);
      const res = await api.get('/users/dashboard/stats');
      if (res.data.success) {
        setStats(res.data.stats);
      }
    } catch (err) {
      console.error('Failed to fetch admin stats:', err);
    } finally {
      setStatsLoading(false);
    }
  };

  // Fetch Users
  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const res = await api.get(`/users?search=${userSearch}&role=${userRole}&page=${userPage}&limit=10`);
      if (res.data.success) {
        setUsers(res.data.users);
        setUserTotalPages(res.data.totalPages);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setUsersLoading(false);
    }
  };

  // Fetch Clubs
  const fetchClubs = async () => {
    try {
      setClubsLoading(true);
      const res = await api.get('/clubs/admin/all');
      if (res.data.success) {
        setClubs(res.data.clubs);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setClubsLoading(false);
    }
  };

  // Fetch Events
  const fetchEvents = async () => {
    try {
      setEventsLoading(true);
      const res = await api.get(`/events?search=${eventSearch}&limit=50`);
      if (res.data.success) {
        setEvents(res.data.events);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEventsLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  useEffect(() => {
    if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'clubs') {
      fetchClubs();
    } else if (activeTab === 'events') {
      fetchEvents();
    }
  }, [activeTab, userSearch, userRole, userPage, eventSearch]);

  // Handle User Promotion/Demotion
  const handleRoleChange = async (userId, newRole) => {
    try {
      const res = await api.put(`/users/${userId}/role`, { role: newRole });
      if (res.data.success) {
        showFeedback(res.data.message);
        fetchUsers();
        fetchStats(); // Update dashboard metrics
      }
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Failed to update user role', 'error');
    }
  };

  // Handle Club Approval
  const handleApproveClub = async (clubId, action) => {
    try {
      const endpoint = `/clubs/${clubId}/${action}`; // approve or reject
      const res = await api.put(endpoint);
      if (res.data.success) {
        showFeedback(res.data.message);
        fetchClubs();
        fetchStats();
      }
    } catch (err) {
      showFeedback('Failed to update club status', 'error');
    }
  };

  // Handle Event Deletion
  const handleDeleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event? This will erase all registrations.')) return;
    try {
      const res = await api.delete(`/events/${eventId}`);
      if (res.data.success) {
        showFeedback(res.data.message);
        fetchEvents();
        fetchStats();
      }
    } catch (err) {
      showFeedback('Failed to delete event', 'error');
    }
  };

  // Colors for Recharts (Academic Emerald & Slate variations)
  const COLORS = ['#10B981', '#475569', '#3B82F6', '#F59E0B', '#EF4444'];

  const getRoleChartData = () => {
    if (!stats) return [];
    return [
      { name: 'Students', value: stats.users.students },
      { name: 'Club Heads', value: stats.users.clubHeads },
      { name: 'Admins', value: stats.users.admins },
    ];
  };

  return (
    <div className="flex-1 lg:ml-64 p-6 lg:p-8 min-h-screen bg-slate-50">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">University Administrator Console</h1>
          <p className="text-slate-500 text-xs mt-0.5">Manage user roles, review official club registrations, and audit campus-wide events.</p>
        </div>
        
        {feedback.message && (
          <div className={`px-3 py-1.5 rounded-md border text-xs font-semibold animate-fade-in shrink-0 ${
            feedback.type === 'error' 
              ? 'bg-red-50 border-red-200 text-red-700' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            {feedback.message}
          </div>
        )}
      </div>

      {/* Tab Selectors */}
      <div className="flex border-b border-slate-200 mb-6 overflow-x-auto whitespace-nowrap bg-white rounded-md border p-1 shadow-sm max-w-md">
        {['overview', 'users', 'clubs', 'events'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-4 py-2 font-semibold text-xs capitalize rounded-md transition-all ${
              activeTab === tab
                ? 'bg-slate-100 text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {statsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-28 bg-white border border-slate-200 rounded-lg animate-pulse"></div>
              ))}
            </div>
          ) : (
            <>
              {/* Analytics Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-200/80 rounded-lg p-5 flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Users</span>
                    <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{stats?.users.total}</h3>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Students: {stats?.users.students}</span>
                  </div>
                  <div className="h-10 w-10 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
                    <Users className="h-5 w-5" />
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-lg p-5 flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Clubs</span>
                    <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{stats?.clubs.total}</h3>
                    <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">Approved: {stats?.clubs.approved}</span>
                  </div>
                  <div className="h-10 w-10 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
                    <Compass className="h-5 w-5" />
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-lg p-5 flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Events</span>
                    <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{stats?.events.total}</h3>
                    <span className="text-[10px] text-emerald-600 font-semibold mt-0.5 block">Upcoming: {stats?.events.upcoming}</span>
                  </div>
                  <div className="h-10 w-10 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
                    <Calendar className="h-5 w-5" />
                  </div>
                </div>

                <div className="bg-white border border-slate-200/80 rounded-lg p-5 flex items-center justify-between shadow-sm">
                  <div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Registrations</span>
                    <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{stats?.registrations.total}</h3>
                    <span className="text-[10px] text-slate-500 mt-0.5 block">Total event bookings</span>
                  </div>
                  <div className="h-10 w-10 rounded-md bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-600">
                    <Layers className="h-5 w-5" />
                  </div>
                </div>
              </div>

              {/* Graphic charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* User distribution */}
                <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <TrendingUp className="h-4 w-4 text-slate-500" />
                    User Role Breakdown
                  </h4>
                  <div className="h-64 flex justify-center items-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={getRoleChartData()}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {getRoleChartData().map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', fontSize: '11px', borderRadius: '6px' }} />
                        <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px' }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Popular events */}
                <div className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm">
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-4 flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Layers className="h-4 w-4 text-slate-500" />
                    Event Registration Counts
                  </h4>
                  <div className="h-64">
                    {stats?.popularEvents && stats.popularEvents.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={stats.popularEvents} barSize={20}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="title" stroke="#64748b" fontSize={10} tickLine={false} />
                          <YAxis stroke="#64748b" fontSize={10} tickLine={false} />
                          <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', fontSize: '11px', borderRadius: '6px' }} />
                          <Bar dataKey="count" fill="#10B981" radius={[3, 3, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                        No registrations logged in the database.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* USERS TAB */}
      {activeTab === 'users' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center border-b border-slate-100 pb-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">User Directory</h4>
            
            {/* Search/Filter */}
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
              <div className="relative flex-1 sm:flex-initial">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search name or email..."
                  value={userSearch}
                  onChange={(e) => { setUserSearch(e.target.value); setUserPage(1); }}
                  className="w-full sm:w-48 pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <select
                value={userRole}
                onChange={(e) => { setUserRole(e.target.value); setUserPage(1); }}
                className="py-1.5 px-2 bg-white border border-slate-300 rounded-md text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">All Roles</option>
                <option value="student">Student</option>
                <option value="clubHead">Club Head</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {usersLoading ? (
            <div className="space-y-2 py-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 bg-slate-100 rounded-md animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="academic-table-container">
              <table className="academic-table">
                <thead>
                  <tr>
                    <th>User Name</th>
                    <th>Email Address</th>
                    <th>System Role</th>
                    <th className="text-right">Administration Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.length > 0 ? (
                    users.map((u) => (
                      <tr key={u._id}>
                        <td className="font-semibold text-slate-900">{u.name}</td>
                        <td className="text-slate-500">{u.email}</td>
                        <td>
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                            u.role === 'admin' 
                              ? 'bg-red-50 border-red-200 text-red-700' 
                              : u.role === 'clubHead' 
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
                          }`}>
                            {u.role === 'clubHead' ? 'Club Head' : u.role}
                          </span>
                        </td>
                        <td className="text-right">
                          {u.role === 'student' && (
                            <button
                              onClick={() => handleRoleChange(u._id, 'clubHead')}
                              className="text-xs font-semibold px-2.5 py-1 border border-slate-300 rounded-md bg-white hover:bg-slate-50 text-slate-700 transition"
                            >
                              Promote to Club Head
                            </button>
                          )}
                          {u.role === 'clubHead' && (
                            <button
                              onClick={() => handleRoleChange(u._id, 'student')}
                              className="text-xs font-semibold px-2.5 py-1 border border-red-200 rounded-md bg-white hover:bg-red-50 text-red-600 transition"
                            >
                              Demote to Student
                            </button>
                          )}
                          {u.role === 'admin' && (
                            <span className="text-xs text-slate-400 font-medium">System Administrator</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                        No registered users found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {userTotalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 pt-4 text-xs text-slate-500">
              <span>Page {userPage} of {userTotalPages}</span>
              <div className="space-x-1">
                <button
                  disabled={userPage === 1}
                  onClick={() => setUserPage(userPage - 1)}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 transition"
                >
                  Previous
                </button>
                <button
                  disabled={userPage === userTotalPages}
                  onClick={() => setUserPage(userPage + 1)}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 transition"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CLUBS TAB */}
      {activeTab === 'clubs' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-sm">
          <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-3">Club Registrations & Proposals</h4>

          {clubsLoading ? (
            <div className="space-y-2 py-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-md animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="academic-table-container">
              <table className="academic-table">
                <thead>
                  <tr>
                    <th>Club Details</th>
                    <th>President</th>
                    <th>Coordinator</th>
                    <th>Status</th>
                    <th className="text-right">Action Requests</th>
                  </tr>
                </thead>
                <tbody>
                  {clubs.length > 0 ? (
                    clubs.map((c) => (
                      <tr key={c._id}>
                        <td>
                          <div className="font-semibold text-slate-900">{c.clubName}</div>
                          <div className="text-xs text-slate-400 max-w-xs truncate">{c.description}</div>
                        </td>
                        <td>{c.president?.name || 'N/A'}</td>
                        <td>{c.facultyCoordinator}</td>
                        <td>
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                            c.status === 'approved' 
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700' 
                              : c.status === 'rejected'
                              ? 'bg-red-50 border-red-200 text-red-700'
                              : 'bg-amber-50 border-amber-200 text-amber-700'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="text-right">
                          {c.status === 'pending' ? (
                            <div className="flex gap-2 justify-end">
                              <button
                                onClick={() => handleApproveClub(c._id, 'approve')}
                                className="p-1 border border-emerald-200 bg-white hover:bg-emerald-50 rounded text-emerald-600 transition"
                                title="Approve Proposal"
                              >
                                <CheckCircle className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleApproveClub(c._id, 'reject')}
                                className="p-1 border border-red-200 bg-white hover:bg-red-50 rounded text-red-600 transition"
                                title="Reject Proposal"
                              >
                                <XCircle className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium">Archived</span>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                        No clubs registered in system.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SYSTEM EVENTS TAB */}
      {activeTab === 'events' && (
        <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center border-b border-slate-100 pb-4">
            <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Campus Events audit</h4>
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search events..."
                value={eventSearch}
                onChange={(e) => setEventSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
              />
            </div>
          </div>

          {eventsLoading ? (
            <div className="space-y-2 py-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-12 bg-slate-100 rounded-md animate-pulse"></div>
              ))}
            </div>
          ) : (
            <div className="academic-table-container">
              <table className="academic-table">
                <thead>
                  <tr>
                    <th>Event Details</th>
                    <th>Venue</th>
                    <th>Event Date</th>
                    <th>Status</th>
                    <th className="text-right">Auditing Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {events.length > 0 ? (
                    events.map((e) => (
                      <tr key={e._id}>
                        <td>
                          <div className="font-semibold text-slate-900">{e.title}</div>
                          <div className="text-xs text-slate-400">Hosting: {e.clubId?.clubName || 'General'}</div>
                        </td>
                        <td>{e.venue}</td>
                        <td>{new Date(e.date).toLocaleDateString()}</td>
                        <td>
                          <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-md border ${
                            e.status === 'upcoming' 
                              ? 'bg-blue-50 border-blue-200 text-blue-700' 
                              : e.status === 'completed'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-slate-100 border-slate-200 text-slate-500'
                          }`}>
                            {e.status}
                          </span>
                        </td>
                        <td className="text-right">
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() => navigate(`/admin/attendance/${e._id}`)}
                              className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold border border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-700 rounded transition"
                              title="View Attendance Report"
                            >
                              <ClipboardList className="h-3.5 w-3.5" />
                              Attendance
                            </button>
                            <button
                              onClick={() => handleDeleteEvent(e._id)}
                              className="p-1.5 border border-red-200 bg-white hover:bg-red-50 text-red-600 rounded transition"
                              title="Cancel Event"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-slate-400 text-xs">
                        No scheduled campus events found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
