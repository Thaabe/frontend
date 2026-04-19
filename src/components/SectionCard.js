import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../constants/theme";

export default function SectionCard({ title, subtitle, children }) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>{title}</Text>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      <View style={styles.body}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: theme.colors.card,
    borderRadius: theme.radius.md,
    padding: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    gap: theme.spacing.sm
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.primaryDark
  },
  subtitle: {
    color: theme.colors.muted
  },
  body: {
    gap: theme.spacing.sm
  }
});
