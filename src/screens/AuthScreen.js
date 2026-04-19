import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import ScreenContainer from "../components/ScreenContainer";
import FormInput from "../components/FormInput";
import PrimaryButton from "../components/PrimaryButton";
import SectionCard from "../components/SectionCard";
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
      <View style={styles.hero}>
        <Text style={styles.title}>LUCT Faculty Reporting</Text>
        <Text style={styles.subtitle}>
          Track classes, reports, attendance, monitoring, and ratings in one mobile workflow.
        </Text>
      </View>

      <SectionCard title={mode === "login" ? "Welcome back" : "Create account"}>
        <View style={styles.switcher}>
          <Pressable onPress={() => setMode("login")} style={[styles.modeButton, mode === "login" ? styles.modeActive : null]}>
            <Text style={[styles.modeText, mode === "login" ? styles.modeTextActive : null]}>Login</Text>
          </Pressable>
          <Pressable onPress={() => setMode("register")} style={[styles.modeButton, mode === "register" ? styles.modeActive : null]}>
            <Text style={[styles.modeText, mode === "register" ? styles.modeTextActive : null]}>Register</Text>
          </Pressable>
        </View>

        {mode === "register" ? (
          <>
            <FormInput label="Full Name" value={form.fullName} onChangeText={(value) => updateField("fullName", value)} />
            <FormInput label="Faculty Name" value={form.facultyName} onChangeText={(value) => updateField("facultyName", value)} />
            <FormInput label="Stream / Department" value={form.stream} onChangeText={(value) => updateField("stream", value)} />
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
          </>
        ) : null}

        <FormInput label="Email" value={form.email} onChangeText={(value) => updateField("email", value)} />
        <FormInput label="Password" value={form.password} onChangeText={(value) => updateField("password", value)} />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <PrimaryButton label={mode === "login" ? "Login" : "Register"} onPress={handleSubmit} loading={loading} />
      </SectionCard>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: {
    backgroundColor: theme.colors.primaryDark,
    borderRadius: theme.radius.lg,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm
  },
  title: {
    color: theme.colors.white,
    fontSize: 28,
    fontWeight: "800"
  },
  subtitle: {
    color: "#d1fae5",
    lineHeight: 22
  },
  switcher: {
    flexDirection: "row",
    backgroundColor: "#f1efe9",
    borderRadius: theme.radius.md,
    padding: 4
  },
  modeButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: theme.radius.sm
  },
  modeActive: {
    backgroundColor: theme.colors.white
  },
  modeText: {
    color: theme.colors.muted,
    fontWeight: "600"
  },
  modeTextActive: {
    color: theme.colors.primaryDark
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
    fontWeight: "600"
  }
});
