import { Command } from '@tauri-apps/plugin-shell';
import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import SignUp from "./component/signup/ModernSignUp";
import Login from "./component/login/ModernLogin";
import MainLayout from "./component/mainlayout/MainLayout";
import AddStudent from "./pages/add-edit-list-student/AddStudent";
import StudentList from "./pages/add-edit-list-student/StudentList";
import StudentDetail from "./pages/add-edit-list-student/StudentDetail";
import EditStudent from "./pages/add-edit-list-student/ModernEditStudent";
import ProtectedRoute from "./component/protected_rout/ProtectedRoute";
import Dashboard from "./component/dashboard/Dashboard";
import AcademicSubjects from "./pages/academic-subjects/AcademicSubjects";


import Schoolprofile from "./pages/school-profile/ModernSchoolProfile";
import Session from "./pages/session/ModernSession";
import MarksEntry from "./pages/mark-entry-view-delet/AdvancedMarkEntry";
import ViewDelMark from "./pages/mark-entry-view-delet/ModernViewDelMark";
import ExamSummary from "./pages/mark-entry-view-delet/ExamSummary";
import StudentExamDetail from "./pages/mark-entry-view-delet/StudentExamDetail";
import UnitTestEntry from "./pages/mark-entry-view-delet/UnitTestEntry";
import UnitTestSummary from "./pages/mark-entry-view-delet/UnitTestSummary";
import ExamRecords from "./pages/mark-entry-view-delet/ExamRecords";
import Marksheet from "./pages/marksheet/ModernMarksheet"
import Tc from "./pages/tc-cc/ModernTc"
import FeeManagement from "./pages/fees/FeeManagement"
import FeeReminders from "./pages/fees/FeeReminders"
import TeacherManagement from "./pages/teachers/TeacherManagement"
import TeacherDetail from "./pages/teachers/TeacherDetail"
import SalaryPayroll from "./pages/teachers/SalaryPayroll"
import PayrollPaymentHistory from "./pages/teachers/PayrollPaymentHistory"
import TeacherAttendance from "./pages/teachers/TeacherAttendance"
import TeacherAttendanceReport from "./pages/teachers/TeacherAttendanceReport"
import InactiveTeachers from "./pages/teachers/InactiveTeachers"

import Attendance from "./pages/attendence/Attendence";
import MonthlyRegister from "./pages/attendence/MonthlyRegister";

import GenerateRollNo from "./pages/rollno/ModernRollNo";
import EnrollMent from "./pages/inroll-apar-pen-uplode/ModernEnrollment"
import StudentPromotion from './pages/student-promotion/StudentPromotion';
import AllowUser from './pages/masterdata-excel-uplode/ModernAllowUser';
import IdCardCustomizer from "./pages/id-card/IdCardCustomizer";
import MobileScanPage from "./pages/id-card/MobileScanPage";
import StudentExcelExport from "./pages/student-excel-export/StudentExcelExport";
import TeacherExcelExport from "./pages/teacher-excel-export/TeacherExcelExport";
import ServerAttendancePage from "./pages/id-card/ServerAttendancePage";
import { BackupRestore, StudentValidation } from "./pages/administration/Administration";
import StudentSync from "./pages/administration/StudentSync";
import UserAccess from "./pages/administration/UserAccess";
import LicenseGate from "./LicenseGate";
import AppUpdater from "./components/AppUpdater";


function App() {

  useEffect(() => {
    const savedTheme = localStorage.getItem("app-theme") || "light";
    document.documentElement.setAttribute("data-theme", savedTheme);
  }, []);




  return (

    <>
      <LicenseGate><AppUpdater /><Router>
        <Routes>
        

          {/* 1. Default route: Agar koi site khole toh /signup par bhej do */}
          <Route path="/" element={<Navigate to="/signup" />} />

          {/* 2. Signup Page ka rasta */}
          <Route path="/signup" element={<SignUp />} />

          {/* 3. Login Page ka rasta */}
          <Route path="/login" element={<Login />} />
          {/* Public mobile scanner; the isolated ID backend also serves this route on the LAN. */}
          <Route path="/scan" element={<MobileScanPage />} />
          <Route element={<ProtectedRoute />}>
            <Route path="/school-profile" element={<Schoolprofile />} />
            <Route path="/allowed-users" element={<AllowUser />} />
            <Route path="/id-card-studio" element={<IdCardCustomizer />} />
            <Route path="/dashboard/id-card" element={<IdCardCustomizer />} />
            <Route path='/session' element={<Session />} />
            <Route path="/dashboard" element={<MainLayout />}>
              <Route index element={<Dashboard />} />
              <Route path="academic-subjects" element={<AcademicSubjects />} />
              <Route path='student-pramotion' element={<StudentPromotion />} />

              {/* teacher route */}
              <Route path="addstudent" element={<AddStudent />} />
              <Route path="studentlist" element={<StudentList />} />
              <Route path="student/:id" element={<StudentDetail />} />
              <Route path="edit-student/:id" element={<EditStudent />} />
          
             
              <Route path="mark-entry" element={<MarksEntry />} />
              <Route path="unit-test-entry" element={<UnitTestEntry />} />
              <Route path="unit-test-summary" element={<UnitTestSummary />} />
              <Route path="exam-records" element={<ExamRecords />} />
              <Route path="view-del-mark" element={<ViewDelMark />} />
              <Route path="exam-summary" element={<ExamSummary />} />
              <Route path="exam-summary/student/:studentId" element={<StudentExamDetail />} />
              <Route path='marksheet' element={<Marksheet />} />
              <Route path="tc" element={<Tc />} />
              <Route path="fees" element={<FeeManagement />} />
              <Route path="fee-reminders" element={<FeeReminders />} />
              <Route path="teachers" element={<TeacherManagement />} />
              <Route path="teachers/:id" element={<TeacherDetail />} />
              <Route path="staff-salary" element={<SalaryPayroll />} />
              <Route path="salary-payment-history" element={<PayrollPaymentHistory />} />
              <Route path="teacher-attendance" element={<TeacherAttendance />} />
              <Route path="teacher-attendance-report" element={<TeacherAttendanceReport />} />
              <Route path="inactive-teachers" element={<InactiveTeachers />} />
              <Route path="attendance" element={<Attendance />} />
              <Route path="attendance-report" element={<MonthlyRegister />} />
              <Route path="id-qr-attendance" element={<ServerAttendancePage onBack={() => window.location.assign("/dashboard")} />} />

              <Route path="roll-no" element={<GenerateRollNo />} />
              <Route path="uplode-inrollment" element={<EnrollMent />} />
              <Route path="student-excel-export" element={<StudentExcelExport />} />
              <Route path="teacher-excel-export" element={<TeacherExcelExport />} />
              <Route path="backup-restore" element={<BackupRestore />} />
              <Route path="student-validation" element={<StudentValidation />} />
              <Route path="student-sync" element={<StudentSync />} />
              <Route path="user-access" element={<UserAccess />} />
            
            </Route>
          </Route>
        </Routes>
      </Router></LicenseGate>


    </>

  );
}

export default App;









