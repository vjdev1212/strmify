import React, { useEffect, useState } from 'react';
import { StyleSheet, ScrollView, Alert, Pressable, Linking } from 'react-native';
import { Text, View } from '@/components/Themed'; // Replace with your custom themed components
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

const StreamDetailsScreen = () => {
    const [servers, setServers] = useState<{ name: string; url: string }[]>([]);
    const [players] = useState([
        { name: 'VLC', scheme: 'vlc://' },
        { name: 'Infuse', scheme: 'infuse://x-callback-url/play?url=' },
        { name: 'VidHub', scheme: 'open-vidhub://x-callback-url/open?url=' },
        { name: 'OutPlayer', scheme: 'outplayer://' },
    ]);
    const [selectedServer, setSelectedServer] = useState<string | null>(null);
    const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const { name, title, description, url, infoHash } = useLocalSearchParams<{
        name: string;
        title: string;
        description?: string;
        url?: string;
        infoHash?: string;
    }>();

    useEffect(() => {
        const fetchServerConfigs = async () => {
            try {
                const stremioConfig = await AsyncStorage.getItem('stremioServerConfig');
                const torrServerConfig = await AsyncStorage.getItem('torrServerConfig');

                const loadedServers = [];
                if (stremioConfig) {
                    loadedServers.push({ name: 'Stremio Server', url: JSON.parse(stremioConfig).url });
                }
                if (torrServerConfig) {
                    loadedServers.push({ name: 'TorrServer', url: JSON.parse(torrServerConfig).url });
                }

                setServers(loadedServers);
            } catch (error) {
                console.error('Error loading server configurations:', error);
                Alert.alert('Error', 'Failed to load server configurations');
            } finally {
                setLoading(false);
            }
        };

        fetchServerConfigs();
    }, []);

    const handlePlay = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);

        if (!selectedServer || !selectedPlayer) {
            Alert.alert('Error', 'Please select both a server and a media player.');
            return;
        }

        const serverUrl = servers.find((server) => server.name === selectedServer)?.url;
        const playerScheme = players.find((player) => player.name === selectedPlayer)?.scheme;

        if (!serverUrl || !playerScheme) {
            Alert.alert('Error', 'Invalid server or player selection.');
            return;
        }

        try {
            const stremioServerUrl = servers.find((server) => server.name === 'Stremio Server')?.url;

            if (stremioServerUrl && infoHash) {
                const endpointUrl = `${stremioServerUrl}/${infoHash}/create`;

                const payload = {
                    torrent: { infoHash },
                    guessFileIdx: {},
                };

                const response = await fetch(endpointUrl, {
                    method: 'POST',
                    body: JSON.stringify(payload),
                });

                if (response.ok) {
                    const data = await response.json();
                    const streamUrl = url ? encodeURIComponent(url) : encodeURIComponent(`${serverUrl}/${infoHash}/${data.guessedFileIdx || 0}`);
                    const playerUrl = `${playerScheme}${streamUrl}`;
                    Linking.openURL(playerUrl);
                } else {
                    Alert.alert('Error', 'Failed to call the server endpoint. Please try again.');
                }
            } else {
                Alert.alert('Error', 'Stremio Server URL or InfoHash is missing.');
            }
        } catch (error) {
            console.error('Error calling server endpoint:', error);
            Alert.alert('Error', 'Failed to contact the server. Please check your connection and try again.');
        }
    };

    if (loading) {
        return (
            <View style={styles.centeredContainer}>
                <Text style={styles.loadingText}>Loading configurations...</Text>
            </View>
        );
    }

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <View style={styles.mediaItem}>
                <View style={styles.row}>
                    <Text style={styles.label}>Name:</Text>
                    <Text style={styles.value}>{name}</Text>
                </View>
                {title && (
                    <View style={styles.row}>
                        <Text style={styles.label}>Title:</Text>
                        <Text style={styles.value}>{title}</Text>
                    </View>
                )}
                {description && (
                    <View style={styles.row}>
                        <Text style={styles.label}>Description:</Text>
                        <Text style={styles.value} numberOfLines={4}>{description}</Text>
                    </View>
                )}
                {infoHash && (
                    <View style={styles.row}>
                        <Text style={styles.label}>InfoHash:</Text>
                        <Text style={styles.value}>{infoHash}</Text>
                    </View>
                )}

                <Text style={styles.subtitle}>Server:</Text>
                <View style={styles.radioGroup}>
                    {servers.map((server) => (
                        <Pressable
                            key={server.name}
                            style={[
                                styles.radioContainer
                            ]}
                            onPress={() => setSelectedServer(server.name)}
                        >
                            <View style={styles.radioRow}>
                                <View>
                                    <Text style={styles.radioLabel}>{server.name}</Text>
                                    <Text style={styles.radioValue}>{server.url}</Text>
                                </View>
                                <View>
                                    {
                                        selectedServer === server.name ? (
                                            <MaterialIcons
                                                name={'check-circle'}
                                                size={24}
                                                color={'#535aff'}
                                                style={styles.radioIcon}
                                            />
                                        ) : (null)
                                    }
                                </View>
                            </View>
                        </Pressable>
                    ))}
                </View>

                <Text style={styles.subtitle}>Media Player:</Text>
                <View style={styles.radioGroup}>
                    {players.map((player) => (
                        <Pressable
                            key={player.name}
                            style={[
                                styles.radioContainer
                            ]}
                            onPress={() => setSelectedPlayer(player.name)}
                        >
                            <View style={styles.radioRow}>
                                <View>
                                    <Text style={styles.radioLabel}>{player.name}</Text>
                                </View>
                                <View>
                                    {
                                        selectedPlayer === player.name ? (
                                            <MaterialIcons
                                                name={'check-circle'}
                                                size={24}
                                                color={'#535aff'}
                                                style={styles.radioIcon}
                                            />
                                        ) : (null)
                                    }
                                </View>
                            </View>
                        </Pressable>
                    ))}
                </View>

                <View style={styles.buttonContainer}>
                    <Pressable style={styles.button} onPress={handlePlay}>
                        <Text style={styles.buttonText}>Play</Text>
                    </Pressable>
                </View>
            </View>
        </ScrollView >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
    },
    mediaItem: {
        marginBottom: 20,
        padding: 15,
        borderRadius: 10,
    },
    row: {
        flexDirection: 'row',
        marginBottom: 20,
    },
    label: {
        fontSize: 14,
        fontWeight: 'bold',
        flex: 1,
    },
    value: {
        fontSize: 14,
        flex: 2,
    },
    radioGroup: {
        marginVertical: 5
    },
    radioRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    subtitle: {
        marginTop: 10,
        fontSize: 14,
        fontWeight: 'bold',
    },
    radioContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 10
    },
    radioLabel: {
        fontSize: 14,
        marginRight: 10,
    },
    radioValue: {
        fontSize: 13,
        paddingTop: 5,
        color: '#888888'
    },
    radioIcon: {
        marginHorizontal: 20
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center'
    },
    button: {
        marginTop: 20,
        paddingVertical: 15,
        paddingHorizontal: 20,
        alignItems: 'center',
        backgroundColor: '#535aff',
        borderRadius: 30,
        width: '50%'
    },
    buttonText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#ffffff'
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
});

export default StreamDetailsScreen;
