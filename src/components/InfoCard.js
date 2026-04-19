import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../constants/theme";

export default function InfoCard({ label, value, tone = "default" }) {
  return (
    <View style={[styles.card, tone === "highlight" ? styles.highlight : null]}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minWidth: 140,
    backgroundColor: theme.colors.white,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: 4
  },
  highlight: {
    backgroundColor: "#eefbf5"
  },
  label: {
    color: theme.colors.muted,
    fontSize: 13
  },
  value: {
    color: theme.colors.text,
    fontSize: 20,
    fontWeight: "700"
  }
});
