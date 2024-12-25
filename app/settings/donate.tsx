import React from 'react';
import { StyleSheet, TouchableOpacity, Linking, Platform } from 'react-native';
import { View, Text } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics'

const DonateScreen = () => {

    const handleDonate = async () => {
        if (Platform.OS !== 'web') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        const profileUsername = 'iamvijay91';
        const buyMeACoffeeUrl = `https://www.buymeacoffee.com/${profileUsername}`;
        Linking.openURL(buyMeACoffeeUrl).catch((err) =>
            console.error('Failed to open URL:', err)
        );
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Liked the App!</Text>
            <Text style={styles.subtitle}>
                If you find this app useful and want to support its continued development, consider buying me a coffee. Your support keeps this project alive and thriving!      </Text>

            <TouchableOpacity style={styles.donateButton} onPress={handleDonate}>
                <Ionicons name="cafe-outline" size={24} color="#fff" style={styles.icon} />
                <Text style={styles.donateText}>Buy Me a Coffee</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginVertical: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#666',
        marginVertical: 20,
        textAlign: 'center',
    },
    donateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#535aff',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 5,
        marginVertical: 20,
        marginHorizontal: 'auto'
    },
    donateText: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '600',
        marginLeft: 10,
    },
    icon: {
        marginRight: 5,
    },
});

export default DonateScreen;
