import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import AuthScreen from "../screens/AuthScreen";
import StudentScreen from "../screens/StudentScreen";
import LecturerScreen from "../screens/LecturerScreen";
import PrincipalLecturerScreen from "../screens/PrincipalLecturerScreen";
import ProgramLeaderScreen from "../screens/ProgramLeaderScreen";
import { useAuth } from "../context/AuthContext";
import { theme } from "../constants/theme";

function DashboardRouter({ profile, user, onLogout }) {
  switch (profile.role) {
    case "lecturer":
      return <LecturerScreen profile={profile} user={user} onLogout={onLogout} />;
    case "principal_lecturer":
      return <PrincipalLecturerScreen profile={profile} user={user} onLogout={onLogout} />;
    case "program_leader":
      return <ProgramLeaderScreen profile={profile} user={user} onLogout={onLogout} />;
    case "student":
    default:
      return <StudentScreen profile={profile} user={user} onLogout={onLogout} />;
  }
}

export default function AppNavigator() {
  const { user, profile, loading, logout } = useAuth();

  if (loading) {
    return (
      <View style={styles.loader}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  if (!user || !profile) {
    return <AuthScreen />;
  }

  return <DashboardRouter profile={profile} user={user} onLogout={logout} />;
}

const styles = StyleSheet.create({
  loader: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: theme.colors.background
  }
});
