import React, { useMemo, useState } from "react";
import IdCardPreview from "./IdCardPreview";
import TeacherIdCardPreview from "./TeacherIdCardPreview";
import "./BulkIdCards.css";
import { getPrintLayout } from "./cardDimensions";

const getCardGroup = (record, cardType) => cardType === "teacher" ? record.designation || "" : record.className || record.class || "";

const chunkStudents = (students, size) => {
  const sheets = [];
  for (let index = 0; index < students.length; index += size) {
    sheets.push(students.slice(index, index + size));
  }
  return sheets;
};

const mirrorSheetRows = (students, columns) => {
  const mirrored = [];
  for (let index = 0; index < students.length; index += columns) {
    const row = students.slice(index, index + columns);
    while (row.length < columns) row.push(null);
    mirrored.push(...row.reverse());
  }
  return mirrored;
};

const BulkIdCards = ({ importedStudents = [], config, cardType = "student", onBack }) => {
  const [selectedClass, setSelectedClass] = useState("");

  const classOptions = useMemo(
    () => [...new Set(importedStudents.map((record) => getCardGroup(record, cardType)).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b)),
    [importedStudents],
  );

  const filteredStudents = useMemo(
    () => selectedClass
      ? importedStudents.filter((record) => getCardGroup(record, cardType) === selectedClass)
      : importedStudents,
    [importedStudents, selectedClass],
  );

  const printLayout = useMemo(() => getPrintLayout(config), [config]);
  const studentSheets = useMemo(
    () => chunkStudents(filteredStudents, printLayout.cardsPerPage),
    [filteredStudents, printLayout.cardsPerPage],
  );
  const sheetStyle = {
    "--print-card-width": `${printLayout.width}mm`,
    "--print-card-height": `${printLayout.height}mm`,
    "--print-card-gap": `${printLayout.gap}mm`,
    "--print-columns": printLayout.columns,
  };

  const printCards = () => {
    const orientation = config.orientation === "landscape" ? "landscape" : "portrait";
    document.body.classList.add("bulk-print-active", `bulk-print-${orientation}`);

    const finishPrinting = () => {
      document.body.classList.remove(
        "bulk-print-active",
        "bulk-print-landscape",
        "bulk-print-portrait",
      );
      window.removeEventListener("afterprint", finishPrinting);
    };

    window.addEventListener("afterprint", finishPrinting);
    window.print();
  };

  return (
    <main className="bulk-idcards-page">
      <header className="bulk-idcards-toolbar">
        <div>
          <h2>{cardType === "teacher" ? "Teacher ID Cards" : "Student ID Cards"}</h2>
          <p>{filteredStudents.length} cards Â· {printLayout.width} Ã— {printLayout.height} mm Â· {printLayout.cardsPerPage} per A4 side</p>
        </div>

        <div className="bulk-idcards-actions">
          {onBack && (
            <button className="bulk-back-btn" type="button" onClick={onBack}>
              Back to customizer
            </button>
          )}
          <select
            aria-label="Filter cards by class"
            value={selectedClass}
            onChange={(event) => setSelectedClass(event.target.value)}
          >
            <option value="">{cardType === "teacher" ? "All Designations" : "All Classes"}</option>
            {classOptions.map((className) => (
              <option key={className} value={className}>{className}</option>
            ))}
          </select>
          <button className="bulk-download-btn" type="button" onClick={printCards}>
            Download A4 PDF
          </button>
        </div>
      </header>

      {!filteredStudents.length ? (
        <p className="bulk-idcards-status">{cardType === "teacher" ? "Koi active teacher load nahi hua hai." : "Excel file se koi student record load nahi hua hai."}</p>
      ) : (
        <div className={`bulk-idcards-sheets screen-${config.orientation}`} style={sheetStyle}>
          {studentSheets.map((sheet, sheetIndex) => <React.Fragment key={sheetIndex}>
            <section className={`bulk-idcards-grid print-${config.orientation} print-front`} style={sheetStyle}>
              {sheet.map((record, recordIndex) => cardType === "teacher" ? <TeacherIdCardPreview config={config} teacher={record} printable side="front" key={`front-${record.employeeId || record.name}-${sheetIndex}-${recordIndex}`} /> : <IdCardPreview config={config} student={record} printable side="front" key={`front-${record.studentId || record.name}-${sheetIndex}-${recordIndex}`} />)}
            </section>
            {config.cardSides === "double" && <section className={`bulk-idcards-grid print-${config.orientation} print-back`} style={sheetStyle}>
              {mirrorSheetRows(sheet, printLayout.columns).map((student, studentIndex) => student
                ? (cardType === "teacher" ? <TeacherIdCardPreview config={config} teacher={student} printable side="back" key={`back-${student.employeeId || student.name}-${sheetIndex}-${studentIndex}`} /> : <IdCardPreview config={config} student={student} printable side="back" key={`back-${student.studentId || student.name}-${sheetIndex}-${studentIndex}`} />)
                : <div className="print-card-placeholder" aria-hidden="true" key={`blank-${sheetIndex}-${studentIndex}`} />)}
            </section>}
          </React.Fragment>)}
        </div>
      )}
    </main>
  );
};

export default BulkIdCards;

