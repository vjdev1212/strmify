import React from 'react';
import { StyleSheet, Pressable, Linking, SafeAreaView, ScrollView } from 'react-native';
import { Text, StatusBar } from '@/components/Themed';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics'
import { isHapticsSupported } from '@/utils/platform';
import { LinearGradient } from 'expo-linear-gradient';

const DonateScreen = () => {

    const handleDonate = async () => {
        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        }
        const profileUsername = 'iamvijay91';
        const buyMeACoffeeUrl = `https://www.buymeacoffee.com/${profileUsername}`;
        Linking.openURL(buyMeACoffeeUrl).catch((err) =>
            console.error('Failed to open URL:', err)
        );
    };

    return (
        <LinearGradient colors={['#111111', '#999999', '#222222']} start={[0, 0]} end={[1, 1]} style={{ flex: 1 }}>

            <SafeAreaView style={styles.container}>
                <StatusBar />
                <ScrollView style={styles.donateContainer} showsVerticalScrollIndicator={false}>
                    <Text style={styles.title}>Liked the App!</Text>
                    <Text style={styles.subtitle}>
                        If you find this app useful and want to support its continued development, consider buying me a coffee. Your support keeps this project alive and thriving!      </Text>

                    <Pressable style={styles.donateButton} onPress={handleDonate}>
                        <Ionicons name="cafe-outline" size={24} color="#fff" style={styles.icon} />
                        <Text style={styles.donateText}>Buy Me a Coffee</Text>
                    </Pressable>
                </ScrollView>
            </SafeAreaView>
        </LinearGradient>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        width: '100%',
        maxWidth: 780,
        margin: 'auto',
        marginTop: 30
    },
    donateContainer: {
        marginHorizontal: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginVertical: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        marginVertical: 20,
        textAlign: 'center',
    },
    donateButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 30,
        borderRadius: 30,
        marginVertical: 20,
        marginHorizontal: 'auto',
        borderColor: '#ffffff',
        borderWidth: 1,
    },
    donateText: {
        color: '#fff',
        fontSize: 18,
        marginLeft: 10,
    },
    icon: {
        marginRight: 5,
    },
});

export default DonateScreen;
