import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { StyleSheet, Pressable, View as RNView, ScrollView } from 'react-native';
import { ActivityIndicator, Card, StatusBar, Text, View } from '@/components/Themed';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { isHapticsSupported, showAlert } from '@/utils/platform';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';
import BottomSpacing from '@/components/BottomSpacing';
import { extractQuality, extractSize, getStreamType } from '@/utils/StreamItem';
import { StorageKeys, storageService } from '@/utils/StorageService';

interface Stream {
    name: string;
    title?: string;
    url?: string;
    embed?: string;
    infoHash?: string;
    magnet?: string;
    magnetLink?: string;
    description?: string;
}

interface Addon {
    name: string;
    url?: string;
    streamBaseUrl?: string;
    types?: string[];
}

interface StreamResponse {
    streams?: Stream[];
}

const ADDONS_KEY = StorageKeys.ADDONS_KEY;

const StreamListScreen = () => {
    const { imdbid, type, name, title, season, episode } = useLocalSearchParams<{
        imdbid: string;
        type: string;
        name: string;
        title: string;
        season?: string;
        episode?: string;
        colors?: string;
    }>();

    // State management
    const [addons, setAddons] = useState<Addon[]>([]);
    const [selectedAddon, setSelectedAddon] = useState<Addon | null>(null);
    const [streams, setStreams] = useState<Stream[]>([]);
    const [loading, setLoading] = useState<boolean>(false);

    // Refs for race condition prevention
    const abortControllerRef = useRef<AbortController | null>(null);
    const currentAddonRef = useRef<string>('');

    const router = useRouter();

    // Fixed addon fetching with race condition prevention
    const fetchAddons = useCallback(async (): Promise<void> => {
        try {
            setLoading(true);

            const storedAddons = storageService.getItem(ADDONS_KEY);
            if (!storedAddons) {
                setAddons([]);
                return;
            }

            const addonsData = JSON.parse(storedAddons) as Record<string, Addon>;
            if (!addonsData || Object.keys(addonsData).length === 0) {
                setAddons([]);
                return;
            }

            const addonList = Object.values(addonsData);
            const filteredAddons = addonList.filter((addon: Addon) => addon?.types?.includes(type));

            setAddons(filteredAddons);

            if (filteredAddons.length > 0) {
                const firstAddon = filteredAddons[0];
                setSelectedAddon(firstAddon);
                currentAddonRef.current = firstAddon.name;
                await fetchStreams(firstAddon);
            }
        } catch (error) {
            console.error('Error fetching addons:', error);
            showAlert('Error', 'Failed to load addons');
            setAddons([]);
        } finally {
            setLoading(false);
        }
    }, [type]);

    // Fixed stream fetching with abort controller
    const fetchStreams = useCallback(async (addon: Addon): Promise<void> => {
        // Abort previous request if it exists
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }

        // Create new abort controller
        const controller = new AbortController();
        abortControllerRef.current = controller;

        // Store the addon name that this request is for
        const requestAddonName = addon.name;

        // Clear streams immediately to prevent showing old data
        setStreams([]);
        setLoading(true); // Always show loader when starting a new request

        try {
            const addonUrl = addon?.url || '';
            const streamBaseUrl = addon?.streamBaseUrl || addonUrl;

            const streamUrl = type === 'series'
                ? `${streamBaseUrl}/stream/series/${imdbid}${season && episode ? `:${season}:${episode}` : ''}.json`
                : `${streamBaseUrl}/stream/${type}/${imdbid}.json`;

            const response = await fetch(streamUrl, { signal: controller.signal });

            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }

            const data = await response.json() as StreamResponse;

            // Only update streams if this is still the current addon
            if (currentAddonRef.current === requestAddonName && !controller.signal.aborted) {
                setStreams(data.streams || []);
                setLoading(false); // Only stop loading after successfully setting streams
            }
        } catch (error: any) {
            // Only handle error if not aborted
            if (error.name !== 'AbortError') {
                console.error('Error fetching streams:', error);
                // Only clear streams and stop loading if this is still the current addon
                if (currentAddonRef.current === requestAddonName) {
                    setStreams([]);
                    setLoading(false);
                }
            }
            // If aborted, keep loading=true so the next request's loader shows
        }
    }, [imdbid, type, season, episode]);

    useEffect(() => {
        fetchAddons();
    }, [fetchAddons]);

    // Optimized addon selection handler
    const handleAddonPress = useCallback(async (item: Addon): Promise<void> => {

        // Update current addon reference immediately
        currentAddonRef.current = item.name;
        setSelectedAddon(item);

        // Fetch streams for the new addon
        await fetchStreams(item);
    }, [fetchStreams]);

    // Stream selection handler - now navigates to player with all streams
    const handleStreamSelected = useCallback(async (stream: Stream, index: number): Promise<void> => {

        // Navigate to player with all streams and selected index
        router.push({
            pathname: '/stream/player',
            params: {
                streams: JSON.stringify(streams),
                selectedStreamIndex: index.toString(),
                title,
                imdbid,
                type,
                season,
                episode
            },
        });
    }, [streams, router, name, imdbid, type, season, episode]);

    // Cleanup effect
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
            }
        };
    }, []);

    // Memoized components
    const AddonItem = React.memo<{ item: Addon }>(({ item }) => {
        if (!item.types?.includes(type)) return null;

        const isSelected = item.name === selectedAddon?.name;
        return (
            <Pressable
                style={[styles.addonItem, isSelected && styles.selectedAddonItem]}
                onPress={() => handleAddonPress(item)}
            >
                <Text style={[styles.addonName, isSelected && styles.selectedaddonName]} numberOfLines={1}>
                    {item.name}
                </Text>
            </Pressable>
        );
    });

    const StreamItem = React.memo<{ item: Stream; index: number }>(({ item, index }) => {
        const { name, title, description } = item;
        const quality = extractQuality(name, title);
        const size = extractSize(description || title || '');
        const streamType = getStreamType(item);

        return (
            <Pressable onPress={() => handleStreamSelected(item, index)} style={styles.streamContainer}>
                <Card style={styles.streamItem}>
                    <RNView style={styles.streamHeader}>
                        <RNView style={styles.streamTitleContainer}>
                            <Text style={styles.streamName} numberOfLines={2}>
                                {name}
                            </Text>
                            {quality && (
                                <RNView style={styles.qualityBadge}>
                                    <Text style={styles.qualityText}>{quality}</Text>
                                </RNView>
                            )}
                        </RNView>
                    </RNView>

                    {(title || description) && (
                        <Text style={styles.streamDescription} numberOfLines={5}>
                            {title || description}
                        </Text>
                    )}

                    <RNView style={styles.streamFooter}>
                        <RNView style={styles.streamMetadata}>
                            {size && <Text style={styles.streamSize}>{size}</Text>}
                            <Text style={styles.streamType}>{streamType}</Text>
                        </RNView>
                    </RNView>
                </Card>
            </Pressable>
        );
    });

    // Render helpers
    const renderLoadingState = (message: string) => (
        <RNView style={styles.loadingContainer}>
            <View style={styles.centeredContainer}>
                <ActivityIndicator size="large" style={styles.activityIndicator} color="#535aff" />
                <Text style={styles.loadingText}>{message}</Text>
            </View>
        </RNView>
    );

    const renderEmptyState = (icon: string, message: string, topMargin = 0) => (
        <RNView style={styles.loadingContainer}>
            <View style={styles.centeredContainer}>
                <Feather
                    style={[topMargin ? { marginTop: topMargin } : undefined, { paddingBottom: 20 }]}
                    name={icon as any}
                    color={'#535aff'}
                    size={50}
                />
                <Text style={styles.noAddonsText}>{message}</Text>
            </View>
        </RNView>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar />

            {loading && addons.length === 0 ? (
                renderLoadingState('Loading addons...')
            ) : addons.length > 0 ? (
                <View style={styles.addonBorderContainer}>
                    <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={styles.addonListContainer}
                    >
                        {addons.map((item, index) => (
                            <AddonItem key={`${item.name}-${index}`} item={item} />
                        ))}
                    </ScrollView>
                </View>
            ) : (
                renderEmptyState('alert-circle', 'No addons have been found. Please ensure that you have configured the addons before searching.', 100)
            )}

            {loading && addons.length > 0 ? (
                renderLoadingState('Loading streams...')
            ) : (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContainer}>
                    <View style={styles.streamsContainer}>
                        {streams.length > 0 ? (
                            streams.map((item, index) => (
                                <StreamItem key={`${item.name}-${index}`} item={item} index={index} />
                            ))
                        ) : (
                            addons.length > 0 && renderEmptyState('alert-circle', 'No streams found!', -50)
                        )}
                    </View>
                </ScrollView>
            )}

            <BottomSpacing space={30} />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 40
    },
    scrollContainer: {
        paddingBottom: 20,
        maxWidth: 780,
        margin: 'auto',
        width: '100%'
    },
    addonBorderContainer: {
        borderBottomWidth: 1,
        borderColor: 'rgba(136, 136, 136, 0.1)'
    },
    addonListContainer: {
        marginVertical: 15,
        marginHorizontal: 15,
        alignItems: 'center',
        justifyContent: 'center'
    },
    addonItem: {
        borderRadius: 20,
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginHorizontal: 6,
        backgroundColor: '#202020',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    selectedAddonItem: {
        backgroundColor: '#535aff',
        borderColor: '#535aff',
    },
    addonName: {
        fontSize: 14,
        color: '#999',
        fontWeight: '500',
    },
    selectedaddonName: {
        color: '#fff',
        fontWeight: '600',
    },
    streamsContainer: {
        paddingHorizontal: 16,
        paddingVertical: 24,
    },
    streamContainer: {
        marginBottom: 12,
    },
    streamItem: {
        backgroundColor: '#101010',
        borderRadius: 16,
        padding: 18,
        borderWidth: 1,
        borderColor: '#1a1a1a',
    },
    streamHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    streamTitleContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'flex-start',
        paddingRight: 12,
    },
    streamName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#ffffff',
        flex: 1,
        lineHeight: 22,
    },
    qualityBadge: {
        backgroundColor: 'rgba(83, 90, 255, 0.25)',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        marginLeft: 8,
        marginTop: 2,
        borderWidth: 1,
        borderColor: 'rgba(83, 90, 255, 0.3)',
    },
    qualityText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '500'
    },
    streamDescription: {
        fontSize: 13,
        color: '#999',
        lineHeight: 20,
        marginBottom: 12,
    },
    streamFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    streamMetadata: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    streamSize: {
        fontSize: 11,
        color: '#666',
        marginRight: 12,
        backgroundColor: '#2a2a2a',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        fontWeight: '500',
    },
    streamType: {
        fontSize: 11,
        color: '#666',
        textTransform: 'uppercase',
        fontWeight: '600',
        letterSpacing: 0.5,
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
    loadingText: {
        fontSize: 15,
        marginTop: 10,
        color: '#999',
        fontWeight: '500',
    },
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    noAddonsText: {
        fontSize: 15,
        textAlign: 'center',
        marginHorizontal: '10%',
        color: '#999',
        lineHeight: 22,
    },
});

export default StreamListScreen;