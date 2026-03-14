import React from 'react';
import { StyleSheet, Pressable, Linking, ScrollView, View } from 'react-native';
import { Text, StatusBar } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors } from '@/constants/theme';

const DonateScreen = () => {

    const handleDonate = async () => {
        const profileUsername = process.env.EXPO_PUBLIC_BUY_ME_COFFEE || '';
        const buyMeACoffeeUrl = `https://www.buymeacoffee.com/${profileUsername}`;
        Linking.openURL(buyMeACoffeeUrl).catch((err) =>
            console.error('Failed to open URL:', err)
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar />
            <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
                <View style={styles.contentWrapper}>
                    {/* Header Section */}
                    <View style={styles.headerSection}>
                        <View style={styles.iconWrapper}>
                            <Ionicons name="heart" size={32} color={Colors.primary} />
                        </View>
                        <Text style={styles.title}>Enjoying the App!</Text>
                        <Text style={styles.subtitle}>
                            Your support helps keep this project alive and enables continuous improvements.
                            Every contribution makes a difference!
                        </Text>
                    </View>

                    {/* Features Section */}
                    <View style={styles.featuresSection}>
                        <View style={styles.featureItem}>
                            <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                            <Text style={styles.featureText}>Regular updates & improvements</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                            <Text style={styles.featureText}>New features development</Text>
                        </View>
                        <View style={styles.featureItem}>
                            <Ionicons name="checkmark-circle" size={20} color={Colors.primary} />
                            <Text style={styles.featureText}>Bug fixes & maintenance</Text>
                        </View>
                    </View>

                    {/* Donation Button */}
                    <View style={styles.donationSection}>
                        <Pressable
                            style={({ pressed }) => [
                                styles.donateButton,
                                pressed && styles.donateButtonPressed
                            ]}
                            onPress={handleDonate}
                        >
                            <View style={styles.buttonContent}>
                                <Ionicons name="cafe" size={24} color="#fff" />
                                <Text style={styles.donateText}>Buy Me a Coffee</Text>
                                <Ionicons name="arrow-forward" size={20} color="#fff" style={styles.arrowIcon} />
                            </View>
                        </Pressable>

                        <Text style={styles.supportText}>
                            Thank you for supporting this project! ☕
                        </Text>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 30
    },
    scrollContainer: {
        flex: 1,
    },
    contentWrapper: {
        paddingHorizontal: 24,
        paddingVertical: 20,
        maxWidth: 780,
        alignSelf: 'center',
        width: '100%',
    },
    headerSection: {
        alignItems: 'center',
        marginBottom: 40,
    },
    iconWrapper: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: Colors.primarySurface,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 24
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 16,
        textAlign: 'center',
        color: Colors.text, // Light text
        lineHeight: 34,
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        color: Colors.textMuted, // Muted grey
        lineHeight: 24,
        paddingHorizontal: 20,
    },
    featuresSection: {
        backgroundColor: Colors.primarySurface,
        borderRadius: 16,
        padding: 20,
        marginBottom: 32
    },
    featureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginVertical: 10,
    },
    featureText: {
        fontSize: 16,
        marginLeft: 12,
        color: Colors.textMuted, // Softer white
        flex: 1,
    },
    donationSection: {
        alignItems: 'center',
    },
    donateButton: {
        backgroundColor: Colors.primaryDark, // Keep brand color
        borderRadius: 16,
        paddingVertical: 15,
        paddingHorizontal: 26,
        marginBottom: 16,
        minWidth: 200,
    },
    donateButtonPressed: {
        transform: [{ scale: 0.96 }],
        shadowOpacity: 0.2,
        shadowOffset: { width: 0, height: 3 },
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    donateText: {
        color: Colors.text,
        fontSize: 18,
        fontWeight: '500',
        marginLeft: 12,
        marginRight: 8,
    },
    arrowIcon: {
        opacity: 0.8,
    },
    supportText: {
        fontSize: 14,
        color: Colors.textMuted,
        textAlign: 'center',
        fontStyle: 'italic',
        paddingVertical: 10
    },
});


export default DonateScreen;