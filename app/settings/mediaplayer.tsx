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
    const router = useRouter();

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
                baseConfig(Players.VLCKit, 'STREAMURL', false),
                baseConfig(Players.Browser, 'STREAMURL', false),
                baseConfig(Players.VLC, 'vlc://STREAMURL', false)
            ];
        } else if (getOriginalPlatform() === 'ios') {
            return [
                baseConfig(Players.Default, 'STREAMURL', false),
                baseConfig(Players.VLCKit, 'STREAMURL', false),
                baseConfig(Players.Browser, 'STREAMURL', false),
                baseConfig(Players.VLC, 'vlc://STREAMURL', false),
                baseConfig(Players.Infuse, 'infuse://x-callback-url/play?url=STREAMURL', true),
                baseConfig(Players.VidHub, 'open-vidhub://x-callback-url/open?url=STREAMURL', true),
                baseConfig(Players.Outplayer, 'outplayer://STREAMURL', false),
            ];
        } else if (getOriginalPlatform() === 'web') {
            return [
                baseConfig(Players.Default, 'STREAMURL', false),
                baseConfig(Players.Browser, 'STREAMURL', false)
            ];
        } else if (getOriginalPlatform() === 'windows') {
            return [
                baseConfig(Players.Default, 'STREAMURL', false),
                baseConfig(Players.VLCKit, 'STREAMURL', false),
                baseConfig(Players.Browser, 'STREAMURL', false),
            ];
        } else if (getOriginalPlatform() === 'macos') {
            return [
                baseConfig(Players.Default, 'STREAMURL', false),
                baseConfig(Players.VLCKit, 'STREAMURL', false),
                baseConfig(Players.Browser, 'STREAMURL', false),
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
            const savedDefault = await storageService.getItem(DEFAULT_MEDIA_PLAYER_KEY);

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
        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
        setSelectedPlayer(playerName);
    };

    const savePlayerConfig = async () => {
        if (!selectedPlayer) {
            showAlert('Error', 'Please select a media player');
            return;
        }

        setSaving(true);

        try {
            await storageService.setItem(DEFAULT_MEDIA_PLAYER_KEY, JSON.stringify(selectedPlayer));

            if (isHapticsSupported()) {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            }

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
                            await storageService.removeItem(DEFAULT_MEDIA_PLAYER_KEY);
                            const platformPlayers = getPlatformSpecificPlayers();
                            setPlayers(platformPlayers);
                            if (platformPlayers.length > 0) {
                                setSelectedPlayer(platformPlayers[0].name);
                            }

                            if (isHapticsSupported()) {
                                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
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
                    <Text style={styles.loadingText}>Loading player configuration...</Text>
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
                        <Text style={styles.title}>Default Media Player</Text>
                        <Text style={styles.subtitle}>
                            Choose your preferred media player for streaming content
                        </Text>
                    </View>

                    <View style={styles.playersSection}>
                        <View style={styles.playersContainer}>
                            {players.map((player, index) => (
                                <Pressable
                                    key={player.name}
                                    style={[
                                        styles.playerRow,
                                        index === 0 && styles.firstRow,
                                        index === players.length - 1 && styles.lastRow
                                    ]}
                                    onPress={() => handlePlayerSelect(player.name)}
                                >
                                    <View style={styles.playerContent}>
                                        <View style={styles.playerInfo}>
                                            <Text style={styles.playerName}>
                                                {player.name}
                                            </Text>
                                        </View>
                                        <View style={styles.checkmarkContainer}>
                                            {selectedPlayer === player.name && (
                                                <MaterialIcons
                                                    name="check"
                                                    size={20}
                                                    color="#535aff"
                                                />
                                            )}
                                        </View>
                                    </View>
                                </Pressable>
                            ))}
                        </View>
                    </View>

                    <View style={styles.buttonSection}>
                        <Pressable
                            style={[styles.button, styles.secondaryButton]}
                            onPress={resetToDefault}
                        >
                            <MaterialIcons name="refresh" size={18} color="#ffffff" style={styles.buttonIcon} />
                            <Text style={styles.secondaryButtonText}>Reset</Text>
                        </Pressable>

                        <Pressable
                            style={[
                                styles.button,
                                styles.primaryButton,
                                saving && styles.buttonDisabled
                            ]}
                            onPress={savePlayerConfig}
                            disabled={saving}
                        >
                            {saving ? (
                                <>
                                    <MaterialIcons name="hourglass-empty" size={18} color="#ffffff" style={styles.buttonIcon} />
                                    <Text style={styles.primaryButtonText}>Saving...</Text>
                                </>
                            ) : (
                                <>
                                    <MaterialIcons name="save" size={18} color="#ffffff" style={styles.buttonIcon} />
                                    <Text style={styles.primaryButtonText}>Save</Text>
                                </>
                            )}
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
        paddingHorizontal: 24,
        maxWidth: 780,
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
        fontSize: 16,
        color: '#888888',
        fontWeight: '400',
    },
    headerSection: {
        alignItems: 'center',
        marginBottom: 10,
        paddingVertical: 20,
    },
    title: {
        fontSize: 30,
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'center',
        color: '#ffffff',
    },
    subtitle: {
        fontSize: 16,
        textAlign: 'center',
        color: '#888888',
        lineHeight: 24,
        paddingHorizontal: 20,
        fontWeight: '400',
    },
    playersSection: {
        marginBottom: 30,
    },
    playersContainer: {
        backgroundColor: '#1C1C1E',
        borderRadius: 12,
        overflow: 'hidden',
    },
    playerRow: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderBottomWidth: 0.5,
        borderBottomColor: '#2C2C2E',
        minHeight: 44,
    },
    firstRow: {
        borderTopLeftRadius: 12,
        borderTopRightRadius: 12,
    },
    lastRow: {
        borderBottomWidth: 0,
        borderBottomLeftRadius: 12,
        borderBottomRightRadius: 12,
    },
    playerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 4,
    },
    playerInfo: {
        flex: 1,
        paddingRight: 12,
    },
    playerName: {
        fontSize: 17,
        fontWeight: '400',
        color: '#ffffff',
        lineHeight: 22,
    },
    playerDescription: {
        fontSize: 13,
        color: '#888888',
        lineHeight: 18,
        fontWeight: '400',
    },
    checkmarkContainer: {
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
    },
    buttonSection: {
        flexDirection: 'row',
        gap: 16,
        marginTop: 8,
        paddingTop: 20,
        borderTopWidth: 1,
        borderTopColor: '#2a2a2a',
    },
    button: {
        flex: 1,
        paddingVertical: 16,
        paddingHorizontal: 20,
        borderRadius: 16,
        alignItems: 'center',
        flexDirection: 'row',
        justifyContent: 'center',
        borderWidth: 1,       
        overflow: 'hidden',
    },
    primaryButton: {
        backgroundColor: 'rgba(83, 90, 255, 0.2)',
        borderColor: 'rgba(83, 90, 255, 0.3)',
        shadowColor: '#535aff',
    },
    secondaryButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    buttonIcon: {
        marginRight: 8,
    },
    primaryButtonText: {
        fontSize: 16,
        color: '#ffffff',
        fontWeight: '500',
    },
    secondaryButtonText: {
        fontSize: 16,
        color: '#ffffff',
        fontWeight: '500',
    },
    buttonDisabled: {
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderColor: 'rgba(255, 255, 255, 0.05)',
        opacity: 0.4,
    },
});

export default MediaPlayerConfigScreen;