import React, { useEffect, useState } from 'react';
import { StyleSheet, Pressable, View as RNView, ScrollView } from 'react-native';
import { ActivityIndicator, Card, StatusBar, Text, View } from '@/components/Themed';
import { useLocalSearchParams, useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import { isHapticsSupported, showAlert } from '@/utils/platform';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather } from '@expo/vector-icons';

interface Stream {
    name: string;
    title?: string;
    url?: string;
    embed?: string;
    infoHash?: string;
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

const StreamScreen = () => {
    const { imdbid, type, name: contentTitle, season, episode, colors } = useLocalSearchParams<{
        imdbid: string;
        type: string;
        name: string;
        season?: string;
        episode?: string;
        colors?: string;
    }>();
    const [addons, setAddons] = useState<Addon[]>([]);
    const [selectedAddon, setSelectedAddon] = useState<Addon | null>(null);
    const [streams, setStreams] = useState<Stream[]>([]);
    const [loading, setLoading] = useState<boolean>(false);
    const router = useRouter();

    const fetchAddons = async (): Promise<void> => {
        try {
            setLoading(true);
            
            // Get addons from AsyncStorage
            const storedAddons = await AsyncStorage.getItem('addons');
            if (!storedAddons) {
                setAddons([]);
                setLoading(false);
                return;
            }
            
            const addonsData = JSON.parse(storedAddons) as Record<string, Addon>;
            if (!addonsData || Object.keys(addonsData).length === 0) {
                setAddons([]);
                setLoading(false);
                return;
            }
            
            const addonList = Object.values(addonsData);
            
            // Filter addons by type
            const filteredAddons = addonList.filter((addon: Addon) => {
                return addon?.types && addon.types.includes(type);
            });
            
            setAddons(filteredAddons);
            
            // Select first addon and fetch streams if we have addons
            if (filteredAddons.length > 0) {
                const firstAddon = filteredAddons[0];
                setSelectedAddon(firstAddon);
                await fetchStreams(firstAddon);
            }
        } catch (error) {
            console.error('Error fetching addons:', error);
            showAlert('Error', 'Failed to load addons');
            setAddons([]);
        } finally {
            setLoading(false);
        }
    };

    const fetchStreams = async (addon: Addon): Promise<void> => {
        setLoading(true);
        
        try {
            const addonUrl = addon?.url || '';
            const streamBaseUrl = addon?.streamBaseUrl || addonUrl;
            let streamUrl = '';

            if (type === 'series') {
                streamUrl = `${streamBaseUrl}/stream/series/${imdbid}${season && episode ? `:${season}:${episode}` : ''}.json`;
            } else {
                streamUrl = `${streamBaseUrl}/stream/${type}/${imdbid}.json`;
            }

            const response = await fetch(streamUrl);
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            
            const data = await response.json() as StreamResponse;
            setStreams(data.streams || []);
        } catch (error) {
            console.error('Error fetching streams:', error);
            setStreams([]);
        } finally {
            setLoading(false);
        }
    };

    // Initial load when component mounts
    useEffect(() => {
        fetchAddons();
    }, []);

    const handleAddonPress = async (item: Addon): Promise<void> => {
        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        }
        setSelectedAddon(item);
        fetchStreams(item);
    };

    interface AddonItemProps {
        item: Addon;
    }

