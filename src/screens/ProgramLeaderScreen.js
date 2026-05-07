import React, { useEffect, useState } from "react";
import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import SectionCard from "../components/SectionCard";
import FormInput from "../components/FormInput";
import PrimaryButton from "../components/PrimaryButton";
import DashboardHeader from "../components/DashboardHeader";
import DashboardStatCard from "../components/DashboardStatCard";
import { theme } from "../constants/theme";
import { deleteCourse, getCoursesForRole, getRecentReportsFiltered, getRoleSummary, saveCourse, submitRating, updateCourse } from "../services/firestore";
import { exportRowsToExcel } from "../utils/reportExport";
import { roleLabels } from "../utils/roles";

const initialCourse = {
  courseName: "",
  courseCode: "",
  className: "",
  stream: "",
  assignedLecturer: "",
  lectureTime: "",
  venue: ""
};

export default function ProgramLeaderScreen({ profile, user, onLogout }) {
  const dashboardTabs = ["Assign Course", "Classes", "Reports", "Rating"];
  const [summary, setSummary] = useState({
    activeCourses: 0,
    reportsSubmitted: 0,
    averageAttendance: 0,
    averageRating: 0
  });
  const [courseForm, setCourseForm] = useState(initialCourse);
  const [courses, setCourses] = useState([]);
  const [reports, setReports] = useState([]);
  const [rating, setRating] = useState({ className: "", score: "", feedback: "" });
  const [courseSearch, setCourseSearch] = useState("");
  const [reportSearch, setReportSearch] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("Assign Course");
  const [editingCourseId, setEditingCourseId] = useState("");

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [summaryData, coursesData, reportsData] = await Promise.all([
        getRoleSummary(user.uid, profile.role, { stream: profile.stream, facultyName: profile.facultyName }),
        getCoursesForRole(profile.role, profile.stream, profile.facultyName),
        getRecentReportsFiltered(20, { facultyName: profile.facultyName || undefined })
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

  const saveCourseData = async () => {
    setError("");
    setMessage("");

    if (!courseForm.courseName.trim() || !courseForm.courseCode.trim() || !courseForm.className.trim()) {
      setError("Course Name, Course Code and Class Name are required.");
      return;
    }

    try {
      if (editingCourseId) {
        await updateCourse(editingCourseId, {
          ...courseForm,
          ownerId: user.uid,
          facultyName: profile.facultyName,
          stream: courseForm.stream || profile.stream || ""
        });
      } else {
        await saveCourse({
          ...courseForm,
          ownerId: user.uid,
          facultyName: profile.facultyName,
          stream: courseForm.stream || profile.stream || ""
        });
      }
      setCourseForm(initialCourse);
      setEditingCourseId("");
      setMessage(editingCourseId ? "Course updated successfully." : "Course assigned successfully.");
      await loadDashboard();
    } catch (courseError) {
      setError(courseError && courseError.message ? courseError.message : "Failed to save course.");
    }
  };

  const startEditCourse = (course) => {
    setCourseForm({
      courseName: course.courseName || "",
      courseCode: course.courseCode || "",
      className: course.className || "",
      stream: course.stream || "",
      assignedLecturer: course.assignedLecturer || "",
      lectureTime: course.lectureTime || "",
      venue: course.venue || ""
    });
    setEditingCourseId(course.id);
    setActiveTab("Assign Course");
    setError("");
    setMessage("Edit mode enabled for selected class/module.");
  };

  const removeCourse = (course) => {
    Alert.alert(
      "Delete Class/Module",
      `Delete ${course.courseName || "this module"} (${course.courseCode || course.id})?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await deleteCourse(course.id);
              if (editingCourseId === course.id) {
                setEditingCourseId("");
                setCourseForm(initialCourse);
              }
              setMessage("Class/Module deleted successfully.");
              await loadDashboard();
            } catch (deleteError) {
              setError(deleteError && deleteError.message ? deleteError.message : "Failed to delete class/module.");
            }
          }
        }
      ]
    );
  };

  const saveRating = async () => {
    setError("");
    setMessage("");

    if (!rating.className.trim() || !rating.score.trim()) {
      setError("Class Name and Score are required.");
      return;
    }

    try {
      await submitRating({
        ...rating,
        ownerId: user.uid,
        role: profile.role,
        submittedByRole: "program_leader",
        facultyName: profile.facultyName,
        stream: profile.stream || ""
      });
      setRating({ className: "", score: "", feedback: "" });
      setMessage("Program rating saved.");
      await loadDashboard();
    } catch (ratingError) {
      setError(ratingError && ratingError.message ? ratingError.message : "Failed to save rating.");
    }
  };

  const filteredCourses = courses.filter((course) => (
      `${course.courseName || ""} ${course.courseCode || ""} ${course.className || ""} ${course.assignedLecturer || ""}`
        .toLowerCase()
        .includes(courseSearch.toLowerCase())
    ));

  const filteredReports = reports.filter((report) => (
      `${report.courseName || ""} ${report.courseCode || ""} ${report.className || ""} ${report.weekOfReporting || ""}`
        .toLowerCase()
        .includes(reportSearch.toLowerCase())
    ));

  const exportReports = async () => {
    await exportRowsToExcel("program-leader-reports", filteredReports.map((report) => ({
      facultyName: report.facultyName || "",
      courseName: report.courseName || "",
      courseCode: report.courseCode || "",
      className: report.className || "",
      weekOfReporting: report.weekOfReporting || "",
      lecturerName: report.lecturerName || "",
      lectureDate: report.lectureDate || "",
      scheduledLectureTime: report.scheduledLectureTime || "",
      recommendations: report.recommendations || "",
      feedbackStatus: report.feedbackStatus || "Pending"
    })));
  };

  const renderActiveTab = () => {
    if (activeTab === "Assign Course") {
      return (
        <SectionCard title="Courses and Lecturer Assignment">
          <FormInput label="Course Name" value={courseForm.courseName} onChangeText={(value) => setCourseForm((current) => ({ ...current, courseName: value }))} />
          <FormInput label="Course Code" value={courseForm.courseCode} onChangeText={(value) => setCourseForm((current) => ({ ...current, courseCode: value }))} />
          <FormInput label="Class Name" value={courseForm.className} onChangeText={(value) => setCourseForm((current) => ({ ...current, className: value }))} />
          <FormInput label="Stream" value={courseForm.stream} onChangeText={(value) => setCourseForm((current) => ({ ...current, stream: value }))} />
          <FormInput label="Assign Lecturer" value={courseForm.assignedLecturer} onChangeText={(value) => setCourseForm((current) => ({ ...current, assignedLecturer: value }))} />
          <FormInput label="Lecture Time" value={courseForm.lectureTime} onChangeText={(value) => setCourseForm((current) => ({ ...current, lectureTime: value }))} />
          <FormInput label="Venue" value={courseForm.venue} onChangeText={(value) => setCourseForm((current) => ({ ...current, venue: value }))} />
          <PrimaryButton label={editingCourseId ? "Update Course" : "Save Course"} onPress={saveCourseData} />
          {editingCourseId ? <PrimaryButton label="Cancel Edit" onPress={() => {
            setEditingCourseId("");
            setCourseForm(initialCourse);
            setMessage("Edit cancelled.");
            setError("");
          }} variant="secondary" /> : null}
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.success}>{message}</Text> : null}
        </SectionCard>
      );
    }

    if (activeTab === "Classes") {
      return (
        <SectionCard title="Classes and Lectures">
          <FormInput label="Search Courses" value={courseSearch} placeholder="Search module, class, lecturer, code" onChangeText={setCourseSearch} />
          {filteredCourses.length ? filteredCourses.map((course) => (
            <View key={course.id} style={styles.listItem}>
              <Text style={styles.listTitle}>{course.courseName} ({course.courseCode})</Text>
              <Text style={styles.listText}>Assigned Lecturer: {course.assignedLecturer || "Not assigned"}</Text>
              <Text style={styles.listText}>Lecture Time: {course.lectureTime || "TBD"}</Text>
              <Text style={styles.listText}>Venue: {course.venue || "TBD"}</Text>
              <View style={styles.actionRow}>
                <Pressable style={[styles.actionBtn, styles.editBtn]} onPress={() => startEditCourse(course)}>
                  <Text style={styles.actionText}>Update</Text>
                </Pressable>
                <Pressable style={[styles.actionBtn, styles.deleteBtn]} onPress={() => removeCourse(course)}>
                  <Text style={styles.actionText}>Delete</Text>
                </Pressable>
              </View>
            </View>
          )) : <Text style={styles.copy}>No courses matched your search.</Text>}
        </SectionCard>
      );
    }

    if (activeTab === "Reports") {
      return (
        <SectionCard title="Reports From PRL">
          <FormInput label="Search Reports" value={reportSearch} placeholder="Search module, class, week, code" onChangeText={setReportSearch} />
          <PrimaryButton label="Download Reports (Excel)" onPress={exportReports} variant="secondary" />
          {filteredReports.length ? filteredReports.map((report) => (
            <View key={report.id} style={styles.listItem}>
              <Text style={styles.listTitle}>{report.courseName} - {report.className}</Text>
              <Text style={styles.listText}>Week: {report.weekOfReporting}</Text>
              <Text style={styles.listText}>Lecture Time: {report.scheduledLectureTime || "TBD"}</Text>
              <Text style={styles.listText}>Recommendations: {report.recommendations}</Text>
            </View>
          )) : <Text style={styles.copy}>No reports matched your search.</Text>}
        </SectionCard>
      );
    }

    return (
      <SectionCard title="Monitoring and Rating">
        <FormInput label="Class / Course Name" value={rating.className} onChangeText={(value) => setRating((current) => ({ ...current, className: value }))} />
        <FormInput label="Score (1-5)" value={rating.score} keyboardType="numeric" onChangeText={(value) => setRating((current) => ({ ...current, score: value }))} />
        <FormInput label="Review Notes" value={rating.feedback} multiline onChangeText={(value) => setRating((current) => ({ ...current, feedback: value }))} />
        <PrimaryButton label="Save Rating" onPress={saveRating} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        {message ? <Text style={styles.success}>{message}</Text> : null}
      </SectionCard>
    );
  };

  return (
    <ScreenContainer>
      <DashboardHeader
        roleLabel={roleLabels[profile.role]}
        title="Program Leader Dashboard"
        subtitle={`${profile.facultyName || "Faculty"} - Manage courses and lecturer assignments`}
        loading={loading}
        onRefresh={loadDashboard}
        onLogout={onLogout}
      />

      <View style={styles.row}>
        <DashboardStatCard label="Managed Courses" value={courses.length} helper="Courses configured by PL" />
        <DashboardStatCard label="Reports Visible" value={reports.length} helper="Reports shared with PL" />
      </View>
      <View style={styles.row}>
        <DashboardStatCard label="Attendance Avg" value={summary.averageAttendance} helper="Aggregated attendance" />
        <DashboardStatCard label="Rating Avg" value={summary.averageRating} helper="Overall lecture ratings" />
      </View>

      <View style={styles.tabBarWrap}>
        <View style={styles.tabBar}>
          {dashboardTabs.map((tab) => {
            const active = tab === activeTab;
            return (
              <Pressable key={tab} style={[styles.tabButton, active ? styles.tabButtonActive : null]} onPress={() => setActiveTab(tab)}>
                <Text style={[styles.tabText, active ? styles.tabTextActive : null]}>{tab}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {renderActiveTab()}
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
  actionRow: {
    flexDirection: "row",
    gap: theme.spacing.xs,
    marginTop: theme.spacing.xs
  },
  actionBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: theme.radius.sm
  },
  editBtn: {
    backgroundColor: theme.colors.primary
  },
  deleteBtn: {
    backgroundColor: theme.colors.danger
  },
  actionText: {
    color: theme.colors.white,
    fontWeight: "700"
  },
  tabBarWrap: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    padding: theme.spacing.xs
  },
  tabBar: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs
  },
  tabButton: {
    paddingVertical: 10,
    paddingHorizontal: theme.spacing.sm,
    borderRadius: theme.radius.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.white
  },
  tabButtonActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primary
  },
  tabText: {
    color: theme.colors.primaryDark,
    fontWeight: "700"
  },
  tabTextActive: {
    color: theme.colors.white
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
