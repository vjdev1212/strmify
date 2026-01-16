import React, { useEffect, useState } from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryService, LibraryItem } from '@/utils/LibraryService';
import * as Haptics from 'expo-haptics';
import { isHapticsSupported } from '@/utils/platform';

interface LibraryButtonProps {
    item: Omit<LibraryItem, 'timestamp'>;
    size?: number;
    color?: string;
}

const LibraryButton: React.FC<LibraryButtonProps> = ({
    item,
    size = 28,
    color = '#fff'
}) => {
    const [isInLibrary, setIsInLibrary] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        checkLibraryStatus();
    }, [item.moviedbid, item.type]);

    const checkLibraryStatus = async () => {
        const inLibrary = await libraryService.isInLibrary(item.moviedbid, item.type);
        setIsInLibrary(inLibrary);
    };

    const handlePress = async () => {
        if (loading) return;

        setLoading(true);

        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        }

        try {
            if (isInLibrary) {
                const success = await libraryService.removeFromLibrary(item.moviedbid, item.type);
                if (success) {
                    setIsInLibrary(false);
                }
            } else {
                const success = await libraryService.addToLibrary(item);
                if (success) {
                    setIsInLibrary(true);
                }
            }
        } catch (error) {
            console.error('Error toggling library status:', error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <TouchableOpacity
            onPress={handlePress}
            style={[
                styles.button,
                isInLibrary && styles.buttonActive
            ]}
            disabled={loading}
        >
            {loading ? (
                <ActivityIndicator size="small" color={color} />
            ) : (
                <Ionicons
                    name={isInLibrary ? 'bookmark' : 'bookmark-outline'}
                    size={size}
                    color={color}
                />
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.3)',
    },
    buttonActive: {
        backgroundColor: 'rgba(83, 90, 255, 0.3)',
        borderColor: 'rgba(83, 90, 255, 0.5)',
    },
});

export default LibraryButton;