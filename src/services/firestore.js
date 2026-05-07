import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  enableIndexedDbPersistence,
  connectFirestoreEmulator
} from "firebase/firestore";
import { db, isFirebaseReady, getInitializationStatus } from "./firebase";

const DEBUG = true;

function log(message, type = "INFO") {
  if (DEBUG) {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] [Firestore-Service] [${type}] ${message}`);
  }
}

function logError(message, error) {
  console.error(`[${new Date().toISOString()}] [Firestore-Service] [ERROR] ${message}`);
  if (error) {
    console.error(`[${new Date().toISOString()}] [Firestore-Service] [ERROR DETAILS]`, {
      message: error.message,
      code: error.code,
      stack: error.stack
    });
  }
}

const collections = {
  users: "users",
  reports: "reports",
  courses: "courses",
  attendance: "attendance",
  ratings: "ratings",
  reportFeedback: "reportFeedback",
  classRegistry: "classRegistry"
};

let persistenceEnabled = false;

async function enableOfflinePersistence() {
  if (!persistenceEnabled && db) {
    try {
      log("Attempting to enable offline persistence...");
      await enableIndexedDbPersistence(db);
      persistenceEnabled = true;
      log(" Offline persistence enabled successfully");
    } catch (err) {
      if (err.code === 'failed-precondition') {
        logError("Offline persistence failed: Multiple tabs open. Persistence can only be enabled in one tab at a time.", err);
      } else if (err.code === 'unimplemented') {
        logError("Offline persistence failed: Browser doesn't support IndexedDB", err);
      } else {
        logError("Failed to enable offline persistence", err);
      }
    }
  }
}

if (typeof window !== 'undefined') {
  enableOfflinePersistence().catch(() => {});
}

function cleanPayload(payload) {
  const cleaned = {};
  const keys = Object.keys(payload);

  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    const value = payload[key];
    if (value !== undefined && value !== null) {
      cleaned[key] = value;
    }
  }

  return cleaned;
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeText(value) {
  return String(value || "").trim().toLowerCase();
}

function sameText(left, right) {
  return normalizeText(left) === normalizeText(right);
}

function getTimestampValue(value) {
  if (!value) {
    return 0;
  }

  if (typeof value.toMillis === "function") {
    return value.toMillis();
  }

  if (typeof value === "number") {
    return value;
  }

  if (value && typeof value === "object" && value.seconds) {
    return value.seconds * 1000;
  }

  return 0;
}

function buildRegistryId(className, courseCode) {
  return `${className || ""}-${courseCode || ""}`
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function applyFilters(items, options = {}) {
  const {
    ownerId,
    facultyName,
    stream,
    className,
    courseCode,
    submittedByRole
  } = options;

  return items.filter((item) => {
    if (ownerId && item.ownerId !== ownerId) {
      return false;
    }

    if (facultyName && !sameText(item.facultyName, facultyName)) {
      return false;
    }

    if (stream && !sameText(item.stream, stream)) {
      return false;
    }

    if (className && !sameText(item.className, className)) {
      return false;
    }

    if (courseCode && !sameText(item.courseCode, courseCode)) {
      return false;
    }

    if (submittedByRole && !sameText(item.submittedByRole, submittedByRole)) {
      return false;
    }

    return true;
  });
}

function handleOfflineError(error, operationName) {
  if (error.code === 'unavailable' || error.message?.includes('offline') || error.message?.includes('network')) {
    logError(`Operation "${operationName}" failed due to network/offline issue`, error);
    throw new Error(`Unable to ${operationName} while offline. Please check your internet connection and try again.`);
  }
  throw error;
}

export async function createUserProfile(uid, payload) {
  log(`Creating user profile for UID: ${uid}`);
  try {
    await setDoc(doc(db, collections.users, uid), cleanPayload({
      ...payload,
      createdAt: serverTimestamp()
    }));
    log(` User profile created successfully for: ${uid}`);
  } catch (error) {
    logError(`Failed to create user profile for: ${uid}`, error);
    handleOfflineError(error, "create user profile");
  }
}

export async function getUserProfile(uid) {
  log(`Fetching user profile for UID: ${uid}`);
  try {
    const snapshot = await getDoc(doc(db, collections.users, uid));
    if (snapshot.exists()) {
      log(` User profile found for: ${uid}`);
      return { id: snapshot.id, ...snapshot.data() };
    } else {
      log(` No user profile found for: ${uid}`);
      return null;
    }
  } catch (error) {
    logError(`Failed to fetch user profile for: ${uid}`, error);
    handleOfflineError(error, "fetch user profile");
    return null;
  }
}

export async function saveCourse(course) {
  log(`Saving course: ${course.courseCode}`);
  try {
    const courseCode = course.courseCode.trim().toUpperCase();
    await setDoc(doc(db, collections.courses, courseCode), cleanPayload({
      ...course,
      courseCode,
      updatedAt: serverTimestamp()
    }), { merge: true });
    log(` Course saved successfully: ${courseCode}`);
  } catch (error) {
    logError(`Failed to save course: ${course.courseCode}`, error);
    handleOfflineError(error, "save course");
  }
}

export async function updateCourse(courseId, updates) {
  log(`Updating course: ${courseId}`);
  try {
    await updateDoc(doc(db, collections.courses, courseId), cleanPayload({
      ...updates,
      updatedAt: serverTimestamp()
    }));
    log(` Course updated successfully: ${courseId}`);
  } catch (error) {
    logError(`Failed to update course: ${courseId}`, error);
    handleOfflineError(error, "update course");
    throw error;
  }
}

export async function deleteCourse(courseId) {
  log(`Deleting course: ${courseId}`);
  try {
    await deleteDoc(doc(db, collections.courses, courseId));
    log(` Course deleted successfully: ${courseId}`);
  } catch (error) {
    logError(`Failed to delete course: ${courseId}`, error);
    handleOfflineError(error, "delete course");
    throw error;
  }
}

export async function getCoursesForRole(role, stream, facultyName) {
  log(`Fetching courses for role: ${role}, stream: ${stream}, faculty: ${facultyName}`);
  try {
    const snapshots = await getDocs(query(collection(db, collections.courses), orderBy("updatedAt", "desc")));
    const allCourses = snapshots.docs.map((item) => ({ id: item.id, ...item.data() }));
    
    log(`Retrieved ${allCourses.length} total courses`);

    let filteredCourses = [];
    
    if (role === "principal_lecturer" && stream) {
      filteredCourses = allCourses.filter((course) => sameText(course.stream, stream));
      log(`Filtered to ${filteredCourses.length} courses for principal lecturer with stream: ${stream}`);
    } else if (role === "principal_lecturer" && facultyName) {
      filteredCourses = allCourses.filter((course) => sameText(course.facultyName, facultyName));
      log(`Filtered to ${filteredCourses.length} courses for principal lecturer with faculty: ${facultyName}`);
    } else if ((role === "program_leader" || role === "lecturer" || role === "student") && facultyName) {
      filteredCourses = allCourses.filter((course) => sameText(course.facultyName, facultyName));
      log(`Filtered to ${filteredCourses.length} courses for ${role} with faculty: ${facultyName}`);
    } else {
      filteredCourses = allCourses;
      log(`Returning all ${filteredCourses.length} courses for role: ${role}`);
    }
    
    return filteredCourses;
  } catch (error) {
    logError("Failed to get courses for role", error);
    handleOfflineError(error, "fetch courses");
    return [];
  }
}

export async function submitLectureReport(report) {
  log(`Submitting lecture report for class: ${report.className}, course: ${report.courseCode}`);
  
  try {
    const registryId = buildRegistryId(report.className, report.courseCode) || "default_registry";
    log(`Registry ID: ${registryId}`);

    await setDoc(doc(db, collections.classRegistry, registryId), {
      className: report.className,
      courseCode: report.courseCode,
      totalRegisteredStudents: toNumber(report.totalRegisteredStudents),
      venue: report.venue,
      updatedAt: serverTimestamp()
    }, { merge: true });
    
    log(" Class registry updated");

    const payload = cleanPayload({
      ...report,
      actualStudentsPresent: toNumber(report.actualStudentsPresent),
      totalRegisteredStudents: toNumber(report.totalRegisteredStudents),
      createdAt: serverTimestamp(),
      submittedByRole: "lecturer",
      feedbackStatus: "Pending",
      status: "submitted"
    });

    const response = await addDoc(collection(db, collections.reports), payload);
    log(` Lecture report submitted successfully with ID: ${response.id}`);
    
    return response.id;
  } catch (error) {
    logError("Failed to submit lecture report", error);
    handleOfflineError(error, "submit report");
    throw error;
  }
}

export async function getStoredRegisteredStudents(className, courseCode) {
  log(`Fetching registered students for class: ${className}, course: ${courseCode}`);
  
  if (!className || !courseCode) {
    log(" Missing className or courseCode, returning empty string");
    return "";
  }
  
  try {
    const registryId = buildRegistryId(className, courseCode);
    if (!registryId) {
      log(" Could not build registry ID, returning empty string");
      return "";
    }
    
    const snapshot = await getDoc(doc(db, collections.classRegistry, registryId));
    
    if (snapshot.exists()) {
      const totalStudents = snapshot.data().totalRegisteredStudents;
      log(` Found registered students: ${totalStudents}`);
      return totalStudents;
    } else {
      log(` No registry found for ID: ${registryId}`);
      return "";
    }
  } catch (error) {
    logError("Failed to get stored registered students", error);
    log(" Continuing with manual entry - auto-fill not available");
    return "";
  }
}

export async function submitAttendance(entry) {
  log(`Submitting attendance for class: ${entry.className}`);
  try {
    const docRef = await addDoc(collection(db, collections.attendance), cleanPayload({
      ...entry,
      presentCount: toNumber(entry.presentCount),
      submittedByRole: entry.submittedByRole || entry.role || "lecturer",
      createdAt: serverTimestamp()
    }));
    log(` Attendance submitted successfully with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    logError("Failed to submit attendance", error);
    handleOfflineError(error, "submit attendance");
    throw error;
  }
}

