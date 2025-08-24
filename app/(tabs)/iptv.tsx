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
}

interface Channel {
    id: string;
    name: string;
    url: string;
    logo?: string;
    group?: string;
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
    const [selectedCategory, setSelectedCategory] = useState<string>('All');

    // Mock data for demonstration
    const mockPlaylists: Playlist[] = [
        {
            id: '1',
            name: 'Sports Channels',
            url: 'https://example.com/sports.m3u8',
            enabled: true,
            createdAt: new Date().toISOString(),
        },
        {
            id: '2',
            name: 'News Channels',
            url: 'https://example.com/news.m3u8',
            enabled: true,
            createdAt: new Date().toISOString(),
        },
        {
            id: '3',
            name: 'Entertainment',
            url: 'https://example.com/entertainment.m3u8',
            enabled: true,
            createdAt: new Date().toISOString(),
        },
    ];

    const mockChannels: Channel[] = [
        {
            id: '1',
            name: 'ESPN',
            url: 'https://example.com/espn.m3u8',
            logo: 'https://via.placeholder.com/80x80/ff0000/ffffff?text=ESPN',
            group: 'Sports',
            playlistId: '1'
        },
        {
            id: '2',
            name: 'Fox Sports',
            url: 'https://example.com/foxsports.m3u8',
            logo: 'https://via.placeholder.com/80x80/0066cc/ffffff?text=FOX',
            group: 'Sports',
            playlistId: '1'
        },
        {
            id: '3',
            name: 'CNN',
            url: 'https://example.com/cnn.m3u8',
            logo: 'https://via.placeholder.com/80x80/cc0000/ffffff?text=CNN',
            group: 'News',
            playlistId: '2'
        },
        {
            id: '4',
            name: 'BBC News',
            url: 'https://example.com/bbc.m3u8',
            logo: 'https://via.placeholder.com/80x80/ffffff/000000?text=BBC',
            group: 'News',
            playlistId: '2'
        },
        {
            id: '5',
            name: 'Netflix',
            url: 'https://example.com/netflix.m3u8',
            logo: 'https://via.placeholder.com/80x80/e50914/ffffff?text=NF',
            group: 'Entertainment',
            playlistId: '3'
        },
        {
            id: '6',
            name: 'Disney+',
            url: 'https://example.com/disney.m3u8',
            logo: 'https://via.placeholder.com/80x80/003366/ffffff?text=D+',
            group: 'Entertainment',
            playlistId: '3'
        },
    ];

    const activePlaylistsData = playlists.length > 0 ? playlists : mockPlaylists;
    const enabledPlaylists = activePlaylistsData.filter(p => p.enabled);

    useEffect(() => {
        loadChannels();
    }, [selectedPlaylist]);

    const loadChannels = async () => {
        setLoading(true);
        try {
            // Simulate API call
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            let filteredChannels = mockChannels;
            if (selectedPlaylist) {
                filteredChannels = mockChannels.filter(c => c.playlistId === selectedPlaylist);
            }
            
            setChannels(filteredChannels);
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

    const getCategories = () => {
        const categories = ['All', ...new Set(channels.map(c => c.group).filter(Boolean))];
        return categories;
    };

    const getFilteredChannels = () => {
        let filtered = channels;
        
        if (selectedCategory !== 'All') {
            filtered = filtered.filter(c => c.group === selectedCategory);
        }
        
        if (searchQuery) {
            filtered = filtered.filter(c => 
                c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                (c.group && c.group.toLowerCase().includes(searchQuery.toLowerCase()))
            );
        }
        
        return filtered;
    };

    const PlaylistSelector = () => (
        <View style={styles.playlistSelector}>
            <FlatList
                horizontal
                data={[{ id: 'all', name: 'All Channels' }, ...enabledPlaylists]}
                keyExtractor={(item) => item.id}
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.playlistSelectorContent}
                renderItem={({ item }) => (
                    <TouchableOpacity
                        style={[
                            styles.playlistChip,
                            (selectedPlaylist === item.id || (item.id === 'all' && !selectedPlaylist)) && 
                            styles.selectedPlaylistChip
                        ]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                            setSelectedPlaylist(item.id === 'all' ? null : item.id);
                            setSelectedCategory('All');
                        }}
                    >
                        <Text style={[
                            styles.playlistChipText,
                            (selectedPlaylist === item.id || (item.id === 'all' && !selectedPlaylist)) && 
                            styles.selectedPlaylistChipText
                        ]}>
                            {item.name}
                        </Text>
                    </TouchableOpacity>
                )}
            />
        </View>
    );

    const CategorySelector = () => {
        const categories = getCategories();
        if (categories.length <= 1) return null;

        return (
            <View style={styles.categorySelector}>
                <FlatList
                    horizontal
                    data={categories}
                    keyExtractor={(item: any) => item}
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categorySelectorContent}
                    renderItem={({ item }) => (
                        <TouchableOpacity
                            style={[
                                styles.categoryChip,
                                selectedCategory === item && styles.selectedCategoryChip
                            ]}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                                setSelectedCategory(item);
                            }}
                        >
                            <Text style={[
                                styles.categoryChipText,
                                selectedCategory === item && styles.selectedCategoryChipText
                            ]}>
                                {item}
                            </Text>
                        </TouchableOpacity>
                    )}
                />
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

    const EmptyState = () => (
        <View style={styles.emptyState}>
            <Ionicons name="tv-outline" size={80} color="#333" />
            <Text style={styles.emptyTitle}>No Channels Available</Text>
            <Text style={styles.emptySubtitle}>
                {enabledPlaylists.length === 0 
                    ? 'No active playlists found. Enable playlists in settings.'
                    : 'No channels found in the selected playlist.'
                }
            </Text>
            {enabledPlaylists.length === 0 && (
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

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="#000" />
            
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.title}>IPTV</Text>
                    <View style={styles.channelCount}>
                        <Text style={styles.channelCountText}>
                            {getFilteredChannels().length} channels
                        </Text>
                    </View>
                </View>
                
                <View style={styles.headerRight}>
                    <TouchableOpacity 
                        style={styles.headerButton}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                            // Add search functionality
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

            {/* Content */}
            <View style={styles.content}>
                {enabledPlaylists.length > 1 && <PlaylistSelector />}
                <CategorySelector />
                
                {loading && !refreshing ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#535aff" />
                        <Text style={styles.loadingText}>Loading channels...</Text>
                    </View>
                ) : getFilteredChannels().length === 0 ? (
                    <EmptyState />
                ) : (
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
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        marginRight: 12,
    },
    channelCount: {
        backgroundColor: '#535aff20',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#535aff40',
    },
    channelCountText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#535aff',
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
    content: {
        flex: 1,
    },
    playlistSelector: {
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
    },
    playlistSelectorContent: {
        paddingHorizontal: 20,
        gap: 12,
    },
    playlistChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#1a1a1a',
        borderWidth: 1,
        borderColor: '#222',
    },
    selectedPlaylistChip: {
        backgroundColor: '#535aff',
        borderColor: '#535aff',
    },
    playlistChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#666',
    },
    selectedPlaylistChipText: {
        color: '#fff',
    },
    categorySelector: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1a1a1a',
    },
    categorySelectorContent: {
        paddingHorizontal: 20,
        gap: 8,
    },
    categoryChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
        backgroundColor: '#151515',
        borderWidth: 1,
        borderColor: '#222',
    },
    selectedCategoryChip: {
        backgroundColor: '#00ff8820',
        borderColor: '#00ff88',
    },
    categoryChipText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#888',
    },
    selectedCategoryChipText: {
        color: '#00ff88',
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
        minHeight: 180,
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