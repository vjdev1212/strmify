import { SafeAreaView, ScrollView, StyleSheet, Pressable, ActivityIndicator, RefreshControl, Image, FlatList, Dimensions } from 'react-native';
import { StatusBar, Text, View } from '../../components/Themed';
import { isHapticsSupported, showAlert } from '@/utils/platform';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { isUserAuthenticated, makeTraktApiCall } from '../settings/trakt';

const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

const { width } = Dimensions.get('window');
const POSTER_WIDTH = (width - 48) / 3;
const POSTER_HEIGHT = POSTER_WIDTH * 1.5;

interface TraktItem {
    type: 'movie' | 'show' | 'episode';
    movie?: any;
    show?: any;
    episode?: any;
    watched_at?: string;
    collected_at?: string;
    rating?: number;
    plays?: number;
}

interface TMDBDetails {
    poster_path?: string;
    backdrop_path?: string;
    overview?: string;
    genre_ids?: number[];
    vote_average?: number;
    release_date?: string;
    first_air_date?: string;
}

interface EnhancedTraktItem extends TraktItem {
    tmdb?: TMDBDetails;
    tmdb_id?: number;
}

const TraktScreen = () => {
    const router = useRouter();
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);

    // Trakt Data States
    const [watchedMovies, setWatchedMovies] = useState<EnhancedTraktItem[]>([]);
    const [watchedShows, setWatchedShows] = useState<EnhancedTraktItem[]>([]);
    const [collectedMovies, setCollectedMovies] = useState<EnhancedTraktItem[]>([]);
    const [collectedShows, setCollectedShows] = useState<EnhancedTraktItem[]>([]);
    const [watchlist, setWatchlist] = useState<EnhancedTraktItem[]>([]);
    const [ratings, setRatings] = useState<EnhancedTraktItem[]>([]);
    const [history, setHistory] = useState<EnhancedTraktItem[]>([]);
    const [stats, setStats] = useState<any>(null);

    const [selectedTab, setSelectedTab] = useState<'watched' | 'collection' | 'watchlist' | 'ratings' | 'history' | 'stats'>('watched');

    useEffect(() => {
        checkAuthentication();
    }, []);

    useFocusEffect(
        useCallback(() => {
            if (isAuthenticated) {
                loadAllTraktData();
            }
        }, [isAuthenticated])
    );

    const checkAuthentication = async () => {
        const authenticated = await isUserAuthenticated();
        setIsAuthenticated(authenticated);
        if (authenticated) {
            await loadAllTraktData();
        }
        setIsLoading(false);
    };

    const loadAllTraktData = async () => {
        if (!isAuthenticated) return;

        try {
            setIsLoading(true);
            await Promise.all([
                loadWatchedMovies(),
                loadWatchedShows(),
                loadCollectedMovies(),
                loadCollectedShows(),
                loadWatchlist(),
                loadRatings(),
                loadHistory(),
                loadStats()
            ]);
        } catch (error) {
            console.error('Error loading Trakt data:', error);
            showAlert('Error', 'Failed to load Trakt data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const enhanceWithTMDB = async (items: TraktItem[]): Promise<EnhancedTraktItem[]> => {
        if (!TMDB_API_KEY) {
            console.warn('TMDB API key not found');
            return items;
        }

        const enhancedItems = await Promise.all(
            items.slice(0, 20).map(async (item) => { // Limit to first 20 items to avoid rate limits
                try {
                    const content = item.movie || item.show;
                    const tmdbId = content?.ids?.tmdb;

                    if (tmdbId) {
                        const endpoint = item.movie ? 'movie' : 'tv';
                        const response = await fetch(
                            `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`
                        );

                        if (response.ok) {
                            const tmdbData = await response.json();
                            return {
                                ...item,
                                tmdb: tmdbData,
                                tmdb_id: tmdbId
                            };
                        }
                    }
                } catch (error) {
                    console.error('TMDB enhancement error:', error);
                }
                return item;
            })
        );

        return enhancedItems;
    };

    const loadWatchedMovies = async () => {
        try {
            const data = await makeTraktApiCall('/sync/watched/movies');
            const enhanced = await enhanceWithTMDB(data.map((item: any) => ({ ...item, type: 'movie' as const })));
            setWatchedMovies(enhanced);
        } catch (error) {
            console.error('Error loading watched movies:', error);
        }
    };

    const loadWatchedShows = async () => {
        try {
            const data = await makeTraktApiCall('/sync/watched/shows');
            const enhanced = await enhanceWithTMDB(data.map((item: any) => ({ ...item, type: 'show' as const })));
            setWatchedShows(enhanced);
        } catch (error) {
            console.error('Error loading watched shows:', error);
        }
    };

    const loadCollectedMovies = async () => {
        try {
            const data = await makeTraktApiCall('/sync/collection/movies');
            const enhanced = await enhanceWithTMDB(data.map((item: any) => ({ ...item, type: 'movie' as const })));
            setCollectedMovies(enhanced);
        } catch (error) {
            console.error('Error loading collected movies:', error);
        }
    };

    const loadCollectedShows = async () => {
        try {
            const data = await makeTraktApiCall('/sync/collection/shows');
            const enhanced = await enhanceWithTMDB(data.map((item: any) => ({ ...item, type: 'show' as const })));
            setCollectedShows(enhanced);
        } catch (error) {
            console.error('Error loading collected shows:', error);
        }
    };

    const loadWatchlist = async () => {
        try {
            const data = await makeTraktApiCall('/sync/watchlist');
            const enhanced = await enhanceWithTMDB(data);
            setWatchlist(enhanced);
        } catch (error) {
            console.error('Error loading watchlist:', error);
        }
    };

    const loadRatings = async () => {
        try {
            const data = await makeTraktApiCall('/sync/ratings');
            const enhanced = await enhanceWithTMDB(data);
            setRatings(enhanced);
        } catch (error) {
            console.error('Error loading ratings:', error);
        }
    };

    const loadHistory = async () => {
        try {
            const data = await makeTraktApiCall('/sync/history');
            const enhanced = await enhanceWithTMDB(data.slice(0, 50)); // Recent 50 items
            setHistory(enhanced);
        } catch (error) {
            console.error('Error loading history:', error);
        }
    };

    const loadStats = async () => {
        try {
            const data = await makeTraktApiCall('/users/me/stats');
            setStats(data);
        } catch (error) {
            console.error('Error loading stats:', error);
        }
    };

    const handleMediaPress = async (item: EnhancedTraktItem) => {
        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        }

        const content = item.movie || item.show;
        const tmdbId = item.tmdb_id || content?.ids?.tmdb;
        const type: ("movie" | "series") = item.movie ? 'movie' : 'series';

        if (tmdbId) {
            router.push({
                pathname: `/${type}/details`,
                params: { moviedbid: tmdbId.toString() },
            });
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadAllTraktData();
        setRefreshing(false);

        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const renderTabs = () => (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.tabContainer}>
            {[
                { key: 'watched', label: 'Watched', count: watchedMovies.length + watchedShows.length },
                { key: 'collection', label: 'Collection', count: collectedMovies.length + collectedShows.length },
                { key: 'watchlist', label: 'Watchlist', count: watchlist.length },
                { key: 'ratings', label: 'Ratings', count: ratings.length },
                { key: 'history', label: 'History', count: history.length },
                { key: 'stats', label: 'Stats', count: 0 }
            ].map((tab) => (
                <Pressable
                    key={tab.key}
                    style={({ pressed }) => [
                        styles.tab,
                        selectedTab === tab.key && styles.activeTab,
                        pressed && styles.tabPressed
                    ]}
                    onPress={() => {
                        setSelectedTab(tab.key as any);
                        if (isHapticsSupported()) {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                        }
                    }}
                >
                    <Text style={[
                        styles.tabText,
                        selectedTab === tab.key && styles.activeTabText
                    ]}>
                        {tab.label}
                    </Text>
                    {tab.count > 0 && (
                        <View style={styles.tabBadge}>
                            <Text style={styles.tabBadgeText}>{tab.count}</Text>
                        </View>
                    )}
                </Pressable>
            ))}
        </ScrollView>
    );

    const renderMediaItemGrid = ({ item, index }: { item: EnhancedTraktItem; index: number }) => {
        const content = item.movie || item.show;
        const title = content?.title || content?.name;
        const year = content?.year;
        const poster = item.tmdb?.poster_path;
        const rating = item.tmdb?.vote_average;
        const userRating = item.rating;

        return (
            <Pressable
                style={({ pressed }) => [
                    styles.gridItem,
                    pressed && styles.gridItemPressed
                ]}
                onPress={() => handleMediaPress(item)}
            >
                <View style={styles.posterContainer}>
                    {poster ? (
                        <Image
                            source={{ uri: `${TMDB_IMAGE_BASE}${poster}` }}
                            style={styles.gridPoster}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.gridPoster, styles.placeholderPoster]}>
                            <Text style={styles.placeholderText}>🎬</Text>
                        </View>
                    )}

                    {rating && (
                        <View style={styles.ratingOverlay}>
                            <Text style={styles.ratingOverlayText}>⭐ {rating.toFixed(1)}</Text>
                        </View>
                    )}

                    {userRating && (
                        <View style={styles.userRatingOverlay}>
                            <Text style={styles.userRatingOverlayText}>{userRating}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.gridItemInfo}>
                    <Text style={styles.gridItemTitle} numberOfLines={2}>
                        {title}
                    </Text>
                    {year && (
                        <Text style={styles.gridItemYear}>{year}</Text>
                    )}
                </View>
            </Pressable>
        );
    };

    const renderMediaItemList = ({ item, index }: { item: EnhancedTraktItem; index: number }) => {
        const content = item.movie || item.show;
        const title = content?.title || content?.name;
        const year = content?.year;
        const poster = item.tmdb?.poster_path;
        const rating = item.tmdb?.vote_average;
        const userRating = item.rating;

        return (
            <Pressable
                style={({ pressed }) => [
                    styles.listItem,
                    pressed && styles.listItemPressed
                ]}
                onPress={() => handleMediaPress(item)}
            >
                <View style={styles.listPosterContainer}>
                    {poster ? (
                        <Image
                            source={{ uri: `${TMDB_IMAGE_BASE}${poster}` }}
                            style={styles.listPoster}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.listPoster, styles.placeholderPoster]}>
                            <Text style={styles.placeholderTextSmall}>🎬</Text>
                        </View>
                    )}
                </View>

                <View style={styles.listItemInfo}>
                    <Text style={styles.listItemTitle} numberOfLines={2}>
                        {title}
                    </Text>
                    {year && (
                        <Text style={styles.listItemYear}>{year}</Text>
                    )}

                    <View style={styles.listRatingContainer}>
                        {rating && (
                            <View style={styles.listRatingBadge}>
                                <Text style={styles.listRatingText}>⭐ {rating.toFixed(1)}</Text>
                            </View>
                        )}
                        {userRating && (
                            <View style={[styles.listRatingBadge, styles.listUserRatingBadge]}>
                                <Text style={styles.listRatingText}>Your: {userRating}/10</Text>
                            </View>
                        )}
                    </View>

                    {item.plays && item.plays > 1 && (
                        <Text style={styles.playCount}>Watched {item.plays} times</Text>
                    )}

                    {(item.watched_at || item.collected_at) && (
                        <Text style={styles.dateText}>
                            {item.watched_at ? `Watched: ${new Date(item.watched_at).toLocaleDateString()}` :
                                item.collected_at ? `Collected: ${new Date(item.collected_at).toLocaleDateString()}` : ''}
                        </Text>
                    )}
                </View>
            </Pressable>
        );
    };

    const renderStats = () => {
        if (!stats) return (
            <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📊</Text>
                <Text style={styles.emptyText}>No stats available</Text>
            </View>
        );

        return (
            <ScrollView style={styles.statsScrollView} showsVerticalScrollIndicator={false}>
                <View style={styles.statsContainer}>
                    <View style={styles.statSection}>
                        <View style={styles.statSectionHeader}>
                            <Text style={styles.statSectionIcon}>🎬</Text>
                            <Text style={styles.statSectionTitle}>Movies</Text>
                        </View>
                        <View style={styles.statGrid}>
                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>{stats.movies?.plays || 0}</Text>
                                <Text style={styles.statLabel}>Plays</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>{stats.movies?.watched || 0}</Text>
                                <Text style={styles.statLabel}>Watched</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>{stats.movies?.collected || 0}</Text>
                                <Text style={styles.statLabel}>Collected</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>{stats.movies?.ratings || 0}</Text>
                                <Text style={styles.statLabel}>Rated</Text>
                            </View>
                        </View>
                        {stats.movies?.minutes && (
                            <View style={styles.statTimeContainer}>
                                <Text style={styles.statMinutes}>
                                    🕒 {Math.round(stats.movies.minutes / 60)} hours watched
                                </Text>
                            </View>
                        )}
                    </View>

                    <View style={styles.statSection}>
                        <View style={styles.statSectionHeader}>
                            <Text style={styles.statSectionIcon}>📺</Text>
                            <Text style={styles.statSectionTitle}>TV Shows</Text>
                        </View>
                        <View style={styles.statGrid}>
                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>{stats.shows?.watched || 0}</Text>
                                <Text style={styles.statLabel}>Shows</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>{stats.episodes?.plays || 0}</Text>
                                <Text style={styles.statLabel}>Episodes</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>{stats.shows?.collected || 0}</Text>
                                <Text style={styles.statLabel}>Collected</Text>
                            </View>
                            <View style={styles.statCard}>
                                <Text style={styles.statValue}>{stats.shows?.ratings || 0}</Text>
                                <Text style={styles.statLabel}>Rated</Text>
                            </View>
                        </View>
                        {stats.episodes?.minutes && (
                            <View style={styles.statTimeContainer}>
                                <Text style={styles.statMinutes}>
                                    🕒 {Math.round(stats.episodes.minutes / 60)} hours watched
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </ScrollView>
        );
    };

    const renderContent = () => {
        let data: EnhancedTraktItem[] = [];
        let emptyMessage = '';
        let emptyIcon = '';

        switch (selectedTab) {
            case 'watched':
                data = [...watchedMovies, ...watchedShows];
                emptyMessage = 'No watched content found';
                emptyIcon = '👁️';
                break;
            case 'collection':
                data = [...collectedMovies, ...collectedShows];
                emptyMessage = 'No collected content found';
                emptyIcon = '📚';
                break;
            case 'watchlist':
                data = watchlist;
                emptyMessage = 'Your watchlist is empty';
                emptyIcon = '⏰';
                break;
            case 'ratings':
                data = ratings;
                emptyMessage = 'No ratings found';
                emptyIcon = '⭐';
                break;
            case 'history':
                data = history;
                emptyMessage = 'No watch history found';
                emptyIcon = '📜';
                break;
            case 'stats':
                return renderStats();
        }

        if (data.length === 0) {
            return (
                <View style={styles.emptyContainer}>
                    <Text style={styles.emptyIcon}>{emptyIcon}</Text>
                    <Text style={styles.emptyText}>{emptyMessage}</Text>
                </View>
            );
        }

        // Use grid layout for watched, collection, and watchlist
        const useGridLayout = ['watched', 'collection', 'watchlist'].includes(selectedTab);

        if (useGridLayout) {
            return (
                <FlatList
                    data={data}
                    renderItem={renderMediaItemGrid}
                    numColumns={3}
                    columnWrapperStyle={styles.gridRow}
                    contentContainerStyle={styles.gridContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                />
            );
        }

        // Use list layout for ratings and history
        return (
            <FlatList
                data={data}
                renderItem={renderMediaItemList}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            />
        );
    };

    const renderUnauthenticated = () => (
        <View style={styles.unauthenticatedContainer}>
            <Text style={styles.unauthenticatedIcon}>🔐</Text>
            <Text style={styles.unauthenticatedTitle}>Connect to Trakt.tv</Text>
            <Text style={styles.unauthenticatedText}>
                Please authenticate with Trakt.tv first to view your data
            </Text>
        </View>
    );

    if (isLoading && !refreshing) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#535aff" />
                    <Text style={styles.loadingText}>Loading your Trakt data...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar />
            {!isAuthenticated ? (
                renderUnauthenticated()
            ) : (
                <View style={styles.mainContainer}>
                    {renderTabs()}
                    <View style={styles.contentWrapper}>
                        {renderContent()}
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 30,
        backgroundColor: '#000',
    },
    mainContainer: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
        backgroundColor: '#000',
    },
    loadingText: {
        fontSize: 16,
        color: '#888',
        fontWeight: '500',
    },
    unauthenticatedContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        gap: 20,
        backgroundColor: '#000',
    },
    unauthenticatedIcon: {
        fontSize: 64,
        marginBottom: 8,
    },
    unauthenticatedTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        textAlign: 'center',
    },
    unauthenticatedText: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        lineHeight: 24,
        maxWidth: 300,
    },
    tabContainer: {
        flexGrow: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
        marginRight: 12,
        borderRadius: 25,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        gap: 8,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    activeTab: {
        backgroundColor: '#535aff',
        borderColor: '#535aff',
        shadowColor: '#535aff',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    tabPressed: {
        transform: [{ scale: 0.95 }],
    },
    tabIcon: {
        fontSize: 16,
    },
    tabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#888',
    },
    activeTabText: {
        color: '#fff',
    },
    tabBadge: {
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        borderRadius: 12,
        paddingHorizontal: 8,
        paddingVertical: 2,
        minWidth: 24,
        alignItems: 'center',
    },
    tabBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#fff',
    },
    contentWrapper: {
        flex: 1,
        backgroundColor: '#000',
    },
    // Grid Layout Styles
    gridContainer: {
        padding: 16,
        paddingBottom: 32,
    },
    gridRow: {
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    gridItem: {
        width: POSTER_WIDTH,
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 12,
        padding: 8,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    gridItemPressed: {
        transform: [{ scale: 0.95 }],
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
    },
    posterContainer: {
        position: 'relative',
        marginBottom: 8,
    },
    gridPoster: {
        width: '100%',
        height: POSTER_HEIGHT,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    placeholderPoster: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 32,
        opacity: 0.5,
    },
    placeholderTextSmall: {
        fontSize: 20,
        opacity: 0.5,
    },
    ratingOverlay: {
        position: 'absolute',
        top: 6,
        right: 6,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
    },
    ratingOverlayText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#ffc107',
    },
    userRatingOverlay: {
        position: 'absolute',
        top: 6,
        left: 6,
        backgroundColor: '#535aff',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 12,
        minWidth: 24,
        alignItems: 'center',
    },
    userRatingOverlayText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#fff',
    },
    gridItemInfo: {
        gap: 4,
    },
    gridItemTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#fff',
        lineHeight: 16,
    },
    gridItemYear: {
        fontSize: 12,
        color: '#888',
        fontWeight: '500',
    },
    // List Layout Styles
    listContainer: {
        padding: 16,
        paddingBottom: 32,
    },
    listItem: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 12,
        padding: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    listItemPressed: {
        backgroundColor: 'rgba(255, 255, 255, 0.08)',
        transform: [{ scale: 0.98 }],
    },
    listPosterContainer: {
        marginRight: 12,
    },
    listPoster: {
        width: 60,
        height: 90,
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    listItemInfo: {
        flex: 1,
        gap: 6,
        justifyContent: 'center',
    },
    listItemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        lineHeight: 20,
    },
    listItemYear: {
        fontSize: 14,
        color: '#888',
        fontWeight: '500',
    },
    listRatingContainer: {
        flexDirection: 'row',
        gap: 8,
        flexWrap: 'wrap',
    },
    listRatingBadge: {
        backgroundColor: 'rgba(255, 193, 7, 0.15)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 193, 7, 0.3)',
    },
    listUserRatingBadge: {
        backgroundColor: 'rgba(83, 90, 255, 0.15)',
        borderColor: 'rgba(83, 90, 255, 0.3)',
    },
    listRatingText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
    playCount: {
        fontSize: 12,
        color: '#535aff',
        fontWeight: '600',
    },
    dateText: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
    },
    // Empty State Styles
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        gap: 16,
    },
    emptyIcon: {
        fontSize: 64,
        opacity: 0.3,
    },
    emptyText: {
        fontSize: 18,
        color: '#666',
        textAlign: 'center',
        fontWeight: '500',
    },
    // Stats Styles
    statsScrollView: {
        flex: 1,
    },
    statsContainer: {
        padding: 16,
        gap: 24,
        paddingBottom: 32,
    },
    statSection: {
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 16,
        padding: 20,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.08)',
    },
    statSectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 20,
        gap: 12,
    },
    statSectionIcon: {
        fontSize: 24,
    },
    statSectionTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#fff',
    },
    statGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'space-between',
    },
    statCard: {
        backgroundColor: 'rgba(83, 90, 255, 0.1)',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
        minWidth: '22%',
        maxWidth: '48%',
        flex: 1,
        borderWidth: 1,
        borderColor: 'rgba(83, 90, 255, 0.2)',
    },
    statValue: {
        fontSize: 24,
        fontWeight: '800',
        color: '#535aff',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#aaa',
        fontWeight: '600',
        textAlign: 'center',
    },
    statTimeContainer: {
        marginTop: 16,
        backgroundColor: 'rgba(83, 90, 255, 0.05)',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(83, 90, 255, 0.1)',
    },
    statMinutes: {
        fontSize: 14,
        color: '#535aff',
        fontWeight: '600',
        textAlign: 'center',
    },
});

export default TraktScreen;