import { SafeAreaView, ScrollView, StyleSheet, Pressable, ActivityIndicator, RefreshControl, Image, FlatList, Dimensions } from 'react-native';
import { StatusBar, Text, View } from '../../components/Themed';
import { isHapticsSupported, showAlert } from '@/utils/platform';
import * as Haptics from 'expo-haptics';
import { useEffect, useState, useMemo } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { isUserAuthenticated, makeTraktApiCall } from '@/utils/Trakt';
import BottomSpacing from '@/components/BottomSpacing';

const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';

interface TraktItem {
    type: 'movie' | 'show';
    movie?: any;
    show?: any;
    episode?: any;
    watched_at?: string;
    rating?: number;
    plays?: number;
    rank?: number;
    listed_at?: string; // For watchlist items
    updated_at?: string;
    last_watched_at?: string;
    last_updated_at?: string;
    progress?: number; // Playback progress (0-100)
    paused_at?: string; // When playback was paused
    action?: string; // 'start', 'pause', 'scrobble', 'watch'
}

interface TMDBDetails {
    poster_path?: string;
    vote_average?: number;
    release_date?: string;
    first_air_date?: string;
}

interface EnhancedTraktItem extends TraktItem {
    tmdb?: TMDBDetails;
    tmdb_id?: number;
}

interface ListSection {
    title: string;
    data: EnhancedTraktItem[];
}

