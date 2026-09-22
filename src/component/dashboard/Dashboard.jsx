import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { FiArrowRight, FiBarChart2, FiBookOpen, FiCalendar, FiCheckCircle, FiClipboard, FiClock, FiDollarSign, FiEdit3, FiTrendingUp, FiUserPlus, FiUsers, FiXCircle } from 'react-icons/fi';
import './Dashboard.css';
import './AcademicSetupCard.css';
import { attendanceApi } from './attendanceApi';

const today = () => new Date().toLocaleDateString('en-CA');
const formatCurrency = (amount) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(amount) || 0);
const quickActions = [
  { label: 'Manage students', description: 'View, edit and manage student records', icon: FiUsers, path: '/dashboard/studentlist', tone: 'blue' },
  { label: 'Add new student', description: 'Create a new admission record', icon: FiUserPlus, path: '/dashboard/addstudent', tone: 'violet' },
  { label: 'Enter marks', description: 'Update examination marks quickly', icon: FiEdit3, path: '/dashboard/mark-entry', tone: 'amber' },
  { label: 'View broadsheet', description: 'Review class-wise performance', icon: FiBarChart2, path: '/dashboard/view-del-mark', tone: 'emerald' },
];

function Dashboard() {
  const currentRole = localStorage.getItem('role');
  const navigate = useNavigate();
  const [stats, setStats] = useState({ totalStudents: 0, totalClasses: 0, examsConducted: 0, pendingEntries: 0, todayPresent: 0, todayAbsent: 0 });
  const [feeSummary, setFeeSummary] = useState({ totalDemand: 0, totalPaid: 0, totalBalance: 0, records: 0 });
  const [feesLoading, setFeesLoading] = useState(true);
  const [error, setError] = useState('');
  const [teachers, setTeachers] = useState([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userRole = localStorage.getItem('role');
    if (!token) { navigate('/login'); return; }
    if (userRole === 'student') { navigate('/student-profile'); return; }
    const fetchDashboardStats = async () => {
      try {
        const res = await axios.get('http://localhost:3000/dashboard', { headers: { Authorization: `Bearer ${token}` }, params: { academicSession: localStorage.getItem('activeSession') } });
        setStats((current) => ({ ...current, totalStudents: res.data.totalStudents || 0, totalClasses: res.data.totalClasses || 4, examsConducted: res.data.examsConducted || 1, pendingEntries: res.data.pendingEntries || 0 }));
      } catch (requestError) {
        console.error('Error fetching dashboard count:', requestError);
        setError('Session expired ya data load nahi ho paya.');
        if (requestError.response?.status === 401) { localStorage.clear(); navigate('/login'); }
      }
    };
    const fetchAttendanceStats = async () => {
      try {
        const data = await attendanceApi.getRecords(today());
        setStats((current) => ({ ...current, todayPresent: data.present || 0, todayAbsent: data.absent || 0 }));
      } catch (attendanceError) { console.error('Dashboard attendance count load nahi hua:', attendanceError); }
    };
    const fetchFeeSummary = async () => {
      if (!['admin', 'teacher'].includes(userRole)) { setFeesLoading(false); return; }
      try {
        const res = await axios.get('http://localhost:3000/fees', { headers: { Authorization: `Bearer ${token}` }, params: { academicSession: localStorage.getItem('activeSession') } });
        setFeeSummary(res.data.summary || { totalDemand: 0, totalPaid: 0, totalBalance: 0, records: 0 });
      } catch (feeError) {
        console.error('Dashboard fee summary load nahi hui:', feeError);
      } finally { setFeesLoading(false); }
    };
    const fetchTeachers = async () => { if (!["admin", "principal", "accountant"].includes(userRole)) return; try { const { data } = await axios.get("http://localhost:3000/teachers", { headers: { Authorization: `Bearer ${token}` }, params: { status: "Active" } }); setTeachers(data.teachers || []); } catch (teacherError) { console.error("Dashboard teachers load nahi hue:", teacherError); } };
    fetchDashboardStats(); fetchAttendanceStats(); fetchFeeSummary(); fetchTeachers();
  }, [navigate]);

  const totalMarked = stats.todayPresent + stats.todayAbsent;
  const attendanceRate = totalMarked ? Math.round((stats.todayPresent / totalMarked) * 100) : 0;
  const collectionRate = feeSummary.totalDemand ? Math.round((feeSummary.totalPaid / feeSummary.totalDemand) * 100) : 0;
  const formattedDate = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

  return <div className="dashboard-wrapper"><div className="dashboard-container">
    <section className="dashboard-hero"><div className="hero-copy"><span className="hero-eyebrow"><FiTrendingUp /> School overview</span><h1>Good to see you again.</h1><p>Here is what is happening across your school today.</p></div><div className="hero-meta"><span className="hero-date"><FiCalendar /> {formattedDate}</span><span className="role-pill">{currentRole || 'Staff'}</span></div></section>
    {error && <div className="dashboard-alert-error">{error}</div>}
    <section className="academic-setup-card" aria-label="Academic setup">
      <button type="button" onClick={() => navigate('/dashboard/academic-subjects')}>
        <span className="academic-setup-icon"><FiBookOpen /></span>
        <span className="academic-setup-copy"><small>Academic setup</small><strong>Class subjects</strong><em>Nursery se 12th tak subjects customize karein</em></span>
        <FiArrowRight className="academic-setup-arrow" />
      </button>
    </section>
    <section className="dashboard-grid" aria-label="School statistics">
      <article className="stat-card students-card"><div className="card-icon"><FiUsers /></div><div className="card-info"><span>Total students</span><strong>{stats.totalStudents}</strong><small>Active student records</small></div></article>
      <button className="stat-card present-card" onClick={() => navigate('/dashboard/attendance-report')}><div className="card-icon"><FiCheckCircle /></div><div className="card-info"><span>Present today</span><strong>{stats.todayPresent}</strong><small>View attendance report <FiArrowRight /></small></div></button>
      <button className="stat-card absent-card" onClick={() => navigate('/dashboard/attendance-report')}><div className="card-icon"><FiXCircle /></div><div className="card-info"><span>Absent today</span><strong>{stats.todayAbsent}</strong><small>View attendance report <FiArrowRight /></small></div></button>
      <article className="stat-card rate-card"><div className="card-icon"><FiClipboard /></div><div className="card-info"><span>Attendance rate</span><strong>{attendanceRate}%</strong><small>{totalMarked} records marked today</small></div></article>
    </section>
    {['admin', 'teacher'].includes(currentRole) && <section className="fee-overview" aria-label="Fee overview">
      <div className="fee-overview-heading"><div className="fee-title-icon"><FiDollarSign /></div><div><span>Active session</span><h2>Fee overview</h2><p>{feesLoading ? 'Fee summary load ho rahi hai...' : `${feeSummary.records} fee records ka summary`}</p></div><button onClick={() => navigate('/dashboard/fees')}>Manage fees <FiArrowRight /></button></div>
      <div className="fee-metrics">
        <div><span>Total demand</span><strong>{feesLoading ? '�' : formatCurrency(feeSummary.totalDemand)}</strong><small>Generated fee amount</small></div>
        <div className="fee-collected"><span>Collected</span><strong>{feesLoading ? '�' : formatCurrency(feeSummary.totalPaid)}</strong><small>{collectionRate}% collection rate</small></div>
        <div className="fee-due"><span>Pending dues</span><strong>{feesLoading ? '�' : formatCurrency(feeSummary.totalBalance)}</strong><small>Yet to be collected</small></div>
      </div>
      <div className="fee-progress" aria-label={`${collectionRate}% fees collected`}><span style={{ width: `${collectionRate}%` }} /></div>
    </section>}
    {teachers.length > 0 && <section className="dashboard-teachers"><div className="dashboard-teachers-head"><div><span>Our faculty</span><h2>Teacher profiles</h2><p>Profile, attendance aur payment history dekhne ke liye card select karein.</p></div><button onClick={() => navigate("/dashboard/teachers")}>Manage all <FiArrowRight /></button></div><div className="dashboard-teacher-track">{teachers.slice(0, 8).map((teacher) => <button className="dashboard-teacher-card" key={teacher._id} onClick={() => navigate(`/dashboard/teachers/${teacher._id}`)}><div className="dashboard-teacher-photo">{teacher.image ? <img src={`http://localhost:3000/uploads/${teacher.image}`} alt={teacher.name} /> : teacher.name.slice(0, 2).toUpperCase()}</div><div><strong>{teacher.name}</strong><span>{teacher.designation}</span><small>{teacher.employeeId} � {teacher.subjects?.slice(0, 2).join(", ") || "Faculty"}</small></div><FiArrowRight /></button>)}</div></section>}
    <section className="dashboard-content-grid"><div className="quick-panel"><div className="section-heading"><div><span>Shortcuts</span><h2>Quick actions</h2></div><p>Your most-used tools in one place</p></div><div className="quicklinks-grid">{quickActions.map(({ label, description, icon: ActionIcon, path, tone }) => <button key={path} onClick={() => navigate(path)} className={`link-action-card ${tone}`}><span className="quick-icon">{React.createElement(ActionIcon)}</span><span className="quick-copy"><strong>{label}</strong><small>{description}</small></span><FiArrowRight className="quick-arrow" /></button>)}</div></div>
      <aside className="attendance-panel"><div className="attendance-panel-icon"><FiClock /></div><span className="panel-kicker">Today&apos;s snapshot</span><h2>{attendanceRate}% attendance</h2><p>{stats.todayPresent} of {totalMarked} marked students are present today.</p><div className="progress-track"><span style={{ width: `${attendanceRate}%` }} /></div><div className="attendance-legend"><span><i className="present-dot" />Present <strong>{stats.todayPresent}</strong></span><span><i className="absent-dot" />Absent <strong>{stats.todayAbsent}</strong></span></div><button className="report-button" onClick={() => navigate('/dashboard/attendance-report')}>Open full report <FiArrowRight /></button></aside></section>
  </div></div>;
}
export default Dashboard;



