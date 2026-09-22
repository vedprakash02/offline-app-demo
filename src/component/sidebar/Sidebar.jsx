import { createElement, useState } from "react";
import { NavLink } from "react-router-dom";
import {
  FiAward, FiBarChart2, FiBookOpen, FiCalendar, FiCheckSquare, FiChevronDown,
  FiClipboard, FiDatabase, FiDollarSign, FiDownload, FiEdit3, FiFileText,
  FiGrid, FiImage, FiList, FiRefreshCw, FiSearch, FiSettings, FiShield,
  FiUploadCloud, FiUserPlus, FiUsers,
} from "react-icons/fi";
import "./Sidebar.css";

const Item = ({ to, icon, children, end }) => <NavLink className="sidebar-btn" to={to} end={end}>{createElement(icon, { className: "sidebar-icon", "aria-hidden": true })}<span>{children}</span></NavLink>;
const SubItem = ({ to, icon, children }) => <NavLink to={to}>{createElement(icon, { className: "sidebar-icon", "aria-hidden": true })}<span>{children}</span></NavLink>;
const Group = ({ label, icon, open, onToggle, children }) => <div className="dropdown-container"><button className="dropdown-btn" aria-expanded={open} onClick={onToggle}><span className="dropdown-label">{createElement(icon, { className: "sidebar-icon" })}{label}</span><FiChevronDown className={`sidebar-chevron ${open ? "up" : ""}`} /></button>{open && <ul className="dropdown-menu"><li>{children}</li></ul>}</div>;

export default function Sidebar() {
  // à¤¸à¤­à¥€ à¤¡à¥à¤°à¥‰à¤ªà¤¡à¤¾à¤‰à¤¨ à¤ªà¥‡à¤œ à¤²à¥‹à¤¡ à¤¹à¥‹à¤¤à¥‡ à¤¹à¥€ à¤¬à¤‚à¤¦ (false) à¤°à¤¹à¥‡à¤‚à¤—à¥‡
  const [staffOpen, setStaffOpen] = useState(false);
  const [studentOpen, setStudentOpen] = useState(false);
  const [attendanceOpen, setAttendanceOpen] = useState(false);
  const [examOpen, setExamOpen] = useState(false);
  const [feeOpen, setFeeOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);

  return <div className="sidebar">
   
    <Item to="/dashboard" icon={FiGrid} end>Dashboard</Item>
    <Item to="/school-profile" icon={FiSettings}>School Profile</Item>
    <Item to="/session" icon={FiCalendar}>Change Session</Item>

    {/* 1. STAFF MANAGEMENT  */}
    <Group label="Staff Management" icon={FiUsers} open={staffOpen} onToggle={() => setStaffOpen((v) => !v)}>
      <SubItem to="/dashboard/teachers" icon={FiUsers}>Teacher Profiles</SubItem>
      <SubItem to="/dashboard/staff-salary" icon={FiDollarSign}>Salary & Payroll</SubItem>
      <SubItem to="/dashboard/salary-payment-history" icon={FiFileText}>Payments & Receipts</SubItem>
      <SubItem to="/dashboard/teacher-attendance" icon={FiCheckSquare}>Daily Staff Attendance</SubItem>
      <SubItem to="/dashboard/teacher-attendance-report" icon={FiBarChart2}>Monthly Attendance Reports</SubItem>
      <SubItem to="/dashboard/inactive-teachers" icon={FiUsers}>Inactive Teachers</SubItem>
      <SubItem to="/dashboard/teacher-excel-export" icon={FiDownload}>Export Teacher Data (Excel)</SubItem>
    </Group>

    {/* 2. STUDENT ADMISSION & LIST  */}
    <Group label="Student Admission" icon={FiUserPlus} open={studentOpen} onToggle={() => setStudentOpen((v) => !v)}>
      <SubItem to="/dashboard/addstudent" icon={FiUserPlus}>Add Student</SubItem>
      <SubItem to="/dashboard/studentlist" icon={FiClipboard}>All Students List</SubItem>
      <SubItem to="/dashboard/student-pramotion" icon={FiAward}>Student Promotion</SubItem>
    </Group>

    {/* 3. STUDENT ATTENDANCE  */}
    <Group label="Student Attendance" icon={FiCheckSquare} open={attendanceOpen} onToggle={() => setAttendanceOpen((v) => !v)}>
      <SubItem to="/dashboard/attendance" icon={FiCheckSquare}>Manual Attendance</SubItem>

      <SubItem to="/dashboard/attendance-report" icon={FiBarChart2}>Attendance Report</SubItem>
    </Group>

    {/* 4. EXAM CONTROL  */}
    <Group label="Exam Control" icon={FiBookOpen} open={examOpen} onToggle={() => setExamOpen((v) => !v)}>
      <SubItem to="/dashboard/roll-no" icon={FiList}>Roll Number</SubItem>
      <SubItem to="/dashboard/mark-entry" icon={FiEdit3}>Mark Entry</SubItem>
      <SubItem to="/dashboard/unit-test-entry" icon={FiEdit3}>Unit Test Entry</SubItem>
      <SubItem to="/dashboard/view-del-mark" icon={FiSearch}>View & Delete Marks</SubItem>
      <SubItem to="/dashboard/exam-summary" icon={FiBarChart2}>Exam Summary</SubItem>
      <SubItem to="/dashboard/unit-test-summary" icon={FiBarChart2}>Unit Test Summary</SubItem>
      <SubItem to="/dashboard/exam-records" icon={FiFileText}>Subject-wise Exam Records</SubItem>
      <SubItem to="/dashboard/marksheet" icon={FiFileText}>Marksheet</SubItem>
    </Group>

    {/* 5. FEE & ACCOUNTS  */}
    <Group label="Fee & Accounts" icon={FiDollarSign} open={feeOpen} onToggle={() => setFeeOpen((v) => !v)}>
      <SubItem to="/dashboard/fees" icon={FiDollarSign}>Fee Management</SubItem>
      <SubItem to="/dashboard/fee-reminders" icon={FiClipboard}>Fee Due Reminders</SubItem>
    </Group>


    <Item to="/dashboard/uplode-inrollment" icon={FiUploadCloud}>Import Student Enroll, Apaar, Pen Data (Excel)</Item>
    <Item to="/dashboard/student-excel-export" icon={FiDownload}>Export Student Data (Excel)</Item>
    <Item to="/dashboard/id-qr-attendance" icon={FiCheckSquare}>QR Attendance (Students & Teachers)</Item>
    <Item to="/id-card-studio" icon={FiImage}>ID Card Studio</Item>
    <Item to="/dashboard/tc" icon={FiFileText}>TC & CC Generator</Item>

    {/* 6. SYSTEM ADMINISTRATION  */}
    <Group label="Administration" icon={FiShield} open={adminOpen} onToggle={() => setAdminOpen((v) => !v)}>
      <SubItem to="/dashboard/student-validation" icon={FiShield}>Data Validation Center</SubItem>
      <SubItem to="/dashboard/student-sync" icon={FiRefreshCw}>Mongo-SQLite Sync</SubItem>
      <SubItem to="/dashboard/backup-restore" icon={FiDatabase}>Backup & Restore</SubItem>
      <SubItem to="/dashboard/user-access" icon={FiUsers}>User Access & Audit Logs</SubItem>
    </Group>
  </div>;
}