export async function submitRating(entry) {
  log(`Submitting rating for class: ${entry.className}, score: ${entry.score}`);
  try {
    const docRef = await addDoc(collection(db, collections.ratings), cleanPayload({
      ...entry,
      score: toNumber(entry.score),
      submittedByRole: entry.submittedByRole || entry.role || "student",
      createdAt: serverTimestamp()
    }));
    log(` Rating submitted successfully with ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    logError("Failed to submit rating", error);
    handleOfflineError(error, "submit rating");
    throw error;
  }
}

export async function addFeedback(reportId, feedback) {
  log(`Adding feedback for report: ${reportId}`);
  try {
    await addDoc(collection(db, collections.reportFeedback), cleanPayload({
      reportId,
      feedback,
      createdAt: serverTimestamp()
    }));

    await updateDoc(doc(db, collections.reports, reportId), {
      feedbackStatus: "Reviewed",
      feedbackUpdatedAt: serverTimestamp()
    });
    
    log(` Feedback added successfully for report: ${reportId}`);
  } catch (error) {
    logError(`Failed to add feedback for report: ${reportId}`, error);
    handleOfflineError(error, "add feedback");
    throw error;
  }
}

export async function getRecentReports(limitCount = 10) {
  log(`Fetching recent reports (limit: ${limitCount})`);
  try {
    const q = query(collection(db, collections.reports), limit(50));
    const snapshots = await getDocs(q);
    const reports = snapshots.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt))
      .slice(0, limitCount);
    
    log(` Retrieved ${reports.length} recent reports`);
    return reports;
  } catch (error) {
    logError("Failed to get recent reports", error);
    handleOfflineError(error, "fetch reports");
    return [];
  }
}

export async function getRecentReportsFiltered(limitCount = 10, options = {}) {
  log(`Fetching filtered reports (limit: ${limitCount})`);
  try {
    const q = query(collection(db, collections.reports), limit(200));
    const snapshots = await getDocs(q);
    const filtered = applyFilters(
      snapshots.docs.map((item) => ({ id: item.id, ...item.data() })),
      options
    )
      .sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt))
      .slice(0, limitCount);
    
    log(` Retrieved ${filtered.length} filtered reports`);
    return filtered;
  } catch (error) {
    logError("Failed to get filtered reports", error);
    handleOfflineError(error, "fetch filtered reports");
    return [];
  }
}

export async function getRecentReportsByOwner(uid, limitCount = 10) {
  log(`Fetching reports for owner: ${uid} (limit: ${limitCount})`);
  try {
    const q = query(
      collection(db, collections.reports),
      where("ownerId", "==", uid),
      limit(50)
    );
    const snapshots = await getDocs(q);
    const reports = snapshots.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt))
      .slice(0, limitCount);
    
    log(` Retrieved ${reports.length} reports for owner: ${uid}`);
    return reports;
  } catch (error) {
    logError(`Failed to get reports for owner: ${uid}`, error);
    handleOfflineError(error, "fetch owner reports");
    return [];
  }
}

export async function getRecentAttendanceByOwner(uid, limitCount = 10) {
  log(`Fetching attendance for owner: ${uid} (limit: ${limitCount})`);
  try {
    const q = query(
      collection(db, collections.attendance),
      where("ownerId", "==", uid),
      limit(50)
    );
    const snapshots = await getDocs(q);
    const attendance = snapshots.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt))
      .slice(0, limitCount);
    
    log(` Retrieved ${attendance.length} attendance records for owner: ${uid}`);
    return attendance;
  } catch (error) {
    logError(`Failed to get attendance for owner: ${uid}`, error);
    handleOfflineError(error, "fetch owner attendance");
    return [];
  }
}

export async function getRecentAttendance(limitCount = 10, options = {}) {
  log(`Fetching recent attendance (limit: ${limitCount})`);
  try {
    const q = query(collection(db, collections.attendance), limit(200));
    const snapshots = await getDocs(q);
    const filtered = applyFilters(
      snapshots.docs.map((item) => ({ id: item.id, ...item.data() })),
      options
    )
      .sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt))
      .slice(0, limitCount);
    
    log(` Retrieved ${filtered.length} attendance records`);
    return filtered;
  } catch (error) {
    logError("Failed to get recent attendance", error);
    handleOfflineError(error, "fetch attendance");
    return [];
  }
}

export async function getRecentRatingsByOwner(uid, limitCount = 10) {
  log(`Fetching ratings for owner: ${uid} (limit: ${limitCount})`);
  try {
    const q = query(
      collection(db, collections.ratings),
      where("ownerId", "==", uid),
      limit(50)
    );
    const snapshots = await getDocs(q);
    const ratings = snapshots.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt))
      .slice(0, limitCount);
    
    log(` Retrieved ${ratings.length} ratings for owner: ${uid}`);
    return ratings;
  } catch (error) {
    logError(`Failed to get ratings for owner: ${uid}`, error);
    handleOfflineError(error, "fetch owner ratings");
    return [];
  }
}

export async function getRecentRatings(limitCount = 10, options = {}) {
  log(`Fetching recent ratings (limit: ${limitCount})`);
  try {
    const q = query(collection(db, collections.ratings), limit(200));
    const snapshots = await getDocs(q);
    const filtered = applyFilters(
      snapshots.docs.map((item) => ({ id: item.id, ...item.data() })),
      options
    )
      .sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt))
      .slice(0, limitCount);
    
    log(` Retrieved ${filtered.length} ratings`);
    return filtered;
  } catch (error) {
    logError("Failed to get recent ratings", error);
    handleOfflineError(error, "fetch ratings");
    return [];
  }
}

export async function getRoleSummary(uid, role, options = {}) {
  log(`Generating role summary for UID: ${uid}, Role: ${role}`);
  
  const stream = options.stream || "";
  const facultyName = options.facultyName || "";
  let reportFilters = {};
  let attendanceFilters = {};
  let ratingFilters = {};

  if (role === "lecturer") {
    reportFilters = { ownerId: uid };
    attendanceFilters = { ownerId: uid };
    ratingFilters = { ownerId: uid };
    log("Using lecturer filters (owner-based)");
  } else if (role === "student") {
    reportFilters = { ownerId: uid };
    attendanceFilters = { facultyName, submittedByRole: "lecturer" };
    ratingFilters = { ownerId: uid, submittedByRole: "student" };
    log("Using student filters");
  } else if (role === "principal_lecturer") {
    reportFilters = stream ? { stream } : { facultyName };
    attendanceFilters = stream ? { stream, submittedByRole: "lecturer" } : { facultyName, submittedByRole: "lecturer" };
    ratingFilters = stream ? { stream } : { facultyName };
    log(`Using principal lecturer filters - Stream: ${stream || 'N/A'}, Faculty: ${facultyName || 'N/A'}`);
  } else if (role === "program_leader") {
    reportFilters = { facultyName };
    attendanceFilters = { facultyName, submittedByRole: "lecturer" };
    ratingFilters = { facultyName };
    log(`Using program leader filters - Faculty: ${facultyName}`);
  } else {
    reportFilters = { ownerId: uid };
    attendanceFilters = { ownerId: uid };
    ratingFilters = { ownerId: uid };
    log("Using default filters (owner-based)");
  }

  try {
    const [courses, reports, attendanceEntries, ratings] = await Promise.all([
      getCoursesForRole(role, stream, facultyName),
      getRecentReportsFiltered(200, reportFilters),
      getRecentAttendance(200, attendanceFilters),
      getRecentRatings(200, ratingFilters)
    ]);

    const attendanceValues = attendanceEntries.map((item) => toNumber(item.presentCount));
    const ratingValues = ratings.map((item) => toNumber(item.score));
    
    const summary = {
      activeCourses: courses.length,
      reportsSubmitted: reports.length,
      averageAttendance: attendanceValues.length
        ? Math.round(attendanceValues.reduce((sum, value) => sum + value, 0) / attendanceValues.length)
        : 0,
      averageRating: ratingValues.length
        ? (ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length).toFixed(1)
        : 0
    };
    
    log(` Role summary generated: Active Courses: ${summary.activeCourses}, Reports: ${summary.reportsSubmitted}`);
    return summary;
  } catch (error) {
    logError("Failed to generate role summary", error);
    throw error;
  }
}

export async function checkFirestoreHealth() {
  log("Checking Firestore health...");
  
  if (!isFirebaseReady()) {
    const status = getInitializationStatus();
    logError(`Firebase not ready: ${JSON.stringify(status)}`);
    return { healthy: false, error: "Firebase not initialized", status };
  }
  
  try {
    const testCollection = collection(db, '_health');
    const testDoc = await addDoc(testCollection, {
      test: true,
      timestamp: serverTimestamp()
    });
    
    await updateDoc(doc(db, '_health', testDoc.id), {
      updated: true,
      checkedAt: serverTimestamp()
    });
    
    await getDoc(doc(db, '_health', testDoc.id));
    
    await setDoc(doc(db, '_health', testDoc.id), { deleted: true });
    
    log(" Firestore health check passed");
    return { healthy: true };
  } catch (error) {
    logError("Firestore health check failed", error);
    return { healthy: false, error: error.message };
  }
}

log("Firestore service module loaded");
log(`Collections configured: ${Object.keys(collections).join(", ")}`);
