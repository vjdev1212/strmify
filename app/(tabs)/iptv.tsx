import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    FlatList,
    StatusBar,
    ActivityIndicator,
    RefreshControl,
    Dimensions,
    Image,
    Alert,
    TextInput,
    Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { asyncStorageService } from '@/utils/AsyncStorage';
import { showAlert } from '@/utils/platform';

const { width } = Dimensions.get('window');

interface AlertButton {
    text: string;
    style?: 'default' | 'cancel' | 'destructive';
    onPress?: () => void;
}

interface Playlist {
    id: string;
    name: string;
    url: string;
    enabled: boolean;
    createdAt: string;
    channelCount?: number;
}

interface Channel {
    id: string;
    name: string;
    url: string;
    logo?: string;
    group?: string;
    language?: string;
    playlistId: string;
}

interface IptvScreenProps {
    onSettingsPress?: () => void;
    onPlayChannel?: (channel: Channel) => void;
}

const STORAGE_KEY = 'iptv_playlists';

const IptvScreen: React.FC<IptvScreenProps> = ({
    onSettingsPress,
    onPlayChannel
}) => {
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const [channels, setChannels] = useState<Channel[]>([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [playlistsLoading, setPlaylistsLoading] = useState<boolean>(true);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('All');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [showSearch, setShowSearch] = useState<boolean>(false);

    const enabledPlaylists = playlists.filter(p => p.enabled);

    // Load playlists from AsyncStorage on component mount
    useEffect(() => {
        loadPlaylists();
    }, []);

    useEffect(() => {
        if (selectedPlaylist) {
            loadChannels();
        }
    }, [selectedPlaylist]);

    const loadPlaylists = async (): Promise<void> => {
        try {
            console.log('Loading playlists from AsyncStorage...');
            setPlaylistsLoading(true);
            
            const stored = await asyncStorageService.getItem(STORAGE_KEY);
            
            if (stored) {
                const parsedPlaylists = JSON.parse(stored);
                console.log('Loaded playlists:', parsedPlaylists);
                
                // Validate the loaded data
                if (Array.isArray(parsedPlaylists)) {
                    // Update channel counts by fetching playlist info
                    const playlistsWithCounts = await Promise.all(
                        parsedPlaylists.map(async (playlist: Playlist) => {
                            if (playlist.enabled) {
                                try {
                                    const response = await fetch(playlist.url);
                                    if (response.ok) {
                                        const content = await response.text();
                                        const channelCount = countChannelsInM3U8(content);
                                        return { ...playlist, channelCount };
                                    }
                                } catch (error) {
                                    console.warn(`Failed to fetch channel count for playlist ${playlist.name}:`, error);
                                }
                            }
                            return { ...playlist, channelCount: 0 };
                        })
                    );
                    
                    setPlaylists(playlistsWithCounts);
                    console.log('Successfully loaded', playlistsWithCounts.length, 'playlists');
                } else {
                    console.log('Invalid data format, starting with empty array');
                    setPlaylists([]);
                }
            } else {
                console.log('No stored playlists found, starting with empty array');
                setPlaylists([]);
            }
        } catch (error) {
            console.error('Error loading playlists:', error);
            showAlert('Error', 'Failed to load saved playlists');
            setPlaylists([]);
        } finally {
            setPlaylistsLoading(false);
        }
    };

    const countChannelsInM3U8 = (content: string): number => {
        const lines = content.split('\n').map(line => line.trim()).filter(line => line);
        let channelCount = 0;
        
        for (const line of lines) {
            if (line.startsWith('#EXTINF:')) {
                channelCount++;
            }
        }
        
        return channelCount;
    };

    // M3U8 Parser function
    const parseM3U8 = (content: string): Channel[] => {
        const lines = content.split('\n').map(line => line.trim()).filter(line => line);
        const channels: Channel[] = [];
        let currentChannel: Partial<Channel> = {};
        let channelIndex = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            if (line.startsWith('#EXTINF:')) {
                // Parse channel info from #EXTINF line
                const infoMatch = line.match(/#EXTINF:.*?,(.+)/);
                const channelName = infoMatch ? infoMatch[1].trim() : `Channel ${channelIndex + 1}`;

                // Extract additional attributes
                const tvgLogoMatch = line.match(/tvg-logo="([^"]+)"/);
                const groupTitleMatch = line.match(/group-title="([^"]+)"/);
                const tvgLanguageMatch = line.match(/tvg-language="([^"]+)"/);

                currentChannel = {
                    id: `channel_${selectedPlaylist}_${channelIndex}`,
                    name: channelName,
                    logo: tvgLogoMatch ? tvgLogoMatch[1] : undefined,
                    group: groupTitleMatch ? groupTitleMatch[1] : undefined,
                    language: tvgLanguageMatch ? tvgLanguageMatch[1] : undefined,
                    playlistId: selectedPlaylist!,
                };
                channelIndex++;
            } else if (line.startsWith('http')) {
                // This is a stream URL
                if (currentChannel.name) {
                    currentChannel.url = line;
                    channels.push(currentChannel as Channel);
                    currentChannel = {};
                }
            }
        }

        return channels;
    };

    const loadChannels = async () => {
        if (!selectedPlaylist) return;

        setLoading(true);
        try {
            const playlist = enabledPlaylists.find(p => p.id === selectedPlaylist);
            if (!playlist) {
                throw new Error('Playlist not found');
            }

            console.log(`Loading channels from playlist: ${playlist.name}`);
            
            // Fetch the M3U8 playlist content
            const response = await fetch(playlist.url);
            if (!response.ok) {
                throw new Error(`Failed to fetch playlist: ${response.status} ${response.statusText}`);
            }

            const content = await response.text();
            const parsedChannels = parseM3U8(content);

            console.log(`Parsed ${parsedChannels.length} channels from playlist`);
            setChannels(parsedChannels);

            // Reset filters when switching playlists
            setSelectedLanguage('All');
            setSelectedCategory('All');
            setSearchQuery('');
        } catch (error) {
            console.error('Error loading channels:', error);
            showAlert(
                'Error',
                `Failed to load channels: ${error instanceof Error ? error.message : 'Unknown error'}`,
                [
                    { text: 'Retry', onPress: () => loadChannels() },
                    { text: 'Back', onPress: resetToPlaylistSelection }
                ]
            );
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        if (selectedPlaylist) {
            await loadChannels();
        } else {
            await loadPlaylists();
        }
        setRefreshing(false);
    };

    const playChannel = async (channel: Channel) => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        
        if (onPlayChannel) {
            onPlayChannel(channel);
        } else {
            showAlert(
                'Play Channel',
                `Playing ${channel.name}`,
                [{ text: 'OK' }]
            );
        }
    };

    const resetToPlaylistSelection = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        setSelectedPlaylist(null);
        setChannels([]);
        setSelectedLanguage('All');
        setSelectedCategory('All');
        setSearchQuery('');
        setShowSearch(false);
    };

    const getLanguages = () => {
        const languages: string[] = ['All', ...new Set(channels.map(c => c.language).filter(Boolean) as string[])];
        return languages.sort();
    };

    const getCategories = () => {
        const categories: string[] = ['All', ...new Set(channels.map(c => c.group).filter(Boolean) as string[])];
        return categories.sort();
    };

    const getFilteredChannels = () => {
        let filtered = channels;

        if (selectedLanguage !== 'All') {
            filtered = filtered.filter(c => c.language === selectedLanguage);
        }

        if (selectedCategory !== 'All') {
            filtered = filtered.filter(c => c.group === selectedCategory);
        }

        if (searchQuery) {
            filtered = filtered.filter(c =>
                c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.group && c.group.toLowerCase().includes(searchQuery.toLowerCase())) ||
                (c.language && c.language.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }

        return filtered;
    };

    const PlaylistCard = ({ playlist }: { playlist: Playlist }) => (
        <TouchableOpacity
            style={styles.playlistCard}
            onPress={async () => {
                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                setSelectedPlaylist(playlist.id);
            }}
            activeOpacity={0.8}
        >
            <LinearGradient
                colors={['#1a1a1a', '#0f0f0f']}
                style={styles.playlistCardGradient}
            >
                <View style={styles.playlistIcon}>
                    <Ionicons name="list" size={32} color="#535aff" />
                </View>

                <Text style={styles.playlistName}>{playlist.name}</Text>

                <View style={styles.playlistMeta}>
                    <Text style={styles.channelCountText}>
                        {playlist.channelCount || 0} channels
                    </Text>
                </View>

                <View style={styles.playlistArrow}>
                    <Ionicons name="chevron-forward" size={20} color="#666" />
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );

    const FilterSelector = ({ title, items, selected, onSelect, icon }: {
        title: string;
        items: string[];
        selected: string;
        onSelect: (item: string) => void;
        icon: string;
    }) => {
        if (items.length <= 1) return null;

        return (
            <View style={styles.filterSection}>
                <View style={styles.filterHeader}>
                    <Ionicons name={icon as any} size={16} color="#666" />
                    <Text style={styles.filterTitle}>{title}</Text>
                </View>
                <FlatList
                    horizontal
                    data={items}
                    keyExtractor={(item) => item}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterContent}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.filterChip,
                                selected === item && styles.selectedFilterChip
                            ]}
                            onPress={async () => {
                                await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                                onSelect(item);
                            }}
                        >
                            <Text style={[
                                styles.filterChipText,
                                selected === item && styles.selectedFilterChipText
                            ]}>
                                {item}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
            </View>
        );
    };

    const SearchBar = () => {
        if (!showSearch) return null;

        return (
            <View style={styles.searchContainer}>
                <View style={styles.searchInputContainer}>
                    <Ionicons name="search" size={20} color="#666" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search channels..."
                        placeholderTextColor="#666"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                        autoFocus
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity
                            onPress={() => setSearchQuery('')}
                            style={styles.clearButton}
                        >
                            <Ionicons name="close-circle" size={20} color="#666" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    const ChannelCard = ({ channel }: { channel: Channel }) => (
        <TouchableOpacity
            style={styles.channelCard}
            onPress={() => playChannel(channel)}
            activeOpacity={0.8}
        >
            <LinearGradient
                colors={['#1a1a1a', '#0f0f0f']}
                style={styles.channelCardGradient}
            >
                <View style={styles.channelImageContainer}>
                    {channel.logo ? (
                        <Image
                            source={{ uri: channel.logo }}
                            style={styles.channelLogo}
                            onError={() => console.log(`Failed to load image: ${channel.logo}`)}
                        />
                    ) : (
                        <View style={styles.channelLogoPlaceholder}>
                            <Ionicons name="tv" size={24} color="#666" />
                        </View>
                    )}
                    <View style={styles.playOverlay}>
                        <Ionicons name="play-circle" size={32} color="#535aff" />
                    </View>
                </View>

                <View style={styles.channelInfo}>
                    <Text style={styles.channelName} numberOfLines={2}>
                        {channel.name}
                    </Text>
                    {channel.group && (
                        <Text style={styles.channelGroup} numberOfLines={1}>
                            {channel.group}
                        </Text>
                    )}
                    {channel.language && (
                        <Text style={styles.channelLanguage} numberOfLines={1}>
                            {channel.language}
                        </Text>
                    )}
                </View>

                <View style={styles.channelActions}>
                    <TouchableOpacity
                        style={styles.favoriteButton}
                        onPress={async (e) => {
                            e.stopPropagation();
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                        }}
                    >
                        <Ionicons name="heart-outline" size={18} color="#666" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </TouchableOpacity>
    );

    const EmptyState = ({ type }: { type: 'playlists' | 'channels' }) => (
        <View style={styles.emptyState}>
            <Ionicons
                name={type === 'playlists' ? "list-outline" : "tv-outline"}
                size={80}
                color="#333"
            />
            <Text style={styles.emptyTitle}>
                {type === 'playlists' ? 'No Playlists Available' : 'No Channels Found'}
            </Text>
            <Text style={styles.emptySubtitle}>
                {type === 'playlists'
                    ? 'No active playlists found. Add and enable playlists in settings.'
                    : searchQuery
                        ? `No channels found matching "${searchQuery}"`
                        : 'No channels found in the selected filters.'
                }
            </Text>
            {type === 'playlists' && (
                <TouchableOpacity
                    style={styles.settingsButton}
                    onPress={() => onSettingsPress?.()}
                >
                    <Ionicons name="settings-outline" size={18} color="#535aff" />
                    <Text style={styles.settingsButtonText}>Open Settings</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    // Show loading state for playlists
    if (playlistsLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#000" />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#535aff" />
                    <Text style={styles.loadingText}>Loading playlists...</Text>
                </View>
            </SafeAreaView>
        );
    }

    // If no playlist is selected, show playlist selection
    if (!selectedPlaylist) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#000" />

                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.title}>Select Playlist</Text>
                        <Text style={styles.subtitle}>
                            {enabledPlaylists.length} active playlist{enabledPlaylists.length !== 1 ? 's' : ''}
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={async () => {
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                            onSettingsPress?.();
                        }}
                    >
                        <Ionicons name="settings-outline" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={styles.content}>
                    {enabledPlaylists.length === 0 ? (
                        <EmptyState type="playlists" />
                    ) : (
                        <FlatList
                            data={enabledPlaylists}
                            keyExtractor={(item) => item.id}
                            contentContainerStyle={styles.playlistsList}
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    tintColor="#535aff"
                                    colors={['#535aff']}
                                />
                            }
                            renderItem={({ item }) => <PlaylistCard playlist={item} />}
                        />
                    )}
                </View>
            </SafeAreaView>
        );
    }

    // Show channels for selected playlist
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={resetToPlaylistSelection}
                    >
                        <Ionicons name="chevron-back" size={24} color="#fff" />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.title}>Channels</Text>
                        <Text style={styles.subtitle}>
                            {enabledPlaylists.find(p => p.id === selectedPlaylist)?.name}
                        </Text>
                    </View>
                </View>

                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={[styles.headerButton, showSearch && styles.activeHeaderButton]}
                        onPress={async () => {
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                            setShowSearch(!showSearch);
                            if (showSearch) setSearchQuery('');
                        }}
                    >
                        <Ionicons name="search" size={22} color="#fff" />
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={async () => {
                            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                            onSettingsPress?.();
                        }}
                    >
                        <Ionicons name="settings-outline" size={22} color="#fff" />
                    </TouchableOpacity>
                </View>
            </View>

            {/* Search Bar */}
            <SearchBar />

            {/* Content */}
            <View style={styles.content}>
                {/* Filters */}
                <View style={styles.filtersContainer}>
                    <FilterSelector
                        title="Language"
                        items={getLanguages()}
                        selected={selectedLanguage}
                        onSelect={setSelectedLanguage}
                        icon="language"
                    />
                    <FilterSelector
                        title="Category"
                        items={getCategories()}
                        selected={selectedCategory}
                        onSelect={setSelectedCategory}
                        icon="grid"
                    />
                </View>

                {loading && !refreshing ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#535aff" />
                        <Text style={styles.loadingText}>Loading channels...</Text>
                    </View>
                ) : getFilteredChannels().length === 0 ? (
                    <EmptyState type="channels" />
                ) : (
                    <View style={styles.channelsContainer}>
                        <View style={styles.channelsHeader}>
                            <Text style={styles.channelsCount}>
                                {getFilteredChannels().length} of {channels.length} channels
                            </Text>
                        </View>
                        <FlatList
                            data={getFilteredChannels()}
                            keyExtractor={(item) => item.id}
                            numColumns={2}
                            columnWrapperStyle={styles.row}
                            contentContainerStyle={styles.channelsList}
                            showsVerticalScrollIndicator={false}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    tintColor="#535aff"
                                    colors={['#535aff']}
                                />
                            }
                            renderItem={({ item }) => <ChannelCard channel={item} />}
                        />
                    </View>
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a0a',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    backButton: {
        marginRight: 12,
        padding: 4,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 2,
    },
    headerRight: {
        flexDirection: 'row',
        gap: 8,
    },
    headerButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#1a1a1a',
        alignItems: 'center',
        justifyContent: 'center',
    },
    activeHeaderButton: {
        backgroundColor: '#535aff',
    },
    content: {
        flex: 1,
    },
    searchContainer: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
    },
    searchInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#1a1a1a',
        borderRadius: 12,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    searchInput: {
        flex: 1,
        marginLeft: 12,
        fontSize: 16,
        color: '#fff',
    },
    clearButton: {
        padding: 4,
    },
    playlistsList: {
        padding: 20,
        paddingBottom: 40,
    },
    playlistCard: {
        marginBottom: 16,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    playlistCardGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        minHeight: 80,
    },
    playlistIcon: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#535aff20',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    playlistName: {
        flex: 1,
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
    },
    playlistMeta: {
        alignItems: 'flex-end',
        marginRight: 12,
    },
    channelCountText: {
        fontSize: 14,
        color: '#666',
    },
    playlistArrow: {
        width: 24,
        height: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    filtersContainer: {
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
    },
    filterSection: {
        paddingVertical: 12,
    },
    filterHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 8,
    },
    filterTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#888',
        marginLeft: 8,
    },
    filterContent: {
        paddingHorizontal: 20,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#151515',
        borderWidth: 1,
        borderColor: '#222',
    },
    selectedFilterChip: {
        backgroundColor: '#535aff20',
        borderColor: '#535aff',
    },
    filterChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#888',
    },
    selectedFilterChipText: {
        color: '#535aff',
    },
    channelsContainer: {
        flex: 1,
    },
    channelsHeader: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
    },
    channelsCount: {
        fontSize: 14,
        color: '#666',
        fontWeight: '600',
    },
    channelsList: {
        padding: 20,
        paddingBottom: 40,
    },
    row: {
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    channelCard: {
        width: (width - 56) / 2,
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
    },
    channelCardGradient: {
        padding: 16,
        minHeight: 200,
    },
    channelImageContainer: {
        alignItems: 'center',
        marginBottom: 12,
        position: 'relative',
    },
    channelLogo: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: '#222',
    },
    channelLogoPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: '#222',
        alignItems: 'center',
        justifyContent: 'center',
    },
    playOverlay: {
        position: 'absolute',
        bottom: -8,
        right: -8,
        backgroundColor: '#0a0a0a',
        borderRadius: 20,
        padding: 2,
    },
    channelInfo: {
        flex: 1,
        marginBottom: 8,
    },
    channelName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
        textAlign: 'center',
    },
    channelGroup: {
        fontSize: 12,
        color: '#888',
        textAlign: 'center',
        marginBottom: 2,
    },
    channelLanguage: {
        fontSize: 11,
        color: '#666',
        textAlign: 'center',
    },
    channelActions: {
        flexDirection: 'row',
        justifyContent: 'center',
    },
    favoriteButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#1a1a1a',
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    loadingText: {
        fontSize: 16,
        color: '#666',
        marginTop: 16,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 40,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginTop: 24,
        marginBottom: 12,
    },
    emptySubtitle: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
        lineHeight: 22,
        marginBottom: 32,
    },
    settingsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 12,
        backgroundColor: '#535aff20',
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#535aff40',
        gap: 8,
    },
    settingsButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#535aff',
    },
});

export default IptvScreen;