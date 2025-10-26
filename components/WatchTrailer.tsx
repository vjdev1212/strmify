import React from 'react';
import { TouchableOpacity, StyleSheet, Linking, Alert } from 'react-native';
import { Text } from './Themed';
import * as Haptics from 'expo-haptics';
import { isHapticsSupported, showAlert } from '@/utils/platform';
import { Ionicons } from '@expo/vector-icons';

interface WatchTrailerButtonProps {
    trailerKey: string | null;
}

const WatchTrailerButton: React.FC<WatchTrailerButtonProps> = ({ trailerKey }) => {
    const handleTrailerPress = async () => {
        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }

        if (!trailerKey) {
            showAlert('No Trailer Available', 'Sorry, no trailer is available for this movie.');
            return;
        }

        const youtubeUrl = `https://www.youtube.com/watch?v=${trailerKey}`;

        try {
            await Linking.openURL(youtubeUrl);
        } catch (error) {
            console.error('Error opening trailer:', error);
            showAlert('Error', 'Failed to open trailer');
        }
    };

    return (
        <TouchableOpacity
            style={[styles.button]}
            onPress={handleTrailerPress}
            disabled={!trailerKey}
        >
            <Ionicons name="film-outline" size={24} color="#fff" style={styles.icon} />
            <Text style={styles.buttonText}> {trailerKey ? 'Trailer' : 'NA'}</Text>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        minWidth: 150,
        alignItems: 'center',
        marginVertical: 20,
        alignSelf: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        backgroundColor: '#1f1f1f',
    },
    buttonDisabled: {
        backgroundColor: '#101010ff',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        opacity: 1,
    },
    buttonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    icon: {
        marginRight: 8,
    }
});

export default WatchTrailerButton;