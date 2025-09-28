import React from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import BottomSpacing from '@/components/BottomSpacing';
import { SafeAreaView } from 'react-native-safe-area-context';

const DisclaimerScreen = () => {
    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Disclaimer</Text>
                <Text style={styles.headerSubtitle}>Important Information</Text>
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.disclaimerContainer}>
                    <Text style={styles.disclaimerText}>
                        This application serves solely as a dashboard interface for movies and TV shows information and does not host, store, or distribute any content.
                    </Text>

                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>📱 Application Purpose</Text>
                        <Text style={styles.sectionText}>
                            This app is only a dashboard that provides movie and TV show information. All content access is provided through third-party addons and external sources that users choose to install and use.
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>⚖️ Legal Notice</Text>
                        <Text style={styles.sectionText}>
                            Users are solely responsible for ensuring their use of any third-party addons or external content sources complies with applicable laws and regulations in their jurisdiction, including copyright laws and licensing agreements.
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>🚫 Not Endorsed</Text>
                        <Text style={styles.sectionText}>
                            The developer does not endorse, encourage, or support:
                            {'\n'}• Accessing pirated or illegally distributed content
                            {'\n'}• Using torrents for copyrighted material
                            {'\n'}• Any activities that violate copyright laws
                            {'\n'}• Illegal streaming or downloading of content
                        </Text>
                    </View>

                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>🛡️ Developer Responsibility</Text>
                        <Text style={styles.sectionText}>
                            The developer of this application:
                            {'\n'}• Is not responsible for user actions or content accessed through addons
                            {'\n'}• Does not provide, control, or moderate third-party content sources
                            {'\n'}• Will not be held liable for any legal consequences resulting from user actions
                            {'\n'}• Has no control over addon functionality or content sources
                        </Text>
                    </View>

                    <View style={styles.warningBox}>
                        <Ionicons name="alert-circle" size={24} color="#535aff" />
                        <Text style={styles.warningText}>
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
    container: {
        flex: 1,
        marginTop: 30,
    },
    header: {
        paddingHorizontal: 20,
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
    },
    headerTitle: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#FFF',
    },
    headerSubtitle: {
        fontSize: 16,
        color: '#888',
        marginTop: 5,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 40,
        width: '100%',
        maxWidth: 780,
        margin: 'auto'
    },
    disclaimerContainer: {
        padding: 20,
    },
    disclaimerText: {
        fontSize: 16,
        color: '#CCC',
        lineHeight: 24,
        marginBottom: 25,
        textAlign: 'center',
        fontStyle: 'italic',
    },
    section: {
        marginBottom: 20,
        padding: 16,
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#535aff',
    },
    sectionHeader: {
        fontSize: 18,
        fontWeight: '600',
        color: '#FFF',
        marginBottom: 12,
    },
    sectionText: {
        fontSize: 15,
        color: '#CCC',
        lineHeight: 22,
    },
    warningBox: {
        backgroundColor: '#1a1a1a',
        borderColor: '#535aff',
        borderWidth: 1,
        borderRadius: 12,
        padding: 16,
        marginTop: 10,
        marginBottom: 25,
    },
    warningText: {
        fontSize: 15,
        color: '#CCC',
        lineHeight: 22,
    },
    footerText: {
        fontSize: 16,
        color: '#535aff',
        textAlign: 'center',
        fontWeight: '600',
        marginTop: 10,
    },
});

export default DisclaimerScreen;