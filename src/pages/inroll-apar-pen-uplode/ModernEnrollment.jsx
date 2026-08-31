import React, { useState } from "react";
import axios from "axios";
import XLSX from "xlsx-js-style";
import { FiAlertCircle, FiCheckCircle, FiDownload, FiFileText, FiUploadCloud, FiUsers, FiX } from "react-icons/fi";
import "./ModernEnrollment.css";
import { SCHOOL_CLASSES } from "../../academicConfig";

const headerAliases = {
  name: ["student name", "name"], admission: ["admission no", "admissionno", "admission number"],
  enrollment: ["enrollment no", "enrollmentno", "enrollment number"], apaar: ["apaar id", "apaarid"], pen: ["pen no", "penno", "pen number"],
};
const hasHeader = (headers, aliases) => aliases.some((alias) => headers.includes(alias));

export default function ModernEnrollment({ onUploadSuccess }) {
  const [selectedClass, setSelectedClass] = useState("");
  const [file, setFile] = useState(null);
  const [rows, setRows] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [status, setStatus] = useState(null);
  const activeSession = localStorage.getItem("activeSession") || "Not selected";

  const resetFile = () => { setFile(null); setRows([]); setHeaders([]); setStatus(null); };
  const downloadTemplate = () => {
    const templateHeaders = ["Admission No", "Student Name", "Enrollment No", "Apaar ID", "PEN No"];
    const sheet = XLSX.utils.aoa_to_sheet([templateHeaders, ...Array.from({ length: 10 }, () => ["", "", "", "", ""])]);
    templateHeaders.forEach((_, index) => {
      const cell = sheet[XLSX.utils.encode_cell({ r: 0, c: index })];
      cell.s = { fill: { fgColor: { rgb: "4F46E5" } }, font: { bold: true, color: { rgb: "FFFFFF" } }, alignment: { horizontal: "center", vertical: "center" }, border: { bottom: { style: "thin", color: { rgb: "312E81" } } } };
    });
    sheet["!cols"] = [{ wch: 18 }, { wch: 28 }, { wch: 22 }, { wch: 22 }, { wch: 22 }];
    sheet["!rows"] = [{ hpt: 24 }];
    sheet["!autofilter"] = { ref: `A1:E11` };

    const instructions = XLSX.utils.aoa_to_sheet([
      ["Enrollment / APAAR / PEN Upload Instructions"],
      ["1", "Class aur academic session Upload Excel page par select karein."],
      ["2", "Admission No recommended hai; ye student ko accurately match karta hai."],
      ["3", "Admission No na ho to exact Student Name se matching hogi."],
      ["4", "Enrollment No, Apaar ID aur PEN No me se kam se kam ek value bharein."],
      ["5", "Template ke header names ko change na karein."],
      ["6", "Ek upload me maximum 5000 student rows supported hain."],
    ]);
    instructions["A1"].s = { fill: { fgColor: { rgb: "4F46E5" } }, font: { bold: true, color: { rgb: "FFFFFF" }, sz: 14 } };
    instructions["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 1 } }];
    instructions["!cols"] = [{ wch: 8 }, { wch: 85 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Student Data");
    XLSX.utils.book_append_sheet(workbook, instructions, "Instructions");
    const sessionName = activeSession === "Not selected" ? "Session" : activeSession;
    XLSX.writeFile(workbook, `Enrollment_APAAR_PEN_Template_${sessionName}.xlsx`);
  };
  const chooseFile = async (event) => {
    const chosen = event.target.files?.[0];
    setStatus(null);
    if (!chosen) return resetFile();
    if (chosen.size > 5 * 1024 * 1024) return setStatus({ type: "error", text: "File size 5 MB se kam honi chahiye." });
    try {
      const workbook = XLSX.read(await chosen.arrayBuffer(), { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const parsed = XLSX.utils.sheet_to_json(sheet, { defval: "" });
      if (!parsed.length) throw new Error("Excel sheet khali hai.");
      const normalizedHeaders = Object.keys(parsed[0]).map((item) => item.trim().toLowerCase());
      if (!hasHeader(normalizedHeaders, headerAliases.name) && !hasHeader(normalizedHeaders, headerAliases.admission)) throw new Error("'Student Name' ya 'Admission No' column required hai.");
      if (![headerAliases.enrollment, headerAliases.apaar, headerAliases.pen].some((aliases) => hasHeader(normalizedHeaders, aliases))) throw new Error("Enrollment No, APAAR ID ya PEN No me se kam se kam ek column required hai.");
      setFile(chosen); setRows(parsed); setHeaders(Object.keys(parsed[0]));
    } catch (error) { resetFile(); setStatus({ type: "error", text: error.message || "Excel file read nahi ho payi." }); }
  };

  const upload = async (event) => {
    event.preventDefault();
    if (!selectedClass || !file || !rows.length) return setStatus({ type: "error", text: "Class aur valid Excel file select karein." });
    setUploading(true); setStatus(null);
    try {
      const response = await axios.post("http://localhost:3000/upload-namankan-excel", { studentData: rows, className: selectedClass, academicSession: activeSession }, { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } });
      setStatus({ type: "success", text: response.data.message, summary: response.data.summary });
      if (onUploadSuccess) onUploadSuccess(response.data);
    } catch (error) { setStatus({ type: "error", text: error.response?.data?.message || "Upload complete nahi ho paya." }); }
    finally { setUploading(false); }
  };

  return <main className="excel-page"><section className="excel-card">
    <header className="excel-header"><div className="excel-title-icon"><FiFileText /></div><div><span>STUDENT DATA IMPORT</span><h2>Update records from Excel</h2><p>Enrollment, APAAR aur PEN details ko existing students se safely match karein.</p></div><div className="excel-context"><span>Session<strong>{activeSession}</strong></span><span>Rows<strong>{rows.length || "—"}</strong></span></div></header>
    {status && <div className={`excel-alert ${status.type}`}>{status.type === "success" ? <FiCheckCircle /> : <FiAlertCircle />}<div><strong>{status.text}</strong>{status.summary && <span>Not found: {status.summary.notFound} · Duplicate names: {status.summary.ambiguous} · Empty data: {status.summary.noData}</span>}</div></div>}
    <form className="excel-workspace" onSubmit={upload}>
      <div className="excel-controls"><label><span>1. Select class</span><select value={selectedClass} onChange={(event) => setSelectedClass(event.target.value)} required><option value="">Choose class</option>{SCHOOL_CLASSES.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
        <label className={`excel-dropzone ${file ? "has-file" : ""}`}><input type="file" accept=".xlsx,.xls" onChange={chooseFile} /><FiUploadCloud /><span><strong>{file ? file.name : "2. Choose Excel file"}</strong><small>{file ? `${(file.size / 1024).toFixed(1)} KB · ${rows.length} rows ready` : "XLSX or XLS · Maximum 5 MB"}</small></span>{file && <button type="button" onClick={(event) => { event.preventDefault(); resetFile(); }} aria-label="Remove file"><FiX /></button>}</label>
        <div className="excel-rules"><strong>Matching priority</strong><span>1. Admission No (recommended)</span><span>2. Unique Student Name</span><small>Same name wale students Admission No ke bina skip honge.</small></div><button className="excel-template-btn" type="button" onClick={downloadTemplate}><FiDownload />Download Excel template</button>
        <button className="excel-submit" type="submit" disabled={uploading || !file || !selectedClass}><FiUsers />{uploading ? "Updating records..." : "Update student records"}</button></div>
      <div className="excel-preview"><div className="excel-preview-head"><div><strong>File preview</strong><span>{headers.length ? headers.join(" · ") : "Upload file to preview first 5 rows"}</span></div></div>{rows.length ? <div className="excel-table-wrap"><table><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.slice(0,5).map((row,index) => <tr key={index}>{headers.map((header) => <td key={header}>{String(row[header] ?? "—")}</td>)}</tr>)}</tbody></table></div> : <div className="excel-empty"><FiFileText /><p>No file selected</p><span>Preview aur validation yahan dikhegi.</span></div>}</div>
    </form>
  </section></main>;
}
