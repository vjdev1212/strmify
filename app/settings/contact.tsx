import React from 'react';
import { StyleSheet, Pressable, Linking, ScrollView } from 'react-native';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import { View, Text, StatusBar } from '@/components/Themed';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';

type IconLibrary = 'AntDesign' | 'Ionicons';
interface ContactItem { type: string; value: string; icon: string; iconLibrary: IconLibrary; action: () => Promise<void>; }

const ContactScreen = () => {
    const { colors } = useTheme();
    const feedbackUrl = process.env.EXPO_PUBLIC_FEEDBACK_URL || '';
    const reportBugUrl = process.env.EXPO_PUBLIC_REPORT_BUG_URL || '';

    const contactInfo: ContactItem[] = [
        { type: 'Feedback', value: 'Submit your feedback', icon: 'form', iconLibrary: 'AntDesign', action: async () => Linking.openURL(feedbackUrl) },
        { type: 'Report Bug', value: 'Found a Bug? Report here', icon: 'bug-outline', iconLibrary: 'Ionicons', action: async () => Linking.openURL(reportBugUrl) },
    ];

    const renderIcon = (item: ContactItem) => {
        const props = { name: item.icon as any, size: 24, color: colors.primary };
        return item.iconLibrary === 'Ionicons' ? <Ionicons {...props} /> : <AntDesign {...props} />;
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar />

            {/* ✅ Fixed header */}
            <View style={styles.headerContainer}>
                <Text style={[styles.title, { color: colors.text }]}>Get in Touch</Text>
                <Text style={[styles.subtitle, { color: colors.textMuted }]}>Your input makes the app better</Text>
            </View>

            {/* ✅ Only content scrolls */}
            <ScrollView
                style={styles.scrollContainer}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.contactList}>
                    {contactInfo.map((item, index) => (
                        <Pressable
                            key={index}
                            style={({ pressed }) => [
                                styles.contactItem,
                                { backgroundColor: colors.primarySurface, borderColor: colors.primaryBorder },
                                pressed && { backgroundColor: colors.backgroundMid, transform: [{ scale: 0.98 }] },
                            ]}
                            onPress={item.action}
                        >
                            <View style={[styles.iconContainer, { backgroundColor: colors.primarySurface }]}>
                                {renderIcon(item)}
                            </View>
                            <View style={styles.contentContainer}>
                                <Text style={[styles.type, { color: colors.text }]}>{item.type}</Text>
                                <Text style={[styles.value, { color: colors.textMuted }]}>{item.value}</Text>
                            </View>
                            <View style={styles.arrowContainer}>
                                <AntDesign name="right" size={16} color={colors.textDim} />
                            </View>
                        </Pressable>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        maxWidth: 780,
        alignSelf: 'center',
    },
    headerContainer: {
        alignItems: 'flex-start',
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'left',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'left',
        fontWeight: '400',
    },
    scrollContainer: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    contactList: {
        backgroundColor: 'transparent',
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 16,
        paddingVertical: 15,
        paddingHorizontal: 20,
        marginBottom: 12,
        borderWidth: 0.5,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    contentContainer: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    type: {
        fontSize: 17,
        fontWeight: '500',
        marginBottom: 4,
    },
    value: {
        fontSize: 14,
        fontWeight: '400',
        lineHeight: 20,
    },
    arrowContainer: {
        backgroundColor: 'transparent',
        marginLeft: 8,
    },
});

export default ContactScreen;