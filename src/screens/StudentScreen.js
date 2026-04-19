import React, { useEffect, useState } from "react";
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
  getRecentAttendanceByOwner,
  getRecentRatingsByOwner,
  submitAttendance,
  submitRating,
  getRoleSummary
} from "../services/firestore";
import { roleLabels } from "../utils/roles";

export default function StudentScreen({ profile, user, onLogout }) {
  const [summary, setSummary] = useState({
    activeCourses: 0,
    reportsSubmitted: 0,
    averageAttendance: 0,
    averageRating: 0
  });
  const [courses, setCourses] = useState([]);
  const [attendanceEntries, setAttendanceEntries] = useState([]);
  const [ratingEntries, setRatingEntries] = useState([]);
  const [attendance, setAttendance] = useState({ className: "", presentCount: "" });
  const [rating, setRating] = useState({ className: "", score: "", feedback: "" });
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [summaryData, coursesData, attendanceData, ratingData] = await Promise.all([
        getRoleSummary(user.uid, profile.role),
        getCoursesForRole(profile.role, profile.stream),
        getRecentAttendanceByOwner(user.uid, 6),
        getRecentRatingsByOwner(user.uid, 6)
      ]);
      setSummary(summaryData);
      setCourses(coursesData);
      setAttendanceEntries(attendanceData);
      setRatingEntries(ratingData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard().catch(() => null);
  }, [profile.role, profile.stream, user.uid]);

  const saveAttendance = async () => {
    await submitAttendance({
      ...attendance,
      ownerId: user.uid,
      role: profile.role,
      facultyName: profile.facultyName
    });
    setAttendance({ className: "", presentCount: "" });
    setMessage("Attendance record submitted.");
    await loadDashboard();
  };

  const saveRating = async () => {
    await submitRating({
      ...rating,
      ownerId: user.uid,
      role: profile.role,
      facultyName: profile.facultyName
    });
    setRating({ className: "", score: "", feedback: "" });
    setMessage("Class rating submitted.");
    await loadDashboard();
  };

  return (
    <ScreenContainer>
      <SectionCard title={`Hello, ${profile.fullName}`} subtitle={profile.facultyName}>
        <RoleBadge label={roleLabels[profile.role]} />
        <Text style={styles.copy}>
          Student module for login, monitoring, rating, and attendance tracking.
        </Text>
        <PrimaryButton label={loading ? "Refreshing..." : "Refresh Dashboard"} onPress={loadDashboard} variant="secondary" />
        <PrimaryButton label="Logout" onPress={onLogout} variant="secondary" />
      </SectionCard>

      <View style={styles.row}>
        <InfoCard label="Active Courses" value={summary.activeCourses} />
        <InfoCard label="Avg Attendance" value={summary.averageAttendance} tone="highlight" />
      </View>
      <View style={styles.row}>
        <InfoCard label="My Ratings" value={summary.averageRating} />
        <InfoCard label="Reports Logged" value={summary.reportsSubmitted} />
      </View>

      <SectionCard title="Monitoring">
        <Text style={styles.copy}>
          Students can monitor personal class engagement and help lecturers validate actual attendance.
        </Text>
      </SectionCard>

      <SectionCard title="Classes">
        {courses.length ? courses.map((course) => (
          <Pressable
            key={course.id}
            style={styles.listItem}
            onPress={() => {
              setAttendance((current) => ({ ...current, className: course.className || current.className }));
              setRating((current) => ({ ...current, className: course.className || current.className }));
            }}
          >
            <Text style={styles.listTitle}>{course.className || "Class"} - {course.courseName} ({course.courseCode})</Text>
            <Text style={styles.listText}>Lecture Time: {course.lectureTime || "TBD"}</Text>
            <Text style={styles.listText}>Venue: {course.venue || "TBD"}</Text>
          </Pressable>
        )) : <Text style={styles.copy}>No classes listed yet.</Text>}
      </SectionCard>

      <SectionCard title="Attendance">
        <FormInput label="Class Name" value={attendance.className} placeholder="Select class above or type class name" onChangeText={(value) => setAttendance((current) => ({ ...current, className: value }))} />
        <FormInput label="Students Present" value={attendance.presentCount} placeholder="45" keyboardType="numeric" onChangeText={(value) => setAttendance((current) => ({ ...current, presentCount: value }))} />
        <PrimaryButton label="Save Attendance" onPress={saveAttendance} />
      </SectionCard>

      <SectionCard title="Rating">
        <FormInput label="Class Name" value={rating.className} placeholder="Select class above or type class name" onChangeText={(value) => setRating((current) => ({ ...current, className: value }))} />
        <FormInput label="Score (1-5)" value={rating.score} placeholder="4" keyboardType="numeric" onChangeText={(value) => setRating((current) => ({ ...current, score: value }))} />
        <FormInput label="Feedback" value={rating.feedback} placeholder="Your class feedback" multiline onChangeText={(value) => setRating((current) => ({ ...current, feedback: value }))} />
        <PrimaryButton label="Submit Rating" onPress={saveRating} />
        {message ? <Text style={styles.success}>{message}</Text> : null}
      </SectionCard>

      <SectionCard title="Recently Inserted Attendance">
        {attendanceEntries.length ? attendanceEntries.map((entry) => (
          <View key={entry.id} style={styles.listItem}>
            <Text style={styles.listTitle}>{entry.className || "Class"}</Text>
            <Text style={styles.listText}>Present: {entry.presentCount ?? "N/A"}</Text>
          </View>
        )) : <Text style={styles.copy}>No attendance entries yet.</Text>}
      </SectionCard>

      <SectionCard title="Recently Inserted Ratings">
        {ratingEntries.length ? ratingEntries.map((entry) => (
          <View key={entry.id} style={styles.listItem}>
            <Text style={styles.listTitle}>{entry.className || "Class"}</Text>
            <Text style={styles.listText}>Score: {entry.score ?? "N/A"}</Text>
            <Text style={styles.listText}>Feedback: {entry.feedback || "N/A"}</Text>
          </View>
        )) : <Text style={styles.copy}>No ratings yet.</Text>}
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
