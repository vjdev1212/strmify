import React, { useEffect, useState } from 'react';
import { FlatList, Image, StyleSheet, Pressable, View as RNView, Alert, Linking, Platform, useColorScheme } from 'react-native';
import { ActivityIndicator, Card, Text, View } from '@/components/Themed';
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
    const [addons, setAddons] = useState<any[]>([]); // Addons for selection
    const [selectedAddon, setSelectedAddon] = useState<any | null>(null); // Track selected addon
    const [streams, setStreams] = useState<any[]>([]); // Streams for selected addon
    const [expandedStream, setExpandedStream] = useState<any | null>(null); // Track expanded stream
    const [loading, setLoading] = useState(false); // Set loading state false initially
    const [noStreamsFound, setNoStreamsFound] = useState(false); // Flag to track no streams found

    // Fetch all addons on mount (without showing loading initially)
    useEffect(() => {
        const fetchAddons = async () => {
            try {
                const storedAddons = await AsyncStorage.getItem('addons');
                const addonsData = storedAddons ? JSON.parse(storedAddons) : {};
                const addonList = Object.values(addonsData); // Set the addon list
                setAddons(addonList); // Set all addons

                // Automatically select the first addon if available
                if (addonList.length > 0) {
                    setSelectedAddon(addonList[0]);
                    fetchStreams(addonList); // Fetch streams in the background after initial render
                }
            } catch (error) {
                console.error('Error fetching addons:', error);
                Alert.alert('Error', 'Failed to load addons');
            }
        };

        fetchAddons();
    }, []);

    const fetchStreams = async (addonList: any[]) => {
        setLoading(true); // Start loading when fetching streams
        setNoStreamsFound(false); // Reset "No streams found" flag

        const fetchWithTimeout = (url: string, timeout = 10000) => {
            return Promise.race([
                fetch(url).then((response) => response.json()),
                new Promise((_, reject) =>
                    setTimeout(() => reject(new Error('Request timed out')), timeout)
                ),
            ]);
        };

        try {
            const addonPromises = addonList.map(async (addon) => {
                const addonTypes = addon?.types || []; // Get supported types for the addon

                // Skip addons that don't support the requested type
                if (!addonTypes.includes(type)) {
                    return { addon, streams: [] }; // Return empty streams for unsupported addons
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
                    const data = await fetchWithTimeout(streamUrl, 10000); // Fetch with timeout
                    return { addon, streams: data.streams || [] }; // Return streams or empty if none found
                } catch (error) {
                    console.error(`Error fetching streams for addon "${addon?.name}":`, error);
                    return { addon, streams: [] }; // Return empty streams on error
                }
            });

            // Run all addon fetches in parallel
            const allStreams = await Promise.all(addonPromises);

            setStreams(allStreams); // Set the collected streams

            // Check if no streams were found across all addons
            const allStreamsData = allStreams.map(stream => stream.streams).flat();
            if (allStreamsData.length === 0) {
                setNoStreamsFound(true); // Set the flag if no streams found
            }
        } catch (error) {
            console.error('Error fetching streams:', error);
            Alert.alert('Error', 'Failed to load streams');
            setNoStreamsFound(true); // Set the flag if an error occurs
        } finally {
            setLoading(false); // End loading state
        }
    };

    // Handle stream selection (expand or collapse)
    const handleStreamExpand = (stream: any) => {
        Haptics.selectionAsync(); // Trigger haptics
        setExpandedStream(expandedStream === stream ? null : stream); // Toggle expand on stream click
    };

    const renderAddonItem = ({ item }: any) => {
        const { name, logo, types } = item;

        // Check if the addon supports the requested type
        if (!types || !types.includes(type)) {
            return null; // Skip rendering this addon if it doesn't support the requested type
        }

        const addonLogo = logo || '';
        const isSelected = item.name === selectedAddon?.name; // Compare using a unique property like `name`

        return (
            <Pressable
                style={[
                    styles.addonItem,
                    isSelected && styles.selectedAddonItem,
                ]}
                onPress={async () => {
                    if (Platform.OS !== 'web') {
                        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }
                    setSelectedAddon(item);
                    fetchStreams([item]);
                }}
            >
                <Text
                    style={[
                        styles.addonName,
                        isSelected && styles.selectedaddonName,
                    ]}
                    numberOfLines={1}
                >
                    {name}
                </Text>
            </Pressable>
        );
    };

    // Handle opening the player with a selected stream
    const handleOpenPlayer = async (player: string, streamUrl: string) => {
        if (Platform.OS !== 'web') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
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
                <Pressable onPress={() => handleStreamExpand(item)}
                >
                    <Card style={styles.streamItem}>
                        <Text style={styles.streamName} numberOfLines={2}>
                            {name}
                        </Text>
                        <Text style={styles.streamTitle}>
                            {title || description}
                        </Text>

                        {isExpanded && (
                            <RNView style={styles.playerIconsContainer}>
                                {players.map((player: string) => (
                                    <Pressable
                                        key={player}
                                        onPress={() => handleOpenPlayer(player, url)}
                                    >
                                        <Image
                                            source={playerIcons[player]}
                                            style={styles.playerIcon}
                                        />
                                    </Pressable>
                                ))}
                            </RNView>
                        )}
                    </Card>
                </Pressable>
            </RNView>
        );
    };

    const selectedAddonStreams = streams.find((addonData) => addonData.addon === selectedAddon)?.streams || [];

    return (
        <RNView style={styles.container}>
            {loading ? (
                <RNView style={styles.loadingContainer}>
                    <View style={styles.centeredContainer}>
                        <ActivityIndicator size="large" style={styles.activityIndicator} color="#535aff" />
                        <Text style={styles.centeredText}>Loading</Text>
                    </View>
                </RNView>
            ) : noStreamsFound ? (
                <RNView style={styles.loadingContainer}>
                    <View style={styles.centeredContainer}>
                        <Text style={styles.centeredText}>No streams found</Text>
                    </View>
                </RNView>
            ) : (
                <View style={styles.contentContainer}>
                    <FlatList
                        style={styles.addonList}
                        data={addons}
                        renderItem={renderAddonItem}
                        keyExtractor={(item, index) => index.toString()}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                    />
                    <FlatList
                        data={selectedAddonStreams}
                        renderItem={renderStreamItem}
                        showsVerticalScrollIndicator={false}
                        keyExtractor={(item, index) => index.toString()}
                    />
                </View>
            )}
        </RNView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {        
    },
    addonList: {
        marginTop: 30,
        marginBottom: 20,
        paddingHorizontal: 10
    },
    addonItem: {
        marginHorizontal: 5,
        borderRadius: 25,
    },
    selectedAddonItem: {
        backgroundColor: '#535aff',
    },
    addonName: {
        fontSize: 15,
        fontWeight: 'bold',
        paddingHorizontal: 20,
        paddingVertical: 15,
        marginBottom: 5
    },
    selectedaddonName: {
        fontWeight: 'bold',
        color: '#fff',
    },
    streamItemContainer: {
        width: '100%',
    },
    streamItem: {
        paddingHorizontal: 10,
        paddingVertical: 20,
        marginVertical: 10,
        marginHorizontal: 20,
        borderRadius: 10,
    },
    streamName: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 10,
        paddingHorizontal: 10,
    },
    streamTitle: {
        fontSize: 13,
        paddingHorizontal: 10,
        color: '#888',
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
        color: '#535aff',
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