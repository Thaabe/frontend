import React, { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import { theme } from "../constants/theme";
import { roles } from "../utils/roles";
import { useAuth } from "../context/AuthContext";

const initialForm = {
  fullName: "",
  facultyName: "",
  stream: "",
  role: "student",
  email: "",
  password: ""
};

export default function AuthScreen() {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const { login, register, error, setError } = useAuth();

  const updateField = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError("");

    try {
      if (mode === "login") {
        await login({ email: form.email.trim(), password: form.password });
      } else {
        await register({
          fullName: form.fullName.trim(),
          facultyName: form.facultyName.trim(),
          stream: form.stream.trim(),
          role: form.role,
          email: form.email.trim(),
          password: form.password
        });
      }
    } catch (submitError) {
      setError(submitError.message || "Unable to authenticate.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.topPanel}>
        <View style={styles.circleOne} />
        <View style={styles.circleTwo} />
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <View style={styles.brandDot} />
          </View>
          <Text style={styles.brandText}>LUCT - ICT Faculty</Text>
        </View>
        <Text style={styles.mainTitle}>Faculty Reporting</Text>
        <Text style={styles.mainSubtitle}>
          Track classes, attendance, reports, and ratings.
        </Text>
        <View style={styles.chipRow}>
          <View style={styles.chip}><Text style={styles.chipText}>Attendance</Text></View>
          <View style={styles.chip}><Text style={styles.chipText}>Reports</Text></View>
          <View style={styles.chip}><Text style={styles.chipText}>Monitorings</Text></View>
          <View style={styles.chip}><Text style={styles.chipText}>Ratings</Text></View>
        </View>
      </View>

      <View style={styles.authCard}>
        <Text style={styles.welcomeText}>{mode === "login" ? "Welcome back" : "Create account"}</Text>
        <View style={styles.switcher}>
          <Pressable onPress={() => setMode("login")} style={[styles.modeButton, mode === "login" ? styles.modeActive : null]}>
            <Text style={[styles.modeText, mode === "login" ? styles.modeTextActive : null]}>Login</Text>
          </Pressable>
          <Pressable onPress={() => setMode("register")} style={[styles.modeButton, mode === "register" ? styles.modeActive : null]}>
            <Text style={[styles.modeText, mode === "register" ? styles.modeTextActive : null]}>Register</Text>
          </Pressable>
        </View>

        {mode === "register" ? (
          <View style={styles.fieldGroup}>
            <Text style={styles.inputLabel}>Full Name</Text>
            <TextInput
              value={form.fullName}
              onChangeText={(value) => updateField("fullName", value)}
              placeholder="Your full name"
              style={styles.input}
              placeholderTextColor="#8a8a8a"
            />
            <Text style={styles.inputLabel}>Faculty Name</Text>
            <TextInput
              value={form.facultyName}
              onChangeText={(value) => updateField("facultyName", value)}
              placeholder="Faculty name"
              style={styles.input}
              placeholderTextColor="#8a8a8a"
            />
            <Text style={styles.inputLabel}>Stream / Department</Text>
            <TextInput
              value={form.stream}
              onChangeText={(value) => updateField("stream", value)}
              placeholder="Stream / department"
              style={styles.input}
              placeholderTextColor="#8a8a8a"
            />
            <Text style={styles.roleLabel}>Select Role</Text>
            <View style={styles.roleGrid}>
              {roles.map((role) => (
                <Pressable
                  key={role.value}
                  style={[styles.roleItem, form.role === role.value ? styles.roleActive : null]}
                  onPress={() => updateField("role", role.value)}
                >
                  <Text style={[styles.roleText, form.role === role.value ? styles.roleTextActive : null]}>
                    {role.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.fieldGroup}>
          <Text style={styles.inputLabel}>Email</Text>
          <TextInput
            value={form.email}
            onChangeText={(value) => updateField("email", value)}
            placeholder="your@luct.edu.ls"
            keyboardType="email-address"
            autoCapitalize="none"
            style={styles.input}
            placeholderTextColor="#8a8a8a"
          />
          <Text style={styles.inputLabel}>Password</Text>
          <TextInput
            value={form.password}
            onChangeText={(value) => updateField("password", value)}
            placeholder="password"
            secureTextEntry
            style={styles.input}
            placeholderTextColor="#8a8a8a"
          />
        </View>

        <Pressable style={styles.forgotWrap}>
          <Text style={styles.forgotText}>Forgot password?</Text>
        </Pressable>
        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable style={styles.loginButton} onPress={handleSubmit} disabled={loading}>
          <Text style={styles.loginButtonText}>{loading ? "Loading..." : mode === "login" ? "Login" : "Register"}</Text>
        </Pressable>

        <Text style={styles.orText}>or</Text>

        <Pressable style={styles.ssoButton}>
          <Text style={styles.ssoButtonText}>Continue with SSO</Text>
        </Pressable>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  topPanel: {
    backgroundColor: "#154f42",
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 10,
    position: "relative",
    overflow: "hidden"
  },
  circleOne: {
    position: "absolute",
    right: -18,
    top: -18,
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "#2a6a5a"
  },
  circleTwo: {
    position: "absolute",
    right: 24,
    bottom: -26,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#245f50"
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  brandIcon: {
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: "#2d7a66",
    alignItems: "center",
    justifyContent: "center"
  },
  brandDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#d6f4ea"
  },
  brandText: {
    color: "#e6f7f1",
    fontSize: 11,
    fontWeight: "700"
  },
  mainTitle: {
    color: theme.colors.white,
    fontSize: 30,
    fontWeight: "800",
    marginTop: 2
  },
  mainSubtitle: {
    color: "#d4eee6",
    lineHeight: 20,
    maxWidth: 220
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4
  },
  chip: {
    borderWidth: 1,
    borderColor: "#4d8377",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#2a6a5a"
  },
  chipText: {
    color: "#d9f0ea",
    fontSize: 11,
    fontWeight: "600"
  },
  authCard: {
    marginTop: -4,
    backgroundColor: "#ffffff",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "#e7e2d9",
    gap: 10
  },
  welcomeText: {
    fontSize: 18,
    color: "#111827",
    fontWeight: "700"
  },
  switcher: {
    flexDirection: "row",
    backgroundColor: "#ece9e2",
    borderRadius: 8,
    padding: 2
  },
  modeButton: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6
  },
  modeActive: {
    backgroundColor: "#dcd8cf"
  },
  modeText: {
    color: "#50565f",
    fontWeight: "600"
  },
  modeTextActive: {
    color: "#111827"
  },
  fieldGroup: {
    gap: 6
  },
  inputLabel: {
    fontSize: 12,
    color: "#1f2937",
    fontWeight: "600",
    marginTop: 2
  },
  input: {
    borderWidth: 1,
    borderColor: "#cacaca",
    borderRadius: 4,
    backgroundColor: "#f8f8f8",
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: "#111827",
    fontSize: 13
  },
  forgotWrap: {
    alignSelf: "flex-end"
  },
  forgotText: {
    color: "#22a16f",
    fontSize: 11,
    fontWeight: "600"
  },
  loginButton: {
    borderWidth: 1,
    borderColor: "#8f8f8f",
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#f7f7f7"
  },
  loginButtonText: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 13
  },
  orText: {
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 12,
    fontWeight: "600"
  },
  ssoButton: {
    borderWidth: 1,
    borderColor: "#8f8f8f",
    borderRadius: 6,
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#ffffff"
  },
  ssoButtonText: {
    color: "#111827",
    fontWeight: "700",
    fontSize: 13
  },
  roleLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.text
  },
  roleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.xs
  },
  roleItem: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.colors.white
  },
  roleActive: {
    backgroundColor: "#dcfce7",
    borderColor: "#86efac"
  },
  roleText: {
    color: theme.colors.text,
    fontWeight: "600"
  },
  roleTextActive: {
    color: theme.colors.success
  },
  error: {
    color: theme.colors.danger,
    fontWeight: "600",
    textAlign: "center"
  }
});
