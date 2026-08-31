import { createServer } from "node:http";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { networkInterfaces } from "node:os";
import { serveFrontend } from "./src/serveFrontend.js";
import { db } from "./src/database.js";
import { readJsonBody as readBody, sendJson as json } from "./src/http.js";
const localAdminKeyPath = join(process.env.SIRF_ID_APP_DIR || join(process.env.LOCALAPPDATA || dirname(process.execPath), "SIRF ID Attendance"), "admin.key");
mkdirSync(dirname(localAdminKeyPath), { recursive: true });
if (!existsSync(localAdminKeyPath)) writeFileSync(localAdminKeyPath, randomBytes(32).toString("hex"), { mode: 0o600 });
const localAdminKey = String(process.env.ERP_ID_ADMIN_KEY || readFileSync(localAdminKeyPath, "utf8")).trim();
const normaliseId = (value) =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/[\sÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€¦Ã¢â‚¬Å“ÃƒÆ’Ã†â€™Ãƒâ€šÃ‚Â¢ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â€šÂ¬Ã…Â¡Ãƒâ€šÃ‚Â¬ÃƒÆ’Ã‚Â¢ÃƒÂ¢Ã¢â‚¬Å¡Ã‚Â¬Ãƒâ€šÃ‚Â_]+/g, "-");
const idFromQr = (value) => {
  const text = String(value || "").trim();
  return normaliseId(
    text.toUpperCase().startsWith("SIRF-ID:") ? text.slice(8) : text,
  );
};
const teacherIdFromQr = (value) => { const text = String(value || "").trim(); const upper = text.toUpperCase(); if (upper.startsWith("SIRF-TEACHER:")) return normaliseId(text.slice(13)); if (upper.startsWith("TEACHER:")) return normaliseId(text.slice(8)); return ""; };
const schoolTimeZone = process.env.SCHOOL_TIME_ZONE || "Asia/Kolkata";
const dateParts = (date = new Date()) =>
  Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: schoolTimeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(date)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, part.value]),
  );
const localDate = (date = new Date()) => {
  const { year, month, day } = dateParts(date);
  return `${year}-${month}-${day}`;
};
const localTime = (isoDate) =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: schoolTimeZone,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(new Date(isoDate));
const attendanceRows = (date) =>
  db
    .prepare(
      `
  SELECT a.id, a.student_id AS studentId, s.name, s.class_name AS className, s.father_name AS fatherName, s.phone,
         a.attendance_date AS date, a.scanned_at AS scannedAt, a.status, a.source,
         a.operator_name AS operatorName, a.academic_session AS academicSession, a.sync_status AS syncStatus
  FROM attendance a JOIN students s ON s.student_id = a.student_id
  WHERE a.attendance_date = ? ORDER BY a.scanned_at DESC
`,
    )
    .all(date)
    .map((row) => ({ ...row, time: localTime(row.scannedAt) }));
const absentRows = (date) =>
  db
    .prepare(
      `
  SELECT s.student_id AS studentId, s.name, s.class_name AS className, s.father_name AS fatherName, s.phone, 'Absent' AS status
  FROM students s
  WHERE s.active = 1 AND NOT EXISTS (
    SELECT 1 FROM attendance a WHERE a.student_id = s.student_id AND a.attendance_date = ?
  )
  ORDER BY s.class_name, s.name
`,
    )
    .all(date);
const dailyAttendance = (date) => {
  const records = attendanceRows(date);
  const absent = absentRows(date);
  return {
    date,
    records,
    absent,
    total: records.length + absent.length,
    presentCount: records.length,
    absentCount: absent.length,
  };
};

const mobileScannerUrls = () => {
  const configuredUrl = String(process.env.PUBLIC_URL || "").replace(/\/$/, "");
  if (configuredUrl) return [`${configuredUrl}/scan?v=20260823-3`];
  const port = Number(process.env.BACKEND_PORT || process.env.PORT || 4173);
  const urls = [];
  for (const entries of Object.values(networkInterfaces())) {
    for (const entry of entries || []) {
      if (entry.family === "IPv4" && !entry.internal)
        urls.push(`http://${entry.address}:${port}/scan?v=20260823-3`);
    }
  }
  return [...new Set(urls)];
};

