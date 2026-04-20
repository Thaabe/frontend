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
  getRecentReportsByOwner,
  getRoleSummary,
  getStoredRegisteredStudents,
  submitAttendance,
  submitLectureReport,
  submitRating
} from "../services/firestore";
import { exportRowsToExcel } from "../utils/reportExport";
import { roleLabels } from "../utils/roles";

const initialReport = (profile) => ({
  facultyName: profile.facultyName || "",
  className: "",
  weekOfReporting: "",
  lectureDate: "",
  courseName: "",
  courseCode: "",
  lecturerName: profile.fullName || "",
  actualStudentsPresent: "",
  totalRegisteredStudents: "",
  venue: "",
  scheduledLectureTime: "",
  topicTaught: "",
  learningOutcomes: "",
  recommendations: ""
});

export default function LecturerScreen({ profile, user, onLogout }) {
  const [summary, setSummary] = useState({
    activeCourses: 0,
    reportsSubmitted: 0,
    averageAttendance: 0,
    averageRating: 0
  });
  const [report, setReport] = useState(initialReport(profile));
  const [courses, setCourses] = useState([]);
  const [myReports, setMyReports] = useState([]);
  const [attendance, setAttendance] = useState({ className: "", presentCount: "" });
  const [rating, setRating] = useState({ className: "", score: "", feedback: "" });
  const [classSearch, setClassSearch] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [submittingReport, setSubmittingReport] = useState(false);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [summaryData, coursesData, reportsData] = await Promise.all([
        getRoleSummary(user.uid, profile.role),
        getCoursesForRole(profile.role, profile.stream),
        getRecentReportsByOwner(user.uid, 6)
      ]);
      setSummary(summaryData);
      setCourses(coursesData);
      setMyReports(reportsData);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard().catch(() => null);
  }, [profile.role, profile.stream, user.uid]);

  useEffect(() => {
    const fetchRegisteredStudents = async () => {
      if (!report.className || !report.courseCode) {
        return;
      }

      const storedValue = await getStoredRegisteredStudents(report.className, report.courseCode);
      if (storedValue) {
        setReport((current) => ({
          ...current,
          totalRegisteredStudents: String(storedValue)
        }));
      }
    };

    fetchRegisteredStudents().catch(() => null);
  }, [report.className, report.courseCode]);

  const updateReport = (key, value) => {
    setReport((current) => ({ ...current, [key]: value }));
  };

  const applyCourseToReport = (course) => {
    setReport((current) => ({
      ...current,
      facultyName: profile.facultyName || current.facultyName,
      className: course.className || current.className,
      courseName: course.courseName || current.courseName,
      courseCode: course.courseCode || current.courseCode,
      lecturerName: course.assignedLecturer || profile.fullName || current.lecturerName,
      venue: course.venue || current.venue,
      scheduledLectureTime: course.lectureTime || current.scheduledLectureTime
    }));
    setAttendance((current) => ({
      ...current,
      className: course.className || current.className
    }));
    setRating((current) => ({
      ...current,
      className: course.className || course.courseName || current.className
    }));
  };

  const saveReport = async () => {
    if (!report.className.trim() || !report.courseName.trim() || !report.courseCode.trim()) {
      setError("Class Name, Course Name, and Course Code are required.");
      setMessage("");
      return;
    }

    setSubmittingReport(true);
    setError("");
    setMessage("");
    try {
      await submitLectureReport({
        ...report,
        ownerId: user.uid,
        stream: profile.stream || "",
        submittedByRole: "lecturer"
      });
      setReport(initialReport(profile));
      setMessage("Lecture report saved successfully.");
      await loadDashboard();
    } catch (submitError) {
      setError(submitError?.message || "Failed to submit report.");
    } finally {
      setSubmittingReport(false);
    }
  };

  const saveAttendance = async () => {
    await submitAttendance({
      ...attendance,
      ownerId: user.uid,
      role: profile.role,
      submittedByRole: "lecturer",
      facultyName: profile.facultyName
    });
    setAttendance({ className: "", presentCount: "" });
    setMessage("Student attendance saved.");
    await loadDashboard();
  };

  const saveRating = async () => {
    await submitRating({
      ...rating,
      ownerId: user.uid,
      role: profile.role,
      submittedByRole: "lecturer",
      facultyName: profile.facultyName
    });
    setRating({ className: "", score: "", feedback: "" });
    setMessage("Monitoring rating submitted.");
    await loadDashboard();
  };

  const filteredCourses = useMemo(
    () => courses.filter((course) => (
      `${course.className || ""} ${course.courseName || ""} ${course.courseCode || ""}`
        .toLowerCase()
        .includes(classSearch.toLowerCase())
    )),
    [courses, classSearch]
  );

  const filteredReports = useMemo(
    () => myReports.filter((savedReport) => (
      `${savedReport.courseName || ""} ${savedReport.className || ""} ${savedReport.weekOfReporting || ""} ${savedReport.courseCode || ""}`
        .toLowerCase()
        .includes(reportSearch.toLowerCase())
    )),
    [myReports, reportSearch]
  );

  const exportMyReports = async () => {
    await exportRowsToExcel("lecturer-reports", filteredReports.map((savedReport) => ({
      facultyName: savedReport.facultyName || "",
      className: savedReport.className || "",
      weekOfReporting: savedReport.weekOfReporting || "",
      lectureDate: savedReport.lectureDate || "",
      courseName: savedReport.courseName || "",
      courseCode: savedReport.courseCode || "",
      lecturerName: savedReport.lecturerName || "",
      actualStudentsPresent: savedReport.actualStudentsPresent ?? "",
      totalRegisteredStudents: savedReport.totalRegisteredStudents ?? "",
      venue: savedReport.venue || "",
      scheduledLectureTime: savedReport.scheduledLectureTime || "",
      topicTaught: savedReport.topicTaught || "",
      learningOutcomes: savedReport.learningOutcomes || "",
      recommendations: savedReport.recommendations || ""
    })));
  };

  return (
    <ScreenContainer>
      <SectionCard title="Lecturer Dashboard" subtitle={profile.facultyName}>
        <RoleBadge label={roleLabels[profile.role]} />
        <Text style={styles.copy}>
          Manage classes, reports, monitoring, rating, and student attendance.
        </Text>
        <PrimaryButton label={loading ? "Refreshing..." : "Refresh Dashboard"} onPress={loadDashboard} variant="secondary" />
        <PrimaryButton label="Logout" onPress={onLogout} variant="secondary" />
      </SectionCard>

      <View style={styles.row}>
        <InfoCard label="Active Classes" value={summary.activeCourses} tone="highlight" />
        <InfoCard label="Reports Submitted" value={summary.reportsSubmitted} />
      </View>
      <View style={styles.row}>
        <InfoCard label="Attendance Avg" value={summary.averageAttendance} />
        <InfoCard label="Rating Avg" value={summary.averageRating} />
      </View>

      <SectionCard title="Classes" subtitle="Tap a class to auto-fill form fields and see time.">
        <FormInput label="Search Classes / Modules" value={classSearch} placeholder="Search class, module, code" onChangeText={setClassSearch} />
        {filteredCourses.length ? filteredCourses.map((course) => (
          <Pressable key={course.id} style={styles.listItem} onPress={() => applyCourseToReport(course)}>
            <Text style={styles.listTitle}>{course.className || "Class"} - {course.courseName} ({course.courseCode})</Text>
            <Text style={styles.listText}>Lecture Time: {course.lectureTime || "TBD"}</Text>
            <Text style={styles.listText}>Venue: {course.venue || "TBD"}</Text>
          </Pressable>
        )) : <Text style={styles.copy}>No classes found yet.</Text>}
      </SectionCard>

      <SectionCard title="Lecturer Reporting Form" subtitle="All assignment fields are captured below.">
        <FormInput label="Faculty Name" value={report.facultyName} placeholder="Faculty of ICT" onChangeText={(value) => updateReport("facultyName", value)} />
        <FormInput label="Class Name" value={report.className} placeholder="BCSMY3S2" onChangeText={(value) => updateReport("className", value)} />
        <FormInput label="Week of Reporting" value={report.weekOfReporting} placeholder="Week 5" onChangeText={(value) => updateReport("weekOfReporting", value)} />
        <FormInput label="Date of Lecture" value={report.lectureDate} placeholder="2026-04-19" onChangeText={(value) => updateReport("lectureDate", value)} />
        <FormInput label="Course Name" value={report.courseName} placeholder="Software Engineering" onChangeText={(value) => updateReport("courseName", value)} />
        <FormInput label="Course Code" value={report.courseCode} placeholder="SE301" onChangeText={(value) => updateReport("courseCode", value)} />
        <FormInput label="Lecturer's Name" value={report.lecturerName} placeholder="Lecturer full name" onChangeText={(value) => updateReport("lecturerName", value)} />
        <FormInput label="Actual Number of Students Present" value={report.actualStudentsPresent} placeholder="45" keyboardType="numeric" onChangeText={(value) => updateReport("actualStudentsPresent", value)} />
        <FormInput label="Total Registered Students" value={report.totalRegisteredStudents} placeholder="50" keyboardType="numeric" onChangeText={(value) => updateReport("totalRegisteredStudents", value)} />
        <FormInput label="Venue of the Class" value={report.venue} placeholder="Lab 2" onChangeText={(value) => updateReport("venue", value)} />
        <FormInput label="Scheduled Lecture Time" value={report.scheduledLectureTime} placeholder="10:00 - 12:00" onChangeText={(value) => updateReport("scheduledLectureTime", value)} />
        <FormInput label="Topic Taught" value={report.topicTaught} placeholder="Topic covered in lecture" multiline onChangeText={(value) => updateReport("topicTaught", value)} />
        <FormInput label="Learning Outcomes of the Topic" value={report.learningOutcomes} placeholder="What students should learn" multiline onChangeText={(value) => updateReport("learningOutcomes", value)} />
        <FormInput label="Lecturer Recommendations" value={report.recommendations} placeholder="Recommendations for improvement" multiline onChangeText={(value) => updateReport("recommendations", value)} />
        <PrimaryButton label={submittingReport ? "Submitting..." : "Submit Report"} onPress={saveReport} loading={submittingReport} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}
      </SectionCard>

      <SectionCard title="My Recently Submitted Reports">
        <FormInput label="Search Reports" value={reportSearch} placeholder="Search class, module, week, code" onChangeText={setReportSearch} />
        <PrimaryButton label="Download Reports (Excel)" onPress={exportMyReports} variant="secondary" />
        {filteredReports.length ? filteredReports.map((savedReport) => (
          <View key={savedReport.id} style={styles.listItem}>
            <Text style={styles.listTitle}>{savedReport.courseName || "Course"} - {savedReport.className || "Class"}</Text>
            <Text style={styles.listText}>Week: {savedReport.weekOfReporting || "N/A"}</Text>
            <Text style={styles.listText}>Lecture Time: {savedReport.scheduledLectureTime || "TBD"}</Text>
            <Text style={styles.listText}>Topic: {savedReport.topicTaught || "N/A"}</Text>
          </View>
        )) : <Text style={styles.copy}>No reports matched your search.</Text>}
      </SectionCard>

      <SectionCard title="Student Attendance">
        <FormInput label="Class Name" value={attendance.className} placeholder="BCSMY3S2" onChangeText={(value) => setAttendance((current) => ({ ...current, className: value }))} />
        <FormInput label="Present Count" value={attendance.presentCount} placeholder="45" keyboardType="numeric" onChangeText={(value) => setAttendance((current) => ({ ...current, presentCount: value }))} />
        <PrimaryButton label="Save Attendance" onPress={saveAttendance} />
      </SectionCard>

      <SectionCard title="Monitoring and Rating">
        <FormInput label="Class / Course Name" value={rating.className} placeholder="Class or course name" onChangeText={(value) => setRating((current) => ({ ...current, className: value }))} />
        <FormInput label="Score (1-5)" value={rating.score} placeholder="4" keyboardType="numeric" onChangeText={(value) => setRating((current) => ({ ...current, score: value }))} />
        <FormInput label="Monitoring Notes" value={rating.feedback} placeholder="Observations for this class" multiline onChangeText={(value) => setRating((current) => ({ ...current, feedback: value }))} />
        <PrimaryButton label="Save Monitoring Rating" onPress={saveRating} />
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
  success: {
    color: theme.colors.success,
    fontWeight: "700"
  },
  error: {
    color: theme.colors.danger,
    fontWeight: "700"
  }
});
