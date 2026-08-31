import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { DatabaseSync } from "node:sqlite";

const dataDirectory = process.env.SIRF_ID_DATA_DIR
  || join(process.env.LOCALAPPDATA || dirname(process.execPath), "SIRF ID Attendance", "data");
mkdirSync(dataDirectory, { recursive: true });

export const db = new DatabaseSync(join(dataDirectory, "attendance.db"));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;
  CREATE TABLE IF NOT EXISTS students (
    student_id TEXT PRIMARY KEY, name TEXT NOT NULL,
    class_name TEXT NOT NULL DEFAULT '', father_name TEXT NOT NULL DEFAULT '',
    phone TEXT NOT NULL DEFAULT '', academic_session TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS teachers (
    employee_id TEXT PRIMARY KEY, name TEXT NOT NULL, designation TEXT NOT NULL DEFAULT '',
    image TEXT NOT NULL DEFAULT '', active INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS teacher_attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT, employee_id TEXT NOT NULL REFERENCES teachers(employee_id),
    attendance_date TEXT NOT NULL, check_in_at TEXT NOT NULL, check_out_at TEXT,
    source TEXT NOT NULL, operator_name TEXT NOT NULL DEFAULT '', sync_status TEXT NOT NULL DEFAULT 'pending',
    synced_at TEXT, sync_error TEXT, UNIQUE(employee_id, attendance_date)
  );
  CREATE INDEX IF NOT EXISTS teacher_attendance_date_idx ON teacher_attendance(attendance_date);
  CREATE TABLE IF NOT EXISTS attendance (
    id INTEGER PRIMARY KEY AUTOINCREMENT, student_id TEXT NOT NULL REFERENCES students(student_id),
    attendance_date TEXT NOT NULL, scanned_at TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'Present',
    source TEXT NOT NULL, operator_name TEXT NOT NULL DEFAULT '', academic_session TEXT NOT NULL DEFAULT '',
    sync_status TEXT NOT NULL DEFAULT 'pending', synced_at TEXT, sync_error TEXT, UNIQUE(student_id, attendance_date)
  );
  CREATE INDEX IF NOT EXISTS attendance_date_idx ON attendance(attendance_date);
  CREATE TABLE IF NOT EXISTS scan_sessions (
    id TEXT PRIMARY KEY, class_name TEXT NOT NULL DEFAULT '', mode TEXT NOT NULL DEFAULT 'attendance',
    operator_name TEXT NOT NULL DEFAULT '', started_at TEXT NOT NULL, finished_at TEXT
  );
  CREATE TABLE IF NOT EXISTS school_calendar (
    calendar_date TEXT NOT NULL, class_name TEXT NOT NULL, is_holiday INTEGER NOT NULL,
    PRIMARY KEY (calendar_date, class_name)
  );
`);

const ensureColumn = (table, columns, name, definition) => {
  if (!columns.some((column) => column.name === name)) db.exec(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
};

const studentColumns = db.prepare("PRAGMA table_info(students)").all();
ensureColumn("students", studentColumns, "marker_id", "INTEGER");
ensureColumn("students", studentColumns, "academic_session", "TEXT NOT NULL DEFAULT ''");
db.exec("CREATE UNIQUE INDEX IF NOT EXISTS students_marker_id_idx ON students(marker_id) WHERE marker_id IS NOT NULL");

const attendanceColumns = db.prepare("PRAGMA table_info(attendance)").all();
ensureColumn("attendance", attendanceColumns, "academic_session", "TEXT NOT NULL DEFAULT ''");
ensureColumn("attendance", attendanceColumns, "sync_status", "TEXT NOT NULL DEFAULT 'pending'");
ensureColumn("attendance", attendanceColumns, "synced_at", "TEXT");
ensureColumn("attendance", attendanceColumns, "sync_error", "TEXT");
db.exec("CREATE INDEX IF NOT EXISTS attendance_sync_status_idx ON attendance(sync_status, attendance_date)");

