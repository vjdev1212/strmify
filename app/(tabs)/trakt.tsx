import { SafeAreaView, ScrollView, StyleSheet, Pressable, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { StatusBar, Text, View } from '../../components/Themed';
import { isHapticsSupported, showAlert } from '@/utils/platform';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { isUserAuthenticated, makeTraktApiCall } from '../settings/trakt';

const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

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
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
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
                    style={[
                        styles.tab,
                        selectedTab === tab.key && styles.activeTab
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

    const renderMediaItem = (item: EnhancedTraktItem, index: number) => {
        const content = item.movie || item.show;
        const title = content?.title || content?.name;
        const year = content?.year;
        const poster = item.tmdb?.poster_path;
        const rating = item.tmdb?.vote_average;
        const userRating = item.rating;

        return (
            <View key={`${content?.ids?.trakt}-${index}`} style={styles.mediaItem}>
                <View style={styles.mediaContent}>
                    {poster && (
                        <Image 
                            source={{ uri: `${TMDB_IMAGE_BASE}${poster}` }}
                            style={styles.poster}
                            resizeMode="cover"
                        />
                    )}
                    <View style={styles.mediaInfo}>
                        <Text style={styles.mediaTitle}>{title}</Text>
                        {year && <Text style={styles.mediaYear}>({year})</Text>}
                        
                        <View style={styles.ratingContainer}>
                            {rating && (
                                <View style={styles.ratingBadge}>
                                    <Text style={styles.ratingText}>⭐ {rating.toFixed(1)}</Text>
                                </View>
                            )}
                            {userRating && (
                                <View style={[styles.ratingBadge, styles.userRatingBadge]}>
                                    <Text style={styles.ratingText}>Your: {userRating}/10</Text>
                                </View>
                            )}
                        </View>

                        {item.plays && item.plays > 1 && (
                            <Text style={styles.playCount}>Watched {item.plays} times</Text>
                        )}
                        
                        {item.watched_at && (
                            <Text style={styles.dateText}>
                                Watched: {new Date(item.watched_at).toLocaleDateString()}
                            </Text>
                        )}
                        
                        {item.collected_at && (
                            <Text style={styles.dateText}>
                                Collected: {new Date(item.collected_at).toLocaleDateString()}
                            </Text>
                        )}
                    </View>
                </View>
            </View>
        );
    };

    const renderStats = () => {
        if (!stats) return <Text style={styles.emptyText}>No stats available</Text>;

        return (
            <View style={styles.statsContainer}>
                <View style={styles.statSection}>
                    <Text style={styles.statSectionTitle}>Movies</Text>
                    <View style={styles.statGrid}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{stats.movies?.plays || 0}</Text>
                            <Text style={styles.statLabel}>Plays</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{stats.movies?.watched || 0}</Text>
                            <Text style={styles.statLabel}>Watched</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{stats.movies?.collected || 0}</Text>
                            <Text style={styles.statLabel}>Collected</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{stats.movies?.ratings || 0}</Text>
                            <Text style={styles.statLabel}>Rated</Text>
                        </View>
                    </View>
                    {stats.movies?.minutes && (
                        <Text style={styles.statMinutes}>
                            {Math.round(stats.movies.minutes / 60)} hours watched
                        </Text>
                    )}
                </View>

                <View style={styles.statSection}>
                    <Text style={styles.statSectionTitle}>TV Shows</Text>
                    <View style={styles.statGrid}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{stats.shows?.watched || 0}</Text>
                            <Text style={styles.statLabel}>Shows</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{stats.episodes?.plays || 0}</Text>
                            <Text style={styles.statLabel}>Episodes</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{stats.shows?.collected || 0}</Text>
                            <Text style={styles.statLabel}>Collected</Text>
                        </View>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{stats.shows?.ratings || 0}</Text>
                            <Text style={styles.statLabel}>Rated</Text>
                        </View>
                    </View>
                    {stats.episodes?.minutes && (
                        <Text style={styles.statMinutes}>
                            {Math.round(stats.episodes.minutes / 60)} hours watched
                        </Text>
                    )}
                </View>
            </View>
        );
    };

    const renderContent = () => {
        let data: EnhancedTraktItem[] = [];
        let emptyMessage = '';

        switch (selectedTab) {
            case 'watched':
                data = [...watchedMovies, ...watchedShows];
                emptyMessage = 'No watched content found';
                break;
            case 'collection':
                data = [...collectedMovies, ...collectedShows];
                emptyMessage = 'No collected content found';
                break;
            case 'watchlist':
                data = watchlist;
                emptyMessage = 'Your watchlist is empty';
                break;
            case 'ratings':
                data = ratings;
                emptyMessage = 'No ratings found';
                break;
            case 'history':
                data = history;
                emptyMessage = 'No watch history found';
                break;
            case 'stats':
                return renderStats();
        }

        if (data.length === 0) {
            return <Text style={styles.emptyText}>{emptyMessage}</Text>;
        }

        return (
            <View style={styles.contentContainer}>
                {data.map((item, index) => renderMediaItem(item, index))}
            </View>
        );
    };

    const renderUnauthenticated = () => (
        <View style={styles.unauthenticatedContainer}>
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
                    <Text style={styles.loadingText}>Loading Trakt data...</Text>
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
                <>
                    {renderTabs()}
                    <ScrollView
                        style={styles.scrollView}
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                        }
                    >
                        {renderContent()}
                    </ScrollView>
                </>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 50,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        color: '#888',
    },
    unauthenticatedContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        gap: 16,
    },
    unauthenticatedTitle: {
        fontSize: 24,
        fontWeight: '600',
        color: '#fff',
        textAlign: 'center',
    },
    unauthenticatedText: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        lineHeight: 24,
    },
    tabContainer: {
        flexGrow: 0,
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    tab: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 12,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        gap: 8,
    },
    activeTab: {
        backgroundColor: '#535aff',
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
        borderRadius: 10,
        paddingHorizontal: 6,
        paddingVertical: 2,
        minWidth: 20,
        alignItems: 'center',
    },
    tabBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
    scrollView: {
        flex: 1,
        paddingHorizontal: 16,
    },
    contentContainer: {
        paddingBottom: 20,
    },
    mediaItem: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    mediaContent: {
        flexDirection: 'row',
        gap: 12,
    },
    poster: {
        width: 60,
        height: 90,
        borderRadius: 6,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
    },
    mediaInfo: {
        flex: 1,
        gap: 4,
    },
    mediaTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        lineHeight: 22,
    },
    mediaYear: {
        fontSize: 14,
        color: '#888',
    },
    ratingContainer: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 4,
    },
    ratingBadge: {
        backgroundColor: 'rgba(255, 193, 7, 0.2)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#ffc107',
    },
    userRatingBadge: {
        backgroundColor: 'rgba(83, 90, 255, 0.2)',
        borderColor: '#535aff',
    },
    ratingText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#fff',
    },
    playCount: {
        fontSize: 12,
        color: '#535aff',
        fontWeight: '500',
    },
    dateText: {
        fontSize: 12,
        color: '#666',
        fontStyle: 'italic',
    },
    emptyText: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        marginTop: 40,
        fontStyle: 'italic',
    },
    statsContainer: {
        gap: 24,
        paddingBottom: 20,
    },
    statSection: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 12,
        padding: 16,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    statSectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 16,
        textAlign: 'center',
    },
    statGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 12,
    },
    statItem: {
        alignItems: 'center',
        minWidth: '22%',
        backgroundColor: 'rgba(83, 90, 255, 0.1)',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#535aff',
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#535aff',
    },
    statLabel: {
        fontSize: 12,
        color: '#888',
        marginTop: 4,
        textAlign: 'center',
    },
    statMinutes: {
        fontSize: 14,
        color: '#fff',
        textAlign: 'center',
        marginTop: 12,
        fontWeight: '500',
    },
});

export default TraktScreen;