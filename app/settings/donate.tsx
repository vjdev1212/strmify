import React from 'react';
import { StyleSheet, Pressable, Linking, ScrollView, View } from 'react-native';
import { Text, StatusBar } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';

const DonateScreen = () => {
    const { colors } = useTheme();

    const handleDonate = async () => {
        const username = process.env.EXPO_PUBLIC_BUY_ME_COFFEE || '';
        Linking.openURL(`https://www.buymeacoffee.com/${username}`).catch(err => console.error('Failed to open URL:', err));
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar />
            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.contentWrapper}>
                    <View style={styles.headerSection}>
                        <View style={[styles.iconWrapper, { backgroundColor: colors.primarySurface }]}>
                            <Ionicons name="heart" size={32} color={colors.primary} />
                        </View>
                        <Text style={[styles.title, { color: colors.text }]}>Enjoying the App!</Text>
                        <Text style={[styles.subtitle, { color: colors.textMuted }]}>Your support helps keep this project alive and enables continuous improvements. Every contribution makes a difference!</Text>
                    </View>
                    <View style={[styles.featuresSection, { backgroundColor: colors.primarySurface }]}>
                        {['Regular updates & improvements', 'New features development', 'Bug fixes & maintenance'].map((text, i) => (
                            <View key={i} style={styles.featureItem}>
                                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                                <Text style={[styles.featureText, { color: colors.textMuted }]}>{text}</Text>
                            </View>
                        ))}
                    </View>
                    <View style={styles.donationSection}>
                        <Pressable style={({ pressed }) => [styles.donateButton, { backgroundColor: colors.primaryDark }, pressed && styles.donateButtonPressed]} onPress={handleDonate}>
                            <View style={styles.buttonContent}>
                                <Ionicons name="cafe" size={24} color="#fff" />
                                <Text style={[styles.donateText, { color: colors.text }]}>Buy Me a Coffee</Text>
                                <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.arrowIcon} />
                            </View>
                        </Pressable>
                        <Text style={[styles.supportText, { color: colors.textMuted }]}>Thank you for supporting this project! ☕</Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, marginTop: 30 },
    scrollContainer: { flex: 1 },
    contentWrapper: { paddingHorizontal: 24, paddingVertical: 20, maxWidth: 780, alignSelf: 'center', width: '100%' },
    headerSection: { alignItems: 'center', marginBottom: 40 },
    iconWrapper: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
    title: { fontSize: 28, fontWeight: '700', marginBottom: 16, textAlign: 'center', lineHeight: 34 },
    subtitle: { fontSize: 16, textAlign: 'center', lineHeight: 24, paddingHorizontal: 20 },
    featuresSection: { borderRadius: 16, padding: 20, marginBottom: 32 },
    featureItem: { flexDirection: 'row', alignItems: 'center', marginVertical: 10 },
    featureText: { fontSize: 16, marginLeft: 12, flex: 1 },
    donationSection: { alignItems: 'center' },
    donateButton: { borderRadius: 16, paddingVertical: 15, paddingHorizontal: 26, marginBottom: 16, minWidth: 200 },
    donateButtonPressed: { transform: [{ scale: 0.96 }] },
    buttonContent: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
    donateText: { fontSize: 18, fontWeight: '500', marginLeft: 12, marginRight: 8 },
    arrowIcon: { opacity: 0.8 },
    supportText: { fontSize: 14, textAlign: 'center', fontStyle: 'italic', paddingVertical: 10 },
});

export default DonateScreen;