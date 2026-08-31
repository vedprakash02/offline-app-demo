import useReportCard from "./useReportCard";
import { MarksTable, ReportHeading, ResultSummary, SchoolHeader, Signatures, StudentInformation } from "./ReportSections";
import "./ReportView.css";

export default function ReportCardView({ studentId, filters }) {
  const { schoolInfo, report, loading } = useReportCard(studentId, filters);

  return <div className="report-card-system-wrapper">
    <div className="action-control-panel no-print">
      {report && <button type="button" onClick={() => window.print()} className="print-main-btn">🖨️ Print This Report Card (A4)</button>}
    </div>

    {loading && <div className="loader-msg no-print">Loading student report, please wait...</div>}
    {!loading && !report && <div className="empty-state no-print">No report card record is available to display.</div>}

    {!loading && report && <div className="report-cards-print-zone">
      <div className="a4-report-sheet">
        <div className="inner-border-decorator">
          <SchoolHeader school={schoolInfo} />
          <ReportHeading filters={filters} />
          <StudentInformation report={report} />
          <MarksTable report={report} />
          <ResultSummary report={report} />
          <Signatures />
        </div>
      </div>
    </div>}
  </div>;
}
