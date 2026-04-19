import React from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { theme } from "../constants/theme";

export default function FormInput({
  label,
  value,
  onChangeText,
  multiline = false,
  keyboardType = "default",
  editable = true,
  placeholder = ""
}) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        style={[styles.input, multiline ? styles.multiline : null, !editable ? styles.disabled : null]}
        multiline={multiline}
        keyboardType={keyboardType}
        editable={editable}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.muted}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 6
  },
  label: {
    color: theme.colors.text,
    fontSize: 14,
    fontWeight: "600"
  },
  input: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.sm,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: theme.colors.text
  },
  multiline: {
    minHeight: 110,
    textAlignVertical: "top"
  },
  disabled: {
    backgroundColor: "#f3f4f6",
    color: theme.colors.muted
  }
});
