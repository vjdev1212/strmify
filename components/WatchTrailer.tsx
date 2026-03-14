import React from 'react';
import { TouchableOpacity, StyleSheet, Linking } from 'react-native';
import * as Haptics from 'expo-haptics';
import { isHapticsSupported, showAlert } from '@/utils/platform';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/context/ThemeContext';

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
    const { colors } = useTheme();

    const handleTrailerPress = async () => {
        if (!trailerKey) {
            showAlert('No Trailer Available', 'Sorry, no trailer is available for this content.');
            return;
        }
        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }
        try {
            await Linking.openURL(`https://www.youtube.com/watch?v=${trailerKey}`);
        } catch (error) {
            console.error('Error opening trailer:', error);
            showAlert('Error', 'Failed to open trailer');
        }
    };

    return (
        <TouchableOpacity
            style={[
                styles.button,
                {
                    backgroundColor: colors.primarySurface,
                    borderColor: colors.primaryBorder,
                },
                !trailerKey && { backgroundColor: colors.backgroundCard, opacity: 0.5 },
            ]}
            onPress={handleTrailerPress}
            disabled={!trailerKey}
        >
            <Ionicons
                name="film-outline"
                size={size}
                color={trailerKey ? colors.text : colors.textDim}
            />
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        width: 50,
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
    },
});

export default WatchTrailerButton;