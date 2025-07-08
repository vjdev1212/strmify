import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, Pressable, Image, SafeAreaView, Alert } from 'react-native';
import { Text, View, StatusBar } from '@/components/Themed';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { getOriginalPlatform, isHapticsSupported, showAlert } from '@/utils/platform';

enum Players {
    Default = 'Default',
    Browser = 'Browser',
    VLC = 'VLC',
    Infuse = 'Infuse',
    VidHub = 'VidHub',
    MXPlayer = "MX Player",
    MXPlayerPro = "MX PRO",
    OutPlayer = 'OutPlayer'
}

interface PlayerConfig {
    name: string;
    scheme: string;
    encodeUrl: boolean;
    icon: any;
    isDefault: boolean;
}

const STORAGE_KEY = 'defaultMediaPlayer';

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
        const baseConfig = (name: string, scheme: string, encodeUrl: boolean, icon: any): PlayerConfig => ({
            name,
            scheme,
            encodeUrl,
            icon,
            isDefault: false
        });

        if (getOriginalPlatform() === 'android') {
            return [
                baseConfig(Players.Browser, 'STREAMURL', false, require('@/assets/images/players/chrome.png')),
                baseConfig(Players.VLC, 'vlc://STREAMURL', false, require('@/assets/images/players/vlc.png')),
                baseConfig(Players.MXPlayer, 'intent:STREAMURL?sign=Yva5dQp8cFQpVAMUh1QxNWbZAZ2h05lYQ4qAxqf717w=:0#Intent;package=com.mxtech.videoplayer.ad;S.title=STREAMTITLE;end', false, require('@/assets/images/players/mxplayer.png')),
                baseConfig(Players.MXPlayerPro, 'intent:STREAMURL?sign=Yva5dQp8cFQpVAMUh1QxNWbZAZ2h05lYQ4qAxqf717w=:0#Intent;package=com.mxtech.videoplayer.pro;S.title=STREAMTITLE;end', false, require('@/assets/images/players/mxplayer.png')),
                baseConfig(Players.VidHub, 'open-vidhub://x-callback-url/open?url=STREAMURL', true, require('@/assets/images/players/vidhub.png')),
            ];
        } else if (getOriginalPlatform() === 'ios') {
            return [
                baseConfig(Players.Browser, 'STREAMURL', false, require('@/assets/images/players/chrome.png')),
                baseConfig(Players.VLC, 'vlc://STREAMURL', false, require('@/assets/images/players/vlc.png')),
                baseConfig(Players.Infuse, 'infuse://x-callback-url/play?url=STREAMURL', true, require('@/assets/images/players/infuse.png')),
                baseConfig(Players.VidHub, 'open-vidhub://x-callback-url/open?url=STREAMURL', true, require('@/assets/images/players/vidhub.png')),
                baseConfig(Players.OutPlayer, 'outplayer://STREAMURL', false, require('@/assets/images/players/outplayer.png')),
            ];
        } else if (getOriginalPlatform() === 'web') {
            return [
                baseConfig(Players.Browser, 'STREAMURL', false, require('@/assets/images/players/chrome.png'))
            ];
        } else if (getOriginalPlatform() === 'windows') {
            return [
                baseConfig(Players.Browser, 'STREAMURL', false, require('@/assets/images/players/chrome.png')),
            ];
        } else if (getOriginalPlatform() === 'macos') {
            return [
                baseConfig(Players.Browser, 'STREAMURL', false, require('@/assets/images/players/chrome.png')),
                baseConfig(Players.VLC, 'vlc://STREAMURL', false, require('@/assets/images/players/vlc.png')),
                baseConfig(Players.Infuse, 'infuse://x-callback-url/play?url=STREAMURL', true, require('@/assets/images/players/infuse.png')),
                baseConfig(Players.VidHub, 'open-vidhub://x-callback-url/open?url=STREAMURL', true, require('@/assets/images/players/vidhub.png')),
            ];
        }
        return [];
    };

    const loadPlayerConfig = async () => {
        try {
            const platformPlayers = getPlatformSpecificPlayers();
            
            // Load saved default player
            const savedDefault = await AsyncStorage.getItem(STORAGE_KEY);
            
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
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
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
            await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(selectedPlayer));
            
            if (isHapticsSupported()) {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
        Alert.alert(
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
                            await AsyncStorage.removeItem(STORAGE_KEY);
                            const platformPlayers = getPlatformSpecificPlayers();
                            setPlayers(platformPlayers);
                            if (platformPlayers.length > 0) {
                                setSelectedPlayer(platformPlayers[0].name);
                            }
                            
                            if (isHapticsSupported()) {
                                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
                <Text style={styles.loadingText}>Loading player configuration...</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar />
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.contentContainer}>
                    <Text style={styles.title}>Default Media Player</Text>
                    <Text style={styles.subtitle}>
                        Choose your preferred media player for streaming content. 
                        This will be automatically selected when you play streams.
                    </Text>

                    <View style={styles.playersContainer}>
                        {players.map((player) => (
                            <Pressable
                                key={player.name}
                                style={[
                                    styles.playerCard,
                                    selectedPlayer === player.name && styles.playerCardSelected
                                ]}
                                onPress={() => handlePlayerSelect(player.name)}
                            >
                                <View style={styles.playerContent}>
                                    <Image 
                                        source={player.icon} 
                                        style={styles.playerIcon} 
                                        resizeMode="cover"
                                    />
                                    <View style={styles.playerInfo}>
                                        <Text style={styles.playerName}>{player.name}</Text>
                                        <Text style={styles.playerDescription}>
                                            {getPlayerDescription(player.name)}
                                        </Text>
                                    </View>
                                    <View style={styles.checkboxContainer}>
                                        <MaterialIcons
                                            name={selectedPlayer === player.name ? 'check-circle' : 'check-circle-outline'}
                                            size={24}
                                            color={selectedPlayer === player.name ? '#535aff' : '#666'}
                                        />
                                    </View>
                                </View>
                            </Pressable>
                        ))}
                    </View>

                    <View style={styles.buttonContainer}>
                        <Pressable
                            style={[styles.button, styles.secondaryButton]}
                            onPress={resetToDefault}
                        >
                            <Text style={styles.secondaryButtonText}>Reset</Text>
                        </Pressable>
                        
                        <Pressable
                            style={[styles.button, styles.primaryButton, saving && styles.buttonDisabled]}
                            onPress={savePlayerConfig}
                            disabled={saving}
                        >
                            <Text style={styles.primaryButtonText}>
                                {saving ? 'Saving...' : 'Save'}
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const getPlayerDescription = (playerName: string): string => {
    switch (playerName) {
        case Players.Browser:
            return 'Play in default browser';
        case Players.VLC:
            return 'VLC Media Player';
        case Players.Infuse:
            return 'Infuse video player';
        case Players.VidHub:
            return 'VidHub video player';
        case Players.MXPlayer:
            return 'MX Player (Free)';
        case Players.MXPlayerPro:
            return 'MX Player Pro';
        case Players.OutPlayer:
            return 'OutPlayer video player';
        default:
            return 'Media player';
    }
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 30,
        width: '100%',
        margin: 'auto',
        maxWidth: 780
    },
    contentContainer: {
        marginHorizontal: 20,
        marginVertical: 20
    },
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center'
    },
    subtitle: {
        fontSize: 15,
        textAlign: 'center',
        marginBottom: 30,
        lineHeight: 22
    },
    playersContainer: {
        marginBottom: 30
    },
    playerCard: {
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        padding: 10,
        marginBottom: 10,
        borderWidth: 2,
        borderColor: 'transparent'
    },
    playerCardSelected: {
        borderColor: '#535aff',
        backgroundColor: '#252545'
    },
    playerContent: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    playerIcon: {
        width: 40,
        height: 40,
        borderRadius: 8,
        marginRight: 16
    },
    playerInfo: {
        flex: 1
    },
    playerName: {
        fontSize: 16,
        fontWeight: '600',
        marginBottom: 4
    },
    playerDescription: {
        fontSize: 14,
        color: '#888'
    },
    checkboxContainer: {
        marginLeft: 16
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: 20
    },
    button: {
        flex: 1,
        paddingVertical: 14,
        paddingHorizontal: 15,
        borderRadius: 30,
        alignItems: 'center'
    },
    primaryButton: {
        backgroundColor: '#535aff'
    },
    secondaryButton: {
        backgroundColor: '#101010'
    },
    primaryButtonText: {
        fontSize: 16,
        color: '#ffffff',
    },
    secondaryButtonText: {
        fontSize: 16,
        color: '#ffffff',
    },
    buttonDisabled: {
        backgroundColor: '#3b3b3b',
        opacity: 0.7,
    }
});

export default MediaPlayerConfigScreen;