import { SegmentType, SkipResult } from "@/clients/introDb";
import React, { useEffect, useRef } from "react";
import { TouchableOpacity, StyleSheet, Text, Animated } from "react-native";

const SEGMENT_LABELS: Record<SegmentType, string> = {
    recap: "Skip Recap",
    intro: "Skip Intro",
    outro: "Skip Credits",
};

interface SkipBannerProps {
    activeSegment: SkipResult | null;
    onSkip: () => void;
}

export const SkipBanner: React.FC<SkipBannerProps> = ({ activeSegment, onSkip }) => {
    const translateX = useRef(new Animated.Value(200)).current;
    const opacity = useRef(new Animated.Value(0)).current;
    const prevTypeRef = useRef<SegmentType | null>(null);

    useEffect(function() {
        if (activeSegment) {
            // Slide in when segment becomes active (or type changes)
            if (prevTypeRef.current !== activeSegment.type) {
                prevTypeRef.current = activeSegment.type;
                translateX.setValue(200);
                opacity.setValue(0);
            }
            Animated.parallel([
                Animated.spring(translateX, {
                    toValue: 0,
                    tension: 80,
                    friction: 12,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 1,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            // Slide out when segment ends
            prevTypeRef.current = null;
            Animated.parallel([
                Animated.timing(translateX, {
                    toValue: 200,
                    duration: 250,
                    useNativeDriver: true,
                }),
                Animated.timing(opacity, {
                    toValue: 0,
                    duration: 200,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [activeSegment]);

    // Always render but animate in/out so the slide-out plays
    const label = activeSegment ? SEGMENT_LABELS[activeSegment.type] : "";

    return (
        <Animated.View
            style={[
                styles.container,
                { transform: [{ translateX }], opacity },
            ]}
            pointerEvents={activeSegment ? "box-none" : "none"}
        >
            <TouchableOpacity
                style={styles.button}
                onPress={onSkip}
                activeOpacity={0.8}
            >
                <Text style={styles.label}>{label}</Text>
                <Text style={styles.arrow}>{"›"}</Text>
            </TouchableOpacity>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: "absolute",
        bottom: 90,
        right: 20,
        zIndex: 300,
    },
    button: {
        flexDirection: "row",
        alignItems: "center",
        paddingHorizontal: 22,
        paddingVertical: 12,
        borderRadius: 4,
        borderWidth: 2,
        borderColor: "rgba(255,255,255,0.85)",
        backgroundColor: "rgba(0,0,0,0.55)",
        gap: 8,
    },
    label: {
        color: "#fff",
        fontSize: 15,
        fontWeight: "600",
        letterSpacing: 0.3,
    },
    arrow: {
        color: "#fff",
        fontSize: 22,
        lineHeight: 22,
        fontWeight: "300",
    },
});