import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../constants/theme";

export default function DashboardStatCard({ label, value, helper }) {
  return (
    <View style={styles.card}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.helper}>{helper}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 145,
    borderWidth: 1,
    borderColor: "#c9d9d3",
    borderRadius: theme.radius.sm,
    padding: theme.spacing.sm,
    backgroundColor: "#f5fffb",
    gap: 2
  },
  label: {
    color: "#5d726b",
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase"
  },
  value: {
    color: "#0d1f1a",
    fontSize: 28,
    fontWeight: "800",
    lineHeight: 32
  },
  helper: {
    color: "#7a8c86",
    fontSize: 11
  }
});
