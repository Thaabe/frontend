import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import SectionCard from "../components/SectionCard";
import InfoCard from "../components/InfoCard";
import FormInput from "../components/FormInput";
import PrimaryButton from "../components/PrimaryButton";
import RoleBadge from "../components/RoleBadge";
import { theme } from "../constants/theme";
import {
  getCoursesForRole,
  getRecentAttendance,
  getRecentRatings,
  getRoleSummary,
  submitRating
} from "../services/firestore";
import { exportRowsToExcel } from "../utils/reportExport";
import { roleLabels } from "../utils/roles";

function includesText(value, query) {
  return String(value || "").toLowerCase().includes(query.toLowerCase());
}

export default function StudentScreen({ profile, user, onLogout }) {
  const [summary, setSummary] = useState({
    activeCourses: 0,
    reportsSubmitted: 0,
    averageAttendance: 0,
    averageRating: 0
  });
  const [courses, setCourses] = useState([]);
  const [attendanceEntries, setAttendanceEntries] = useState([]);
  const [monitoringEntries, setMonitoringEntries] = useState([]);
  const [myRatings, setMyRatings] = useState([]);
  const [rating, setRating] = useState({ className: "", score: "", feedback: "" });
  const [courseSearch, setCourseSearch] = useState("");
  const [attendanceSearch, setAttendanceSearch] = useState("");
  const [monitoringSearch, setMonitoringSearch] = useState("");
  const [ratingSearch, setRatingSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [summaryData, coursesData, lecturerAttendance, lecturerMonitoring, studentRatings] = await Promise.all([
        getRoleSummary(user.uid, profile.role),
        getCoursesForRole(profile.role, profile.stream),
        getRecentAttendance(20, { facultyName: profile.facultyName, submittedByRole: "lecturer" }),
        getRecentRatings(20, { facultyName: profile.facultyName, submittedByRole: "lecturer" }),
        getRecentRatings(20, { ownerId: user.uid, submittedByRole: "student" })
      ]);
      setSummary(summaryData);
      setCourses(coursesData);
      setAttendanceEntries(lecturerAttendance);
      setMonitoringEntries(lecturerMonitoring);
      setMyRatings(studentRatings);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard().catch(() => null);
  }, [profile.role, profile.stream, profile.facultyName, user.uid]);

  const filteredCourses = useMemo(
    () => courses.filter((course) => (
      includesText(course.className, courseSearch)
      || includesText(course.courseName, courseSearch)
      || includesText(course.courseCode, courseSearch)
    )),
    [courses, courseSearch]
  );

  const filteredAttendance = useMemo(
    () => attendanceEntries.filter((entry) => (
      includesText(entry.className, attendanceSearch)
      || includesText(entry.courseCode, attendanceSearch)
    )),
    [attendanceEntries, attendanceSearch]
  );

  const filteredMonitoring = useMemo(
    () => monitoringEntries.filter((entry) => (
      includesText(entry.className, monitoringSearch)
      || includesText(entry.feedback, monitoringSearch)
    )),
    [monitoringEntries, monitoringSearch]
  );

  const filteredMyRatings = useMemo(
    () => myRatings.filter((entry) => (
      includesText(entry.className, ratingSearch)
      || includesText(entry.feedback, ratingSearch)
    )),
    [myRatings, ratingSearch]
  );

  const saveRating = async () => {
    await submitRating({
      ...rating,
      ownerId: user.uid,
      role: profile.role,
      submittedByRole: "student",
      facultyName: profile.facultyName
    });
    setRating({ className: "", score: "", feedback: "" });
    setMessage("Class rating submitted.");
    await loadDashboard();
  };

  const exportStudentRatings = async () => {
    await exportRowsToExcel("student-ratings", filteredMyRatings.map((entry) => ({
      className: entry.className || "",
      score: entry.score ?? "",
      feedback: entry.feedback || "",
      facultyName: entry.facultyName || "",
      submittedByRole: entry.submittedByRole || "",
      createdAt: entry.createdAt?.toDate?.()?.toISOString?.() || ""
    })));
  };

  return (
    <ScreenContainer>
      <SectionCard title={`Hello, ${profile.fullName}`} subtitle={profile.facultyName}>
        <RoleBadge label={roleLabels[profile.role]} />
        <Text style={styles.copy}>
          Student module for login/register, monitoring view, attendance view, and rating submission.
        </Text>
        <PrimaryButton label={loading ? "Refreshing..." : "Refresh Dashboard"} onPress={loadDashboard} variant="secondary" />
        <PrimaryButton label="Logout" onPress={onLogout} variant="secondary" />
      </SectionCard>

      <View style={styles.row}>
        <InfoCard label="Active Courses" value={summary.activeCourses} />
        <InfoCard label="Attendance Avg" value={summary.averageAttendance} tone="highlight" />
      </View>
      <View style={styles.row}>
        <InfoCard label="My Rating Avg" value={summary.averageRating} />
        <InfoCard label="My Logs" value={summary.reportsSubmitted} />
      </View>

      <SectionCard title="Classes">
        <FormInput label="Search Classes / Modules" value={courseSearch} placeholder="Search by class, module, code" onChangeText={setCourseSearch} />
        {filteredCourses.length ? filteredCourses.map((course) => (
          <Pressable
            key={course.id}
            style={styles.listItem}
            onPress={() => {
              setRating((current) => ({ ...current, className: course.className || current.className }));
            }}
          >
            <Text style={styles.listTitle}>{course.className || "Class"} - {course.courseName} ({course.courseCode})</Text>
            <Text style={styles.listText}>Lecture Time: {course.lectureTime || "TBD"}</Text>
            <Text style={styles.listText}>Venue: {course.venue || "TBD"}</Text>
          </Pressable>
        )) : <Text style={styles.copy}>No classes matched your search.</Text>}
      </SectionCard>

      <SectionCard title="Attendance (Inserted By Lecturer)">
        <FormInput label="Search Attendance" value={attendanceSearch} placeholder="Search class or course code" onChangeText={setAttendanceSearch} />
        {filteredAttendance.length ? filteredAttendance.map((entry) => (
          <View key={entry.id} style={styles.listItem}>
            <Text style={styles.listTitle}>{entry.className || "Class"}</Text>
            <Text style={styles.listText}>Present Count: {entry.presentCount ?? "N/A"}</Text>
            <Text style={styles.listText}>Recorded By: {entry.submittedByRole || "lecturer"}</Text>
          </View>
        )) : <Text style={styles.copy}>No lecturer attendance records matched your search.</Text>}
      </SectionCard>

      <SectionCard title="Monitoring (Inserted By Lecturer)">
        <FormInput label="Search Monitoring" value={monitoringSearch} placeholder="Search class or monitoring notes" onChangeText={setMonitoringSearch} />
        {filteredMonitoring.length ? filteredMonitoring.map((entry) => (
          <View key={entry.id} style={styles.listItem}>
            <Text style={styles.listTitle}>{entry.className || "Class"}</Text>
            <Text style={styles.listText}>Score: {entry.score ?? "N/A"}</Text>
            <Text style={styles.listText}>Notes: {entry.feedback || "N/A"}</Text>
          </View>
        )) : <Text style={styles.copy}>No lecturer monitoring records matched your search.</Text>}
      </SectionCard>

      <SectionCard title="Rating (Student Input)">
        <FormInput label="Class Name" value={rating.className} placeholder="Select class above or type class name" onChangeText={(value) => setRating((current) => ({ ...current, className: value }))} />
        <FormInput label="Score (1-5)" value={rating.score} placeholder="4" keyboardType="numeric" onChangeText={(value) => setRating((current) => ({ ...current, score: value }))} />
        <FormInput label="Feedback" value={rating.feedback} placeholder="Your class feedback" multiline onChangeText={(value) => setRating((current) => ({ ...current, feedback: value }))} />
        <PrimaryButton label="Submit Rating" onPress={saveRating} />
        {message ? <Text style={styles.success}>{message}</Text> : null}
      </SectionCard>

      <SectionCard title="My Ratings">
        <FormInput label="Search My Ratings" value={ratingSearch} placeholder="Search class or feedback" onChangeText={setRatingSearch} />
        <PrimaryButton label="Download My Ratings (Excel)" onPress={exportStudentRatings} variant="secondary" />
        {filteredMyRatings.length ? filteredMyRatings.map((entry) => (
          <View key={entry.id} style={styles.listItem}>
            <Text style={styles.listTitle}>{entry.className || "Class"}</Text>
            <Text style={styles.listText}>Score: {entry.score ?? "N/A"}</Text>
            <Text style={styles.listText}>Feedback: {entry.feedback || "N/A"}</Text>
          </View>
        )) : <Text style={styles.copy}>No ratings matched your search.</Text>}
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  },
  copy: {
    color: theme.colors.text,
    lineHeight: 22
  },
  listItem: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    gap: 4
  },
  listTitle: {
    fontWeight: "700",
    color: theme.colors.primaryDark
  },
  listText: {
    color: theme.colors.text
  },
  success: {
    color: theme.colors.success,
    fontWeight: "700"
  }
});