const TraktScreen = () => {
    const router = useRouter();
    const [screenData, setScreenData] = useState(Dimensions.get('window'));
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
    const [isLoading, setIsLoading] = useState<boolean>(true);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [selectedTab, setSelectedTab] = useState<'user-lists' | 'movies' | 'shows'>('user-lists');
    const [userListSections, setUserListSections] = useState<ListSection[]>([]);
    const [movieSections, setMovieSections] = useState<ListSection[]>([]);
    const [showSections, setShowSections] = useState<ListSection[]>([]);

    // Screen dimensions and responsive calculations
    const { width, height } = screenData;
    const isPortrait = height > width;
    const shortSide = Math.min(width, height);

    // Device category based on shortSide
    const getPostersPerScreen = () => {
        if (shortSide < 580) return isPortrait ? 3 : 5;       // mobile
        if (shortSide < 1024) return isPortrait ? 6 : 8;      // tablet
        if (shortSide < 1440) return isPortrait ? 7 : 9;      // laptop
        return isPortrait ? 7 : 10;                           // desktop
    };

    const postersPerScreen = getPostersPerScreen();
    const spacing = 12;
    const containerMargin = 15;

    const posterWidth = useMemo(() => {
        const totalSpacing = spacing * (postersPerScreen - 1);
        const totalMargins = containerMargin * 2; // left + right
        return (width - totalSpacing - totalMargins) / postersPerScreen;
    }, [width, postersPerScreen]);

    const posterHeight = posterWidth * 1.5;

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setScreenData(window);
        });

        return () => subscription?.remove();
    }, []);

    useEffect(() => {
        checkAuthentication();
    }, []);

    const checkAuthentication = async () => {
        const authenticated = await isUserAuthenticated();
        setIsAuthenticated(authenticated);
        if (authenticated) {
            await loadAllData();
        }
        setIsLoading(false);
    };

    // Helper function to sort items by most recent date
    const sortByRecentDate = (items: TraktItem[]) => {
        return items.sort((a: any, b: any) => {
            // Priority order for date fields: listed_at > last_watched_at > last_updated_at > updated_at
            const getDate = (item: any) => {
                return item.rank ||
                    item.listed_at ||
                    item.last_watched_at ||
                    item.last_updated_at ||
                    item.updated_at ||
                    item.watched_at ||
                    '1970-01-01';
            };

            const dateA = new Date(getDate(a)).getTime();
            const dateB = new Date(getDate(b)).getTime();
            return dateB - dateA; // descending order (newest first)
        });
    };

    const enhanceWithTMDB = async (items: TraktItem[]): Promise<EnhancedTraktItem[]> => {
        if (!TMDB_API_KEY) {
            console.warn('TMDB API key not found');
            return items;
        }

        const enhancedItems = await Promise.all(
            items.slice(0, 20).map(async (item) => {
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

    const loadAllData = async () => {
        if (!isAuthenticated) return;

        try {
            setIsLoading(true);
            await Promise.all([loadUserListData(), loadMovieData(), loadShowData()]);
        } catch (error) {
            console.error('Error loading Trakt data:', error);
            showAlert('Error', 'Failed to load Trakt data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const loadUserListData = async () => {
        const newUserListSections: ListSection[] = [];

        try {
            // Load User Created Lists (Both movies and shows)
            const userLists = await makeTraktApiCall('/users/me/lists');
            for (const list of userLists) {
                const listItems = await makeTraktApiCall(`/users/me/lists/${list.ids.slug}/items`);
                if (listItems.length > 0) {
                    // Sort list items by recent date
                    const sortedListItems = sortByRecentDate(listItems);
                    const enhancedListItems = await enhanceWithTMDB(sortedListItems.slice(0, 20));
                    newUserListSections.push({
                        title: list.name,
                        data: enhancedListItems,
                    });
                }
            }

            // Load Watchlist as a special user list (combined movies and shows)
            try {
                const watchlistItems = await makeTraktApiCall('/sync/watchlist');
                if (watchlistItems.length > 0) {
                    // Sort watchlist by most recent additions
                    const sortedWatchlistItems = sortByRecentDate(watchlistItems);
                    const enhancedWatchlistItems = await enhanceWithTMDB(sortedWatchlistItems.slice(0, 20));
                    newUserListSections.unshift({
                        title: 'Watchlist',
                        data: enhancedWatchlistItems,
                    });
                }
            } catch (error) {
                console.error('Error loading watchlist:', error);
            }

            setUserListSections(newUserListSections);
        } catch (error) {
            console.error('Error loading user lists:', error);
        }
    };

    const loadMovieData = async () => {
        const newMovieSections: ListSection[] = [];

        try {
            // Movie Playback Progress - Add as first section
            try {
                const movieProgress = await makeTraktApiCall('/sync/playback/movies');
                if (movieProgress.length > 0) {
                    // Sort by most recent activity (paused_at)
                    const sortedMovieProgress = movieProgress
                        .sort((a: any, b: any) => {
                            const dateA = new Date(a.paused_at || a.updated_at || '1970-01-01').getTime();
                            const dateB = new Date(b.paused_at || b.updated_at || '1970-01-01').getTime();
                            return dateB - dateA;
                        })
                        .slice(0, 20)
                        .map((item: any) => ({
                            ...item,
                            type: 'movie' as const,
                            progress: item.progress || 0,
                            paused_at: item.paused_at,
                        }));

                    const enhancedMovieProgress = await enhanceWithTMDB(sortedMovieProgress);
                    newMovieSections.push({
                        title: 'Continue Watching Movies',
                        data: enhancedMovieProgress,
                    });
                }
            } catch (error) {
                console.error('Error loading movie playback progress:', error);
            }

            // Trending Movies
            const trendingMovies = await makeTraktApiCall('/movies/trending');
            const enhancedTrendingMovies = await enhanceWithTMDB(
                trendingMovies.slice(0, 20).map((item: any) => ({ movie: item.movie, type: 'movie' as const }))
            );
            newMovieSections.push({
                title: 'Trending',
                data: enhancedTrendingMovies,
            });

            // Recommendations Movies
            try {
                const recommendedMovies = await makeTraktApiCall('/recommendations/movies');
                if (recommendedMovies.length > 0) {
                    const enhancedRecommendedMovies = await enhanceWithTMDB(
                        recommendedMovies.slice(0, 20).map((item: any) => ({ movie: item, type: 'movie' as const }))
                    );
                    newMovieSections.push({
                        title: 'Recommendations',
                        data: enhancedRecommendedMovies,
                    });
                }
            } catch (error) {
                console.error('Error loading movie recommendations:', error);
            }

            // Popular Movies
            const popularMovies = await makeTraktApiCall('/movies/popular');
            const enhancedPopularMovies = await enhanceWithTMDB(
                popularMovies.slice(0, 20).map((item: any) => ({ movie: item, type: 'movie' as const }))
            );
            newMovieSections.push({
                title: 'Popular',
                data: enhancedPopularMovies,
            });

            // Favorited Movies
            try {
                const favoritedMovies = await makeTraktApiCall('/sync/favorites/movies');
                if (favoritedMovies.length > 0) {
                    // Sort favorited movies by recent date
                    const sortedFavoritedMovies = sortByRecentDate(favoritedMovies)
                        .slice(0, 20)
                        .map((item: any) => ({ ...item, type: 'movie' as const }));
                    const enhancedFavoritedMovies = await enhanceWithTMDB(sortedFavoritedMovies);
                    newMovieSections.push({
                        title: 'Favorited',
                        data: enhancedFavoritedMovies,
                    });
                }
            } catch (error) {
                console.error('Error loading favorited movies:', error);
            }

            // Watched Movies
            const watchedMovies = await makeTraktApiCall('/sync/watched/movies');
            if (watchedMovies.length > 0) {
                const sortedWatchedMovies = sortByRecentDate(watchedMovies)
                    .slice(0, 20)
                    .map((item: any) => ({
                        ...item,
                        type: 'movie' as const,
                    }));
                const enhancedWatchedMovies = await enhanceWithTMDB(sortedWatchedMovies);
                newMovieSections.push({
                    title: 'Watched',
                    data: enhancedWatchedMovies,
                });
            }

            // Collected Movies
            try {
                const collectedMovies = await makeTraktApiCall('/sync/collection/movies');
                if (collectedMovies.length > 0) {
                    // Sort collected movies by recent date
                    const sortedCollectedMovies = sortByRecentDate(collectedMovies)
                        .slice(0, 20)
                        .map((item: any) => ({ ...item, type: 'movie' as const }));
                    const enhancedCollectedMovies = await enhanceWithTMDB(sortedCollectedMovies);
                    newMovieSections.push({
                        title: 'Collected',
                        data: enhancedCollectedMovies,
                    });
                }
            } catch (error) {
                console.error('Error loading collected movies:', error);
            }

            setMovieSections(newMovieSections);
        } catch (error) {
            console.error('Error loading movie data:', error);
        }
    };

    const loadShowData = async () => {
        const newShowSections: ListSection[] = [];

        try {
            // TV Show Playback Progress - Add as first section  
            try {
                const showProgress = await makeTraktApiCall('/sync/playback/episodes');
                if (showProgress.length > 0) {
                    // Sort by most recent activity (paused_at) and map to show format
                    const sortedShowProgress = showProgress
                        .sort((a: any, b: any) => {
                            const dateA = new Date(a.paused_at || a.updated_at || '1970-01-01').getTime();
                            const dateB = new Date(b.paused_at || b.updated_at || '1970-01-01').getTime();
                            return dateB - dateA;
                        })
                        .slice(0, 20)
                        .map((item: any) => ({
                            ...item,
                            show: item.show || (item.episode && item.episode.show),
                            type: 'show' as const,
                            progress: item.progress || 0,
                            paused_at: item.paused_at,
                        }));

                    const enhancedShowProgress = await enhanceWithTMDB(sortedShowProgress);
                    newShowSections.push({
                        title: 'Continue Watching TV',
                        data: enhancedShowProgress,
                    });
                }
            } catch (error) {
                console.error('Error loading show playback progress:', error);
            }

            // Trending Shows
            const trendingShows = await makeTraktApiCall('/shows/trending');
            const enhancedTrendingShows = await enhanceWithTMDB(
                trendingShows.slice(0, 20).map((item: any) => ({ show: item.show, type: 'show' as const }))
            );
            newShowSections.push({
                title: 'Trending',
                data: enhancedTrendingShows,
            });

            // Recommendations Shows
            try {
                const recommendedShows = await makeTraktApiCall('/recommendations/shows');
                if (recommendedShows.length > 0) {
                    const enhancedRecommendedShows = await enhanceWithTMDB(
                        recommendedShows.slice(0, 20).map((item: any) => ({ show: item, type: 'show' as const }))
                    );
                    newShowSections.push({
                        title: 'Recommendations',
                        data: enhancedRecommendedShows,
                    });
                }
            } catch (error) {
                console.error('Error loading show recommendations:', error);
            }

            // Popular Shows
            const popularShows = await makeTraktApiCall('/shows/popular');
            const enhancedPopularShows = await enhanceWithTMDB(
                popularShows.slice(0, 20).map((item: any) => ({ show: item, type: 'show' as const }))
            );
            newShowSections.push({
                title: 'Popular',
                data: enhancedPopularShows,
            });

            // Favorited Shows
            try {
                const favoritedShows = await makeTraktApiCall('/sync/favorites/shows');
                if (favoritedShows.length > 0) {
                    // Sort favorited shows by recent date
                    const sortedFavoritedShows = sortByRecentDate(favoritedShows)
                        .slice(0, 20)
                        .map((item: any) => ({ ...item, type: 'show' as const }));
                    const enhancedFavoritedShows = await enhanceWithTMDB(sortedFavoritedShows);
                    newShowSections.push({
                        title: 'Favorited',
                        data: enhancedFavoritedShows,
                    });
                }
            } catch (error) {
                console.error('Error loading favorited shows:', error);
            }

            // Watched Shows
            const watchedShows = await makeTraktApiCall('/sync/watched/shows?extended=noseasons');
            if (watchedShows.length > 0) {
                const sortedWatchedShows = sortByRecentDate(watchedShows)
                    .slice(0, 20)
                    .map((item: any) => ({
                        ...item,
                        type: 'show' as const,
                    }));
                const enhancedWatchedShows = await enhanceWithTMDB(sortedWatchedShows);
                newShowSections.push({
                    title: 'Watched',
                    data: enhancedWatchedShows,
                });
            }

            // Collected Shows
            try {
                const collectedShows = await makeTraktApiCall('/sync/collection/shows');
                if (collectedShows.length > 0) {
                    // Sort collected shows by recent date
                    const sortedCollectedShows = sortByRecentDate(collectedShows)
                        .slice(0, 20)
                        .map((item: any) => ({ ...item, type: 'show' as const }));
                    const enhancedCollectedShows = await enhanceWithTMDB(sortedCollectedShows);
                    newShowSections.push({
                        title: 'Collected',
                        data: enhancedCollectedShows,
                    });
                }
            } catch (error) {
                console.error('Error loading collected shows:', error);
            }

            setShowSections(newShowSections);
        } catch (error) {
            console.error('Error loading show data:', error);
        }
    };

    const handleMediaPress = async (item: EnhancedTraktItem) => {
        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        }

        const content = item.movie || item.show;
        const tmdbId = item.tmdb_id || content?.ids?.tmdb;
        const type = item.movie ? 'movie' : 'series';

        if (tmdbId) {
            router.push({
                pathname: `/${type}/details`,
                params: { moviedbid: tmdbId.toString() },
            });
        }
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadAllData();
        setRefreshing(false);

        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const renderMediaItem = ({ item }: { item: EnhancedTraktItem }) => {
        const content = item.movie || item.show;
        const title = content?.title || content?.name;
        const year = content?.year;
        const poster = item.tmdb?.poster_path;
        const rating = item.tmdb?.vote_average;
        const userRating = item.rating;
        const progress = item.progress;

        // For episodes, extract episode info
        const episode = item.episode;
        const episodeTitle = episode?.title;
        const seasonNumber = episode?.season;
        const episodeNumber = episode?.number;

        return (
            <Pressable
                style={({ pressed }) => [
                    {
                        ...styles.mediaItem,
                        width: posterWidth,
                        marginRight: spacing,
                    },
                    pressed && styles.mediaItemPressed
                ]}
                onPress={() => handleMediaPress(item)}
            >
                <View style={styles.posterContainer}>
                    {poster ? (
                        <Image
                            source={{ uri: `${TMDB_IMAGE_BASE}${poster}` }}
                            style={{
                                ...styles.poster,
                                width: posterWidth,
                                height: posterHeight,
                            }}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[
                            styles.poster,
                            styles.placeholderPoster,
                            {
                                width: posterWidth,
                                height: posterHeight,
                            }
                        ]}>
                            <Text style={styles.placeholderText}>
                                {item.type === 'movie' ? '🎬' : '📺'}
                            </Text>
                        </View>
                    )}

                    {/* Progress Bar for Continue Watching items */}
                    {progress !== undefined && progress > 0 && (
                        <View style={styles.progressContainer}>
                            <View style={styles.progressBar}>
                                <View
                                    style={[
                                        styles.progressFill,
                                        { width: `${progress}%` }
                                    ]}
                                />
                            </View>
                            <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                        </View>
                    )}

                    {userRating && (
                        <View style={styles.userRatingOverlay}>
                            <Text style={styles.userRatingOverlayText}>{userRating}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.mediaInfo}>
                    <Text style={styles.mediaTitle} numberOfLines={1}>
                        {title}
                    </Text>
                    {/* Show episode info for TV shows */}
                    {episode && seasonNumber && episodeNumber && (
                        <Text style={styles.episodeInfo} numberOfLines={1}>
                            S{seasonNumber}E{episodeNumber}
                            {episodeTitle && ` • ${episodeTitle}`}
                        </Text>
                    )}
                    {year && (
                        <Text style={styles.mediaYear}>{year}</Text>
                    )}
                    {/* Show progress percentage in title area for continue watching */}
                    {progress !== undefined && progress > 0 && (
                        <Text style={styles.progressLabel}>
                            {Math.round(progress)}% watched
                        </Text>
                    )}
                </View>
            </Pressable>
        );
    };

    const renderSection = (section: ListSection) => (
        <View key={section.title} style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionCount}>{section.data.length} items</Text>
            </View>

            <FlatList
                data={section.data}
                renderItem={renderMediaItem}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                    ...styles.horizontalList,
                    paddingLeft: containerMargin,
                    paddingRight: containerMargin,
                }}
                keyExtractor={(item, index) => `${section.title}-${index}`}
            />
        </View>
    );

    const renderTabs = () => (
        <View style={styles.tabContainer}>
            <Pressable
                style={[
                    styles.tab,
                    selectedTab === 'user-lists' && styles.activeTab
                ]}
                onPress={() => {
                    setSelectedTab('user-lists');
                    if (isHapticsSupported()) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                    }
                }}
            >
                <Ionicons
                    name='apps'
                    size={16}
                    color={selectedTab === 'user-lists' ? '#fff' : '#bbb'}
                    style={{ marginRight: 6 }}
                />
                <Text style={[
                    styles.tabText,
                    selectedTab === 'user-lists' && styles.activeTabText
                ]}>
                    Lists
                </Text>
            </Pressable>

            <Pressable
                style={[
                    styles.tab,
                    selectedTab === 'movies' && styles.activeTab
                ]}
                onPress={() => {
                    setSelectedTab('movies');
                    if (isHapticsSupported()) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                    }
                }}
            >
                <Ionicons
                    name='film-outline'
                    size={16}
                    color={selectedTab === 'movies' ? '#fff' : '#bbb'}
                    style={{ marginRight: 6 }}
                />
                <Text style={[
                    styles.tabText,
                    selectedTab === 'movies' && styles.activeTabText
                ]}>
                    Movies
                </Text>
            </Pressable>

            <Pressable
                style={[
                    styles.tab,
                    selectedTab === 'shows' && styles.activeTab
                ]}
                onPress={() => {
                    setSelectedTab('shows');
                    if (isHapticsSupported()) {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                    }
                }}
            >
                <Ionicons
                    name='tv-outline'
                    size={16}
                    color={selectedTab === 'shows' ? '#fff' : '#bbb'}
                    style={{ marginRight: 6 }}
                />
                <Text style={[
                    styles.tabText,
                    selectedTab === 'shows' && styles.activeTabText
                ]}>
                    TV
                </Text>
            </Pressable>
        </View>
    );

    const getCurrentSections = () => {
        switch (selectedTab) {
            case 'user-lists':
                return userListSections;
            case 'movies':
                return movieSections;
            case 'shows':
                return showSections;
            default:
                return [];
        }
    };

    const renderUnauthenticated = () => (
        <View style={styles.unauthenticatedContainer}>
            <Text style={styles.unauthenticatedTitle}>Connect to Trakt.tv</Text>
            <Text style={styles.unauthenticatedText}>
                Please authenticate with Trakt.tv to view your data
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
                    <ScrollView
                        style={styles.contentContainer}
                        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    >
                        {getCurrentSections().map(renderSection)}
                    </ScrollView>
                    <BottomSpacing space={50} />
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    mainContainer: {
        flex: 1,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
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
        flexDirection: 'row',
        paddingHorizontal: 16,
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
    },
    tab: {
        flexDirection: 'row',
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 25,
        marginRight: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
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
    tabText: {
        fontWeight: '500',
        color: '#ccc',
    },
    activeTabText: {
        color: '#fff',
    },
    contentContainer: {
        flex: 1,
        paddingVertical: 20
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
    },
    sectionCount: {
        fontSize: 14,
        color: '#ccc',
        fontWeight: '500',
    },
    horizontalList: {
        // Dynamic padding applied inline
    },
    // Media Items - Dynamic sizing applied inline
    mediaItem: {
        // width and marginRight applied dynamically
    },
    mediaItemPressed: {
        transform: [{ scale: 0.95 }],
    },
    posterContainer: {
        position: 'relative',
        marginBottom: 8,
    },
    poster: {
        // width and height applied dynamically
        borderRadius: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.01)',
    },
    placeholderPoster: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderText: {
        fontSize: 32,
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
        fontWeight: '500',
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
    mediaInfo: {
        gap: 4,
    },
    mediaTitle: {
        fontSize: 14,
        fontWeight: '500',
        color: '#fff',
        lineHeight: 18,
    },
    mediaYear: {
        fontSize: 12,
        color: '#ccc',
        fontWeight: '500',
    },
    progressContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        paddingHorizontal: 8,
        paddingVertical: 6,
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    progressBar: {
        flex: 1,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#535aff',
        borderRadius: 2,
    },
    progressText: {
        fontSize: 10,
        color: '#fff',
        fontWeight: '600',
        minWidth: 32,
        textAlign: 'right',
    },
    progressLabel: {
        fontSize: 11,
        color: '#535aff',
        fontWeight: '600',
        marginTop: 2,
    },
    episodeInfo: {
        fontSize: 12,
        color: '#aaa',
        fontWeight: '500',
        marginTop: 2,
    },
});

export default TraktScreen;