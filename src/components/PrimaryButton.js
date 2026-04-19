import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text } from "react-native";
import { theme } from "../constants/theme";

export default function PrimaryButton({ label, onPress, variant = "primary", loading = false }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        variant === "secondary" ? styles.secondary : styles.primary,
        pressed && styles.pressed
      ]}
    >
      {loading ? (
        <ActivityIndicator color={variant === "secondary" ? theme.colors.primary : theme.colors.white} />
      ) : (
        <Text style={[styles.label, variant === "secondary" ? styles.secondaryLabel : null]}>{label}</Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: theme.radius.md,
    paddingVertical: 14,
    alignItems: "center"
  },
  primary: {
    backgroundColor: theme.colors.primary
  },
  secondary: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.primary
  },
  pressed: {
    opacity: 0.9
  },
  label: {
    color: theme.colors.white,
    fontWeight: "700",
    fontSize: 15
  },
  secondaryLabel: {
    color: theme.colors.primary
  }
});
