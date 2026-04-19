import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../constants/theme";

export default function ScreenContainer({ children }) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={styles.safeArea} edges={["top", "right", "bottom", "left"]}>
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          {
            paddingTop: Math.max(insets.top, theme.spacing.sm),
            paddingBottom: Math.max(insets.bottom, theme.spacing.lg)
          }
        ]}
      >
        <View style={styles.contentWrap}>
          <View style={styles.content}>{children}</View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  scroll: {
    flexGrow: 1
  },
  contentWrap: {
    width: "100%",
    alignItems: "center"
  },
  content: {
    width: "100%",
    maxWidth: 720,
    padding: theme.spacing.md,
    gap: theme.spacing.md
  }
});
