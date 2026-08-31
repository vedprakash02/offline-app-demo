import { getMarksTotals, getSubjectTotal, isSupplementary, numberToWords, orderSubjects } from "./reportUtils";

const valueOrNA = (value) => value || "N/A";

export function SchoolHeader({ school }) {
  return <div className="card-school-header">
    {school?.schoolImage ? <img src={`http://localhost:3000/uploads/${school.schoolImage}`} alt="School Logo" className="card-logo-img" /> : <div className="card-logo-placeholder">🏫</div>}
    <div className="card-school-text">
      <h2>{school?.schoolName || "School Name"}</h2>
      <p className="card-school-address">{school?.address ? `${school.address}, Block: ${valueOrNA(school.block)}, Dist: ${valueOrNA(school.dist)}` : "Please complete the school profile."}</p>
      <div className="card-school-codes">
        <span><strong>Udice Code:</strong> {valueOrNA(school?.schoolCode)}</span>
        <span><strong>School Code:</strong> {valueOrNA(school?.sansthacode)}</span>
        <span><strong>Phone:</strong> {valueOrNA(school?.phone)}</span>
      </div>
    </div>
  </div>;
}

export function ReportHeading({ filters }) {
  return <>
    <div className="report-title-row">
      <div className="report-title-spacer" />
      <div className="card-report-title"><h3>PROGRESS REPORT CARD</h3><p className="session-tag">Academic Session: {filters.academicYear} | Exam: {filters.examType}</p></div>
      <div className="student-report-photo-box"><span>PHOTO</span></div>
    </div>
    <div className="class"><div className="info-item"><strong>Class / Stream:</strong> {filters.class} {filters.stream ? `(${filters.stream.toUpperCase()})` : ""}</div></div>
  </>;
}

export function StudentInformation({ report }) {
  const student = report.personalDetails || report;
  const dob = student.dob ? new Date(student.dob).toLocaleDateString("en-IN") : "N/A";
  const fields = [
    ["Student Name", student.name || report.name], ["Father's Name", student.fatherName || report.fatherName],
    ["Mother's Name", student.motherName], ["Roll No", report.rollNo], ["DOB", dob], ["Cast Group", student.cast],
    ["Admission No", student.admissionNo], ["Enrollment No", student.EnrollmentNo], ["APAAR ID", student.ApaarId], ["PEN No", student.PenNo],
  ];
  return <div className="card-student-info-grid">{fields.map(([label, value]) => <div className="info-item" key={label}><strong>{label}:</strong> {valueOrNA(value)}</div>)}</div>;
}

export function MarksTable({ report }) {
  const subjects = orderSubjects(report.calculatedMarks);
  const totals = getMarksTotals(subjects, report.suppMarks);
  return <div className="card-table-container"><table className="card-marks-table printable-marks-table">
    <thead><tr><th className="text-center" rowSpan="2">Subject Name</th><th className="text-center" rowSpan="2">MAX MARKS</th><th className="text-center" rowSpan="2">MIN MARKS THEORY</th><th className="text-center" rowSpan="2">Theory Marks</th><th className="text-center" rowSpan="2">Practical Marks</th><th className="text-center" rowSpan="2">Total Obtained</th><th className="text-center" rowSpan="2">Remarks</th><th className="text-center" colSpan="2">Supplementary Marks</th></tr><tr><th className="text-center">Max</th><th className="text-center">Obtained</th></tr></thead>
    <tbody>{subjects.map((subject) => {
      const supplementary = isSupplementary(subject);
      return <tr key={subject.subjectName}><td className="subject-title-column">{subject.subjectName}</td><td className="text-center">100</td><td className="text-center">33</td><td className="text-center font-bold">{subject.theory !== "" ? subject.theory : "0"}</td><td className="text-center font-bold">{subject.practical !== "" ? subject.practical : "0"}</td><td className="text-center font-bold highlight-obtained-total">{getSubjectTotal(subject)}</td><td className="text-center">{supplementary ? "Supplementary" : "Passed"}</td><td className="text-center">{supplementary ? 100 : "-"}</td><td className="text-center font-bold">{report.suppMarks?.[subject.subjectName] ?? "-"}</td></tr>;
    })}</tbody>
    {subjects.length > 0 && <tfoot><tr className="total-row"><td>GRAND TOTAL</td><td className="text-center">{subjects.length * 100}</td><td className="text-center">-</td><td className="text-center">{totals.theory}</td><td className="text-center">{totals.practical}</td><td className="text-center final-total-count">{totals.grand}</td><td className="text-center">-</td><td className="text-center">{totals.supplementaryMax || "-"}</td><td className="text-center">{totals.supplementaryObtained || "-"}</td></tr></tfoot>}
  </table></div>;
}

export function ResultSummary({ report }) {
  const supplementarySubjects = (report.calculatedMarks || []).filter(isSupplementary);
  const hasSupplementary = supplementarySubjects.length > 0;
  const result = hasSupplementary ? "Supplementary" : report.result;
  const statusClass = hasSupplementary ? "Supplementary" : (report.result || "").toLowerCase();
  return <>
    <div className="marks-summary-details"><p><strong>Total Marks Obtained (In Words):</strong> {numberToWords(report.grandTotal)} Only</p>{hasSupplementary && <p><strong>Supplementary Subjects:</strong> {supplementarySubjects.map((subject) => subject.subjectName).join(", ")}</p>}</div>
    <div className="card-result-footer-section"><div className="final-performance-stats"><div className="stat-row"><span className="stat-label">Percentage:</span><span className="stat-value">{report.percentage}%</span><div className="stat-row"><span className="stat-label">Final Result:</span><span className={`stat-value status-stamp ${statusClass}`}>{result}</span></div></div></div></div>
  </>;
}

export function Signatures() {
  return <div className="card-signatures-block"><div className="signature-seal-box"><div className="signature-line-placeholder" /><p>Class Teacher</p></div><div className="signature-seal-box authority-principal-seal"><div className="signature-line-placeholder image-signature-wrap" /><p>Principal Signature</p></div></div>;
}