    const RenderAddonItem = ({ item }: AddonItemProps): React.ReactElement | null => {
        const { name, types } = item;

        if (!types || !types.includes(type)) {
            return null;
        }

        const isSelected = item.name === selectedAddon?.name;
        return (
            <Pressable
                style={[
                    styles.addonItem,
                    isSelected && styles.selectedAddonItem,
                ]}
                onPress={() => handleAddonPress(item)}
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

    interface StreamItemProps {
        item: Stream;
    }

    const RenderStreamItem = ({ item }: StreamItemProps): React.ReactElement => {
        const { name, title, url, embed, infoHash, description } = item;

        const handleStreamSelected = async (): Promise<void> => {
            if (isHapticsSupported()) {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
            }
            if (embed) {
                router.push({
                    pathname: '/stream/embed',
                    params: {
                        url: embed
                    },
                });
                return;
            }
            router.push({
                pathname: '/stream/details',
                params: {
                    imdbid, type, season, episode, contentTitle, name, title, description, url, infoHash, colors
                },
            });
        };

        return (
            <RNView style={[{
                marginHorizontal: 'auto',
                marginVertical: 10,
                justifyContent: 'space-evenly',
                width: '98%',
                maxWidth: 380,
                alignSelf: 'center'
            }]}>
                <Pressable onPress={handleStreamSelected}>
                    <Card style={styles.streamItem}>
                        <Text style={styles.streamName} numberOfLines={2}>
                            {name}
                        </Text>
                        <Text style={styles.streamTitle}>
                            {title || description}
                        </Text>
                    </Card>
                </Pressable>
            </RNView>
        );
    };
    
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar />
            {
                loading && addons.length === 0 ? (
                    <RNView style={styles.loadingContainer}>
                        <View style={styles.centeredContainer}>
                            <ActivityIndicator size="large" style={styles.activityIndicator} color="#535aff" />
                            <Text style={styles.loadingText}>Loading addons...</Text>
                        </View>
                    </RNView>
                ) : addons?.length > 0 ? (
                    <View>
                        <ScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={styles.addonListContainer}>
                            {
                                addons.map((item, index) => (
                                    <RenderAddonItem key={`addon-${index}-${item.name}`} item={item} />
                                ))
                            }
                        </ScrollView>
                    </View>
                ) : (
                    <RNView style={styles.loadingContainer}>
                        <View style={styles.centeredContainer}>
                            <Feather style={styles.noAddons} name='alert-circle' color="#ffffff" size={70} />
                            <Text style={[styles.noAddonsText]}>
                                No addons have been found. Please ensure that you have configured the addons before searching.
                            </Text>
                        </View>
                    </RNView>
                )
            }
            {
                loading && addons.length > 0 ? (
                    <RNView style={styles.loadingContainer}>
                        <View style={styles.centeredContainer}>
                            <ActivityIndicator size="large" style={styles.activityIndicator} color="#ffffff" />
                            <Text style={styles.loadingText}>Loading streams...</Text>
                        </View>
                    </RNView>
                ) : (
                    <ScrollView showsVerticalScrollIndicator={false}>
                        <View style={styles.streamsContainer}>
                            {
                                streams.length > 0 ? (
                                    streams.map((item, index) => (
                                        <RenderStreamItem key={`stream-${index}-${item.name}`} item={item} />
                                    ))
                                ) : (
                                    <>
                                        {
                                            addons.length > 0 && (
                                                <View style={styles.centeredContainer}>
                                                    <Feather style={styles.noStreams} name='alert-circle' color="#ffffff" size={50} />
                                                    <Text style={[styles.noStreamsText]}>
                                                        No streams found!
                                                    </Text>
                                                </View>
                                            )
                                        }
                                    </>
                                )
                            }
                        </View>
                    </ScrollView>
                )
            }
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 40
    },
    addonListContainer: {
        marginVertical: 20,
        marginHorizontal: '5%',
        alignItems: 'center',
        justifyContent: 'center'
    },
    addonList: {
        paddingHorizontal: 10,
    },
    addonItem: {
        borderRadius: 25,
        paddingVertical: 10,
        paddingHorizontal: 20,
        marginHorizontal: 5,
    },
    selectedAddonItem: {
        backgroundColor: '#535aff'
    },
    addonName: {
        fontSize: 15,
    },
    selectedaddonName: {
        color: '#fff',
    },
    streamsContainer: {
        flexGrow: 0,
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-evenly',
    },
    streamItem: {
        paddingHorizontal: 10,
        paddingVertical: 20,
        marginVertical: 10,
        marginHorizontal: 20,
        borderRadius: 10,
        backgroundColor: '#111111'
    },
    streamName: {
        fontSize: 14,
        marginBottom: 10,
        paddingHorizontal: 10,
    },
    streamTitle: {
        fontSize: 13,
        paddingHorizontal: 10,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    activityIndicator: {
        marginBottom: 10,
        color: '#ffffff',
    },
    loadingText: {
        fontSize: 16,
        marginTop: 10,
    },
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    centeredText: {
        fontSize: 18,
        textAlign: 'center',
    },
    noStreams: {
        marginTop: 150,
        paddingBottom: 20
    },
    noStreamsText: {
        fontSize: 16,
        textAlign: 'center',
        marginHorizontal: '10%',
        color: '#fff'
    },
    noAddons: {
        marginTop: 100,
        paddingBottom: 20
    },
    noAddonsText: {
        fontSize: 16,
        textAlign: 'center',
        marginHorizontal: '10%',
        color: '#fff'
    }
});

export default StreamScreen;