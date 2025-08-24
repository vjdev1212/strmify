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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';

const { width } = Dimensions.get('window');

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
    playlists?: Playlist[];
    onSettingsPress?: () => void;
}

const IptvScreen: React.FC<IptvScreenProps> = ({ 
    playlists = [],
    onSettingsPress 
}) => {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [selectedPlaylist, setSelectedPlaylist] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [searchQuery, setSearchQuery] = useState<string>('');
    const [selectedLanguage, setSelectedLanguage] = useState<string>('All');
    const [selectedCategory, setSelectedCategory] = useState<string>('All');
    const [showSearch, setShowSearch] = useState<boolean>(false);

    // Mock data for demonstration
    const mockPlaylists: Playlist[] = [
        {
            id: '1',
            name: 'Sports Channels',
            url: 'https://example.com/sports.m3u8',
            enabled: true,
            createdAt: new Date().toISOString(),
            channelCount: 45,
        },
        {
            id: '2',
            name: 'News Channels',
            url: 'https://example.com/news.m3u8',
            enabled: true,
            createdAt: new Date().toISOString(),
            channelCount: 28,
        },
        {
            id: '3',
            name: 'Entertainment',
            url: 'https://example.com/entertainment.m3u8',
            enabled: true,
            createdAt: new Date().toISOString(),
            channelCount: 67,
        },
        {
            id: '4',
            name: 'International',
            url: 'https://example.com/international.m3u8',
            enabled: true,
            createdAt: new Date().toISOString(),
            channelCount: 132,
        },
    ];

    const mockChannels: Channel[] = [
        // Sports Channels
        {
            id: '1',
            name: 'ESPN',
            url: 'https://example.com/espn.m3u8',
            logo: 'https://via.placeholder.com/80x80/ff0000/ffffff?text=ESPN',
            group: 'Sports',
            language: 'English',
            playlistId: '1'
        },
        {
            id: '2',
            name: 'Fox Sports',
            url: 'https://example.com/foxsports.m3u8',
            logo: 'https://via.placeholder.com/80x80/0066cc/ffffff?text=FOX',
            group: 'Sports',
            language: 'English',
            playlistId: '1'
        },
        {
            id: '15',
            name: 'Sky Sports',
            url: 'https://example.com/skysports.m3u8',
            logo: 'https://via.placeholder.com/80x80/003366/ffffff?text=SKY',
            group: 'Premium Sports',
            language: 'English',
            playlistId: '1'
        },
        // News Channels
        {
            id: '3',
            name: 'CNN',
            url: 'https://example.com/cnn.m3u8',
            logo: 'https://via.placeholder.com/80x80/cc0000/ffffff?text=CNN',
            group: 'News',
            language: 'English',
            playlistId: '2'
        },
        {
            id: '4',
            name: 'BBC News',
            url: 'https://example.com/bbc.m3u8',
            logo: 'https://via.placeholder.com/80x80/ffffff/000000?text=BBC',
            group: 'News',
            language: 'English',
            playlistId: '2'
        },
        {
            id: '16',
            name: 'Al Jazeera',
            url: 'https://example.com/aljazeera.m3u8',
            logo: 'https://via.placeholder.com/80x80/8B4513/ffffff?text=AJ',
            group: 'International News',
            language: 'Arabic',
            playlistId: '2'
        },
        // Entertainment Channels
        {
            id: '5',
            name: 'Netflix',
            url: 'https://example.com/netflix.m3u8',
            logo: 'https://via.placeholder.com/80x80/e50914/ffffff?text=NF',
            group: 'Streaming',
            language: 'English',
            playlistId: '3'
        },
        {
            id: '6',
            name: 'Disney+',
            url: 'https://example.com/disney.m3u8',
            logo: 'https://via.placeholder.com/80x80/003366/ffffff?text=D+',
            group: 'Family',
            language: 'English',
            playlistId: '3'
        },
        {
            id: '17',
            name: 'Comedy Central',
            url: 'https://example.com/comedy.m3u8',
            logo: 'https://via.placeholder.com/80x80/FFFF00/000000?text=CC',
            group: 'Comedy',
            language: 'English',
            playlistId: '3'
        },
        // International Channels
        {
            id: '7',
            name: 'Zee TV',
            url: 'https://example.com/zee.m3u8',
            logo: 'https://via.placeholder.com/80x80/FF6600/ffffff?text=ZEE',
            group: 'Entertainment',
            language: 'Hindi',
            playlistId: '4'
        },
        {
            id: '8',
            name: 'Star Plus',
            url: 'https://example.com/star.m3u8',
            logo: 'https://via.placeholder.com/80x80/FFD700/000000?text=STAR',
            group: 'Drama',
            language: 'Hindi',
            playlistId: '4'
        },
        {
            id: '9',
            name: 'TF1',
            url: 'https://example.com/tf1.m3u8',
            logo: 'https://via.placeholder.com/80x80/0066FF/ffffff?text=TF1',
            group: 'General',
            language: 'French',
            playlistId: '4'
        },
        {
            id: '10',
            name: 'RAI Uno',
            url: 'https://example.com/rai.m3u8',
            logo: 'https://via.placeholder.com/80x80/009900/ffffff?text=RAI',
            group: 'General',
            language: 'Italian',
            playlistId: '4'
        },
        {
            id: '11',
            name: 'TVE',
            url: 'https://example.com/tve.m3u8',
            logo: 'https://via.placeholder.com/80x80/FF0033/ffffff?text=TVE',
            group: 'General',
            language: 'Spanish',
            playlistId: '4'
        },
        {
            id: '12',
            name: 'ARD',
            url: 'https://example.com/ard.m3u8',
            logo: 'https://via.placeholder.com/80x80/000066/ffffff?text=ARD',
            group: 'General',
            language: 'German',
            playlistId: '4'
        },
        {
            id: '13',
            name: 'NHK World',
            url: 'https://example.com/nhk.m3u8',
            logo: 'https://via.placeholder.com/80x80/CC0000/ffffff?text=NHK',
            group: 'News',
            language: 'Japanese',
            playlistId: '4'
        },
        {
            id: '14',
            name: 'CCTV',
            url: 'https://example.com/cctv.m3u8',
            logo: 'https://via.placeholder.com/80x80/FF0000/FFFF00?text=CCTV',
            group: 'News',
            language: 'Chinese',
            playlistId: '4'
        },
    ];

    const activePlaylistsData = playlists.length > 0 ? playlists : mockPlaylists;
    const enabledPlaylists = activePlaylistsData.filter(p => p.enabled);

    useEffect(() => {
        if (selectedPlaylist) {
            loadChannels();
        }
    }, [selectedPlaylist]);

    const loadChannels = async () => {
        if (!selectedPlaylist) return;
        
        setLoading(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            const filteredChannels = mockChannels.filter(c => c.playlistId === selectedPlaylist);
            setChannels(filteredChannels);
            
            // Reset filters when switching playlists
            setSelectedLanguage('All');
            setSelectedCategory('All');
            setSearchQuery('');
        } catch (error) {
            Alert.alert('Error', 'Failed to load channels');
        } finally {
            setLoading(false);
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadChannels();
        setRefreshing(false);
    };

    const playChannel = (channel: Channel) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            'Play Channel',
            `Playing ${channel.name}`,
            [{ text: 'OK' }]
        );
    };

    const resetToPlaylistSelection = () => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        setSelectedPlaylist(null);
        setChannels([]);
        setSelectedLanguage('All');
        setSelectedCategory('All');
        setSearchQuery('');
        setShowSearch(false);
    };

    const getLanguages = () => {
        const languages = ['All', ...new Set(channels.map(c => c.language).filter(Boolean))];
        return languages.sort();
    };

    const getCategories = () => {
        const categories = ['All', ...new Set(channels.map(c => c.group).filter(Boolean))];
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
            onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
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
                        {playlist.channelCount || mockChannels.filter(c => c.playlistId === playlist.id).length} channels
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
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
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
                        onPress={(e) => {
                            e.stopPropagation();
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
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
                    ? 'No active playlists found. Enable playlists in settings.'
                    : searchQuery 
                        ? `No channels found matching "${searchQuery}"`
                        : 'No channels found in the selected filters.'
                }
            </Text>
            {type === 'playlists' && (
                <TouchableOpacity 
                    style={styles.settingsButton}
                    onPress={onSettingsPress}
                >
                    <Ionicons name="settings-outline" size={20} color="#535aff" />
                    <Text style={styles.settingsButtonText}>Go to Settings</Text>
                </TouchableOpacity>
            )}
        </View>
    );

    // If no playlist is selected, show playlist selection
    if (!selectedPlaylist) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar barStyle="light-content" backgroundColor="#000" />
                
                <View style={styles.header}>
                    <View style={styles.headerLeft}>
                        <Text style={styles.title}>Select Playlist</Text>
                    </View>
                    
                    <TouchableOpacity 
                        style={styles.headerButton}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
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
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                            setShowSearch(!showSearch);
                            if (showSearch) setSearchQuery('');
                        }}
                    >
                        <Ionicons name="search" size={22} color="#fff" />
                    </TouchableOpacity>
                    
                    <TouchableOpacity 
                        style={styles.headerButton}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
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
                        items={getLanguages() as []}
                        selected={selectedLanguage}
                        onSelect={setSelectedLanguage}
                        icon="language"
                    />
                    <FilterSelector
                        title="Category"
                        items={getCategories() as []}
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