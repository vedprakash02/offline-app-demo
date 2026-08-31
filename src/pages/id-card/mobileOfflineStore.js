import { normalizeStudentId, readStudentIdFromQr } from "./attendanceQr";

const studentsKey = "sirf-id-mobile-students";
const queueKey = "sirf-id-offline-attendance";

const readList = (key) => {
  try { const value = JSON.parse(localStorage.getItem(key)); return Array.isArray(value) ? value : []; }
  catch { return []; }
};

export const getCachedStudents = () => readList(studentsKey);
export const cacheStudents = (students) => localStorage.setItem(studentsKey, JSON.stringify(students));
export const getOfflineQueue = () => readList(queueKey);
export const saveOfflineQueue = (events) => localStorage.setItem(queueKey, JSON.stringify(events));

export const studentIdFromScan = (value) => readStudentIdFromQr(value) || normalizeStudentId(value);

export const queueOfflineAttendance = ({ qrValue, operatorName }) => {
  const studentId = studentIdFromScan(qrValue);
  const student = getCachedStudents().find((item) => item.studentId === studentId);
  if (!student) throw new Error(`Student ID ${studentId || "blank"} phone mein nahi mili. Online hokar students refresh karein.`);
  const date = new Date().toLocaleDateString("en-CA");
  const queue = getOfflineQueue();
  if (queue.some((event) => event.studentId === studentId && event.localDate === date)) {
    return { duplicate: true, student, queue };
  }
  const event = {
    id: globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    studentId,
    qrValue,
    operatorName,
    scannedAt: new Date().toISOString(),
    localDate: date,
  };
  const nextQueue = [...queue, event];
  saveOfflineQueue(nextQueue);
  return { duplicate: false, student, queue: nextQueue };
};

export const removeSyncedEvents = (results) => {
  const acceptedIds = new Set(results.filter((item) => ["marked", "duplicate"].includes(item.status)).map((item) => item.id));
  const remaining = getOfflineQueue().filter((event) => !acceptedIds.has(event.id));
  saveOfflineQueue(remaining);
  return remaining;
};
