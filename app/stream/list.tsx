import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, TouchableOpacity, View as RNView, Alert, Linking } from 'react-native';
import { Text } from '@/components/Themed';
import { useLocalSearchParams } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

const playerIcons: any = {
    vlc: require('../../assets/images/players/vlc.png'),
    vidhub: require('../../assets/images/players/vidhub.png'),
    outplayer: require('../../assets/images/players/outplayer.png'),
    infuse: require('../../assets/images/players/infuse.png'),
};


const StreamScreen = () => {
    const { imdbid, type, season, episode } = useLocalSearchParams();
    const [addons, setAddons] = useState<any[]>([]);
    const [streams, setStreams] = useState<any[]>([]);
    const [expandedStream, setExpandedStream] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchAddons = async () => {
            try {
                const storedAddons = await AsyncStorage.getItem('addons');
                const addonsData = storedAddons ? JSON.parse(storedAddons) : {};
                setAddons(Object.values(addonsData)); // Set the addon list
            } catch (error) {
                console.error('Error fetching addons:', error);
                Alert.alert('Error', 'Failed to load addons');
            }
        };

        fetchAddons();
    }, []);

    useEffect(() => {
        const fetchStreams = async () => {
            try {
                const addonRequests = addons.map(async (addon) => {
                    const addonUrl = addon?.url || '';
                    const streamBaseUrl = addon?.streamBaseUrl || addonUrl;

                    let streamUrl = '';
                    if (type === 'series') {
                        streamUrl = `${streamBaseUrl}/stream/series/${imdbid}${season && episode ? `:${season}:${episode}` : ''}.json`;
                    } else {
                        streamUrl = `${streamBaseUrl}/stream/${type}/${imdbid}.json`;
                    }

                    try {
                        const response = await fetch(streamUrl);
                        const data = await response.json();
                        if (data.streams) {
                            return { addon, streams: data.streams };
                        }
                    } catch (error) {
                        console.error(`Error fetching from ${streamUrl}: `, error);
                    }
                });

                const results = await Promise.all(addonRequests);
                setStreams(results.filter(result => result)); // Filter out any failed responses
            } catch (error) {
                console.error('Error fetching streams:', error);
                Alert.alert('Error', 'Failed to load streams');
            } finally {
                setLoading(false);
            }
        };

        if (addons.length) {
            fetchStreams();
        }
    }, [addons, imdbid, season, episode, type]);

    const handlePress = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const handleStreamExpand = (stream: any) => {
        setExpandedStream(expandedStream === stream ? null : stream); // Toggle expand on stream click
    };

    const renderAddonItem = ({ item }: any) => {
        const { name, logo } = item;
        const addonLogo = logo || '';
        return (
            <TouchableOpacity
                style={styles.addonItem}
                onPress={() => handlePress()} // Just to trigger haptic feedback
            >
                <Image source={{ uri: addonLogo }} style={styles.addonIcon} />
                <Text style={styles.addonName}>{name}</Text>
            </TouchableOpacity>
        );
    };

    const handleOpenPlayer = (player: string, streamUrl: string) => {
        const playerIcon = playerIcons[player]; // Get the player icon
        if (!playerIcon) return; // If the player icon doesn't exist, do nothing

        const appUrls = [
            `vlc://${streamUrl}`,
            `vidhub://open?url=${encodeURIComponent(streamUrl)}`,
            `outplayer://open?url=${encodeURIComponent(streamUrl)}`,
            `infuse://open?url=${encodeURIComponent(streamUrl)}`
        ];

        appUrls.some((appUrl) => {
            Linking.canOpenURL(appUrl).then((supported) => {
                if (supported) {
                    Linking.openURL(appUrl);
                    return true;
                }
                return false;
            });
        });
    };

    const renderStreamItem = ({ item }: any) => {
        const { name, title, url, description, infoHash, addon } = item;
        const streamType = url ? 'url' : 'magnet';

        const isExpanded = expandedStream === item;

        return (
            <RNView style={styles.streamItemContainer}>
                <TouchableOpacity
                    style={styles.streamItem}
                    onPress={() => handleStreamExpand(item)}
                >
                    <Text style={styles.streamName} numberOfLines={2}>
                        {name}
                    </Text>
                    <Text style={styles.streamTitle} numberOfLines={2}>
                        {title || description}
                    </Text>
                </TouchableOpacity>

                {isExpanded && (
                    <RNView style={styles.playerIconsContainer}>
                        {item.players && item.players.map((player: string) => (
                            <TouchableOpacity key={player} onPress={() => handleOpenPlayer(player, url)}>
                                <Image
                                    source={playerIcons[player]} // Use the mapped player icon
                                    style={styles.playerIcon}
                                />
                            </TouchableOpacity>
                        ))}
                    </RNView>
                )}
            </RNView>
        );
    };

    return (
        <RNView style={styles.container}>
            <FlatList
                data={addons}
                renderItem={renderAddonItem}
                keyExtractor={(item, index) => index.toString()}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.addonList}
            />
            {loading ? (
                <Text>Loading...</Text>
            ) : (
                <FlatList
                    data={streams.flatMap(result => result.streams)} // Flattening streams from all addons
                    renderItem={renderStreamItem}
                    showsVerticalScrollIndicator={false}
                    keyExtractor={(item, index) => index.toString()}
                />
            )}
        </RNView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 10,
    },
    addonList: {
        margin: 20,
    },
    addonItem: {
        alignItems: 'center',
        marginRight: 20,
    },
    addonIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        marginBottom: 5,
    },
    addonName: {
        fontSize: 12,
    },
    streamItemContainer: {
        marginBottom: 15,
        alignItems: 'center',
        width: '100%',
    },
    streamItem: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderRadius: 8,
        width: '100%',
        borderColor: 'gray',
        borderWidth: 1,
    },
    streamName: {
        fontSize: 14,
        flex: 1,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    streamTitle: {
        fontSize: 14,
        flex: 1,
    },
    playerIconsContainer: {
        flexDirection: 'row',
        marginTop: 10,
    },
    playerIcon: {
        width: 30,
        height: 30,
        margin: 5,
    },
});

export default StreamScreen;
