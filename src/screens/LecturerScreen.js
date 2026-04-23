import React, { useEffect, useState } from "react";
import { Pressable, StyleSheet, Text, View, ScrollView, Alert } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import SectionCard from "../components/SectionCard";
import FormInput from "../components/FormInput";
import PrimaryButton from "../components/PrimaryButton";
import DashboardHeader from "../components/DashboardHeader";
import DashboardStatCard from "../components/DashboardStatCard";
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
  const [fieldErrors, setFieldErrors] = useState({});

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [summaryData, coursesData, reportsData] = await Promise.all([
        getRoleSummary(user.uid, profile.role, { stream: profile.stream, facultyName: profile.facultyName }),
        getCoursesForRole(profile.role, profile.stream, profile.facultyName),
        getRecentReportsByOwner(user.uid, 6)
      ]);
      setSummary(summaryData);
      setCourses(coursesData);
      setMyReports(reportsData);
    } catch (error) {
      console.error("Error loading dashboard:", error);
      setError("Failed to load dashboard data");
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

      try {
        const storedValue = await getStoredRegisteredStudents(report.className, report.courseCode);
        if (storedValue) {
          setReport((current) => ({
            ...current,
            totalRegisteredStudents: String(storedValue)
          }));
        }
      } catch (error) {
        console.error("Error fetching registered students:", error);
      }
    };

    fetchRegisteredStudents().catch(() => null);
  }, [report.className, report.courseCode]);

  const updateReport = (key, value) => {
    setReport((current) => ({ ...current, [key]: value }));
    if (fieldErrors[key]) {
      setFieldErrors((prev) => ({ ...prev, [key]: null }));
    }
    if (error) setError("");
  };

  const validateReport = () => {
    const errors = {};
    
    if (!report.className?.trim()) {
      errors.className = "Class Name is required";
    }
    if (!report.courseName?.trim()) {
      errors.courseName = "Course Name is required";
    }
    if (!report.courseCode?.trim()) {
      errors.courseCode = "Course Code is required";
    }
    if (!report.weekOfReporting?.trim()) {
      errors.weekOfReporting = "Week of Reporting is required";
    }
    if (!report.lectureDate?.trim()) {
      errors.lectureDate = "Lecture Date is required";
    }
    if (!report.lecturerName?.trim()) {
      errors.lecturerName = "Lecturer Name is required";
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const saveReport = async () => {
    setError("");
    setMessage("");
    
    if (!validateReport()) {
      setError("Please fill in all required fields marked below");
      return;
    }
    
    setSubmittingReport(true);
    
    try {
      console.log("Submitting report with data:", report);
      
      const reportData = {
        ...report,
        ownerId: user.uid,
        stream: profile.stream || "",
        submittedByRole: "lecturer",
        facultyName: profile.facultyName || report.facultyName,
        actualStudentsPresent: report.actualStudentsPresent ? Number(report.actualStudentsPresent) : 0,
        totalRegisteredStudents: report.totalRegisteredStudents ? Number(report.totalRegisteredStudents) : 0,
        submittedAt: new Date().toISOString(),
        status: "submitted"
      };
      
      await submitLectureReport(reportData);
      
      setReport(initialReport(profile));
      setFieldErrors({});
      setMessage("Lecture report submitted successfully!");
      
      Alert.alert("Success", "Lecture report has been submitted successfully");
      
      await loadDashboard();
      
      setTimeout(() => setMessage(""), 3000);
      
    } catch (submitError) {
      console.error("Error submitting report:", submitError);
      
      if (submitError.code === "permission-denied") {
        setError("You don't have permission to submit reports. Please contact an administrator.");
      } else if (submitError.code === "unavailable") {
        setError("Network error. Please check your connection and try again.");
      } else if (submitError.code === "not-found") {
        setError("Database collection not found. Please contact support.");
      } else if (submitError.message) {
        setError(`${submitError.message}`);
      } else {
        setError("Failed to submit report. Please try again.");
      }
      
      Alert.alert("Submission Failed", error || "Please try again later");
    } finally {
      setSubmittingReport(false);
    }
  };

  const saveAttendance = async () => {
    setError("");
    setMessage("");

    if (!attendance.className.trim()) {
      setError("Class Name is required.");
      return;
    }
    
    if (!attendance.presentCount.trim()) {
      setError("Present Count is required.");
      return;
    }
    
    if (isNaN(attendance.presentCount) || Number(attendance.presentCount) < 0) {
      setError("Present Count must be a valid number.");
      return;
    }

    try {
      await submitAttendance({
        ...attendance,
        presentCount: Number(attendance.presentCount),
        ownerId: user.uid,
        role: profile.role,
        submittedByRole: "lecturer",
        facultyName: profile.facultyName,
        stream: profile.stream || "",
        submittedAt: new Date().toISOString()
      });
      
      setAttendance({ className: "", presentCount: "" });
      setMessage("Student attendance saved successfully.");
      await loadDashboard();
      
      setTimeout(() => setMessage(""), 3000);
    } catch (attendanceError) {
      console.error("Attendance error:", attendanceError);
      setError(attendanceError && attendanceError.message ? attendanceError.message : "Failed to save attendance.");
    }
  };

  const saveRating = async () => {
    setError("");
    setMessage("");

    if (!rating.className.trim()) {
      setError("Class Name is required.");
      return;
    }

    if (!rating.score.trim()) {
      setError("Score is required.");
      return;
    }
    
    const scoreNum = Number(rating.score);
    if (isNaN(scoreNum) || scoreNum < 1 || scoreNum > 5) {
      setError("Score must be a number between 1 and 5.");
      return;
    }

    try {
      await submitRating({
        ...rating,
        score: scoreNum,
        ownerId: user.uid,
        role: profile.role,
        submittedByRole: "lecturer",
        facultyName: profile.facultyName,
        stream: profile.stream || "",
        submittedAt: new Date().toISOString()
      });
      
      setRating({ className: "", score: "", feedback: "" });
      setMessage("Monitoring rating submitted successfully.");
      await loadDashboard();
      
      setTimeout(() => setMessage(""), 3000);
    } catch (ratingError) {
      console.error("Rating error:", ratingError);
      setError(ratingError && ratingError.message ? ratingError.message : "Failed to save rating.");
    }
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
    
    setFieldErrors({});
    
    setMessage(`Course "${course.courseName}" loaded successfully`);
    setTimeout(() => setMessage(""), 2000);
  };

  const filteredCourses = courses.filter((course) => (
    `${course.className || ""} ${course.courseName || ""} ${course.courseCode || ""}`
      .toLowerCase()
      .includes(classSearch.toLowerCase())
  ));

  const filteredReports = myReports.filter((savedReport) => (
    `${savedReport.courseName || ""} ${savedReport.className || ""} ${savedReport.weekOfReporting || ""} ${savedReport.courseCode || ""}`
      .toLowerCase()
      .includes(reportSearch.toLowerCase())
  ));

  const exportMyReports = async () => {
    if (filteredReports.length === 0) {
      Alert.alert("No Data", "No reports to export");
      return;
    }
    
    try {
      await exportRowsToExcel("lecturer-reports", filteredReports.map((savedReport) => ({
        facultyName: savedReport.facultyName || "",
        className: savedReport.className || "",
        weekOfReporting: savedReport.weekOfReporting || "",
        lectureDate: savedReport.lectureDate || "",
        courseName: savedReport.courseName || "",
        courseCode: savedReport.courseCode || "",
        lecturerName: savedReport.lecturerName || "",
        actualStudentsPresent: savedReport.actualStudentsPresent != null ? savedReport.actualStudentsPresent : "",
        totalRegisteredStudents: savedReport.totalRegisteredStudents != null ? savedReport.totalRegisteredStudents : "",
        venue: savedReport.venue || "",
        scheduledLectureTime: savedReport.scheduledLectureTime || "",
        topicTaught: savedReport.topicTaught || "",
        learningOutcomes: savedReport.learningOutcomes || "",
        recommendations: savedReport.recommendations || ""
      })));
      setMessage("Reports exported successfully");
      setTimeout(() => setMessage(""), 3000);
    } catch (error) {
      console.error("Export error:", error);
      setError("Failed to export reports");
    }
  };

  const isReportValid = () => {
    return report.className?.trim() && 
           report.courseName?.trim() && 
           report.courseCode?.trim();
  };

  const renderFormField = (label, key, placeholder, options = {}) => {
    const { keyboardType = "default", multiline = false, required = true } = options;
    
    return (
      <View key={key} style={styles.fieldContainer}>
        <Text style={styles.fieldLabel}>
          {label}
          {required && <Text style={styles.requiredStar}> *</Text>}
        </Text>
        <FormInput
          label=""
          value={report[key]}
          placeholder={placeholder}
          keyboardType={keyboardType}
          multiline={multiline}
          onChangeText={(value) => updateReport(key, value)}
          style={[
            fieldErrors[key] && styles.errorInput,
            multiline && styles.multilineInput
          ]}
        />
        {fieldErrors[key] && (
          <Text style={styles.fieldError}>{fieldErrors[key]}</Text>
        )}
      </View>
    );
  };

  return (
    <ScreenContainer>
      <DashboardHeader
        roleLabel={roleLabels[profile.role]}
        title="Lecturer Dashboard"
        subtitle={`${profile.facultyName || "ICT Department"} - Manage your classes and reports`}
        loading={loading}
        onRefresh={loadDashboard}
        onLogout={onLogout}
      />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.row}>
          <DashboardStatCard label="Active Classes" value={summary.activeCourses} helper={courses.length ? "Live class list loaded" : "No classes yet"} />
          <DashboardStatCard label="Reports Submitted" value={summary.reportsSubmitted} helper={myReports.length ? "Latest reports listed" : "No submission yet"} />
        </View>
        <View style={styles.row}>
          <DashboardStatCard label="Attendance Avg" value={summary.averageAttendance} helper="From attendance logs" />
          <DashboardStatCard label="Rating Avg" value={summary.averageRating} helper="From monitoring scores" />
        </View>

        <SectionCard title="Classes" subtitle="Tap a class to auto-fill form fields and see time.">
          <FormInput 
            label="Search Classes / Modules" 
            value={classSearch} 
            placeholder="Search class, module, code" 
            onChangeText={setClassSearch} 
          />
          {filteredCourses.length ? filteredCourses.map((course) => (
            <Pressable 
              key={course.id} 
              style={({ pressed }) => [
                styles.listItem,
                pressed && styles.listItemPressed
              ]} 
              onPress={() => applyCourseToReport(course)}
            >
              <Text style={styles.listTitle}>{course.className || "Class"} - {course.courseName} ({course.courseCode})</Text>
              <Text style={styles.listText}>Lecture Time: {course.lectureTime || "TBD"}</Text>
              <Text style={styles.listText}>Venue: {course.venue || "TBD"}</Text>
            </Pressable>
          )) : <Text style={styles.copy}>No classes found yet.</Text>}
        </SectionCard>

        <SectionCard title="Lecturer Reporting Form" subtitle="All fields marked with * are required">
          {renderFormField("Faculty Name", "facultyName", "Faculty of ICT", { required: false })}
          {renderFormField("Class Name", "className", "BCSMY3S2")}
          {renderFormField("Week of Reporting", "weekOfReporting", "Week 5")}
          {renderFormField("Date of Lecture", "lectureDate", "2026-04-19")}
          {renderFormField("Course Name", "courseName", "Software Engineering")}
          {renderFormField("Course Code", "courseCode", "SE301")}
          {renderFormField("Lecturer's Name", "lecturerName", "Lecturer full name")}
          {renderFormField("Actual Number of Students Present", "actualStudentsPresent", "45", { keyboardType: "numeric", required: false })}
          {renderFormField("Total Registered Students", "totalRegisteredStudents", "50", { keyboardType: "numeric", required: false })}
          {renderFormField("Venue of the Class", "venue", "Lab 2", { required: false })}
          {renderFormField("Scheduled Lecture Time", "scheduledLectureTime", "10:00 - 12:00", { required: false })}
          {renderFormField("Topic Taught", "topicTaught", "Topic covered in lecture", { multiline: true, required: false })}
          {renderFormField("Learning Outcomes of the Topic", "learningOutcomes", "What students should learn", { multiline: true, required: false })}
          {renderFormField("Lecturer Recommendations", "recommendations", "Recommendations for improvement", { multiline: true, required: false })}
          
          <PrimaryButton 
            label={submittingReport ? "Submitting..." : "Submit Report"} 
            onPress={saveReport} 
            loading={submittingReport}
            disabled={!isReportValid() || submittingReport}
          />
          
          {error ? <Text style={styles.error}>{error}</Text> : null}
          {message ? <Text style={styles.success}>{message}</Text> : null}
        </SectionCard>

        <SectionCard title="My Recently Submitted Reports">
          <FormInput 
            label="Search Reports" 
            value={reportSearch} 
            placeholder="Search class, module, week, code" 
            onChangeText={setReportSearch} 
          />
          <PrimaryButton 
            label="Download Reports (Excel)" 
            onPress={exportMyReports} 
            variant="secondary" 
          />
          {filteredReports.length ? filteredReports.map((savedReport) => (
            <View key={savedReport.id} style={styles.reportItem}>
              <Text style={styles.listTitle}>{savedReport.courseName || "Course"} - {savedReport.className || "Class"}</Text>
              <Text style={styles.listText}>Week: {savedReport.weekOfReporting || "N/A"}</Text>
              <Text style={styles.listText}>Lecture Time: {savedReport.scheduledLectureTime || "TBD"}</Text>
              <Text style={styles.listText}>Topic: {savedReport.topicTaught || "N/A"}</Text>
              {savedReport.submittedAt && (
                <Text style={styles.listTextSmall}>Submitted: {new Date(savedReport.submittedAt).toLocaleString()}</Text>
              )}
            </View>
          )) : <Text style={styles.copy}>No reports matched your search.</Text>}
        </SectionCard>

        <SectionCard title="Student Attendance">
          <FormInput 
            label="Class Name" 
            value={attendance.className} 
            placeholder="BCSMY3S2" 
            onChangeText={(value) => setAttendance((current) => ({ ...current, className: value }))} 
          />
          <FormInput 
            label="Present Count" 
            value={attendance.presentCount} 
            placeholder="45" 
            keyboardType="numeric" 
            onChangeText={(value) => setAttendance((current) => ({ ...current, presentCount: value }))} 
          />
          <PrimaryButton label="Save Attendance" onPress={saveAttendance} />
        </SectionCard>

        <SectionCard title="Monitoring and Rating">
          <FormInput 
            label="Class / Course Name" 
            value={rating.className} 
            placeholder="Class or course name" 
            onChangeText={(value) => setRating((current) => ({ ...current, className: value }))} 
          />
          <FormInput 
            label="Score (1-5)" 
            value={rating.score} 
            placeholder="4" 
            keyboardType="numeric" 
            onChangeText={(value) => setRating((current) => ({ ...current, score: value }))} 
          />
          <FormInput 
            label="Monitoring Notes" 
            value={rating.feedback} 
            placeholder="Observations for this class" 
            multiline 
            onChangeText={(value) => setRating((current) => ({ ...current, feedback: value }))} 
          />
          <PrimaryButton label="Save Monitoring Rating" onPress={saveRating} />
        </SectionCard>
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.md
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
    gap: 4,
    marginBottom: theme.spacing.xs
  },
  listItemPressed: {
    backgroundColor: theme.colors.primaryLight,
    borderColor: theme.colors.primary
  },
  reportItem: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    backgroundColor: theme.colors.white,
    gap: 4,
    marginBottom: theme.spacing.xs
  },
  listTitle: {
    fontWeight: "700",
    color: theme.colors.primaryDark,
    fontSize: 16
  },
  listText: {
    color: theme.colors.text,
    fontSize: 14
  },
  listTextSmall: {
    color: theme.colors.textLight,
    fontSize: 12,
    marginTop: 4
  },
  success: {
    color: theme.colors.success,
    fontWeight: "700",
    marginTop: theme.spacing.sm,
    textAlign: "center"
  },
  error: {
    color: theme.colors.danger,
    fontWeight: "700",
    marginTop: theme.spacing.sm,
    textAlign: "center"
  },
  fieldContainer: {
    marginBottom: theme.spacing.md
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text,
    marginBottom: 4
  },
  requiredStar: {
    color: theme.colors.danger,
    fontSize: 14
  },
  errorInput: {
    borderColor: theme.colors.danger,
    borderWidth: 1
  },
  fieldError: {
    color: theme.colors.danger,
    fontSize: 12,
    marginTop: 4
  },
  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top"
  }
});