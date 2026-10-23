import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView } from 'react-native';
import { Text, View, StatusBar } from '@/components/Themed';
import { MaterialIcons } from '@expo/vector-icons';
import { getOriginalPlatform, showAlert } from '@/utils/platform';
import BottomSpacing from '@/components/BottomSpacing';
import {
    Players
} from '@/utils/MediaPlayer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StorageKeys, storageService } from '@/utils/StorageService';
import { useTheme } from '@/context/ThemeContext';
import { NativeButton, NativeSelect } from '@/components/native-ui-controls';

interface PlayerConfig {
    name: string;
    scheme: string;
    encodeUrl: boolean;
    isDefault: boolean;
}

const DEFAULT_MEDIA_PLAYER_KEY = StorageKeys.DEFAULT_MEDIA_PLAYER_KEY;

const MediaPlayerConfigScreen = () => {
    const { colors } = useTheme();
    const [players, setPlayers] = useState<PlayerConfig[]>([]);
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        loadPlayerConfig();
    }, []);

    const getPlatformSpecificPlayers = (): PlayerConfig[] => {
        const baseConfig = (name: string, scheme: string, encodeUrl: boolean): PlayerConfig => ({
            name,
            scheme,
            encodeUrl,
            isDefault: false
        });

        if (getOriginalPlatform() === 'android') {
            return [
                baseConfig(Players.Default, 'STREAMURL', false),
                baseConfig(Players.VLC, 'vlc://STREAMURL', false),
                baseConfig(Players.External, 'STREAMURL', false),
            ];
        } else if (getOriginalPlatform() === 'ios') {
            return [
                baseConfig(Players.Default, 'STREAMURL', false),
                baseConfig(Players.External, 'STREAMURL', false),
                baseConfig(Players.VLC, 'vlc://STREAMURL', false),
                baseConfig(Players.Infuse, 'infuse://x-callback-url/play?url=STREAMURL', true),
                baseConfig(Players.VidHub, 'open-vidhub://x-callback-url/open?url=STREAMURL', true),
                baseConfig(Players.Outplayer, 'outplayer://STREAMURL', false),
            ];
        } else if (getOriginalPlatform() === 'web') {
            return [
                baseConfig(Players.Default, 'STREAMURL', false),
                baseConfig(Players.External, 'STREAMURL', false)
            ];
        } else if (getOriginalPlatform() === 'windows') {
            return [
                baseConfig(Players.Default, 'STREAMURL', false),
                baseConfig(Players.External, 'STREAMURL', false),
            ];
        } else if (getOriginalPlatform() === 'macos') {
            return [
                baseConfig(Players.Default, 'STREAMURL', false),
                baseConfig(Players.External, 'STREAMURL', false),
                baseConfig(Players.VLC, 'vlc://STREAMURL', false),
                baseConfig(Players.Infuse, 'infuse://x-callback-url/play?url=STREAMURL', true),
                baseConfig(Players.VidHub, 'open-vidhub://x-callback-url/open?url=STREAMURL', true),
            ];
        }
        return [];
    };

    const loadPlayerConfig = async () => {
        try {
            const platformPlayers = getPlatformSpecificPlayers();
            const savedDefault = storageService.getItem(DEFAULT_MEDIA_PLAYER_KEY);

            if (savedDefault) {
                const defaultPlayerName = JSON.parse(savedDefault);
                setSelectedPlayer(defaultPlayerName);
                const updatedPlayers = platformPlayers.map(player => ({
                    ...player,
                    isDefault: player.name === defaultPlayerName
                }));
                setPlayers(updatedPlayers);
            } else {
                setPlayers(platformPlayers);
                if (platformPlayers.length > 0) {
                    setSelectedPlayer(platformPlayers[0].name);
                }
            }
        } catch (error) {
            console.error('Error loading player config:', error);
            showAlert('Error', 'Failed to load player configuration');
            setPlayers(getPlatformSpecificPlayers());
        } finally {
            setLoading(false);
        }
    };

    const handlePlayerSelect = async (playerName: string) => {
        setSelectedPlayer(playerName);
    };

    const savePlayerConfig = async () => {
        if (!selectedPlayer) {
            showAlert('Error', 'Please select a media player');
            return;
        }
        setSaving(true);
        try {
            storageService.setItem(DEFAULT_MEDIA_PLAYER_KEY, JSON.stringify(selectedPlayer));
            showAlert('Success', 'Player settings saved successfully');
        } catch (error) {
            console.error('Error saving player config:', error);
            showAlert('Error', 'Failed to save player configuration');
        } finally {
            setSaving(false);
        }
    };

    const resetToDefault = async () => {
        showAlert(
            'Reset to Default',
            'Are you sure you want to reset to the default media player?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reset',
                    onPress: async () => {
                        try {
                            storageService.removeItem(DEFAULT_MEDIA_PLAYER_KEY);
                            const platformPlayers = getPlatformSpecificPlayers();
                            setPlayers(platformPlayers);
                            if (platformPlayers.length > 0) {
                                setSelectedPlayer(platformPlayers[0].name);
                            }
                            showAlert('Success', 'Player settings reset to default');
                        } catch (error) {
                            console.error('Error resetting player config:', error);
                            showAlert('Error', 'Failed to reset player configuration');
                        }
                    }
                }
            ]
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.centeredContainer}>
                <View style={styles.loadingContainer}>
                    <Text style={[styles.loadingText, { color: colors.textMuted }]}>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar />
            <View style={styles.contentContainer}>
                <View style={styles.headerSection}>
                    <Text style={[styles.title, { color: colors.text }]}>Media Player</Text>
                    <Text style={[styles.subtitle, { color: colors.textMuted }]}>
                        Select your preferred player for streaming
                    </Text>
                </View>
                <ScrollView
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={styles.scrollContent}
                >
                    <NativeSelect
                        selectedValue={selectedPlayer ?? players[0]?.name ?? ''}
                        onValueChange={handlePlayerSelect}
                        options={players.map((player) => ({ label: player.name, value: player.name }))}
                        enabled={players.length > 0}
                        style={styles.playerSelect}
                    />

                    <View style={styles.buttonSection}>
                        <NativeButton
                            style={[styles.button, { backgroundColor: colors.primarySurface, borderWidth: 1, borderColor: colors.primaryBorder }]}
                            onPress={resetToDefault}
                            label="Reset"
                            variant="outlined"
                            seedColor={colors.primary}
                        >
                            <MaterialIcons name="refresh" size={20} color={colors.text} />
                            <Text style={[styles.buttonText, { color: colors.text }]}>Reset</Text>
                        </NativeButton>

                        <NativeButton
                            style={[styles.button, { backgroundColor: colors.primary }, saving && styles.buttonDisabled]}
                            onPress={savePlayerConfig}
                            disabled={saving}
                            label={saving ? 'Saving...' : 'Save'}
                            seedColor={colors.primary}
                        >
                            <MaterialIcons
                                name={saving ? 'hourglass-empty' : 'save'}
                                size={20}
                                color={colors.text}
                            />
                            <Text style={[styles.buttonText, { color: colors.text }]}>
                                {saving ? 'Saving...' : 'Save'}
                            </Text>
                        </NativeButton>
                    </View>
                </ScrollView>
            </View>
            <BottomSpacing space={30} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    scrollContent: {
        paddingBottom: 20,
    },
    contentContainer: {
        paddingHorizontal: 20,
        maxWidth: 600,
        alignSelf: 'center',
        width: '100%',
    },
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingContainer: {
        alignItems: 'center',
        padding: 32,
    },
    loadingText: {
        fontSize: 15,
        fontWeight: '400',
    },
    headerSection: {
        paddingTop: 60,
        marginBottom: 10,
        paddingVertical: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 8,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        lineHeight: 20,
        fontWeight: '400',
    },
    playerSelect: {
        width: '100%',
        marginBottom: 24,
    },
    playbackSection: {
        marginBottom: 32,
    },
    preferenceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        paddingVertical: 16,
        paddingHorizontal: 4,
    },
    preferenceText: {
        flex: 1,
    },
    preferenceTitle: {
        fontSize: 16,
        fontWeight: '600',
        letterSpacing: -0.2,
        marginBottom: 4,
    },
    preferenceDescription: {
        fontSize: 13,
        lineHeight: 18,
    },
    buttonSection: {
        flexDirection: 'row',
        gap: 12,
        paddingTop: 8,
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 25,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    buttonPressed: {
        opacity: 0.7,
    },
    buttonText: {
        fontSize: 15,
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
});

export default MediaPlayerConfigScreen;
