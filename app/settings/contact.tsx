import React from 'react';
import { StyleSheet, Pressable, Linking, ScrollView } from 'react-native';
import { AntDesign, Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { View, Text, StatusBar } from '@/components/Themed';
import { isHapticsSupported } from '@/utils/platform';
import { SafeAreaView } from 'react-native-safe-area-context';

type IconLibrary = 'AntDesign' | 'Ionicons';

interface ContactItem {
    type: string;
    value: string;
    icon: string;
    iconLibrary: IconLibrary;
    action: () => Promise<void>;
}

const ContactScreen = () => {
    const feedbackUrl = process.env.EXPO_PUBLIC_FEEDBACK_URL || '';
    const reportBugUrl = process.env.EXPO_PUBLIC_REPORT_BUG_URL || '';
    
    const contactInfo: ContactItem[] = [
        {
            type: 'Feedback',
            value: 'Submit your feedback',
            icon: 'form',
            iconLibrary: 'AntDesign',
            action: async () => {
                if (isHapticsSupported()) {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                }
                Linking.openURL(feedbackUrl);
            },
        },
        {
            type: 'Report Bug',
            value: 'Found a Bug? Report here',
            icon: 'bug-outline',
            iconLibrary: 'Ionicons',
            action: async () => {
                if (isHapticsSupported()) {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                }
                Linking.openURL(reportBugUrl);
            },
        }        
    ];

    const renderIcon = (item: ContactItem) => {
        const iconProps = {
            name: item.icon as any,
            size: 24,
            color: "#535aff"
        };

        switch (item.iconLibrary) {
            case 'Ionicons':
                return <Ionicons {...iconProps} />;
            case 'AntDesign':
            default:
                return <AntDesign {...iconProps} />;
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar />
            <ScrollView 
                style={styles.scrollContainer} 
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.headerContainer}>
                    <Text style={styles.title}>Get in Touch</Text>
                    <Text style={styles.subtitle}>Your input makes the app better</Text>
                </View>

                <View style={styles.contactList}>
                    {contactInfo.map((item, index) => (
                        <Pressable
                            key={index}
                            style={({ pressed }) => [
                                styles.contactItem,
                                pressed && styles.contactItemPressed
                            ]}
                            onPress={item.action}
                        >
                            <View style={styles.iconContainer}>
                                {renderIcon(item)}
                            </View>
                            <View style={styles.contentContainer}>
                                <Text style={styles.type}>{item.type}</Text>
                                <Text style={styles.value}>{item.value}</Text>
                            </View>
                            <View style={styles.arrowContainer}>
                                <AntDesign name="right" size={16} color="#666" />
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
        margin: 'auto'  
    },
    scrollContainer: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    headerContainer: {
        alignItems: 'center',
        paddingVertical: 40,
        paddingHorizontal: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#ffffff',
        marginBottom: 8,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#999',
        textAlign: 'center',
        fontWeight: '400',
    },
    contactList: {
        backgroundColor: 'transparent',
    },
    contactItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#101010',
        borderRadius: 16,
        paddingVertical: 15,
        paddingHorizontal: 20,
        marginBottom: 12,
        borderWidth: 0.5,
        borderColor: '#1f1f1f',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    contactItemPressed: {
        backgroundColor: '#1a1a1a',
        transform: [{ scale: 0.98 }],
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: 'rgba(83, 90, 255, 0.1)',
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
        color: '#ffffff',
        marginBottom: 4,
    },
    value: {
        fontSize: 14,
        color: '#999',
        fontWeight: '400',
        lineHeight: 20,
    },
    arrowContainer: {
        backgroundColor: 'transparent',
        marginLeft: 8,
    },
});

export default ContactScreen;