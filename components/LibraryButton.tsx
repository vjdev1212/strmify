import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { libraryService, LibraryItem } from '@/utils/LibraryService';
import * as Haptics from 'expo-haptics';
import { isHapticsSupported } from '@/utils/platform';
import { useTheme } from '@/context/ThemeContext';

interface LibraryButtonProps {
    item: Omit<LibraryItem, 'timestamp'>;
    size?: number;
    color?: string;
}

const LibraryButton: React.FC<LibraryButtonProps> = ({ item, size = 28, color = '#fff' }) => {
    const { colors } = useTheme();
    const [isInLibrary, setIsInLibrary] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => { checkLibraryStatus(); }, [item.moviedbid, item.type]);

    const checkLibraryStatus = async () => {
        setIsInLibrary(await libraryService.isInLibrary(item.moviedbid, item.type));
    };

    const handlePress = async () => {
        if (loading) return;
        setLoading(true);
        if (isHapticsSupported()) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        try {
            if (isInLibrary) {
                if (await libraryService.removeFromLibrary(item.moviedbid, item.type)) setIsInLibrary(false);
            } else {
                if (await libraryService.addToLibrary(item)) setIsInLibrary(true);
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
                { backgroundColor: colors.primarySurface, borderColor: colors.primaryBorder },
                isInLibrary && { backgroundColor: colors.primaryMuted, opacity: 0.5 },
            ]}
            disabled={loading}
        >
            {loading
                ? <ActivityIndicator size="small" color={color} />
                : <Ionicons name={isInLibrary ? 'bookmark' : 'bookmark-outline'} size={size} color={color} />
            }
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', borderWidth: 2 },
});

export default LibraryButton;