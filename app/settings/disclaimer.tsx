import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSpacing from '@/components/BottomSpacing';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';

const DisclaimerScreen = () => {
    const { colors } = useTheme();
    return (
        <SafeAreaView style={styles.container}>
            <View style={[styles.header, { borderBottomColor: colors.primaryBorder }]}>
                <Text style={[styles.headerTitle, { color: colors.text }]}>Disclaimer</Text>
                <Text style={[styles.headerSubtitle, { color: colors.textDim }]}>Important Information</Text>
            </View>
            <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <View style={styles.disclaimerContainer}>
                    <Text style={[styles.disclaimerText, { color: colors.textMuted }]}>
                        This application serves solely as a dashboard interface for movies and TV shows information and does not host, store, or distribute any content.
                    </Text>
                    {[
                        { header: '📱 Application Purpose', text: 'This app is only a dashboard that provides movie and TV show information. All content access is provided through third-party addons and external sources that users choose to install and use.' },
                        { header: '⚖️ Legal Notice', text: 'Users are solely responsible for ensuring their use of any third-party addons or external content sources complies with applicable laws and regulations in their jurisdiction, including copyright laws and licensing agreements.' },
                        { header: '🚫 Not Endorsed', text: 'The developer does not endorse, encourage, or support:\n• Accessing pirated or illegally distributed content\n• Using torrents for copyrighted material\n• Any activities that violate copyright laws\n• Illegal streaming or downloading of content' },
                        { header: '🛡️ Developer Responsibility', text: 'The developer of this application:\n• Is not responsible for user actions or content accessed through addons\n• Does not provide, control, or moderate third-party content sources\n• Will not be held liable for any legal consequences resulting from user actions\n• Has no control over addon functionality or content sources' },
                    ].map((section, i) => (
                        <View key={i} style={[styles.section, { backgroundColor: colors.primarySurface, borderLeftColor: colors.primary }]}>
                            <Text style={[styles.sectionHeader, { color: colors.text }]}>{section.header}</Text>
                            <Text style={[styles.sectionText, { color: colors.textMuted }]}>{section.text}</Text>
                        </View>
                    ))}
                    <View style={[styles.warningBox, { backgroundColor: colors.primarySurface, borderColor: colors.primary }]}>
                        <Ionicons name="alert-circle" size={24} color={colors.primary} />
                        <Text style={[styles.warningText, { color: colors.textMuted }]}>
                            This disclaimer serves to inform users of their responsibilities. The developer assumes no responsibility for how users choose to utilize third-party addons or external content sources accessible through this dashboard application.
                        </Text>
                    </View>
                </View>
                <BottomSpacing space={50} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, marginTop: 30 },
    header: { paddingHorizontal: 20, paddingVertical: 15, borderBottomWidth: 1 },
    headerTitle: { fontSize: 32, fontWeight: 'bold' },
    headerSubtitle: { fontSize: 16, marginTop: 5 },
    scrollView: { flex: 1 },
    scrollContent: { paddingBottom: 40, width: '100%', maxWidth: 780, margin: 'auto' },
    disclaimerContainer: { padding: 20 },
    disclaimerText: { fontSize: 16, lineHeight: 24, marginBottom: 25, textAlign: 'center', fontStyle: 'italic' },
    section: { marginBottom: 20, padding: 16, borderRadius: 12, borderLeftWidth: 4 },
    sectionHeader: { fontSize: 18, fontWeight: '600', marginBottom: 12 },
    sectionText: { fontSize: 15, lineHeight: 22 },
    warningBox: { borderWidth: 1, borderRadius: 12, padding: 16, marginTop: 10, marginBottom: 25 },
    warningText: { fontSize: 15, lineHeight: 22 },
});

export default DisclaimerScreen;