import React, { useEffect, useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import SectionCard from "../components/SectionCard";
import InfoCard from "../components/InfoCard";
import FormInput from "../components/FormInput";
import PrimaryButton from "../components/PrimaryButton";
import RoleBadge from "../components/RoleBadge";
import { theme } from "../constants/theme";
import { addFeedback, getCoursesForRole, getRecentReportsFiltered, getRoleSummary, submitRating } from "../services/firestore";
import { exportRowsToExcel } from "../utils/reportExport";
import { roleLabels } from "../utils/roles";

export default function PrincipalLecturerScreen({ profile, user, onLogout }) {
  const [summary, setSummary] = useState({
    activeCourses: 0,
    reportsSubmitted: 0,
    averageAttendance: 0,
    averageRating: 0
  });
  const [courses, setCourses] = useState([]);
  const [reports, setReports] = useState([]);
  const [feedbackForm, setFeedbackForm] = useState({ reportId: "", feedback: "" });
  const [rating, setRating] = useState({ className: "", score: "", feedback: "" });
  const [courseSearch, setCourseSearch] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [summaryData, coursesData, reportsData] = await Promise.all([
        getRoleSummary(user.uid, profile.role),
        getCoursesForRole(profile.role, profile.stream),
        getRecentReportsFiltered(20, { stream: profile.stream || undefined })
      ]);
      setSummary(summaryData);
      setCourses(coursesData);
      setReports(reportsData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard().catch(() => null);
  }, [profile.role, profile.stream, user.uid]);

  const saveFeedback = async () => {
    await addFeedback(feedbackForm.reportId, feedbackForm.feedback);
    setFeedbackForm({ reportId: "", feedback: "" });
    setMessage("Feedback added to lecture report.");
    await loadDashboard();
  };

  const saveRating = async () => {
    await submitRating({
      ...rating,
      ownerId: user.uid,
      role: profile.role,
      submittedByRole: "principal_lecturer",
      facultyName: profile.facultyName
    });
    setRating({ className: "", score: "", feedback: "" });
    setMessage("Rating saved.");
    await loadDashboard();
  };

  const filteredCourses = useMemo(
    () => courses.filter((course) => (
      `${course.courseName || ""} ${course.courseCode || ""} ${course.className || ""} ${course.assignedLecturer || ""}`
        .toLowerCase()
        .includes(courseSearch.toLowerCase())
    )),
    [courses, courseSearch]
  );

  const filteredReports = useMemo(
    () => reports.filter((report) => (
      `${report.courseName || ""} ${report.courseCode || ""} ${report.className || ""} ${report.weekOfReporting || ""}`
        .toLowerCase()
        .includes(reportSearch.toLowerCase())
    )),
    [reports, reportSearch]
  );

  const exportReports = async () => {
    await exportRowsToExcel("principal-lecturer-reports", filteredReports.map((report) => ({
      courseName: report.courseName || "",
      courseCode: report.courseCode || "",
      className: report.className || "",
      weekOfReporting: report.weekOfReporting || "",
      lectureDate: report.lectureDate || "",
      lecturerName: report.lecturerName || "",
      scheduledLectureTime: report.scheduledLectureTime || "",
      topicTaught: report.topicTaught || "",
      feedbackStatus: report.feedbackStatus || "Pending"
    })));
  };

  return (
    <ScreenContainer>
      <SectionCard title="Principal Lecturer" subtitle={profile.stream || profile.facultyName}>
        <RoleBadge label={roleLabels[profile.role]} />
        <Text style={styles.copy}>
          View all courses and lecturers in your stream, review reports, add feedback, monitor classes, and rate delivery.
        </Text>
        <PrimaryButton label={loading ? "Refreshing..." : "Refresh Dashboard"} onPress={loadDashboard} variant="secondary" />
        <PrimaryButton label="Logout" onPress={onLogout} variant="secondary" />
      </SectionCard>

      <SectionCard title="Dashboard Overview" subtitle="Principal Lecturer quick view">
        <View style={styles.row}>
          <InfoCard label="Courses In Stream" value={courses.length} tone="highlight" />
          <InfoCard label="Reports In View" value={reports.length} />
        </View>
        <View style={styles.row}>
          <InfoCard label="Reviewed Reports" value={reports.filter((item) => item.feedbackStatus === "Reviewed").length} />
          <InfoCard label="Pending Feedback" value={reports.filter((item) => item.feedbackStatus !== "Reviewed").length} />
        </View>
      </SectionCard>

      <View style={styles.row}>
        <InfoCard label="Stream Courses" value={courses.length} tone="highlight" />
        <InfoCard label="Reports Reviewed" value={summary.reportsSubmitted} />
      </View>
      <View style={styles.row}>
        <InfoCard label="Attendance Avg" value={summary.averageAttendance} />
        <InfoCard label="Rating Avg" value={summary.averageRating} />
      </View>

      <SectionCard title="Courses">
        <FormInput label="Search Courses" value={courseSearch} placeholder="Search module, class, lecturer, code" onChangeText={setCourseSearch} />
        {filteredCourses.length ? filteredCourses.map((course) => (
          <View key={course.id} style={styles.listItem}>
            <Text style={styles.listTitle}>{course.courseName} ({course.courseCode})</Text>
            <Text style={styles.listText}>Lecturer: {course.assignedLecturer || "Pending assignment"}</Text>
            <Text style={styles.listText}>Class: {course.className || "TBD"}</Text>
            <Text style={styles.listText}>Lecture Time: {course.lectureTime || "TBD"}</Text>
            <Text style={styles.listText}>Venue: {course.venue || "TBD"}</Text>
          </View>
        )) : <Text style={styles.copy}>No courses matched your search.</Text>}
      </SectionCard>

      <SectionCard title="Reports">
        <FormInput label="Search Reports" value={reportSearch} placeholder="Search module, class, week, code" onChangeText={setReportSearch} />
        <PrimaryButton label="Download Reports (Excel)" onPress={exportReports} variant="secondary" />
        {filteredReports.length ? filteredReports.map((report) => (
          <View key={report.id} style={styles.listItem}>
            <Text style={styles.listTitle}>{report.courseName} - {report.weekOfReporting}</Text>
            <Text style={styles.listText}>Lecturer: {report.lecturerName}</Text>
            <Text style={styles.listText}>Class: {report.className || "TBD"}</Text>
            <Text style={styles.listText}>Lecture Time: {report.scheduledLectureTime || "TBD"}</Text>
            <Text style={styles.listText}>Topic: {report.topicTaught}</Text>
            <Text style={styles.listText}>Status: {report.feedbackStatus || "Pending"}</Text>
          </View>
        )) : <Text style={styles.copy}>No reports matched your search.</Text>}
      </SectionCard>

      <SectionCard title="Add Feedback to Report">
        <FormInput label="Report ID" value={feedbackForm.reportId} placeholder="Tap a report below or type report id" onChangeText={(value) => setFeedbackForm((current) => ({ ...current, reportId: value }))} />
        <View style={styles.selectionRow}>
          {filteredReports.slice(0, 6).map((report) => (
            <Pressable
              key={report.id}
              style={[styles.selectionChip, feedbackForm.reportId === report.id ? styles.selectionChipActive : null]}
              onPress={() => setFeedbackForm((current) => ({ ...current, reportId: report.id }))}
            >
              <Text style={[styles.selectionText, feedbackForm.reportId === report.id ? styles.selectionTextActive : null]} numberOfLines={1}>
                {report.courseCode || report.courseName || "Report"} ({(report.weekOfReporting || "Week").toString()})
              </Text>
            </Pressable>
          ))}
        </View>
        <FormInput label="Feedback" value={feedbackForm.feedback} placeholder="Write PRL feedback on this report" multiline onChangeText={(value) => setFeedbackForm((current) => ({ ...current, feedback: value }))} />
        <PrimaryButton label="Submit Feedback" onPress={saveFeedback} />
      </SectionCard>

      <SectionCard title="Monitoring and Rating">
        <View style={styles.selectionRow}>
          {courses.slice(0, 8).map((course) => (
            <Pressable
              key={course.id}
              style={[styles.selectionChip, rating.className === course.className ? styles.selectionChipActive : null]}
              onPress={() => setRating((current) => ({ ...current, className: course.className || current.className }))}
            >
              <Text style={[styles.selectionText, rating.className === course.className ? styles.selectionTextActive : null]} numberOfLines={1}>
                {course.className || course.courseCode || "Class"} - {course.lectureTime || "TBD"}
              </Text>
            </Pressable>
          ))}
        </View>
        <FormInput label="Class / Course Name" value={rating.className} placeholder="Select above or type manually" onChangeText={(value) => setRating((current) => ({ ...current, className: value }))} />
        <FormInput label="Score (1-5)" value={rating.score} placeholder="5" keyboardType="numeric" onChangeText={(value) => setRating((current) => ({ ...current, score: value }))} />
        <FormInput label="Observation" value={rating.feedback} placeholder="Monitoring notes for this class" multiline onChangeText={(value) => setRating((current) => ({ ...current, feedback: value }))} />
        <PrimaryButton label="Save Rating" onPress={saveRating} />
        {message ? <Text style={styles.success}>{message}</Text> : null}
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
  selectionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs
  },
  selectionChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 10,
    paddingVertical: 8,
    backgroundColor: theme.colors.white,
    maxWidth: "100%"
  },
  selectionChipActive: {
    backgroundColor: "#dcfce7",
    borderColor: "#86efac"
  },
  selectionText: {
    color: theme.colors.text,
    fontWeight: "600"
  },
  selectionTextActive: {
    color: theme.colors.success
  },
  success: {
    color: theme.colors.success,
    fontWeight: "700"
  }
});
