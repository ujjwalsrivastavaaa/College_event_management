import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
  ArrowLeft,
  Download,
  FileSpreadsheet,
  FileText,
  Search,
  Filter,
  Users,
  UserCheck,
  UserX,
  Award,
  Clock,
  RefreshCw,
  CheckCircle,
  XCircle,
  ChevronUp,
  ChevronDown,
} from 'lucide-react';

// ── Stat Card ─────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, icon: Icon, accent = 'emerald' }) => {
  const colors = {
    emerald: 'text-emerald-600 bg-emerald-50 border-emerald-200',
    slate:   'text-slate-600 bg-slate-50 border-slate-200',
    red:     'text-red-600 bg-red-50 border-red-200',
    amber:   'text-amber-600 bg-amber-50 border-amber-200',
  };
  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5 flex items-center justify-between shadow-sm">
      <div>
        <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">{label}</span>
        <h3 className="text-2xl font-extrabold text-slate-900 mt-1">{value}</h3>
        {sub && <span className="text-[10px] text-slate-500 mt-0.5 block">{sub}</span>}
      </div>
      <div className={`h-10 w-10 rounded-md border flex items-center justify-center ${colors[accent]}`}>
        <Icon className="h-5 w-5" />
      </div>
    </div>
  );
};

// ── Main Page ─────────────────────────────────────────────────────────────────
const EventAttendancePage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState('');
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  // Filter / search state
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all'); // all | present | absent | certified
  const [sortField, setSortField] = useState('sNo');
  const [sortDir, setSortDir] = useState('asc');
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 25;

  const fetchReport = async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/attendance/event/${eventId}/report`);
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load attendance report.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [eventId]);

  // ── Derived / filtered roster ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (!data) return [];
    let rows = data.report;

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.email.toLowerCase().includes(q) ||
          (r.rollNumber || '').toLowerCase().includes(q) ||
          (r.department || '').toLowerCase().includes(q)
      );
    }

    if (statusFilter === 'present') rows = rows.filter((r) => r.present);
    if (statusFilter === 'absent')  rows = rows.filter((r) => !r.present);
    if (statusFilter === 'certified') rows = rows.filter((r) => r.certificateReceived);

    // Sort
    rows = [...rows].sort((a, b) => {
      let av = a[sortField] ?? '';
      let bv = b[sortField] ?? '';
      if (typeof av === 'string') av = av.toLowerCase();
      if (typeof bv === 'string') bv = bv.toLowerCase();
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return rows;
  }, [data, search, statusFilter, sortField, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const toggleSort = (field) => {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortField(field); setSortDir('asc'); }
    setPage(1);
  };

  // ── Export helpers ─────────────────────────────────────────────────────────
  const downloadBlob = async (url, label) => {
    try {
      setExporting(label);
      const token = localStorage.getItem('token');
      // Use same origin so Vite dev proxy forwards it correctly
      const base = `${window.location.origin}/api`;
      const resp = await fetch(`${base}${url}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.message || 'Export failed');
      }
      const blob = await resp.blob();
      const href = URL.createObjectURL(blob);
      const disposition = resp.headers.get('content-disposition') || '';
      const filename = disposition.split('filename=')[1]?.replace(/"/g, '') || `export_${Date.now()}`;
      const a = document.createElement('a');
      a.href = href;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(href);
    } catch (err) {
      alert('Export failed: ' + err.message);
    } finally {
      setExporting('');
    }
  };

  const handleExcelExport = () =>
    downloadBlob(`/attendance/event/${eventId}/export-excel`, 'excel');

  const handleCSVExport = () =>
    downloadBlob(`/attendance/event/${eventId}/export-csv`, 'csv');

  // ── Sort icon helper ───────────────────────────────────────────────────────
  const SortIcon = ({ field }) =>
    sortField === field ? (
      sortDir === 'asc' ? <ChevronUp className="h-3 w-3 inline ml-0.5" /> : <ChevronDown className="h-3 w-3 inline ml-0.5" />
    ) : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex-1 lg:ml-64 min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="h-8 w-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-500 text-sm">Loading attendance report…</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 lg:ml-64 min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center space-y-4 max-w-sm">
          <XCircle className="h-10 w-10 text-red-500 mx-auto" />
          <p className="text-slate-700 font-semibold">{error}</p>
          <button onClick={() => navigate(-1)} className="academic-btn-secondary text-sm">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  const { event, stats } = data;

  return (
    <div className="flex-1 lg:ml-64 p-6 lg:p-8 min-h-screen bg-slate-50">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="p-2 rounded-md border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              Attendance Report
            </h1>
            <p className="text-slate-500 text-xs mt-0.5">
              {event.title} &nbsp;·&nbsp; {event.clubName} &nbsp;·&nbsp;{' '}
              {new Date(event.date).toLocaleDateString('en-IN', { dateStyle: 'long' })}
              &nbsp;·&nbsp; {event.venue}
            </p>
          </div>
        </div>

        {/* Export buttons */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={fetchReport}
            className="p-2 rounded-md border border-slate-200 bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
            title="Refresh"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          <button
            onClick={handleCSVExport}
            disabled={!!exporting}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border border-slate-300 bg-white text-slate-700 rounded-md hover:bg-slate-50 transition disabled:opacity-60"
          >
            <FileText className="h-3.5 w-3.5" />
            {exporting === 'csv' ? 'Exporting…' : 'Export CSV'}
          </button>

          <button
            onClick={handleExcelExport}
            disabled={!!exporting}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-md hover:bg-emerald-700 transition disabled:opacity-60"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            {exporting === 'excel' ? 'Exporting…' : 'Download Excel'}
          </button>
        </div>
      </div>

      {/* ── Stats Cards ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          label="Total Registered"
          value={stats.totalRegistered}
          sub="Students enrolled"
          icon={Users}
          accent="slate"
        />
        <StatCard
          label="Total Present"
          value={stats.totalPresent}
          sub={`${stats.attendancePercentage}% attendance rate`}
          icon={UserCheck}
          accent="emerald"
        />
        <StatCard
          label="Total Absent"
          value={stats.totalAbsent}
          sub="Did not attend"
          icon={UserX}
          accent="red"
        />
        <StatCard
          label="Certificates Issued"
          value={stats.certificatesIssued}
          sub="Downloaded by students"
          icon={Award}
          accent="amber"
        />
      </div>

      {/* ── Attendance % bar ─────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-6 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Attendance Rate
          </span>
          <span className="text-sm font-extrabold text-emerald-700">
            {stats.attendancePercentage}%
          </span>
        </div>
        <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 rounded-full transition-all duration-700"
            style={{ width: `${stats.attendancePercentage}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5 text-[10px] text-slate-400">
          <span>{stats.totalPresent} present</span>
          <span>{stats.totalAbsent} absent</span>
        </div>
      </div>

      {/* ── Search / Filter bar ──────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 mb-4 shadow-sm flex flex-col sm:flex-row gap-3 items-start sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, roll number, email, department…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-md text-xs placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          {['all', 'present', 'absent', 'certified'].map((f) => (
            <button
              key={f}
              onClick={() => { setStatusFilter(f); setPage(1); }}
              className={`px-2.5 py-1 text-[10px] font-bold uppercase rounded-md border transition ${
                statusFilter === f
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-white text-slate-500 border-slate-300 hover:border-slate-400'
              }`}
            >
              {f === 'certified' ? 'Cert. Received' : f}
            </button>
          ))}
        </div>

        <span className="text-[10px] text-slate-400 shrink-0">
          {filtered.length} result{filtered.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-lg shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200">
                {[
                  { label: '#', field: 'sNo', w: 'w-10' },
                  { label: 'Student Name', field: 'name', w: 'min-w-[160px]' },
                  { label: 'Roll No.', field: 'rollNumber', w: 'w-24' },
                  { label: 'Department', field: 'department', w: 'w-28' },
                  { label: 'Email', field: 'email', w: 'min-w-[180px]' },
                  { label: 'Status', field: 'present', w: 'w-24' },
                  { label: 'Check-in Time', field: 'attendanceTime', w: 'w-32' },
                  { label: 'Certificate', field: 'certificateReceived', w: 'w-28' },
                ].map(({ label, field, w }) => (
                  <th
                    key={field}
                    onClick={() => toggleSort(field)}
                    className={`${w} px-3 py-3 text-left font-bold text-slate-600 uppercase tracking-wider cursor-pointer hover:text-slate-900 select-none whitespace-nowrap`}
                  >
                    {label} <SortIcon field={field} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageRows.length > 0 ? (
                pageRows.map((student, idx) => (
                  <tr
                    key={student.studentId}
                    className={`transition-colors hover:bg-slate-50 ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                    }`}
                  >
                    <td className="px-3 py-2.5 text-slate-400 font-medium">{student.sNo}</td>

                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-center font-bold text-emerald-700 text-xs shrink-0 overflow-hidden">
                          {student.profilePicture ? (
                            <img
                              src={student.profilePicture.startsWith('http') ? student.profilePicture : `http://localhost:5000${student.profilePicture}`}
                              alt=""
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            student.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <span className="font-semibold text-slate-900">{student.name}</span>
                      </div>
                    </td>

                    <td className="px-3 py-2.5 text-slate-600 font-mono">{student.rollNumber}</td>
                    <td className="px-3 py-2.5 text-slate-600">{student.department}</td>
                    <td className="px-3 py-2.5 text-slate-500">{student.email}</td>

                    <td className="px-3 py-2.5">
                      {student.present ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700">
                          <CheckCircle className="h-2.5 w-2.5" /> Present
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-red-50 border border-red-200 text-red-600">
                          <XCircle className="h-2.5 w-2.5" /> Absent
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap">
                      {student.attendanceTime ? (
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3 text-slate-400" />
                          {new Date(student.attendanceTime).toLocaleTimeString('en-IN', {
                            hour: '2-digit', minute: '2-digit', hour12: true,
                          })}
                        </span>
                      ) : (
                        <span className="text-slate-300">—</span>
                      )}
                    </td>

                    <td className="px-3 py-2.5">
                      {student.certificateReceived ? (
                        <span className="inline-flex items-center gap-1 text-[9px] font-bold uppercase px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-700">
                          <Award className="h-2.5 w-2.5" /> Yes
                        </span>
                      ) : (
                        <span className="text-[9px] font-bold uppercase text-slate-400">No</span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    <Users className="h-8 w-8 mx-auto mb-2 opacity-30" />
                    <p>No students match the current filter.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* ── Pagination ───────────────────────────────────────────────────── */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50/50 text-xs text-slate-500">
            <span>
              Page {page} of {totalPages} &nbsp;·&nbsp; {filtered.length} students
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 transition"
              >
                Previous
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const pg = page <= 3 ? i + 1 : page - 2 + i;
                if (pg < 1 || pg > totalPages) return null;
                return (
                  <button
                    key={pg}
                    onClick={() => setPage(pg)}
                    className={`px-2.5 py-1 rounded-md border transition ${
                      pg === page
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {pg}
                  </button>
                );
              })}
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-2.5 py-1 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-40 transition"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Footer note ─────────────────────────────────────────────────────── */}
      <p className="text-[10px] text-slate-400 text-center mt-4">
        Showing {Math.min(PAGE_SIZE, pageRows.length)} of {filtered.length} entries &nbsp;·&nbsp;
        Exported files include all {data.report.length} registered students
      </p>
    </div>
  );
};

export default EventAttendancePage;
