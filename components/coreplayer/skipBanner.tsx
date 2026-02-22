import { SegmentType, SkipResult } from "@/clients/introDb";
import React from "react";
import { TouchableOpacity, StyleSheet, Text, View } from "react-native";

const SEGMENT_LABELS: Record<SegmentType, string> = {
  recap: "Skip Recap",
  intro: "Skip Intro",
  outro: "Skip Outro",
};

interface SkipBannerProps {
  activeSegment: SkipResult | null;
  onSkip: () => void;
}

export const SkipBanner: React.FC<SkipBannerProps> = ({ activeSegment, onSkip }) => {
  if (!activeSegment) return null;

  return (
    <View style={styles.container} pointerEvents="box-none">
      <TouchableOpacity style={styles.button} onPress={onSkip} activeOpacity={0.85}>
        <Text style={styles.label}>{SEGMENT_LABELS[activeSegment.type]}</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    bottom: 80,
    right: 20,
    zIndex: 200,
  },
  button: {
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(255, 255, 255, 0.6)",
    borderRadius: 6,
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  label: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
});