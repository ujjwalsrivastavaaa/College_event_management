import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Compass, Users, Check, Plus, X, ShieldAlert } from 'lucide-react';

const JoinClubs = () => {
  const [clubs, setClubs] = useState([]);
  const [joinedClubIds, setJoinedClubIds] = useState([]);
  const [clubsLoading, setClubsLoading] = useState(true);

  // Request Club Form Modal State
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [clubRequestForm, setClubRequestForm] = useState({
    clubName: '',
    description: '',
    facultyCoordinator: '',
  });

  const [feedback, setFeedback] = useState({ message: '', type: '' });

  const showFeedback = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
  };

  const fetchClubs = async () => {
    try {
      setClubsLoading(true);
      const res = await api.get('/clubs');
      const joinedRes = await api.get('/clubs/my/joined');

      if (res.data.success) setClubs(res.data.clubs);
      if (joinedRes.data.success) setJoinedClubIds(joinedRes.data.joinedClubIds);
    } catch (err) {
      console.error('Failed to load clubs:', err.message);
    } finally {
      setClubsLoading(false);
    }
  };

  useEffect(() => {
    fetchClubs();
  }, []);

  const handleJoinClub = async (clubId) => {
    try {
      const res = await api.post(`/clubs/${clubId}/join`);
      if (res.data.success) {
        showFeedback(res.data.message);
        setJoinedClubIds([...joinedClubIds, clubId]);
      }
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Failed to join club', 'error');
    }
  };

  const handleLeaveClub = async (clubId) => {
    try {
      const res = await api.post(`/clubs/${clubId}/leave`);
      if (res.data.success) {
        showFeedback(res.data.message);
        setJoinedClubIds(joinedClubIds.filter((id) => id !== clubId));
      }
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Failed to leave club', 'error');
    }
  };

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    try {
      const res = await api.post('/clubs', clubRequestForm);
      if (res.data.success) {
        showFeedback(res.data.message);
        setIsRequestModalOpen(false);
        setClubRequestForm({ clubName: '', description: '', facultyCoordinator: '' });
      }
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Request failed.', 'error');
    }
  };

  return (
    <div className="flex-1 lg:ml-64 p-6 lg:p-8 min-h-screen bg-slate-50">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Compass className="h-6 w-6 text-emerald-600 animate-pulse" />
            Discover Student Clubs
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">Explore specialized campus communities, submit membership requests, or pitch a new club.</p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto ml-auto md:ml-0">
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
            onClick={() => setIsRequestModalOpen(true)}
            className="academic-btn-primary flex items-center gap-1 text-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Propose Club</span>
          </button>
        </div>
      </div>

      {/* Clubs Grid List */}
      {clubsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-44 bg-white border border-slate-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      ) : clubs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {clubs.map((c) => {
            const isJoined = joinedClubIds.includes(c._id);
            return (
              <div key={c._id} className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between space-y-4 shadow-sm hover:shadow transition-shadow">
                <div className="space-y-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center font-bold text-emerald-700 text-base shrink-0 overflow-hidden">
                      {c.logo ? (
                        <img src={c.logo.startsWith('http') ? c.logo : `http://localhost:5000${c.logo}`} alt="Logo" className="h-full w-full object-cover" />
                      ) : (
                        c.clubName.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm leading-snug">{c.clubName}</h4>
                      <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">Faculty Sponsor: {c.facultyCoordinator}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-slate-600 text-xs leading-relaxed line-clamp-3 pt-1">{c.description}</p>
                </div>

                <div className="pt-3 border-t border-slate-100 flex justify-between items-center">
                  <div className="text-[10px] text-slate-500 leading-normal">
                    <span className="font-semibold text-slate-700 block">President</span>
                    <span>{c.president?.name || 'Faculty Sponsor'}</span>
                  </div>

                  {isJoined ? (
                    <button
                      onClick={() => handleLeaveClub(c._id)}
                      className="px-2.5 py-1.5 border border-red-200 bg-white hover:bg-red-50 text-red-600 text-xs font-semibold rounded transition"
                    >
                      Joined • Leave
                    </button>
                  ) : (
                    <button
                      onClick={() => handleJoinClub(c._id)}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-semibold rounded shadow-sm transition"
                    >
                      Join Club
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-slate-400 text-xs shadow-sm">
          No active student clubs registered. Pitch starting a new club using the "Propose Club" button.
        </div>
      )}

      {/* PROPOSE CLUB REQUEST MODAL */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-5 space-y-4 relative shadow-md animate-slide-up">
            <button
              onClick={() => setIsRequestModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">Propose New Student Club</h3>
              <p className="text-slate-500 text-[10px] mt-0.5">Submit a pitch to register a new official student organization.</p>
            </div>

            <form onSubmit={handleSubmitRequest} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wide block">Club Name</label>
                <input
                  type="text"
                  required
                  value={clubRequestForm.clubName}
                  onChange={(e) => setClubRequestForm({ ...clubRequestForm, clubName: e.target.value })}
                  placeholder="e.g. Astronomy Club"
                  className="academic-input text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wide block">Description / Mission</label>
                <textarea
                  required
                  value={clubRequestForm.description}
                  onChange={(e) => setClubRequestForm({ ...clubRequestForm, description: e.target.value })}
                  placeholder="Pitch target activities, scope, and department sponsor plans..."
                  rows={3}
                  className="academic-input text-xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-700 uppercase tracking-wide block">Faculty Sponsor Name</label>
                <input
                  type="text"
                  required
                  value={clubRequestForm.facultyCoordinator}
                  onChange={(e) => setClubRequestForm({ ...clubRequestForm, facultyCoordinator: e.target.value })}
                  placeholder="e.g. Dr. Arthur Dent"
                  className="academic-input text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold text-xs rounded-md shadow-sm transition"
              >
                Submit Club Proposal
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default JoinClubs;
