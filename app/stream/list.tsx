import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, TouchableOpacity, View as RNView, Alert, Linking } from 'react-native';
import { ActivityIndicator, Text, View } from '@/components/Themed';
import { useLocalSearchParams } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics'; // Import Haptics

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
    const [streams, setStreams] = useState<any[]>([]); // Streams for selected addon
    const [expandedStream, setExpandedStream] = useState<any | null>(null); // Track expanded stream
    const [loading, setLoading] = useState(true);

    // Fetch all addons on mount
    useEffect(() => {
        const fetchAddons = async () => {
            try {
                const storedAddons = await AsyncStorage.getItem('addons');
                const addonsData = storedAddons ? JSON.parse(storedAddons) : {};
                const addonList = Object.values(addonsData); // Set the addon list
                setAddons(addonList); // Set all addons

                // Fetch streams for each addon
                fetchStreams(addonList);

                // Automatically select the first addon
                if (addonList.length > 0) {
                    setSelectedAddon(addonList[0]);
                }
            } catch (error) {
                console.error('Error fetching addons:', error);
                Alert.alert('Error', 'Failed to load addons');
            }
        };

        fetchAddons();
    }, []);

    // Fetch streams for all addons
    const fetchStreams = async (addonList: any[]) => {
        setLoading(true); // Start loading

        try {
            const allStreams: any[] = [];

            for (const addon of addonList) {
                const addonTypes = addon?.types || []; // Get supported types for the addon

                // Check if the addon supports the requested type
                if (!addonTypes.includes(type)) {
                    console.log(`Skipping addon "${addon?.name}" as it does not support type "${type}"`);
                    continue; // Skip if the addon doesn't support the requested media type
                }

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
                        allStreams.push({ addon, streams: data.streams }); // Collect streams for each addon
                    } else {
                        allStreams.push({ addon, streams: [] }); // No streams found for this addon
                    }
                } catch (error) {
                    console.error(`Error fetching streams for addon "${addon?.name}":`, error);
                }
            }

            setStreams(allStreams);
        } catch (error) {
            console.error('Error fetching streams:', error);
            Alert.alert('Error', 'Failed to load streams');
        } finally {
            setLoading(false); // End loading state
        }
    };

    // Handle stream selection (expand or collapse)
    const handleStreamExpand = (stream: any) => {
        Haptics.selectionAsync(); // Trigger haptics
        setExpandedStream(expandedStream === stream ? null : stream); // Toggle expand on stream click
    };

    // Render each addon item
    const renderAddonItem = ({ item }: any) => {
        const { name, logo } = item;
        const addonLogo = logo || '';
        return (
            <TouchableOpacity
                style={styles.addonItem}
                onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); // Trigger haptics
                    setSelectedAddon(item); // Set selected addon
                }}
            >
                <Image source={{ uri: addonLogo }} style={styles.addonIcon} />
                <Text style={styles.addonName} numberOfLines={1}>{name}</Text>
            </TouchableOpacity>
        );
    };

    // Handle opening the player with a selected stream
    const handleOpenPlayer = (player: string, streamUrl: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); // Trigger haptics
        const playerUrls: { [key: string]: string } = {
            vlc: `vlc://${streamUrl}`,
            vidhub: `open-vidhub://x-callback-url/open?url=${encodeURIComponent(streamUrl)}`,
            outplayer: `outplayer://${streamUrl}`,
            infuse: `infuse://x-callback-url/play?url=${encodeURIComponent(streamUrl)}`,
        };

        const playerUrl = playerUrls[player];

        if (!playerUrl) return;

        Linking.openURL(playerUrl).catch((error) => {
            console.error('Error opening URL:', error);
            Alert.alert(
                'Error',
                `Failed to open ${player}.`
            );
        });
    };

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
                    <Text style={styles.streamTitle}>
                        {title || description}
                    </Text>

                    {isExpanded && (
                        <RNView style={styles.playerIconsContainer}>
                            {players.map((player: string) => (
                                <TouchableOpacity
                                    key={player}
                                    onPress={() => handleOpenPlayer(player, url)}
                                >
                                    <Image
                                        source={playerIcons[player]}
                                        style={styles.playerIcon}
                                    />
                                </TouchableOpacity>
                            ))}
                        </RNView>
                    )}
                </TouchableOpacity>
            </RNView>
        );
    };

    const selectedAddonStreams = streams.find((addonData) => addonData.addon === selectedAddon)?.streams || [];

    return (
        <RNView style={styles.container}>
            {loading ? (
                <RNView style={styles.loadingContainer}>
                    <View style={styles.centeredContainer}>
                        <ActivityIndicator size="large" style={styles.activityIndicator} color="#fc7703" />
                        <Text style={styles.centeredText}>Loading</Text>
                    </View>
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
                        data={selectedAddonStreams}
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
        marginVertical: 20,
        marginHorizontal: 20,
    },
    addonItem: {
        alignItems: 'center',
        marginRight: 20,
        width: 100,
    },
    addonIcon: {
        width: 60,
        height: 60,
        borderRadius: 10,
        marginBottom: 5,
    },
    addonName: {
        paddingVertical: 10,
        paddingBottom: 20,
        fontWeight: 'bold',
        overflow: 'hidden',
        textAlign: 'left',
        flexShrink: 1,
    },
    streamItemContainer: {
        alignItems: 'center',
        width: '100%',
    },
    streamItem: {
        paddingHorizontal: 20,
        paddingVertical: 20,
        borderRadius: 8,
        width: '100%',
        borderColor: '#a0a0a0',
        borderBottomWidth: 0.5,
    },
    streamName: {
        fontSize: 14,
        fontWeight: 'bold',
        flex: 1,
        marginBottom: 10,
    },
    streamTitle: {
        fontSize: 13,
        flex: 1,
    },
    playerIconsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-evenly',
        alignContent: 'center',
        alignItems: 'center',
        marginTop: 20,
        padding: 10,
        width: '100%',
    },
    playerIcon: {
        width: 40,
        height: 40,
        borderRadius: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activityIndicator: {
        marginBottom: 10,
        color: '#fc7703',
    },
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    centeredText: {
        fontSize: 18,
        fontWeight: 'bold',
        textAlign: 'center',
    },
});

export default StreamScreen;
