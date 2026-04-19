import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { theme } from "../constants/theme";

export default function RoleBadge({ label }) {
  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    alignSelf: "flex-start",
    backgroundColor: "#dcfce7",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6
  },
  text: {
    color: theme.colors.success,
    fontWeight: "700",
    fontSize: 12,
    textTransform: "uppercase"
  }
});
