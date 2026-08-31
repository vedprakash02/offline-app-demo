// Keep ID-card traffic on its standalone SQLite service. When that service
// serves the mobile scanner itself, use the current LAN origin.
export const API_BASE = import.meta.env.VITE_ID_BACKEND_URL ?? (
  typeof window !== "undefined" && window.location.port === "4173"
    ? ""
    : "http://127.0.0.1:4173"
);

export const apiRequest = async (path, options = {}) => {
  const url = path.startsWith('http') ? path : (API_BASE ? `${API_BASE.replace(/\/$/, '')}${path}` : path);
  const request = () => fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) },
    });
  let response;
  for (let attempt = 0; attempt < (API_BASE ? 15 : 1); attempt += 1) {
    try {
      response = await request();
      break;
    } catch (error) {
      if (attempt === 14 || !API_BASE) throw error;
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.message || "Server request fail hui.");
    error.status = response.status;
    error.data = data;
    throw error;
  }
  return data;
};

export const attendanceApi = {
  resetStudents: () => apiRequest("/api/students/reset", { method: "POST" }),
  getConnection: () => apiRequest("/api/connection"),
  getStudents: () => apiRequest("/api/students"),
  getRecords: (date) => apiRequest(`/api/attendance?date=${encodeURIComponent(date)}`),
  getMonthlyReport: (className, month) => apiRequest(`/api/attendance/report?className=${encodeURIComponent(className)}&month=${encodeURIComponent(month)}`),
  setHoliday: (date, className, isHoliday) => apiRequest("/api/attendance/holiday", {
    method: "POST", body: JSON.stringify({ date, className, isHoliday }),
  }),
  bulkScan: (markerIds, operatorName) => apiRequest("/api/attendance/bulk", {
    method: "POST", body: JSON.stringify({ markerIds, operatorName }),
  }),
  scan: (qrValue, source, operatorName) => apiRequest("/api/attendance/scan", {
    method: "POST", body: JSON.stringify({ qrValue, source, operatorName }),
  }),
  syncOffline: (events) => apiRequest("/api/attendance/sync", {
    method: "POST", body: JSON.stringify({ events }),
  }),
  getPendingMongoSync: () => apiRequest("/api/attendance/pending"),
  updateMongoSyncStatus: (results) => apiRequest("/api/attendance/sync-status", {
    method: "POST", body: JSON.stringify({ results }),
  }),
  syncTeachers: (teachers) => apiRequest("/api/teachers/sync", { method: "POST", body: JSON.stringify({ teachers }) }),
  syncStudents: (students, academicSession = localStorage.getItem("activeSession") || "") => apiRequest("/api/students/sync", {
    method: "POST", body: JSON.stringify({ students: students.map((student) => ({
      studentId: student.studentId,
      name: student.name,
      className: student.className,
      fatherName: student.fatherName,
      phone: student.phone,
    })), academicSession }),
  }),
};


export const syncQrAttendanceToMongo = async () => {
  const { events = [] } = await attendanceApi.getPendingMongoSync();
  if (!events.length) return { pending: 0, synced: 0, failed: 0 };
  const token = localStorage.getItem("token");
  if (!token) throw new Error("ERP login token nahi mila.");
  const response = await fetch("http://localhost:3000/attendance/qr-sync", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ events, academicSession: localStorage.getItem("activeSession") || "" }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Mongo attendance sync fail hui.");
  await attendanceApi.updateMongoSyncStatus(data.results || []);
  return { ...data, pending: Math.max(0, events.length - Number(data.synced || 0)) };
};

