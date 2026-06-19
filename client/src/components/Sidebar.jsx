import React, { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import {
  LayoutDashboard,
  Users,
  Calendar,
  Award,
  QrCode,
  Bell,
  LogOut,
  Compass,
  Menu,
  X,
  GraduationCap,
  UserCheck
} from 'lucide-react';
import ProfileSettingsModal from './ProfileSettingsModal';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  // Poll notifications count periodically
  useEffect(() => {
    if (!user) return;
    const fetchNotificationsCount = async () => {
      try {
        const res = await api.get('/notifications');
        if (res.data.success) {
          setUnreadNotifications(res.data.unreadCount);
        }
      } catch (err) {
        console.error('Failed to get notifications count:', err.message);
      }
    };
    fetchNotificationsCount();
    const interval = setInterval(fetchNotificationsCount, 30000);
    return () => clearInterval(interval);
  }, [user, location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) return null;

  // Determine routes based on role
  const getNavLinks = () => {
    switch (user.role) {
      case 'admin':
        return [
          { path: '/admin', label: 'Overview Dashboard', icon: LayoutDashboard },
          { path: '/admin/users', label: 'User Directory', icon: UserCheck },
          { path: '/admin/clubs', label: 'Club Moderation', icon: Users },
          { path: '/admin/events', label: 'All Campus Events', icon: Calendar },
        ];
      case 'clubHead':
        return [
          { path: '/clubhead', label: 'Club Console', icon: LayoutDashboard },
          { path: '/clubhead/events', label: 'Manage Events', icon: Calendar },
          { path: '/clubhead/members', label: 'Club Registries', icon: Users },
        ];
      case 'student':
      default:
        return [
          { path: '/student', label: 'Student Portal', icon: LayoutDashboard },
          { path: '/student/clubs', label: 'Browse Clubs', icon: Compass },
          { path: '/student/events', label: 'Campus Events', icon: Calendar },
          { path: '/student/scan', label: 'QR Attendance Scan', icon: QrCode },
          { path: '/student/certificates', label: 'My Credentials', icon: Award },
        ];
    }
  };

  const navLinks = getNavLinks();

  return (
    <>
      {/* Mobile top navigation bar */}
      <header className="lg:hidden w-full h-14 bg-white border-b border-slate-200 px-4 flex justify-between items-center fixed top-0 left-0 right-0 z-50">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-5 w-5 text-emerald-600" />
          <span className="font-bold text-xs tracking-wider text-slate-800">
            UNIVERSITY PORTAL
          </span>
        </div>
        <div className="flex items-center gap-2">
          {user.role === 'student' && (
            <button
              onClick={() => { navigate('/student'); setIsOpen(false); }}
              className="relative p-2 text-slate-500 hover:text-slate-800 transition"
            >
              <Bell className="h-4 w-4" />
              {unreadNotifications > 0 && (
                <span className="absolute top-1 right-1 h-3.5 w-3.5 bg-emerald-600 text-[8px] font-bold text-white flex items-center justify-center rounded-full">
                  {unreadNotifications}
                </span>
              )}
            </button>
          )}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="p-1 text-slate-500 hover:text-slate-800 focus:outline-none transition"
          >
            {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      {/* Sidebar background backdrop for mobile */}
      {isOpen && (
        <div
          onClick={() => setIsOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-900/40 z-40 transition-opacity"
        ></div>
      )}

      {/* Main Sidebar Navigation drawer */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 lg:translate-x-0 ${
          isOpen ? 'translate-x-0 pt-14 lg:pt-0' : '-translate-x-full'
        }`}
      >
        <div>
          {/* Logo Brand Header (Desktop) */}
          <div className="hidden lg:flex items-center gap-2.5 p-5 border-b border-slate-200">
            <GraduationCap className="h-6 w-6 text-emerald-600" />
            <span className="font-bold text-sm tracking-wider text-slate-800">
              UNIVERSITY PORTAL
            </span>
          </div>

          {/* User Badge Profile Summary */}
          <div 
            onClick={() => setIsProfileModalOpen(true)}
            className="p-4 border-b border-slate-100 flex items-center gap-3 bg-slate-50/50 cursor-pointer hover:bg-slate-100 transition-colors group"
            title="Edit Profile Settings"
          >
            <div className="h-9 w-9 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center font-bold text-emerald-700 text-sm overflow-hidden shrink-0 group-hover:border-emerald-300 transition-colors">
              {user.profilePicture ? (
                <img src={user.profilePicture.startsWith('http') ? user.profilePicture : `http://localhost:5000${user.profilePicture}`} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="overflow-hidden flex-1">
              <h4 className="font-semibold text-slate-900 text-xs truncate leading-normal group-hover:text-emerald-700 transition-colors">{user.name}</h4>
              <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-200/50">
                {user.role === 'clubHead' ? 'Club Head' : user.role}
              </span>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              return (
                <NavLink
                  key={link.path}
                  to={link.path}
                  onClick={() => setIsOpen(false)}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold transition-all ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 border-l-2 border-emerald-600'
                        : 'text-slate-600 hover:text-slate-950 hover:bg-slate-100 border-l-2 border-transparent'
                    }`
                  }
                >
                  <Icon className="h-4.5 w-4.5 shrink-0" />
                  <span>{link.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* Footer Area with Notification Bell (Desktop) & Logout */}
        <div className="p-3 border-t border-slate-100 space-y-1">
          {user.role === 'student' && (
            <NavLink
              to="/student"
              onClick={() => setIsOpen(false)}
              className="hidden lg:flex items-center justify-between px-3 py-2 rounded-md text-xs text-slate-600 hover:text-slate-950 hover:bg-slate-100 font-semibold transition"
            >
              <div className="flex items-center gap-2.5">
                <Bell className="h-4.5 w-4.5" />
                <span>Portal Alerts</span>
              </div>
              {unreadNotifications > 0 && (
                <span className="bg-emerald-600 text-[9px] font-bold text-white px-2 py-0.5 rounded-full">
                  {unreadNotifications}
                </span>
              )}
            </NavLink>
          )}

          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-semibold text-slate-600 hover:text-red-700 hover:bg-red-50/50 transition-colors"
          >
            <LogOut className="h-4.5 w-4.5" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>

      {/* Render the Profile Settings Modal independently of the Sidebar DOM flow */}
      <ProfileSettingsModal 
        isOpen={isProfileModalOpen} 
        onClose={() => setIsProfileModalOpen(false)} 
      />
    </>
  );
};

export default Sidebar;
