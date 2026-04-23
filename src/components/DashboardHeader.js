import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../constants/theme";

export default function DashboardHeader({
  roleLabel,
  title,
  subtitle,
  loading,
  onRefresh,
  onLogout
}) {
  return (
    <View style={styles.wrapper}>
      <View style={styles.circleTop} />
      <View style={styles.circleBottom} />
      <View style={styles.roleTag}>
        <Text style={styles.roleTagText}>{roleLabel}</Text>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.subtitle}>{subtitle}</Text>
      <View style={styles.actions}>
        <Pressable style={styles.refreshButton} onPress={onRefresh}>
          <Text style={styles.refreshText}>{loading ? "Refreshing..." : "Refresh"}</Text>
        </Pressable>
        <Pressable style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    backgroundColor: "#1f8f71",
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: "#19745b",
    overflow: "hidden",
    gap: 6
  },
  circleTop: {
    position: "absolute",
    right: -18,
    top: -24,
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#42ab8e"
  },
  circleBottom: {
    position: "absolute",
    left: 10,
    bottom: -30,
    width: 74,
    height: 74,
    borderRadius: 37,
    backgroundColor: "#2c9f80"
  },
  roleTag: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#8fd6c2",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: "#1a7e63"
  },
  roleTagText: {
    color: "#eafff8",
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  title: {
    color: "#f4fffb",
    fontSize: 24,
    fontWeight: "800"
  },
  subtitle: {
    color: "#d8fff1",
    fontSize: 12
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 6
  },
  refreshButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#0f5f4a",
    backgroundColor: "#1a8b6c",
    borderRadius: 8,
    paddingVertical: 9,
    alignItems: "center"
  },
  refreshText: {
    color: "#e7fff8",
    fontWeight: "700",
    fontSize: 12
  },
  logoutButton: {
    borderWidth: 1,
    borderColor: "#0f5f4a",
    backgroundColor: "#4dc6a4",
    borderRadius: 8,
    paddingHorizontal: 14,
    paddingVertical: 9
  },
  logoutText: {
    color: "#064836",
    fontWeight: "700",
    fontSize: 12
  }
});
