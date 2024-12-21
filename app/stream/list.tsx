import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, TouchableOpacity, View as RNView, Alert, Linking } from 'react-native';
import { Text } from '@/components/Themed';
import { useLocalSearchParams } from 'expo-router';
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
    const [selectedAddon, setSelectedAddon] = useState<any | null>(null); // Track selected addon
    const [streams, setStreams] = useState<any[]>([]);
    const [expandedStream, setExpandedStream] = useState<any | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch addons on mount
    useEffect(() => {
        const fetchAddons = async () => {
            try {
                const storedAddons = await AsyncStorage.getItem('addons');
                const addonsData = storedAddons ? JSON.parse(storedAddons) : {};
                setAddons(Object.values(addonsData)); // Set the addon list

                // Automatically select the first addon if there is one
                if (Object.values(addonsData).length === 1) {
                    setSelectedAddon(Object.values(addonsData)[0]);
                } else if (Object.values(addonsData).length > 0) {
                    setSelectedAddon(Object.values(addonsData)[0]); // Default select first addon if available
                }
            } catch (error) {
                console.error('Error fetching addons:', error);
                Alert.alert('Error', 'Failed to load addons');
            }
        };

        fetchAddons();
    }, []);

    // Fetch streams from the selected addon
    useEffect(() => {
        const fetchStreams = async () => {
            if (!selectedAddon) return; // Ensure the addon is selected first

            setLoading(true); // Start loading

            try {
                const addonUrl = selectedAddon?.url || '';
                const streamBaseUrl = selectedAddon?.streamBaseUrl || addonUrl;

                let streamUrl = '';
                if (type === 'series') {
                    streamUrl = `${streamBaseUrl}/stream/series/${imdbid}${season && episode ? `:${season}:${episode}` : ''}.json`;
                } else {
                    streamUrl = `${streamBaseUrl}/stream/${type}/${imdbid}.json`;
                }

                const response = await fetch(streamUrl);
                const data = await response.json();
                if (data.streams) {
                    setStreams(data.streams); // Set the fetched streams
                } else {
                    setStreams([]); // Clear streams if none are found
                }
            } catch (error) {
                console.error('Error fetching streams:', error);
                Alert.alert('Error', 'Failed to load streams');
            } finally {
                setLoading(false); // End loading state
            }
        };

        fetchStreams();
    }, [selectedAddon, imdbid, season, episode, type]);

    // Handle expansion of the stream item
    const handleStreamExpand = (stream: any) => {
        setExpandedStream(expandedStream === stream ? null : stream); // Toggle expand on stream click
    };

    // Render each addon item
    const renderAddonItem = ({ item }: any) => {
        const { name, logo } = item;
        const addonLogo = logo || '';
        return (
            <TouchableOpacity
                style={styles.addonItem}
                onPress={() => setSelectedAddon(item)} // Set selected addon
            >
                <Image source={{ uri: addonLogo }} style={styles.addonIcon} />
                <Text style={styles.addonName}>{name}</Text>
            </TouchableOpacity>
        );
    };

    // Handle opening the player with a selected stream
    const handleOpenPlayer = (player: string, streamUrl: string) => {
        // Mapping players to their respective callback URL schemes
        const playerUrls: { [key: string]: string } = {
            vlc: `vlc://${streamUrl}`, // VLC URL scheme
            vidhub: `open-vidhub://x-callback-url/open?url=${encodeURIComponent(streamUrl)}`, // VidHub URL scheme
            outplayer: `outplayer://${streamUrl}`, // OutPlayer URL scheme
            infuse: `infuse://x-callback-url/play?url=${encodeURIComponent(streamUrl)}`, // Infuse URL scheme
        };

        // Get the corresponding URL for the selected player
        const playerUrl = playerUrls[player];

        if (!playerUrl) return; // If no URL found for the player, do nothing

        // Check if the URL scheme can be opened by any app
        Linking.canOpenURL(playerUrl).then((supported) => {
            if (supported) {
                Linking.openURL(playerUrl); // Open the player with the stream URL
            } else {
                console.error(`App for player ${player} is not installed or cannot open the URL.`);
            }
        }).catch((error) => {
            console.error("Error checking URL scheme:", error);
        });
    };

    // Render each stream item
    const renderStreamItem = ({ item }: any) => {
        const { name, title, url, description } = item;

        const isExpanded = expandedStream === item;
        const players = ['vlc', 'infuse', 'vidhub', 'outplayer'];

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
                        {players.map((player: string) => (
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
            {loading ? (
                <RNView style={styles.loadingContainer}>
                    <Text>Loading...</Text>
                </RNView>
            ) : (
                <>
                    <FlatList
                        data={addons}
                        renderItem={renderAddonItem}
                        keyExtractor={(item, index) => index.toString()}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.addonList}
                    />
                    <FlatList
                        data={streams} // Only show streams from the selected addon
                        renderItem={renderStreamItem}
                        showsVerticalScrollIndicator={false}
                        keyExtractor={(item, index) => index.toString()}
                    />
                </>
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
        justifyContent: 'space-evenly',
        alignContent: 'center',
        alignItems: 'center',
        marginTop: 10,
        padding: 10,
        width: '100%',
    },
    playerIcon: {
        width: 40,
        height: 40,
        borderRadius: 10
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default StreamScreen;
