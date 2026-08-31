import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { calculateReport } from "./reportUtils";

const API_URL = "http://localhost:3000";
const getHeaders = () => {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export default function useReportCard(studentId, filters) {
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);

  const loadReport = useCallback(async () => {
    setLoading(true);
    setReport(null);
    const headers = getHeaders();
    try {
      try {
        const { data } = await axios.get(`${API_URL}/get-school-profile`, { headers });
        setSchoolInfo(data || null);
      } catch (error) {
        console.warn("School profile failed, using defaults", error);
      }

      const { data } = await axios.get(`${API_URL}/view-marks-matrix`, {
        headers,
        params: {
          class: filters.class,
          academicYear: filters.academicYear,
          examType: filters.examType,
          ...(filters.stream ? { stream: filters.stream } : {}),
        },
      });
      if (!data?.success) throw new Error(data?.message || "Marks data could not be loaded.");

      const student = (data.studentsMatrix || []).find((item) => String(item.studentId) === String(studentId));
      if (!student) throw new Error("No marks record was found for this student.");
      setReport(calculateReport(student, data.subjects || []));
    } catch (error) {
      console.error("Report Card Generation Error:", error);
      alert(error.response?.data?.message || error.message || "Unable to load the report card.");
    } finally {
      setLoading(false);
    }
  }, [filters.academicYear, filters.class, filters.examType, filters.stream, studentId]);

  useEffect(() => {
    if (studentId && filters.class) loadReport();
  }, [studentId, filters.class, loadReport]);

  return { schoolInfo, report, loading };
}
