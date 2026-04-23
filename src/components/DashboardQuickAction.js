import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { theme } from "../constants/theme";

export default function DashboardQuickAction({ label, onPress }) {
  return (
    <Pressable style={styles.item} onPress={onPress}>
      <View style={styles.iconWrap}>
        <View style={styles.iconDot} />
      </View>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  item: {
    flex: 1,
    minWidth: 145,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#d5dfdb",
    borderRadius: theme.radius.sm,
    backgroundColor: "#ffffff",
    paddingVertical: 10,
    paddingHorizontal: 10
  },
  iconWrap: {
    width: 18,
    height: 18,
    borderRadius: 5,
    backgroundColor: "#d7efe8",
    alignItems: "center",
    justifyContent: "center"
  },
  iconDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#1f8f71"
  },
  label: {
    color: "#10241f",
    fontSize: 12,
    fontWeight: "700"
  }
});
