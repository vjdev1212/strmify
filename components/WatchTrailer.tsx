import React from 'react';
import { TouchableOpacity, StyleSheet, Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import { isHapticsSupported, showAlert } from '@/utils/platform';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

interface WatchTrailerButtonProps {
    trailerKey: string | null;
    size?: number;
    color?: string;
}

const WatchTrailerButton: React.FC<WatchTrailerButtonProps> = ({ 
    trailerKey,
    size = 28,
    color = '#fff'
}) => {
    const handleTrailerPress = async () => {
        if (!trailerKey) {
            showAlert('No Trailer Available', 'Sorry, no trailer is available for this content.');
            return;
        }

        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
            style={[
                styles.button,
                !trailerKey && styles.buttonDisabled
            ]}
            onPress={handleTrailerPress}
            disabled={!trailerKey}
        >
            <Ionicons 
                name="film-outline" 
                size={size} 
                color={trailerKey ? Colors.text : Colors.textDim}
            />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: Colors.primarySurface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: Colors.primaryBorder,
    },
    buttonDisabled: {
        backgroundColor: Colors.backgroundCard,
        borderColor: Colors.primaryBorder,
        opacity: 0.5,
    },
});

export default WatchTrailerButton;