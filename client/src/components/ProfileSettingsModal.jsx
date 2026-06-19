import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Camera, Trash2, X, Upload, CheckCircle2, AlertTriangle } from 'lucide-react';

const ProfileSettingsModal = ({ isOpen, onClose }) => {
  const { user, refreshUser, logout } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [department, setDepartment] = useState('');
  const [success, setSuccess] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDeleteForm, setShowDeleteForm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setRollNumber(user.rollNumber || '');
      setDepartment(user.department || '');
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setLoading(true);
      setError(null);

      // 1. Upload the image to the /api/upload endpoint
      const formData = new FormData();
      formData.append('image', file);

      const uploadRes = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (uploadRes.data.success) {
        // 2. Save the URL to the user's profile
        const profileRes = await api.put('/auth/profile/image', {
          profilePicture: uploadRes.data.url,
        });

        if (profileRes.data.success) {
          await refreshUser();
        }
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteImage = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await api.delete('/auth/profile/image');
      if (res.data.success) {
        await refreshUser();
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete image');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      const res = await api.put('/auth/profile', {
        name,
        rollNumber,
        department,
      });
      if (res.data.success) {
        setSuccess('Profile updated successfully!');
        await refreshUser();
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!window.confirm('Are you sure you want to permanently delete your account? This action cannot be undone.')) return;
    try {
      setLoading(true);
      setError(null);
      const res = await api.delete('/auth/account', {
        data: { password: deletePassword }
      });
      if (res.data.success) {
        alert('Account deleted successfully.');
        logout();
        onClose();
        navigate('/login');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to delete account. Please verify your password.');
    } finally {
      setLoading(false);
    }
  };

  const getAvatarUrl = () => {
    if (!user.profilePicture) return null;
    return user.profilePicture.startsWith('http')
      ? user.profilePicture
      : `http://localhost:5000${user.profilePicture}`;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden animate-fade-in relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="p-6 text-center border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Profile Settings</h2>
          <p className="text-xs text-slate-500 mt-1">Manage your avatar and personal info.</p>
        </div>

        <div className="p-6 flex flex-col items-center">
          {error && (
            <div className="mb-4 w-full p-2 bg-red-50 text-red-700 border border-red-200 rounded text-xs text-center font-medium">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-4 w-full p-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-xs flex items-center justify-center gap-1.5 font-medium">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 animate-bounce" />
              {success}
            </div>
          )}

          <div className="relative group">
            <div className="h-24 w-24 rounded-full bg-emerald-50 border-4 border-white shadow-md flex items-center justify-center font-bold text-emerald-700 text-3xl overflow-hidden shrink-0">
              {getAvatarUrl() ? (
                <img src={getAvatarUrl()} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                user.name.charAt(0).toUpperCase()
              )}
            </div>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 h-8 w-8 bg-emerald-600 rounded-full border-2 border-white text-white flex items-center justify-center shadow-sm hover:bg-emerald-700 transition"
              disabled={loading}
              title="Upload new picture"
            >
              <Camera className="h-4 w-4" />
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={handleImageUpload}
            />
          </div>

          <div className="mt-4 text-center">
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>

          {showDeleteForm ? (
            <form onSubmit={handleDeleteAccount} className="w-full mt-6 space-y-4">
              <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-850 text-xs flex gap-2 items-start leading-relaxed">
                <AlertTriangle className="h-5 w-5 text-red-650 shrink-0 mt-0.5" />
                <div>
                  <strong>Warning:</strong> Deleting your account is permanent. It will immediately cancel all your event registrations, active club memberships, and delete earned credentials.
                </div>
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Verify Account Password</label>
                <input
                  type="password"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  placeholder="Enter your current password"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-955 text-xs focus:outline-none focus:ring-1 focus:ring-red-500 focus:border-red-500"
                  required
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-red-650 hover:bg-red-750 active:bg-red-800 text-white font-semibold text-xs rounded-md shadow-sm transition disabled:opacity-50"
                >
                  {loading ? 'Deleting Account...' : 'Permanently Delete Account'}
                </button>

                <button
                  type="button"
                  onClick={() => { setShowDeleteForm(false); setDeletePassword(''); }}
                  disabled={loading}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-xs font-semibold transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleUpdateProfile} className="w-full mt-6 space-y-3.5">
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-955 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  required
                />
              </div>
              
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Roll Number</label>
                <input
                  type="text"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="e.g. 2021CSB1001"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-955 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Department</label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Computer Science"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-md text-slate-955 text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs rounded-md shadow-sm transition disabled:opacity-50"
                >
                  {loading ? 'Saving Profile...' : 'Save Profile Changes'}
                </button>

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 rounded-md text-xs font-semibold hover:bg-emerald-100 transition"
                >
                  <Upload className="h-3.5 w-3.5" />
                  Upload New Picture
                </button>

                {user.profilePicture && (
                  <button
                    type="button"
                    onClick={handleDeleteImage}
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-650 rounded-md text-xs font-semibold hover:bg-red-50 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove Picture
                  </button>
                )}

                {user.role === 'student' && (
                  <div className="pt-2 border-t border-red-100 mt-2">
                    <button
                      type="button"
                      onClick={() => setShowDeleteForm(true)}
                      disabled={loading}
                      className="w-full py-2 bg-red-55 hover:bg-red-100 text-red-650 rounded-md text-xs font-bold border border-red-200 transition"
                    >
                      Delete My Account
                    </button>
                  </div>
                )}
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSettingsModal;
