import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "firebase/firestore";
import { db } from "./firebase";

const collections = {
  users: "users",
  reports: "reports",
  courses: "courses",
  attendance: "attendance",
  ratings: "ratings",
  reportFeedback: "reportFeedback",
  classRegistry: "classRegistry"
};

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

  return 0;
}

export async function createUserProfile(uid, payload) {
  await setDoc(doc(db, collections.users, uid), {
    ...payload,
    createdAt: serverTimestamp()
  });
}

export async function getUserProfile(uid) {
  const snapshot = await getDoc(doc(db, collections.users, uid));
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

export async function saveCourse(course) {
  const courseCode = course.courseCode.trim().toUpperCase();
  await setDoc(doc(db, collections.courses, courseCode), {
    ...course,
    courseCode,
    updatedAt: serverTimestamp()
  }, { merge: true });
}

export async function getCoursesForRole(role, stream) {
  if (role === "principal_lecturer" && stream) {
    const streamQuery = query(
      collection(db, collections.courses),
      where("stream", "==", stream)
    );
    const snapshots = await getDocs(streamQuery);
    return snapshots.docs
      .map((item) => ({ id: item.id, ...item.data() }))
      .sort((a, b) => getTimestampValue(b.updatedAt) - getTimestampValue(a.updatedAt));
  }

  const snapshots = await getDocs(query(collection(db, collections.courses), orderBy("updatedAt", "desc")));
  return snapshots.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function submitLectureReport(report) {
  const registryId = `${report.className}-${report.courseCode}`.replace(/\s+/g, "_").toLowerCase();

  await setDoc(doc(db, collections.classRegistry, registryId), {
    className: report.className,
    courseCode: report.courseCode,
    totalRegisteredStudents: Number(report.totalRegisteredStudents),
    venue: report.venue,
    updatedAt: serverTimestamp()
  }, { merge: true });

  const payload = {
    ...report,
    actualStudentsPresent: Number(report.actualStudentsPresent),
    totalRegisteredStudents: Number(report.totalRegisteredStudents),
    createdAt: serverTimestamp(),
    feedbackStatus: "Pending"
  };

  const response = await addDoc(collection(db, collections.reports), payload);
  return response.id;
}

export async function getStoredRegisteredStudents(className, courseCode) {
  const registryId = `${className}-${courseCode}`.replace(/\s+/g, "_").toLowerCase();
  const snapshot = await getDoc(doc(db, collections.classRegistry, registryId));
  return snapshot.exists() ? snapshot.data().totalRegisteredStudents : "";
}

export async function submitAttendance(entry) {
  await addDoc(collection(db, collections.attendance), {
    ...entry,
    presentCount: Number(entry.presentCount),
    createdAt: serverTimestamp()
  });
}

export async function submitRating(entry) {
  await addDoc(collection(db, collections.ratings), {
    ...entry,
    score: Number(entry.score),
    createdAt: serverTimestamp()
  });
}

export async function addFeedback(reportId, feedback) {
  await addDoc(collection(db, collections.reportFeedback), {
    reportId,
    feedback,
    createdAt: serverTimestamp()
  });

  await updateDoc(doc(db, collections.reports, reportId), {
    feedbackStatus: "Reviewed",
    feedbackUpdatedAt: serverTimestamp()
  });
}

export async function getRecentReports(limitCount = 10) {
  const q = query(collection(db, collections.reports), limit(50));
  const snapshots = await getDocs(q);
  return snapshots.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt))
    .slice(0, limitCount);
}

export async function getRecentReportsByOwner(uid, limitCount = 10) {
  const q = query(
    collection(db, collections.reports),
    where("ownerId", "==", uid),
    limit(50)
  );
  const snapshots = await getDocs(q);
  return snapshots.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt))
    .slice(0, limitCount);
}

export async function getRecentAttendanceByOwner(uid, limitCount = 10) {
  const q = query(
    collection(db, collections.attendance),
    where("ownerId", "==", uid),
    limit(50)
  );
  const snapshots = await getDocs(q);
  return snapshots.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt))
    .slice(0, limitCount);
}

export async function getRecentRatingsByOwner(uid, limitCount = 10) {
  const q = query(
    collection(db, collections.ratings),
    where("ownerId", "==", uid),
    limit(50)
  );
  const snapshots = await getDocs(q);
  return snapshots.docs
    .map((item) => ({ id: item.id, ...item.data() }))
    .sort((a, b) => getTimestampValue(b.createdAt) - getTimestampValue(a.createdAt))
    .slice(0, limitCount);
}

export async function getRoleSummary(uid, role) {
  const [courses, reports, attendanceEntries, ratings] = await Promise.all([
    getCoursesForRole(role),
    getDocs(query(collection(db, collections.reports), where("ownerId", "==", uid))),
    getDocs(query(collection(db, collections.attendance), where("ownerId", "==", uid))),
    getDocs(query(collection(db, collections.ratings), where("ownerId", "==", uid)))
  ]);

  const attendanceValues = attendanceEntries.docs.map((item) => Number(item.data().presentCount || 0));
  const ratingValues = ratings.docs.map((item) => Number(item.data().score || 0));

  return {
    activeCourses: courses.length,
    reportsSubmitted: reports.size,
    averageAttendance: attendanceValues.length
      ? Math.round(attendanceValues.reduce((sum, value) => sum + value, 0) / attendanceValues.length)
      : 0,
    averageRating: ratingValues.length
      ? (ratingValues.reduce((sum, value) => sum + value, 0) / ratingValues.length).toFixed(1)
      : 0
  };
}
