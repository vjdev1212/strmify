import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, Pressable, Alert, Platform } from 'react-native';
import { Text, View, StatusBar } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getOriginalPlatform, isHapticsSupported, showAlert } from '@/utils/platform';
import BottomSpacing from '@/components/BottomSpacing';
import { Players } from '@/utils/MediaPlayer';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StorageKeys, storageService } from '@/utils/StorageService';


interface PlayerConfig {
    name: string;
    scheme: string;
    encodeUrl: boolean;
    isDefault: boolean;
}

const DEFAULT_MEDIA_PLAYER_KEY = StorageKeys.DEFAULT_MEDIA_PLAYER_KEY;

const MediaPlayerConfigScreen = () => {
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

            // Load saved default player
            const savedDefault = storageService.getItem(DEFAULT_MEDIA_PLAYER_KEY);

            if (savedDefault) {
                const defaultPlayerName = JSON.parse(savedDefault);
                setSelectedPlayer(defaultPlayerName);

                // Mark the default player
                const updatedPlayers = platformPlayers.map(player => ({
                    ...player,
                    isDefault: player.name === defaultPlayerName
                }));
                setPlayers(updatedPlayers);
            } else {
                // No saved default, use first player as default
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
            showAlert('Success', 'Default media player saved successfully');
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
                {
                    text: 'Cancel',
                    style: 'cancel'
                },
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

                            showAlert('Success', 'Player configuration reset to default');
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
                    <Text style={styles.loadingText}>Loading...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar />
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                <View style={styles.contentContainer}>
                    <View style={styles.headerSection}>
                        <Text style={styles.title}>Media Player</Text>
                        <Text style={styles.subtitle}>
                            Select your preferred player for streaming
                        </Text>
                    </View>

                    <View style={styles.playersSection}>
                        {players.map((player, index) => (
                            <Pressable
                                key={player.name}
                                style={({ pressed }) => [
                                    styles.playerRow,
                                    index === players.length - 1 && styles.lastRow,
                                    pressed && styles.playerRowPressed
                                ]}
                                onPress={() => handlePlayerSelect(player.name)}
                            >
                                <View style={styles.radioButton}>
                                    <View style={[
                                        styles.radioButtonOuter,
                                        selectedPlayer === player.name && styles.radioButtonOuterSelected
                                    ]}>
                                        {selectedPlayer === player.name && (
                                            <View style={styles.radioButtonInner} />
                                        )}
                                    </View>
                                </View>
                                <Text style={styles.playerName}>{player.name}</Text>
                            </Pressable>
                        ))}
                    </View>

                    <View style={styles.buttonSection}>
                        <Pressable
                            style={({ pressed }) => [
                                styles.button,
                                styles.secondaryButton,
                                pressed && styles.buttonPressed
                            ]}
                            onPress={resetToDefault}
                        >
                            <MaterialIcons name="refresh" size={20} color="#ffffff" />
                            <Text style={styles.buttonText}>Reset</Text>
                        </Pressable>

                        <Pressable
                            style={({ pressed }) => [
                                styles.button,
                                styles.primaryButton,
                                pressed && styles.buttonPressed,
                                saving && styles.buttonDisabled
                            ]}
                            onPress={savePlayerConfig}
                            disabled={saving}
                        >
                            <MaterialIcons
                                name={saving ? "hourglass-empty" : "save"}
                                size={20}
                                color="#ffffff"
                            />
                            <Text style={styles.buttonText}>
                                {saving ? 'Saving...' : 'Save'}
                            </Text>
                        </Pressable>
                    </View>
                </View>
                <BottomSpacing space={30} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 30
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
        color: '#666666',
        fontWeight: '400',
    },
    headerSection: {
        alignItems: 'center',
        marginBottom: 32,
        paddingVertical: 16,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        marginBottom: 8,
        textAlign: 'center',
        color: '#ffffff',
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
        color: '#888888',
        lineHeight: 20,
        fontWeight: '400',
    },
    playersSection: {
        marginBottom: 32,
    },
    playerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 4,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    },
    lastRow: {
        borderBottomWidth: 0,
    },
    playerRowPressed: {
        opacity: 0.6,
    },
    radioButton: {
        marginRight: 16,
    },
    radioButtonOuter: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: 'rgba(255, 255, 255, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'transparent',
    },
    radioButtonOuterSelected: {
        borderColor: '#535aff',
        backgroundColor: 'rgba(83, 90, 255, 0.1)',
    },
    radioButtonInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#535aff',
    },
    playerName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#ffffff',
        letterSpacing: -0.2,
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
        borderRadius: 12,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 8,
    },
    primaryButton: {
        backgroundColor: '#535aff',
    },
    secondaryButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    buttonPressed: {
        opacity: 0.7,
    },
    buttonText: {
        fontSize: 15,
        color: '#ffffff',
        fontWeight: '600',
        letterSpacing: -0.2,
    },
    buttonDisabled: {
        opacity: 0.5,
    },
});

export default MediaPlayerConfigScreen;