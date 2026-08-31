import React, { useEffect, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { FiMoon, FiSun } from "react-icons/fi";
import "./IdCardCustmizer.css";
import "./Customizer-panel.css";
import "./Landscap.css";
import CustomizerPanel from "./CustomizerPanel";
import IdCardPreview from "./IdCardPreview";
import TeacherIdCardPreview from "./TeacherIdCardPreview";
import SchoolDetails from "./SchoolDetails";
import BulkIdCards from "./BulkIdCards";
import { attendanceApi } from "./attendanceApi";
import { defaultConfig, emptyStudent } from "./customizer/defaultConfig";
import { ensureStudentIds, ensureTeacherIds, mapStudentRow, mapTeacherRow } from "./customizer/studentImport";
import { getStoredConfig, getStoredPreviewWork, loadPreviewWork, savePreviewWork } from "./customizer/previewStorage";
import { downloadStyledIdCardTemplate, downloadStyledTeacherIdCardTemplate } from "../../utils/studentExcel";

const fileToDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error || new Error("Photo read nahi ho saki."));
  reader.readAsDataURL(file);
});

const toolbarButtonStyle = (backgroundColor) => ({ backgroundColor, color: "#ffffff", borderColor: backgroundColor });

const IdCardCustomizer = () => {
  const storedPreviewWork = useRef(getStoredPreviewWork()).current;
  const [config, setConfig] = useState(() => ({
    ...defaultConfig,
    ...(getStoredConfig() || {}),
    cardSides: "single",
  }));
  const [saveMessage, setSaveMessage] = useState("");
  const [theme, setTheme] = useState(() => localStorage.getItem("app-theme") || "light");
  const [students, setStudents] = useState(() => Array.isArray(storedPreviewWork?.students) ? ensureStudentIds(storedPreviewWork.students) : []);
  const [cardType, setCardType] = useState(() => storedPreviewWork?.cardType === "teacher" || storedPreviewWork?.students?.[0]?.entityType === "teacher" ? "teacher" : "student");
  const [selectedStudentIndex, setSelectedStudentIndex] = useState(() => Number.isInteger(storedPreviewWork?.selectedStudentIndex) ? storedPreviewWork.selectedStudentIndex : 0);
  const [page, setPage] = useState(() => ["editor", "bulk", "school"].includes(storedPreviewWork?.page) ? storedPreviewWork.page : "editor");
  const [previewHydrated, setPreviewHydrated] = useState(false);
  const fileInputRef = useRef(null);
  const teacherFileInputRef = useRef(null);
  const photoFolderInputRef = useRef(null);
  const photoObjectUrlsRef = useRef([]);

  useEffect(() => { localStorage.setItem("id-card-customizer-config", JSON.stringify(config)); }, [config]);
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("app-theme", theme);
  }, [theme]);
  useEffect(() => {
    let active = true;
    loadPreviewWork().then((stored) => {
      if (!active) return;
      if (Array.isArray(stored?.students)) {
        setStudents(ensureStudentIds(stored.students));
        setCardType(stored.cardType === "teacher" || stored.students[0]?.entityType === "teacher" ? "teacher" : "student");
      }
      if (Number.isInteger(stored?.selectedStudentIndex)) setSelectedStudentIndex(stored.selectedStudentIndex);
      if (["editor", "bulk", "school"].includes(stored?.page)) setPage(stored.page);
      setPreviewHydrated(true);
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!previewHydrated) return;
    savePreviewWork({ students, selectedStudentIndex, page, cardType }).catch(() => {
      setSaveMessage("Preview browser storage mein save nahi ho saka.");
    });
  }, [students, selectedStudentIndex, page, cardType, previewHydrated]);
  useEffect(() => {
    const prev = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);
  useEffect(() => () => {
    photoObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
  }, []);

  const handleSaveDesign = () => {
    localStorage.setItem("id-card-customizer-config", JSON.stringify(config));
    setSaveMessage("Design saved. Bulk ID card page will use this layout.");
  };

  const syncStudentsToServer = async () => {
    if (!students.length) return setSaveMessage(cardType === "teacher" ? "Pehle teachers load karein." : "Pehle Excel file load karein.");
    if (cardType === "student" && !/^\d{4}-\d{4}$/.test(localStorage.getItem("activeSession") || "")) return setSaveMessage("Pehle valid academic session select karein.");
    try { const result = cardType === "teacher" ? await attendanceApi.syncTeachers(students) : await attendanceApi.syncStudents(students); setSaveMessage(result.message); }
    catch (error) { setSaveMessage(`${error.message} Backend server check karein.`); }
  };

  const resetSyncedStudents = async () => {
    const confirmation = window.prompt("Sirf local SQLite roster aur QR attendance delete hogi. MongoDB attendance safe rahegi. Confirm karne ke liye RESET likhein.");
    if (confirmation !== "RESET") return setSaveMessage("Reset cancel ho gaya.");
    try {
      const result = await attendanceApi.resetStudents();
      setSaveMessage(`${result.message} Ab nayi list ko Sync students karein.`);
    } catch (error) {
      setSaveMessage(`${error.message} Backend server check karein.`);
    }
  };

  const toggleOrientation = () => setConfig((p) => {
    const orientation = p.orientation === "portrait" ? "landscape" : "portrait";
    return { ...p, orientation, schoolNameWidth: orientation === "landscape" ? 340 : 220, sigTop: orientation === "landscape" ? 172 : 190, sigImageTop: orientation === "landscape" ? 150 : 168, infoBlockTop: orientation === "landscape" ? 88 : 105, qrLeft: orientation === "landscape" ? 285 : 170, qrTop: orientation === "landscape" ? 148 : 250 };
  });

  const handleExcelUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];

      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });

      const mappedStudents = rawRows.map(mapStudentRow).filter((student) => student.name);
      const missingAdmissionNumbers = mappedStudents.filter((student) => !student.studentId);
      if (missingAdmissionNumbers.length) {
        throw new Error(`${missingAdmissionNumbers.length} students ka Admission_No missing hai. Mongo attendance merge ke liye ye column zaroori hai.`);
      }
      const imported = ensureStudentIds(mappedStudents);

      if (!imported.length) {
        throw new Error("Name column match nahi hui. Column headings check karein.");
      }

      photoObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      photoObjectUrlsRef.current = [];
      setCardType("student");
      setStudents(imported);
      setSelectedStudentIndex(0);
      setPage("bulk");
      setSaveMessage(`${imported.length} student load ho gaye.`);
    } catch (err) {
      setSaveMessage(err.message || "Excel file read error.");
    } finally {
      e.target.value = "";
    }
  };

  const handleTeacherExcelUpload = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];

      const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });

      const mappedTeachers = rawRows.map(mapTeacherRow).filter((teacher) => teacher.name);
      const missingEmployeeIds = mappedTeachers.filter((teacher) => !teacher.employeeId);
      if (missingEmployeeIds.length) {
        throw new Error(`${missingEmployeeIds.length} teachers ka Employee_ID missing hai. QR attendance merge ke liye ye column zaroori hai.`);
      }
      const imported = ensureTeacherIds(mappedTeachers);

      if (!imported.length) {
        throw new Error("Name column match nahi hui. Column headings check karein.");
      }

      photoObjectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      photoObjectUrlsRef.current = [];
      setCardType("teacher");
      setStudents(imported);
      setSelectedStudentIndex(0);
      setPage("bulk");
      setSaveMessage(`${imported.length} teacher load ho gaye.`);
    } catch (err) {
      setSaveMessage(err.message || "Teacher Excel file read error.");
    } finally {
      e.target.value = "";
    }
  };

  const handlePhotoFolderSelect = async (e) => {
    const imageFiles = Array.from(e.target.files || []).filter((file) => file.type.startsWith("image/"));
    e.target.value = "";

    if (!students.length) {
      setSaveMessage("Pehle Excel file load karein, phir student photos ka folder select karein.");
      return;
    }
    if (!imageFiles.length) {
      setSaveMessage("Selected folder mein koi image file nahi mili.");
      return;
    }

    try {
      const photoEntries = await Promise.all(imageFiles.map(async (file) => [
        String(Number(file.name.replace(/\.[^.]+$/, ""))),
        await fileToDataUrl(file),
      ]));
      const photosBySerial = new Map(photoEntries);
      let matchedPhotos = 0;
      setStudents((currentStudents) => currentStudents.map((student, index) => {
        const photo = photosBySerial.get(String(index + 1));
        if (photo) matchedPhotos += 1;
        return photo ? { ...student, photo } : student;
      }));
      setSaveMessage(`${matchedPhotos}/${students.length} photos serial number se match ho gayi.`);
    } catch (err) {
      setSaveMessage(err.message || "Photos read nahi ho saki.");
    }
  };

  const downloadExcelTemplate = async () => {
    try {
      const result = await downloadStyledIdCardTemplate("student-id-card-template.xlsx");
      if (result?.cancelled) return setSaveMessage("Student template save cancel kiya gaya.");
      setSaveMessage("Student template select ki hui location par save ho gayi.");
    } catch (error) {
      setSaveMessage(error?.message || "Student template save dialog nahi khul saka.");
    }
  };

  const downloadTeacherExcelTemplate = async () => {
    try {
      const result = await downloadStyledTeacherIdCardTemplate("teacher-id-card-template.xlsx");
      if (result?.cancelled) return setSaveMessage("Teacher template save cancel kiya gaya.");
      setSaveMessage("Teacher template select ki hui location par save ho gayi.");
    } catch (error) {
      setSaveMessage(error?.message || "Teacher template save dialog nahi khul saka.");
    }
  };

  const activeStudent = students[selectedStudentIndex] || emptyStudent;


  return (
    <div
      className={`id-customizer-page ${page === "bulk" ? "bulk-preview-page" : ""}`}
      style={page === "bulk" ? { overflowY: "auto", overflowX: "hidden" } : undefined}
    >
      <header className="id-customizer-header">
        <div className="id-customizer-header-text"><h3 className="id-customizer-eyebrow">ID Card Studio</h3></div>
        <div className="id-customizer-actions">
          <div className="idc-toolbar-general">
            <button className="idc-btn idc-action-dashboard" style={toolbarButtonStyle("#15803d")} type="button" onClick={() => window.location.assign("/dashboard")}>Dashboard par wapas jayein</button>
            <button className="idc-btn idc-theme-toggle" style={toolbarButtonStyle(theme === "light" ? "#1e293b" : "#f59e0b")} type="button" onClick={() => setTheme((current) => current === "light" ? "dark" : "light")} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`} title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>{theme === "light" ? <FiMoon /> : <FiSun />}<span>{theme === "light" ? "Dark mode" : "Light mode"}</span></button>
            <button className="idc-btn idc-action-language" style={toolbarButtonStyle("#475569")} type="button" onClick={() => setConfig((current) => ({ ...current, language: current.language === "hi" ? "en" : "hi" }))}>{config.language === "hi" ? "English mode" : "Hindi mode"}</button>
            <button className="idc-btn idc-action-school" style={toolbarButtonStyle("#7c3aed")} type="button" onClick={() => setPage("school")}>School details</button>
            <button className="idc-btn idc-action-preview" style={toolbarButtonStyle("#4f46e5")} type="button" onClick={() => setPage("bulk")}>Bulk preview</button>
            <button className="idc-btn idc-action-save" style={toolbarButtonStyle("#15803d")} type="button" onClick={handleSaveDesign}>Save design</button>
          </div>
          <input ref={fileInputRef} className="excel-file-input" type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} />
          <input ref={teacherFileInputRef} className="excel-file-input" type="file" accept=".xlsx,.xls,.csv" onChange={handleTeacherExcelUpload} />
          <input ref={photoFolderInputRef} className="excel-file-input" type="file" accept="image/*" multiple webkitdirectory="" onChange={handlePhotoFolderSelect} />
          <div className="idc-card-action-group idc-student-actions">
            <strong>Student ID Cards</strong>
            <div>
              <button className="idc-btn idc-action-import" style={toolbarButtonStyle("#b45309")} type="button" onClick={() => fileInputRef.current?.click()}>Load Student Excel</button>
              <button className="idc-btn idc-action-sync" style={toolbarButtonStyle("#059669")} type="button" onClick={syncStudentsToServer} disabled={!students.length || cardType !== "student"}>Sync Students</button>
              {cardType === "student" && <button className="idc-btn idc-btn-danger" style={toolbarButtonStyle("#dc2626")} type="button" onClick={resetSyncedStudents}>Reset local data</button>}
              <button className="idc-btn idc-action-folder" style={toolbarButtonStyle("#0f766e")} type="button" onClick={() => photoFolderInputRef.current?.click()} disabled={cardType !== "student"}>Select photo folder</button>
              <button className="idc-btn idc-action-template" style={toolbarButtonStyle("#64748b")} type="button" onClick={downloadExcelTemplate}>Student Template</button>
            </div>
          </div>
          <div className="idc-card-action-group idc-teacher-actions">
            <strong>Teacher ID Cards</strong>
            <div>
              <button className="idc-btn" style={toolbarButtonStyle("#2563eb")} type="button" onClick={() => teacherFileInputRef.current?.click()}>Load Teacher Excel</button>
              <button className="idc-btn idc-action-sync" style={toolbarButtonStyle("#0891b2")} type="button" onClick={syncStudentsToServer} disabled={!students.length || cardType !== "teacher"}>Sync Teachers</button>
              <button className="idc-btn" style={toolbarButtonStyle("#0891b2")} type="button" onClick={downloadTeacherExcelTemplate}>Teacher Template</button>
            </div>
          </div>
        </div>
      </header>
      {saveMessage && <div className="save-status-msg" role="status"><span>{saveMessage}</span><button className="save-status-close" type="button" onClick={() => setSaveMessage("")}>Close</button></div>}
      {page === "editor" && (
        <div className="id-customizer-content">
          <div className="customizer-panel-column"><CustomizerPanel config={config} setConfig={setConfig} toggleOrientation={toggleOrientation} cardType={cardType} /></div>
          {cardType === "teacher" ? <TeacherIdCardPreview config={config} teacher={activeStudent} /> : <IdCardPreview config={config} student={activeStudent} />}
        </div>
      )}
      {page === "bulk" && <BulkIdCards importedStudents={students} config={config} cardType={cardType} onBack={() => setPage("editor")} />}
      {page === "school" && <SchoolDetails config={config} setConfig={setConfig} onBack={() => setPage("editor")} onPreview={() => setPage("bulk")} />}
    </div>
  );
};

export default IdCardCustomizer;