let cachedErpLicense = { valid: false, checkedAt: 0, expiresAt: "" };
const mutationLicenseStatus = async () => {
  const now = Date.now();
  const cachedExpiry = Date.parse(`${cachedErpLicense.expiresAt || "1970-01-01"}T23:59:59.999Z`);
  if (cachedErpLicense.valid && now <= cachedExpiry && now - cachedErpLicense.checkedAt < 6 * 60 * 60 * 1000) return cachedErpLicense;
  try {
    const response = await fetch("http://127.0.0.1:3000/license/status", { signal: AbortSignal.timeout(2500) });
    const status = await response.json();
    cachedErpLicense = { valid: Boolean(status.valid), checkedAt: now, expiresAt: status.license?.expiresAt || "", code: status.code, message: status.message };
    return cachedErpLicense;
  } catch {
    if (cachedErpLicense.valid && now <= cachedExpiry && now - cachedErpLicense.checkedAt < 7 * 24 * 60 * 60 * 1000) return cachedErpLicense;
    return { valid: false, code: "LICENSE_CHECK_UNAVAILABLE", message: "ERP license verify nahi hua. Main ERP backend start karein." };
  }
};
const api = async (req, res, url) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    const license = await mutationLicenseStatus();
    if (!license.valid) return json(res, 402, { success: false, readOnly: true, code: license.code || "LICENSE_REQUIRED", message: license.message || "Valid ERP license required hai." });
  }  if (req.method === "GET" && url.pathname === "/api/health") {
    return json(res, 200, { ok: true, service: "SIRF ID Attendance" });
  }
  if (req.method === "GET" && url.pathname === "/api/connection") {
    return json(res, 200, {
      scannerUrls: mobileScannerUrls(),
      timeZone: schoolTimeZone,
    });
  }
  if (req.method === "GET" && url.pathname === "/api/teachers") {
    return json(res, 200, { teachers: db.prepare("SELECT employee_id AS employeeId, name, designation, image FROM teachers WHERE active = 1 ORDER BY name").all() });
  }
  if (req.method === "POST" && url.pathname === "/api/teachers/sync") {
    const { teachers } = await readBody(req);
    if (!Array.isArray(teachers)) return json(res, 400, { message: "Valid teacher list chahiye." });
    const upsert = db.prepare(`INSERT INTO teachers (employee_id,name,designation,image,active,updated_at) VALUES (?,?,?,?,1,?) ON CONFLICT(employee_id) DO UPDATE SET name=excluded.name,designation=excluded.designation,image=excluded.image,active=1,updated_at=excluded.updated_at`);
    const now = new Date().toISOString(); db.exec("BEGIN");
    try { db.prepare("UPDATE teachers SET active = 0").run(); for (const teacher of teachers) { const id=normaliseId(teacher.employeeId); if(id&&String(teacher.name||"").trim()) upsert.run(id,String(teacher.name).trim(),String(teacher.designation||"").trim(),String(teacher.image||"").trim(),now); } db.exec("COMMIT"); }
    catch(error){db.exec("ROLLBACK");throw error;}
    return json(res,200,{message:`${teachers.length} teachers SQLite scanner par sync ho gaye.`,count:teachers.length});
  }
  if (req.method === "GET" && url.pathname === "/api/students") {
    return json(res, 200, {
      students: db
        .prepare(
          "SELECT student_id AS studentId, student_id AS admissionNo, name, class_name AS className, academic_session AS academicSession, marker_id AS markerId FROM students WHERE active = 1 ORDER BY name",
        )
        .all(),
    });
  }
  if (req.method === "POST" && url.pathname === "/api/students/sync") {
    const { students, academicSession } = await readBody(req);
    if (!Array.isArray(students) || !students.length)
      return json(res, 400, { message: "Sync ke liye student list chahiye." });
    const session = String(academicSession || "").trim();
    if (!/^\d{4}-\d{4}$/.test(session))
      return json(res, 400, { message: "Valid academic session chahiye." });
    const upsert =
      db.prepare(`INSERT INTO students (student_id,name,class_name,father_name,phone,academic_session,active,updated_at)
      VALUES (?,?,?,?,?,?,1,?) ON CONFLICT(student_id) DO UPDATE SET name=excluded.name,class_name=excluded.class_name,
      father_name=excluded.father_name,phone=excluded.phone,academic_session=excluded.academic_session,active=1,updated_at=excluded.updated_at`);
    const now = new Date().toISOString();
    const findMarker = db.prepare(
      "SELECT marker_id AS markerId FROM students WHERE student_id = ?",
    );
    const setMarker = db.prepare(
      "UPDATE students SET marker_id = ? WHERE student_id = ?",
    );
    let nextMarkerId = Number(
      db
        .prepare(
          "SELECT COALESCE(MAX(marker_id), 0) + 1 AS value FROM students",
        )
        .get().value,
    );
    let saved = 0;
    db.exec("BEGIN");
    try {
      for (const student of students) {
        const id = normaliseId(student.studentId);
        if (id && String(student.name || "").trim()) {
          upsert.run(
            id,
            String(student.name).trim(),
            String(student.className || "").trim(),
            String(student.fatherName || "").trim(),
            String(student.phone || "").trim(),
            session,
            now,
          );
          if (findMarker.get(id)?.markerId == null)
            setMarker.run(nextMarkerId++, id);
          saved += 1;
        }
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    return json(res, 200, {
      message: `${saved} students server par sync ho gaye.`,
      count: saved,
    });
  }
  if (req.method === "POST" && url.pathname === "/api/students/reset") {
    const studentCount = Number(
      db.prepare("SELECT COUNT(*) AS count FROM students").get().count,
    );
    const attendanceCount = Number(
      db.prepare("SELECT COUNT(*) AS count FROM attendance").get().count,
    );
    db.exec("BEGIN");
    try {
      db.exec(
        "DELETE FROM attendance; DELETE FROM students; DELETE FROM scan_sessions;",
      );
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    return json(res, 200, {
      message: `${studentCount} local SQLite students aur ${attendanceCount} QR attendance records reset ho gaye. MongoDB data change nahi hua.`,
      studentCount,
      attendanceCount,
    });
  }
  if (req.method === "GET" && url.pathname === "/api/backup") {
    const remote = req.socket.remoteAddress || "";
    if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote)) return json(res, 403, { message: "Backup sirf local ERP server le sakta hai." });
    return json(res, 200, { available: true, format: "sirf-id-sqlite-v1", createdAt: new Date().toISOString(), tables: { students: db.prepare("SELECT * FROM students").all(), attendance: db.prepare("SELECT * FROM attendance").all(), scan_sessions: db.prepare("SELECT * FROM scan_sessions").all(), school_calendar: db.prepare("SELECT * FROM school_calendar").all() } });
  }
  if (req.method === "POST" && url.pathname === "/api/restore") {
    const remote = req.socket.remoteAddress || "";
    const expectedKey = localAdminKey;
    const suppliedKey = String(req.headers["x-erp-admin-key"] || "");
    const validKey = expectedKey && suppliedKey && expectedKey.length === suppliedKey.length && timingSafeEqual(Buffer.from(expectedKey), Buffer.from(suppliedKey));
    if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote) || !validKey) return json(res, 403, { message: "Authenticated local ERP restore required hai." });
    const payload = await readBody(req);
    if (payload.confirmation !== "RESTORE SQLITE DATA" || !payload.tables) return json(res, 400, { message: "Invalid SQLite restore request." });
    const tableOrder = ["students", "scan_sessions", "school_calendar", "attendance"];
    try {
      db.exec("BEGIN IMMEDIATE");
      ["attendance", "scan_sessions", "school_calendar", "students"].forEach((table) => db.exec(`DELETE FROM ${table}`));
      for (const table of tableOrder) {
        const allowed = new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((column) => column.name));
        for (const row of payload.tables[table] || []) {
          const columns = Object.keys(row).filter((column) => allowed.has(column));
          if (!columns.length) continue;
          db.prepare(`INSERT INTO ${table} (${columns.join(",")}) VALUES (${columns.map(() => "?").join(",")})`).run(...columns.map((column) => row[column]));
        }
      }
      db.exec("COMMIT");
      return json(res, 200, { success: true, message: "SQLite data restore ho gaya." });
    } catch (error) {
      try { db.exec("ROLLBACK"); } catch {}
      return json(res, 500, { message: `SQLite restore nahi hua: ${error.message}` });
    }
  }
  if (req.method === "GET" && url.pathname === "/api/attendance") {
    const date = url.searchParams.get("date") || localDate();
    return json(res, 200, dailyAttendance(date));
  }
  if (req.method === "GET" && url.pathname === "/api/attendance/report") {
    const className = String(url.searchParams.get("className") || "").trim();
    const month = String(url.searchParams.get("month") || "").trim();
    if (!className || !/^\d{4}-\d{2}$/.test(month))
      return json(res, 400, { message: "Class aur valid month chahiye." });

    const monthStart = `${month}-01`;
    const monthEndDate = new Date(`${monthStart}T00:00:00Z`);
    monthEndDate.setUTCMonth(monthEndDate.getUTCMonth() + 1);
    const monthEnd = monthEndDate.toISOString().slice(0, 10);
    const attendanceRows = db.prepare(`
      SELECT a.student_id AS studentId, a.attendance_date AS date, a.status
      FROM attendance a JOIN students s ON s.student_id = a.student_id
      WHERE s.class_name = ? AND a.attendance_date >= ? AND a.attendance_date < ?
    `).all(className, monthStart, monthEnd);
    const markedDates = new Set(attendanceRows.map((row) => row.date));
    const overrides = new Map(db.prepare(`
      SELECT calendar_date AS date, is_holiday AS isHoliday FROM school_calendar
      WHERE class_name = ? AND calendar_date >= ? AND calendar_date < ?
    `).all(className, monthStart, monthEnd).map((row) => [row.date, Boolean(row.isHoliday)]));
    const daysInMonth = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
    const calendar = Array.from({ length: daysInMonth }, (_, index) => {
      const date = `${month}-${String(index + 1).padStart(2, "0")}`;
      const isSunday = new Date(`${date}T00:00:00Z`).getUTCDay() === 0;
      const override = overrides.get(date);
      const isHoliday = override === undefined ? isSunday : override;
      const isWorkingDay = !isHoliday && (markedDates.has(date) || override === false);
      return { date, day: index + 1, isHoliday, isSunday, isWorkingDay };
    });
    const workingDates = new Set(calendar.filter((day) => day.isWorkingDay).map((day) => day.date));
    const statusByStudent = new Map();
    for (const row of attendanceRows) {
      if (!statusByStudent.has(row.studentId)) statusByStudent.set(row.studentId, {});
      statusByStudent.get(row.studentId)[row.date] = row.status;
    }
    const rows = db.prepare(`
      SELECT student_id AS studentId, name, class_name AS className
      FROM students WHERE active = 1 AND class_name = ? ORDER BY name COLLATE NOCASE
    `).all(className);
    const schoolWorkingDays = workingDates.size;
    return json(res, 200, {
      className,
      month,
      calendar,
      summary: {
        totalCalendarDays: daysInMonth,
        holidayDays: calendar.filter((day) => day.isHoliday).length,
        schoolWorkingDays,
      },
      students: rows.map((row) => {
        const recorded = statusByStudent.get(row.studentId) || {};
        const dailyStatus = {};
        let presentCount = 0;
        for (const day of calendar) {
          if (day.isHoliday) dailyStatus[day.date] = "Holiday";
          else if (recorded[day.date]) {
            dailyStatus[day.date] = recorded[day.date];
            if (recorded[day.date] === "Present") presentCount += 1;
          } else if (day.isWorkingDay) dailyStatus[day.date] = "Absent";
        }
        const absentCount = Math.max(0, schoolWorkingDays - presentCount);
        return { ...row, rollNo: row.studentId, dailyStatus, presentCount, absentCount,
          totalDays: schoolWorkingDays,
          percentage: schoolWorkingDays ? Math.round((presentCount / schoolWorkingDays) * 100) : 0 };
      }),
    });
  }
  if (req.method === "POST" && url.pathname === "/api/attendance/holiday") {
    const body = await readBody(req);
    const date = String(body.date || "").trim();
    const className = String(body.className || "").trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !className || typeof body.isHoliday !== "boolean")
      return json(res, 400, { message: "Valid date, class aur holiday status chahiye." });
    db.prepare(`INSERT INTO school_calendar (calendar_date,class_name,is_holiday) VALUES (?,?,?)
      ON CONFLICT(calendar_date,class_name) DO UPDATE SET is_holiday=excluded.is_holiday`)
      .run(date, className, body.isHoliday ? 1 : 0);
    return json(res, 200, { message: `${date} ko ${body.isHoliday ? "holiday" : "working day"} mark kar diya.`, date, className, isHoliday: body.isHoliday });
  }
  if (req.method === "POST" && url.pathname === "/api/attendance/scan") {
    const body = await readBody(req);
    const teacherId = teacherIdFromQr(body.qrValue);
    if (teacherId) {
      const teacher = db.prepare("SELECT employee_id AS employeeId,name,designation FROM teachers WHERE employee_id = ? AND active = 1").get(teacherId);
      if (!teacher) return json(res,404,{message:`Teacher ID ${teacherId} scanner roster mein nahi mili. Pehle teacher sync karein.`});
      const now=new Date(); const date=localDate(now); const existing=db.prepare("SELECT id,check_in_at AS checkInAt,check_out_at AS checkOutAt FROM teacher_attendance WHERE employee_id=? AND attendance_date=?").get(teacherId,date);
      if (!existing) db.prepare("INSERT INTO teacher_attendance (employee_id,attendance_date,check_in_at,source,operator_name) VALUES (?,?,?,?,?)").run(teacherId,date,now.toISOString(),["camera","hardware","photo","manual"].includes(body.source)?body.source:"manual",String(body.operatorName||"").trim());
      else if (!existing.checkOutAt) db.prepare("UPDATE teacher_attendance SET check_out_at=?,source=?,operator_name=?,sync_status='pending',synced_at=NULL,sync_error=NULL WHERE id=?").run(now.toISOString(),body.source||"manual",String(body.operatorName||"").trim(),existing.id);
      else return json(res,409,{duplicate:true,teacher,message:`${teacher.name} ka check-in aur check-out aaj complete hai.`});
      return json(res,201,{teacher,teacherScan:{action:existing?"check-out":"check-in",time:localTime(now.toISOString())},message:`${teacher.name} ${existing?"check-out":"check-in"}: ${localTime(now.toISOString())}`,...dailyAttendance(date)});
    }
    const studentId = idFromQr(body.qrValue);
    if (!studentId)
      return json(res, 400, { message: "QR/Student ID blank hai." });
    const student = db
      .prepare(
        "SELECT student_id AS studentId, name, class_name AS className, academic_session AS academicSession FROM students WHERE student_id = ? AND active = 1",
      )
      .get(studentId);
    if (!student)
      return json(res, 404, {
        message: `Student ID ${studentId} server par nahi mili.`,
      });
    const now = new Date();
    const date = localDate(now);
    try {
      db.prepare(
        "INSERT INTO attendance (student_id,attendance_date,scanned_at,status,source,operator_name,academic_session) VALUES (?,?,?,?,?,?,?)",
      ).run(
        studentId,
        date,
        now.toISOString(),
        "Present",
        ["camera", "hardware", "photo", "manual"].includes(body.source)
          ? body.source
          : "manual",
        String(body.operatorName || "").trim(),
      student.academicSession || "",
      );
    } catch (error) {
      if (String(error.message).includes("UNIQUE"))
        return json(res, 409, {
          duplicate: true,
          student,
          message: `${student.name} ki attendance aaj pehle hi lag chuki hai.`,
        });
      throw error;
    }
    return json(res, 201, {
      student,
      message: `Attendance marked: ${student.name}`,
      ...dailyAttendance(date),
    });
  }
  if (req.method === "POST" && url.pathname === "/api/attendance/bulk") {
    const body = await readBody(req);
    const markerIds = [
      ...new Set(
        (Array.isArray(body.markerIds) ? body.markerIds : [])
          .map(Number)
          .filter(Number.isInteger),
      ),
    ];
    if (!markerIds.length)
      return json(res, 400, {
        message: "Whole-class scan mein marker IDs nahi mili.",
      });
    if (markerIds.length > 200)
      return json(res, 400, {
        message: "Ek scan mein adhiktam 200 cards bhejein.",
      });
    const findByMarker = db.prepare(
      "SELECT student_id AS studentId, name, class_name AS className, academic_session AS academicSession FROM students WHERE marker_id = ? AND active = 1",
    );
    const insert = db.prepare(
      "INSERT INTO attendance (student_id,attendance_date,scanned_at,status,source,operator_name,academic_session) VALUES (?,?,?,?,?,?,?)",
    );
    const now = new Date();
    const date = localDate(now);
    const results = [];
    db.exec("BEGIN");
    try {
      for (const markerId of markerIds) {
        const student = findByMarker.get(markerId);
        if (!student) {
          results.push({ markerId, status: "not_found" });
          continue;
        }
        try {
          insert.run(
            student.studentId,
            date,
            now.toISOString(),
            "Present",
            "whole-class",
            String(body.operatorName || "").trim(),
          student.academicSession || "",
      );
          results.push({ markerId, student, status: "marked" });
        } catch (error) {
          if (String(error.message).includes("UNIQUE"))
            results.push({ markerId, student, status: "duplicate" });
          else throw error;
        }
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    return json(res, 200, {
      results,
      ...dailyAttendance(date),
      message: `${results.filter((item) => item.status === "marked").length} attendance mark hui.`,
    });
  }
  if (req.method === "POST" && url.pathname === "/api/attendance/sync") {
    const { events } = await readBody(req);
    if (!Array.isArray(events) || !events.length)
      return json(res, 400, {
        message: "Offline sync ke liye attendance events chahiye.",
      });
    if (events.length > 2000)
      return json(res, 400, {
        message: "Ek baar mein adhiktam 2000 attendance events sync karein.",
      });
    const findStudent = db.prepare(
      "SELECT student_id AS studentId, name, class_name AS className, academic_session AS academicSession FROM students WHERE student_id = ? AND active = 1",
    );
    const insertAttendance = db.prepare(
      "INSERT INTO attendance (student_id,attendance_date,scanned_at,status,source,operator_name,academic_session) VALUES (?,?,?,?,?,?,?)",
    );
    const results = [];
    db.exec("BEGIN");
    try {
      for (const event of events) {
        const queuedTeacherId = teacherIdFromQr(event.qrValue);
        if (queuedTeacherId) {
          const teacher=db.prepare("SELECT employee_id AS employeeId,name FROM teachers WHERE employee_id=? AND active=1").get(queuedTeacherId);
          if(!teacher){results.push({id:event.id,employeeId:queuedTeacherId,entityType:"teacher",status:"not_found"});continue;}
          const scannedAtDate=new Date(event.scannedAt);const scannedAt=Number.isNaN(scannedAtDate.getTime())?new Date():scannedAtDate;const date=localDate(scannedAt);
          const existing=db.prepare("SELECT id,check_out_at AS checkOutAt FROM teacher_attendance WHERE employee_id=? AND attendance_date=?").get(queuedTeacherId,date);
          if(!existing)db.prepare("INSERT INTO teacher_attendance (employee_id,attendance_date,check_in_at,source,operator_name) VALUES (?,?,?,?,?)").run(queuedTeacherId,date,scannedAt.toISOString(),"mobile-offline",String(event.operatorName||"").trim());
          else if(!existing.checkOutAt)db.prepare("UPDATE teacher_attendance SET check_out_at=?,source='mobile-offline',sync_status='pending',synced_at=NULL WHERE id=?").run(scannedAt.toISOString(),existing.id);
          results.push({id:event.id,employeeId:queuedTeacherId,entityType:"teacher",name:teacher.name,status:existing?.checkOutAt?"duplicate":"marked"});continue;
        }
        const studentId = idFromQr(event.qrValue || event.studentId);
        const student = findStudent.get(studentId);
        if (!student) {
          results.push({ id: event.id, studentId, status: "not_found" });
          continue;
        }
        const scannedAtDate = new Date(event.scannedAt);
        const scannedAt = Number.isNaN(scannedAtDate.getTime())
          ? new Date()
          : scannedAtDate;
        const ageDays = Math.abs(Date.now() - scannedAt.getTime()) / 86_400_000;
        if (ageDays > 31) {
          results.push({ id: event.id, studentId, status: "too_old" });
          continue;
        }
        try {
          insertAttendance.run(
            studentId,
            localDate(scannedAt),
            scannedAt.toISOString(),
            "Present",
            "mobile-offline",
            String(event.operatorName || "").trim(),
          student.academicSession || "",
          );
          results.push({
            id: event.id,
            studentId,
            name: student.name,
            status: "marked",
          });
        } catch (error) {
          if (String(error.message).includes("UNIQUE"))
            results.push({
              id: event.id,
              studentId,
              name: student.name,
              status: "duplicate",
            });
          else throw error;
        }
      }
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    const accepted = results.filter((result) =>
      ["marked", "duplicate"].includes(result.status),
    ).length;
    return json(res, 200, {
      message: `${accepted}/${events.length} offline attendance sync ho gayi.`,
      results,
    });
  }

  if (req.method === "GET" && url.pathname === "/api/attendance/pending") {
    const studentEvents = db.prepare(`SELECT a.id, 'student' AS entityType, a.student_id AS admissionNo, a.attendance_date AS date, a.scanned_at AS scannedAt, a.source, a.operator_name AS operatorName, COALESCE(NULLIF(a.academic_session, ''), s.academic_session) AS academicSession FROM attendance a JOIN students s ON s.student_id=a.student_id WHERE a.sync_status IN ('pending','error') ORDER BY a.scanned_at ASC LIMIT 500`).all();
    const teacherEvents = db.prepare(`SELECT a.id, 'teacher' AS entityType, a.employee_id AS employeeId, a.attendance_date AS date, a.check_in_at AS checkInAt, a.check_out_at AS checkOutAt, a.check_in_at AS scannedAt, a.source, a.operator_name AS operatorName FROM teacher_attendance a JOIN teachers t ON t.employee_id=a.employee_id WHERE a.sync_status IN ('pending','error') ORDER BY a.check_in_at ASC LIMIT 500`).all();
    const events=[...studentEvents,...teacherEvents].sort((a,b)=>String(a.scannedAt).localeCompare(String(b.scannedAt))).slice(0,500);
    return json(res,200,{events,count:events.length});
  }
  if (req.method === "POST" && url.pathname === "/api/attendance/sync-status") {
    const {results}=await readBody(req); if(!Array.isArray(results)||results.length>500)return json(res,400,{message:"Valid sync results chahiye."});
    const updateStudent=db.prepare("UPDATE attendance SET sync_status=?,synced_at=?,sync_error=? WHERE id=?"); const updateTeacher=db.prepare("UPDATE teacher_attendance SET sync_status=?,synced_at=?,sync_error=? WHERE id=?");
    const now=new Date().toISOString();db.exec("BEGIN");try{for(const result of results){const id=Number(result.id);if(!Number.isInteger(id))continue;const accepted=["synced","manual_override"].includes(result.status);(result.entityType==="teacher"?updateTeacher:updateStudent).run(accepted?"synced":"error",accepted?now:null,accepted?null:String(result.message||"Mongo sync failed").slice(0,500),id);}db.exec("COMMIT");}catch(error){db.exec("ROLLBACK");throw error;}
    return json(res,200,{message:"SQLite sync status update ho gaya."});
  }

  return false;
};

const server = createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    });
    return res.end();
  }
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (url.pathname.startsWith("/api/")) {
      if ((await api(req, res, url)) === false)
        json(res, 404, { message: "API route nahi mili." });
      return;
    }
    await serveFrontend(res, url.pathname, json);
  } catch (error) {
    console.error(error);
    json(res, 500, { message: "Server error. Dobara koshish karein." });
  }
});

const port = Number(process.env.BACKEND_PORT || process.env.PORT || 4173);
server.listen(port, "0.0.0.0", () =>
  console.log(`SIRF ID Attendance: http://0.0.0.0:${port}`),
);

