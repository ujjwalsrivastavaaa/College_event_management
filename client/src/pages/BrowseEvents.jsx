import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { Calendar, Search, MapPin, Clock, Lock, X, CheckCircle } from 'lucide-react';

const BrowseEvents = () => {
  const [events, setEvents] = useState([]);
  const [clubs, setClubs] = useState([]);
  const [myRegEventIds, setMyRegEventIds] = useState([]);

  // Filter States
  const [timeline, setTimeline] = useState('upcoming');
  const [clubFilter, setClubFilter] = useState('');
  const [searchWord, setSearchWord] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [loading, setLoading] = useState(true);

  // Expanded Event Modal State
  const [detailedEvent, setDetailedEvent] = useState(null);
  const [detailedCount, setDetailedCount] = useState(0);

  const [feedback, setFeedback] = useState({ message: '', type: '' });

  const showFeedback = (message, type = 'success') => {
    setFeedback({ message, type });
    setTimeout(() => setFeedback({ message: '', type: '' }), 4000);
  };

  const fetchFiltersData = async () => {
    try {
      const clubsRes = await api.get('/clubs');
      if (clubsRes.data.success) setClubs(clubsRes.data.clubs);
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await api.get(
        `/events?search=${searchWord}&clubId=${clubFilter}&timeline=${timeline}&page=${currentPage}&limit=6`
      );

      // Fetch student's registered event IDs to mark cards
      const regRes = await api.get('/events/my/registrations');

      if (res.data.success) {
        setEvents(res.data.events);
        setTotalPages(res.data.totalPages);
      }
      if (regRes.data.success) {
        const ids = regRes.data.registrations.map((r) => r.eventId?._id);
        setMyRegEventIds(ids);
      }
    } catch (err) {
      console.error('Failed to load events:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiltersData();
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [timeline, clubFilter, searchWord, currentPage]);

  const handleRegister = async (eventId) => {
    try {
      const res = await api.post(`/events/${eventId}/register`);
      if (res.data.success) {
        showFeedback(res.data.message);
        setMyRegEventIds([...myRegEventIds, eventId]);
        // Refresh detailed view if open
        if (detailedEvent?._id === eventId) {
          handleOpenDetails(detailedEvent);
        }
      }
    } catch (err) {
      showFeedback(err.response?.data?.message || 'Registration failed', 'error');
    }
  };

  const handleOpenDetails = async (event) => {
    try {
      const res = await api.get(`/events/${event._id}`);
      if (res.data.success) {
        setDetailedEvent(res.data.event);
        setDetailedCount(res.data.registrationsCount);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="flex-1 lg:ml-64 p-6 lg:p-8 min-h-screen bg-slate-50">
      
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Calendar className="h-6 w-6 text-emerald-600" />
            Explore Campus Events
          </h1>
          <p className="text-slate-500 text-xs mt-0.5">Register for guest lectures, workshops, hackathons, and activities scheduled on campus.</p>
        </div>

        {feedback.message && (
          <div className={`px-3 py-1.5 rounded-md border text-xs font-semibold animate-fade-in shrink-0 ml-auto md:ml-0 ${
            feedback.type === 'error' 
              ? 'bg-red-50 border-red-200 text-red-700' 
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            {feedback.message}
          </div>
        )}
      </div>

      {/* Search & Filters Console */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 flex flex-col md:flex-row gap-4 justify-between items-center shadow-sm">
        {/* Timeline Tabs */}
        <div className="flex bg-slate-100 p-1 rounded-md w-full md:w-auto border border-slate-200/50">
          <button
            onClick={() => { setTimeline('upcoming'); setCurrentPage(1); }}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded transition-all ${
              timeline === 'upcoming'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Upcoming
          </button>
          <button
            onClick={() => { setTimeline('past'); setCurrentPage(1); }}
            className={`flex-1 md:flex-initial px-4 py-1.5 text-xs font-bold rounded transition-all ${
              timeline === 'past'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Past Events
          </button>
        </div>

        {/* Inputs */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* Keyword Search */}
          <div className="relative flex-1 md:flex-initial md:w-48">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search events..."
              value={searchWord}
              onChange={(e) => { setSearchWord(e.target.value); setCurrentPage(1); }}
              className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs placeholder-slate-400 focus:outline-none"
            />
          </div>

          {/* Club Dropdown Filter */}
          <select
            value={clubFilter}
            onChange={(e) => { setClubFilter(e.target.value); setCurrentPage(1); }}
            className="py-1.5 px-2 bg-white border border-slate-300 rounded-md text-xs text-slate-700 w-full md:w-auto"
          >
            <option value="">All Hosting Clubs</option>
            {clubs.map((c) => (
              <option key={c._id} value={c._id}>{c.clubName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Events Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-60 bg-white border border-slate-200 rounded-lg animate-pulse"></div>
          ))}
        </div>
      ) : events.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {events.map((e) => {
            const isReg = myRegEventIds.includes(e._id);
            const isPast = new Date(e.date) < new Date();
            return (
              <div
                key={e._id}
                onClick={() => handleOpenDetails(e)}
                className="bg-white border border-slate-200 rounded-lg p-5 flex flex-col justify-between space-y-4 cursor-pointer hover:border-slate-300 shadow-sm transition-all"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[9px] font-bold tracking-wider">
                    <span className="text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md uppercase">
                      {e.clubId?.clubName || 'General'}
                    </span>
                    
                    {isReg && (
                      <span className="text-emerald-700 bg-emerald-50 border border-emerald-250 px-2 py-0.5 rounded-md uppercase flex items-center gap-0.5">
                        <CheckCircle className="h-3 w-3" />
                        Registered
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-900 text-base leading-snug">{e.title}</h3>
                  <p className="text-slate-500 text-xs line-clamp-3 leading-normal">{e.description}</p>
                </div>

                <div className="space-y-3 pt-3 border-t border-slate-100">
                  <div className="flex flex-col gap-1 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {e.venue}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {new Date(e.date).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Actions footer */}
                  <div className="flex justify-between items-center pt-1.5 border-t border-slate-50">
                    <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">
                      Seats: {e.maxParticipants} max
                    </span>

                    {isReg ? (
                      <span className="text-xs font-semibold text-slate-400 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded">
                        Seat Booked
                      </span>
                    ) : isPast ? (
                      <span className="text-xs font-semibold text-slate-400 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded flex items-center gap-1">
                        <Lock className="h-3.5 w-3.5" />
                        Closed
                      </span>
                    ) : (
                      <button
                        onClick={(evt) => { evt.stopPropagation(); handleRegister(e._id); }}
                        className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded transition"
                      >
                        Register
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-lg p-10 text-center text-slate-400 text-xs shadow-sm">
          No campus events scheduled matching your active search filters.
        </div>
      )}

      {/* Pagination Controls */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 mt-6 pt-4 text-xs text-slate-500">
          <span>Page {currentPage} of {totalPages}</span>
          <div className="space-x-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(currentPage - 1)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 transition"
            >
              Previous
            </button>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage(currentPage + 1)}
              className="px-2.5 py-1 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 transition"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* DETAILED EVENT SPECIFICATION MODAL */}
      {detailedEvent && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg p-5 space-y-4 relative shadow-md animate-slide-up">
            <button
              onClick={() => setDetailedEvent(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="border-b border-slate-100 pb-2">
              <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-250 px-2 py-0.5 rounded-md uppercase">
                {detailedEvent.clubId?.clubName}
              </span>
              <h3 className="text-lg font-bold text-slate-900 mt-1">{detailedEvent.title}</h3>
            </div>

            <p className="text-slate-600 text-xs leading-relaxed whitespace-pre-line">{detailedEvent.description}</p>

            <div className="grid grid-cols-2 gap-3 py-2.5 border-y border-slate-100 text-xs text-slate-500">
              <div>
                <strong className="text-slate-700 block mb-0.5">Venue</strong>
                <span>{detailedEvent.venue}</span>
              </div>
              <div>
                <strong className="text-slate-700 block mb-0.5">Scheduled Date</strong>
                <span>{new Date(detailedEvent.date).toLocaleString()}</span>
              </div>
              <div>
                <strong className="text-slate-700 block mb-0.5">Slots Taken</strong>
                <span>{detailedCount} / {detailedEvent.maxParticipants} filled</span>
              </div>
              <div>
                <strong className="text-slate-700 block mb-0.5">Contact faculty</strong>
                <span>{detailedEvent.clubId?.facultyCoordinator || 'N/A'}</span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1.5">
              <button
                onClick={() => setDetailedEvent(null)}
                className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 border border-slate-300 rounded"
              >
                Close
              </button>
              
              {!myRegEventIds.includes(detailedEvent._id) && new Date(detailedEvent.date) >= new Date() && (
                <button
                  onClick={() => handleRegister(detailedEvent._id)}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded shadow-sm"
                >
                  Register Seat
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BrowseEvents;
