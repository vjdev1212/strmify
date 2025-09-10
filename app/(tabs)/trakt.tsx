import { SafeAreaView, ScrollView, StyleSheet, Pressable, ActivityIndicator, RefreshControl, Image, FlatList, Dimensions } from 'react-native';
import { StatusBar, Text, View } from '../../components/Themed';
import { isHapticsSupported, showAlert } from '@/utils/platform';
import * as Haptics from 'expo-haptics';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BottomSpacing from '@/components/BottomSpacing';
import { isUserAuthenticated, makeTraktApiCall } from '@/clients/trakt';
import { ListSection, CalendarSection, TraktItem, EnhancedTraktItem, CalendarItem } from '@/models/trakt';

const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/w780';

// Cache duration
const TMDB_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

// Simple TMDB cache implementation
const tmdbCache = new Map<string, { data: any; timestamp: number }>();

const TraktScreen = () => {
    const router = useRouter();
    const [screenData, setScreenData] = useState(() => Dimensions.get('window'));
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [selectedTab, setSelectedTab] = useState<'user-lists' | 'movies' | 'shows' | 'calendar'>('movies');
    const [userListSections, setUserListSections] = useState<ListSection[]>([]);
    const [movieSections, setMovieSections] = useState<ListSection[]>([]);
    const [showSections, setShowSections] = useState<ListSection[]>([]);
    const [calendarSections, setCalendarSections] = useState<CalendarSection[]>([]);
    const [allTabsLoaded, setAllTabsLoaded] = useState<boolean>(false);

    // Refs for optimization
    const mountedRef = useRef(true);

    // Memoized responsive calculations
    const dimensions = useMemo(() => {
        const { width, height } = screenData;
        const isPortrait = height > width;
        const shortSide = Math.min(width, height);

        const getPostersPerScreen = () => {
            if (shortSide < 580) return isPortrait ? 3 : 5;
            if (shortSide < 1024) return isPortrait ? 6 : 8;
            if (shortSide < 1440) return isPortrait ? 7 : 9;
            return isPortrait ? 7 : 10;
        };

        const getBackdropsPerScreen = () => {
            if (shortSide < 580) return isPortrait ? 2 : 3;
            if (shortSide < 1024) return isPortrait ? 3 : 5;
            if (shortSide < 1440) return isPortrait ? 5 : 7;
            return isPortrait ? 7 : 9;
        };

        const postersPerScreen = getPostersPerScreen();
        const backdropsPerScreen = getBackdropsPerScreen();
        const spacing = 12;
        const containerMargin = 15;

        const posterWidth = (width - spacing * (postersPerScreen - 1) - containerMargin * 2) / postersPerScreen;
        const backdropWidth = (width - spacing * (backdropsPerScreen - 1) - containerMargin * 2) / backdropsPerScreen;
        const posterHeight = posterWidth * 1.5;
        const backdropHeight = backdropWidth * 0.56;

        return {
            width,
            height,
            isPortrait,
            posterWidth,
            backdropWidth,
            posterHeight,
            backdropHeight,
            spacing,
            containerMargin,
        };
    }, [screenData]);

    // Enhanced TMDB enhancement - no limits, process all items
    const enhanceWithTMDB = useCallback(async (items: TraktItem[]): Promise<EnhancedTraktItem[]> => {
        if (!TMDB_API_KEY || !items.length) return items;

        const enhancedItems: EnhancedTraktItem[] = [];

        // Process all items in parallel
        const enhancePromises = items.map(async (item): Promise<EnhancedTraktItem> => {
            try {
                const content = item.movie || item.show;
                const tmdbId = content?.ids?.tmdb;

                if (!tmdbId) return item;

                const cacheKey = `${item.movie ? 'movie' : 'tv'}-${tmdbId}`;
                const cached = tmdbCache.get(cacheKey);
                const now = Date.now();

                // Return cached data if still valid
                if (cached && (now - cached.timestamp) < TMDB_CACHE_DURATION) {
                    return {
                        ...item,
                        tmdb: cached.data,
                        tmdb_id: tmdbId
                    };
                }

                const endpoint = item.movie ? 'movie' : 'tv';
                const response = await fetch(
                    `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}`
                );

                if (response.ok) {
                    const tmdbData = await response.json();
                    // Cache the result
                    tmdbCache.set(cacheKey, { data: tmdbData, timestamp: now });

                    return {
                        ...item,
                        tmdb: tmdbData,
                        tmdb_id: tmdbId
                    };
                }
            } catch (error) {
                console.error('TMDB enhancement error:', error);
            }
            return item;
        });

        const results = await Promise.all(enhancePromises);
        return results;
    }, []);

    // Sorting functions with memoization
    const sortByRankThenDate = useCallback((items: TraktItem[]) => {
        return items.sort((a: any, b: any) => {
            if (a.rank !== undefined && b.rank !== undefined) {
                return a.rank - b.rank;
            }
            if (a.rank !== undefined && b.rank === undefined) return -1;
            if (a.rank === undefined && b.rank !== undefined) return 1;

            const getDate = (item: any) => {
                return item.listed_at || item.last_watched_at || item.last_updated_at ||
                    item.updated_at || item.watched_at || '1970-01-01';
            };

            const dateA = new Date(getDate(a)).getTime();
            const dateB = new Date(getDate(b)).getTime();
            return dateB - dateA;
        });
    }, []);

    const sortByRecentDate = useCallback((items: TraktItem[]) => {
        return items.sort((a: any, b: any) => {
            const getDate = (item: any) => {
                return item.listed_at || item.last_watched_at || item.last_updated_at ||
                    item.updated_at || item.watched_at || '1970-01-01';
            };

            const dateA = new Date(getDate(a)).getTime();
            const dateB = new Date(getDate(b)).getTime();
            return dateB - dateA;
        });
    }, []);

    // Load all tabs data at once
    const loadAllData = useCallback(async () => {
        setIsLoading(true);

        try {
            // Load all tab data in parallel
            await Promise.all([
                loadMovieData(),
                loadShowData(),
                loadUserListData(),
                loadCalendarData()
            ]);

            setAllTabsLoaded(true);
        } catch (error) {
            console.error('Error loading data:', error);
            showAlert('Error', 'Failed to load data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    }, []);

    // Effect for dimension changes
    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setScreenData(window);
        });
        return () => subscription?.remove();
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Load all data when authenticated
    useEffect(() => {
        if (isAuthenticated && !allTabsLoaded) {
            loadAllData();
        }
    }, [isAuthenticated, allTabsLoaded, loadAllData]);

    const checkAuthentication = useCallback(async () => {
        const authenticated = await isUserAuthenticated();
        setIsAuthenticated(authenticated);
    }, []);

    useFocusEffect(
        useCallback(() => {
            checkAuthentication();
        }, [checkAuthentication])
    );

    // Movie data loading - no limits
    const loadMovieData = useCallback(async () => {
        const newMovieSections: ListSection[] = [];

        try {
            // Load all movie sections in parallel
            const [
                movieProgress,
                trendingMovies,
                recommendedMovies,
                popularMovies,
                favoritedMovies,
                watchedMovies,
                collectedMovies
            ] = await Promise.allSettled([
                makeTraktApiCall('/sync/playback/movies'),
                makeTraktApiCall('/movies/trending'),
                makeTraktApiCall('/recommendations/movies'),
                makeTraktApiCall('/movies/popular'),
                makeTraktApiCall('/sync/favorites/movies'),
                makeTraktApiCall('/sync/watched/movies'),
                makeTraktApiCall('/sync/collection/movies')
            ]);

            // Currently Watching
            if (movieProgress.status === 'fulfilled' && movieProgress.value?.length > 0) {
                const progressItems = movieProgress.value
                    .sort((a: any, b: any) => {
                        const dateA = new Date(a.paused_at || a.updated_at || '1970-01-01').getTime();
                        const dateB = new Date(b.paused_at || b.updated_at || '1970-01-01').getTime();
                        return dateB - dateA;
                    })
                    .map((item: any) => ({
                        ...item,
                        type: 'movie' as const,
                        progress: item.progress || 0,
                        paused_at: item.paused_at,
                    }));

                const enhancedMovieProgress = await enhanceWithTMDB(progressItems);
                newMovieSections.push({
                    title: 'Currently Watching',
                    data: enhancedMovieProgress,
                });
            }

            // Trending
            if (trendingMovies.status === 'fulfilled' && trendingMovies.value?.length > 0) {
                const trendingItems = trendingMovies.value.map((item: any) => ({ movie: item.movie, type: 'movie' as const }));
                const enhancedTrending = await enhanceWithTMDB(trendingItems);
                newMovieSections.push({
                    title: 'Trending',
                    data: enhancedTrending,
                });
            }

            // Recommendations
            if (recommendedMovies.status === 'fulfilled' && recommendedMovies.value?.length > 0) {
                const recommendedItems = recommendedMovies.value.map((item: any) => ({ movie: item, type: 'movie' as const }));
                const enhancedRecommended = await enhanceWithTMDB(recommendedItems);
                newMovieSections.push({
                    title: 'Recommendations',
                    data: enhancedRecommended,
                });
            }

            // Popular
            if (popularMovies.status === 'fulfilled' && popularMovies.value?.length > 0) {
                const popularItems = popularMovies.value.map((item: any) => ({ movie: item, type: 'movie' as const }));
                const enhancedPopular = await enhanceWithTMDB(popularItems);
                newMovieSections.push({
                    title: 'Popular',
                    data: enhancedPopular,
                });
            }

            // Favorited
            if (favoritedMovies.status === 'fulfilled' && favoritedMovies.value?.length > 0) {
                const favoritedItems = sortByRecentDate(favoritedMovies.value)
                    .map((item: any) => ({ ...item, type: 'movie' as const }));
                const enhancedFavorited = await enhanceWithTMDB(favoritedItems);
                newMovieSections.push({
                    title: 'Favorited',
                    data: enhancedFavorited,
                });
            }

            // Watched
            if (watchedMovies.status === 'fulfilled' && watchedMovies.value?.length > 0) {
                const watchedItems = sortByRecentDate(watchedMovies.value)
                    .map((item: any) => ({ ...item, type: 'movie' as const }));
                const enhancedWatched = await enhanceWithTMDB(watchedItems);
                newMovieSections.push({
                    title: 'Watched',
                    data: enhancedWatched,
                });
            }

            // Collected
            if (collectedMovies.status === 'fulfilled' && collectedMovies.value?.length > 0) {
                const collectedItems = sortByRecentDate(collectedMovies.value)
                    .map((item: any) => ({ ...item, type: 'movie' as const }));
                const enhancedCollected = await enhanceWithTMDB(collectedItems);
                newMovieSections.push({
                    title: 'Collected',
                    data: enhancedCollected,
                });
            }

            if (mountedRef.current) {
                setMovieSections(newMovieSections);
            }

        } catch (error) {
            console.error('Error loading movie data:', error);
        }
    }, [enhanceWithTMDB, sortByRecentDate]);

    const loadShowData = useCallback(async () => {
        const newShowSections: ListSection[] = [];

        try {
            // Load all show sections in parallel
            const [
                showProgress,
                trendingShows,
                recommendedShows,
                popularShows,
                favoritedShows,
                watchedShows,
                collectedShows
            ] = await Promise.allSettled([
                makeTraktApiCall('/sync/playback/episodes'),
                makeTraktApiCall('/shows/trending'),
                makeTraktApiCall('/recommendations/shows'),
                makeTraktApiCall('/shows/popular'),
                makeTraktApiCall('/sync/favorites/shows'),
                makeTraktApiCall('/sync/watched/shows?extended=noseasons'),
                makeTraktApiCall('/sync/collection/shows')
            ]);

            // Currently Watching
            if (showProgress.status === 'fulfilled' && showProgress.value?.length > 0) {
                const progressItems = showProgress.value
                    .sort((a: any, b: any) => {
                        const dateA = new Date(a.paused_at || a.updated_at || '1970-01-01').getTime();
                        const dateB = new Date(b.paused_at || b.updated_at || '1970-01-01').getTime();
                        return dateB - dateA;
                    })
                    .map((item: any) => ({
                        ...item,
                        show: item.show || (item.episode && item.episode.show),
                        type: 'show' as const,
                        progress: item.progress || 0,
                        paused_at: item.paused_at,
                    }));

                const enhancedShowProgress = await enhanceWithTMDB(progressItems);
                newShowSections.push({
                    title: 'Currently Watching',
                    data: enhancedShowProgress,
                });
            }

            // Trending
            if (trendingShows.status === 'fulfilled' && trendingShows.value?.length > 0) {
                const trendingItems = trendingShows.value.map((item: any) => ({ show: item.show, type: 'show' as const }));
                const enhancedTrending = await enhanceWithTMDB(trendingItems);
                newShowSections.push({
                    title: 'Trending',
                    data: enhancedTrending,
                });
            }

            // Recommendations
            if (recommendedShows.status === 'fulfilled' && recommendedShows.value?.length > 0) {
                const recommendedItems = recommendedShows.value.map((item: any) => ({ show: item, type: 'show' as const }));
                const enhancedRecommended = await enhanceWithTMDB(recommendedItems);
                newShowSections.push({
                    title: 'Recommendations',
                    data: enhancedRecommended,
                });
            }

            // Popular
            if (popularShows.status === 'fulfilled' && popularShows.value?.length > 0) {
                const popularItems = popularShows.value.map((item: any) => ({ show: item, type: 'show' as const }));
                const enhancedPopular = await enhanceWithTMDB(popularItems);
                newShowSections.push({
                    title: 'Popular',
                    data: enhancedPopular,
                });
            }

            // Favorited
            if (favoritedShows.status === 'fulfilled' && favoritedShows.value?.length > 0) {
                const favoritedItems = sortByRecentDate(favoritedShows.value)
                    .map((item: any) => ({ ...item, type: 'show' as const }));
                const enhancedFavorited = await enhanceWithTMDB(favoritedItems);
                newShowSections.push({
                    title: 'Favorited',
                    data: enhancedFavorited,
                });
            }

            // Watched
            if (watchedShows.status === 'fulfilled' && watchedShows.value?.length > 0) {
                const watchedItems = sortByRecentDate(watchedShows.value)
                    .map((item: any) => ({ ...item, type: 'show' as const }));
                const enhancedWatched = await enhanceWithTMDB(watchedItems);
                newShowSections.push({
                    title: 'Watched',
                    data: enhancedWatched,
                });
            }

            // Collected
            if (collectedShows.status === 'fulfilled' && collectedShows.value?.length > 0) {
                const collectedItems = sortByRecentDate(collectedShows.value)
                    .map((item: any) => ({ ...item, type: 'show' as const }));
                const enhancedCollected = await enhanceWithTMDB(collectedItems);
                newShowSections.push({
                    title: 'Collected',
                    data: enhancedCollected,
                });
            }

            if (mountedRef.current) {
                setShowSections(newShowSections);
            }

        } catch (error) {
            console.error('Error loading show data:', error);
        }
    }, [enhanceWithTMDB, sortByRecentDate]);

    const loadUserListData = useCallback(async () => {
        const newUserListSections: ListSection[] = [];

        try {
            // Load watchlist first
            const watchlistItems = await makeTraktApiCall('/sync/watchlist');
            if (watchlistItems.length > 0) {
                const sortedWatchlistItems = sortByRecentDate(watchlistItems);
                const enhancedWatchlistItems = await enhanceWithTMDB(sortedWatchlistItems);
                newUserListSections.push({
                    title: 'Watchlist',
                    data: enhancedWatchlistItems,
                });
            }

            // Load all user lists
            const userLists = await makeTraktApiCall('/users/me/lists');

            for (const list of userLists) {
                const listItems = await makeTraktApiCall(`/users/me/lists/${list.ids.slug}/items`);
                if (listItems.length > 0) {
                    const sortedListItems = sortByRankThenDate(listItems);
                    const enhancedListItems = await enhanceWithTMDB(sortedListItems);
                    newUserListSections.push({
                        title: list.name,
                        data: enhancedListItems,
                    });
                }
            }

            if (mountedRef.current) {
                setUserListSections(newUserListSections);
            }

        } catch (error) {
            console.error('Error loading user lists:', error);
        }
    }, [enhanceWithTMDB, sortByRecentDate, sortByRankThenDate]);

    const loadCalendarData = useCallback(async () => {
        try {
            const today = new Date();
            const startDate = new Date(today);
            const endDate = new Date(today);
            endDate.setDate(today.getDate() + 30); // Load full month

            const formatDate = (date: Date) => date.toISOString().split('T')[0];

            // Load full calendar data
            const [showCalendar, movieCalendar] = await Promise.allSettled([
                makeTraktApiCall(`/calendars/my/shows/${formatDate(startDate)}/30`),
                makeTraktApiCall(`/calendars/my/movies/${formatDate(startDate)}/30`)
            ]);

            const allDates: string[] = [];
            const currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                allDates.push(formatDate(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }

            const calendarMap = new Map<string, CalendarItem[]>();
            allDates.forEach(date => calendarMap.set(date, []));

            // Process show episodes
            if (showCalendar.status === 'fulfilled' && showCalendar.value) {
                showCalendar.value.forEach((item: any) => {
                    const date = item.first_aired;
                    if (!date || !calendarMap.has(date)) return;

                    const calendarItem: CalendarItem = {
                        type: 'episode',
                        date,
                        title: item.show?.title || 'Unknown Show',
                        show_title: item.show?.title,
                        year: item.show?.year,
                        season: item.episode?.season,
                        episode: item.episode?.number,
                        episode_title: item.episode?.title,
                        first_aired: item.first_aired,
                        tmdb_id: item.show?.ids?.tmdb,
                        poster_path: '',
                        backdrop_path: '',
                        ids: item.show?.ids
                    };

                    calendarMap.get(date)!.push(calendarItem);
                });
            }

            // Process movies
            if (movieCalendar.status === 'fulfilled' && movieCalendar.value) {
                movieCalendar.value.forEach((item: any) => {
                    const date = item.released;
                    if (!date || !calendarMap.has(date)) return;

                    const calendarItem: CalendarItem = {
                        type: 'movie',
                        date,
                        title: item.movie?.title || 'Unknown Movie',
                        year: item.movie?.year,
                        first_aired: item.released,
                        tmdb_id: item.movie?.ids?.tmdb,
                        poster_path: '',
                        backdrop_path: '',
                        ids: item.movie?.ids
                    };

                    calendarMap.get(date)!.push(calendarItem);
                });
            }

            const formatDateLabel = (dateString: string): string => {
                const date = new Date(dateString);
                const today = new Date();
                const tomorrow = new Date(today);
                tomorrow.setDate(today.getDate() + 1);
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);

                const normalizeDate = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
                const normalizedDate = normalizeDate(date);
                const normalizedToday = normalizeDate(today);
                const normalizedTomorrow = normalizeDate(tomorrow);
                const normalizedYesterday = normalizeDate(yesterday);

                if (normalizedDate.getTime() === normalizedToday.getTime()) {
                    return 'Today';
                } else if (normalizedDate.getTime() === normalizedTomorrow.getTime()) {
                    return 'Tomorrow';
                } else if (normalizedDate.getTime() === normalizedYesterday.getTime()) {
                    return 'Yesterday';
                } else {
                    return date.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric'
                    });
                }
            };

            const newCalendarSections: CalendarSection[] = allDates.map(date => ({
                date,
                dateLabel: formatDateLabel(date),
                items: calendarMap.get(date) || []
            }));

            // Enhance all calendar items with TMDB data
            for (const section of newCalendarSections) {
                if (section.items.length > 0 && TMDB_API_KEY) {
                    const enhancedItems = await Promise.all(
                        section.items.map(async (item) => {
                            try {
                                if (item.tmdb_id) {
                                    const endpoint = item.type === 'movie' ? 'movie' : 'tv';
                                    const cacheKey = `${endpoint}-${item.tmdb_id}`;
                                    const cached = tmdbCache.get(cacheKey);
                                    const now = Date.now();

                                    if (cached && (now - cached.timestamp) < TMDB_CACHE_DURATION) {
                                        return {
                                            ...item,
                                            poster_path: cached.data.poster_path,
                                            backdrop_path: cached.data.backdrop_path
                                        };
                                    }

                                    const response = await fetch(
                                        `${TMDB_BASE_URL}/${endpoint}/${item.tmdb_id}?api_key=${TMDB_API_KEY}`
                                    );

                                    if (response.ok) {
                                        const tmdbData = await response.json();
                                        tmdbCache.set(cacheKey, { data: tmdbData, timestamp: now });
                                        return {
                                            ...item,
                                            poster_path: tmdbData.poster_path,
                                            backdrop_path: tmdbData.backdrop_path
                                        };
                                    }
                                }
                            } catch (error) {
                                console.error('TMDB calendar enhancement error:', error);
                            }
                            return item;
                        })
                    );
                    section.items = enhancedItems;
                }
            }

            setCalendarSections(newCalendarSections);
        } catch (error) {
            console.error('Error loading calendar data:', error);
        }
    }, []);

    // Memoized handlers
    const handleMediaPress = useCallback(async (item: EnhancedTraktItem) => {
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
    }, [router]);

    const handleCalendarItemPress = useCallback(async (item: CalendarItem) => {
        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        }

        const tmdbId = item.tmdb_id;
        const type = item.type === 'movie' ? 'movie' : 'series';

        if (tmdbId) {
            router.push({
                pathname: `/${type}/details`,
                params: { moviedbid: tmdbId.toString() },
            });
        }
    }, [router]);

    const handleTabPress = useCallback(async (tab: 'user-lists' | 'movies' | 'shows' | 'calendar') => {
        setSelectedTab(tab);
        if (isHapticsSupported()) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
        }
    }, []);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        // Clear cache on refresh
        tmdbCache.clear();
        setAllTabsLoaded(false);
        await loadAllData();
        setRefreshing(false);

        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [loadAllData]);

    // Utility function for remaining minutes calculation
    const calculateRemainingMinutes = useCallback((progress: number, runtime?: number, episodeRuntime?: number[]): number | null => {
        if (progress === undefined || progress === null) return null;

        let totalMinutes: number;

        if (runtime) {
            totalMinutes = runtime;
        } else if (episodeRuntime && episodeRuntime.length > 0) {
            totalMinutes = episodeRuntime.reduce((sum, time) => sum + time, 0) / episodeRuntime.length;
        } else {
            totalMinutes = 45;
        }

        const watchedMinutes = (progress / 100) * totalMinutes;
        const remainingMinutes = Math.max(0, totalMinutes - watchedMinutes);

        return Math.round(remainingMinutes);
    }, []);

    // Memoized render functions
    const renderMediaItem = useCallback(({ item, sectionTitle }: { item: EnhancedTraktItem; sectionTitle?: string }) => {
        const content = item.movie || item.show;
        const title = content?.title || content?.name;
        const year = content?.year;
        const poster = item.tmdb?.poster_path;
        const backdrop = item.tmdb?.backdrop_path;
        const userRating = item.rating;
        const progress = item.progress;

        const episode = item.episode;
        const episodeTitle = episode?.title;
        const seasonNumber = episode?.season;
        const episodeNumber = episode?.number;

        const isCurrentlyWatching = sectionTitle === 'Currently Watching';

        const remainingMinutes = progress !== undefined ? calculateRemainingMinutes(
            progress,
            item.tmdb?.runtime,
            item.tmdb?.episode_run_time
        ) : null;

        const imageSource = isCurrentlyWatching && backdrop ?
            `${TMDB_BACKDROP_BASE}${backdrop}` :
            poster ? `${TMDB_IMAGE_BASE}${poster}` : null;

        const itemWidth = isCurrentlyWatching ? dimensions.backdropWidth : dimensions.posterWidth;
        const imageHeight = isCurrentlyWatching ? dimensions.backdropHeight : dimensions.posterHeight;

        return (
            <Pressable
                style={({ pressed }) => [
                    {
                        ...styles.mediaItem,
                        width: itemWidth,
                        marginRight: dimensions.spacing,
                    },
                    pressed && styles.mediaItemPressed
                ]}
                onPress={() => handleMediaPress(item)}
            >
                <View style={styles.posterContainer}>
                    {imageSource ? (
                        <Image
                            source={{ uri: imageSource }}
                            style={{
                                ...styles.poster,
                                width: itemWidth,
                                height: imageHeight,
                            }}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[
                            styles.poster,
                            styles.placeholderPoster,
                            {
                                width: itemWidth,
                                height: imageHeight,
                            }
                        ]}>
                            <Text style={styles.placeholderText}>
                                {item.type === 'movie' ? '🎬' : '📺'}
                            </Text>
                        </View>
                    )}

                    {progress !== undefined && progress > 0 && isCurrentlyWatching && (
                        <View style={styles.backdropProgressContainer}>
                            <View
                                style={[
                                    styles.backdropProgressFill,
                                    { width: `${progress}%` }
                                ]}
                            />
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
                    {episode && seasonNumber && episodeNumber && (
                        <Text style={styles.episodeInfo} numberOfLines={1}>
                            S{seasonNumber}E{episodeNumber}
                            {episodeTitle && ` • ${episodeTitle}`}
                        </Text>
                    )}
                    {year && (
                        <Text style={styles.mediaYear}>{year}</Text>
                    )}
                    {progress !== undefined && progress > 0 && remainingMinutes !== null && remainingMinutes > 0 && (
                        <Text style={styles.progressLabel}>
                            {remainingMinutes < 60 ?
                                `${remainingMinutes} min left` :
                                `${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m left`
                            }
                        </Text>
                    )}
                </View>
            </Pressable>
        );
    }, [dimensions, handleMediaPress, calculateRemainingMinutes]);

    const renderCalendarItemHorizontal = useCallback(({ item }: { item: CalendarItem }) => {
        const imageSource = item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : null;

        return (
            <Pressable
                style={({ pressed }) => [
                    {
                        ...styles.calendarMediaItem,
                        width: dimensions.posterWidth,
                        marginRight: dimensions.spacing,
                    },
                    pressed && styles.mediaItemPressed
                ]}
                onPress={() => handleCalendarItemPress(item)}
            >
                <View style={styles.posterContainer}>
                    {imageSource ? (
                        <Image
                            source={{ uri: imageSource }}
                            style={{
                                ...styles.poster,
                                width: dimensions.posterWidth,
                                height: dimensions.posterHeight,
                            }}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[
                            styles.poster,
                            styles.placeholderPoster,
                            {
                                width: dimensions.posterWidth,
                                height: dimensions.posterHeight,
                            }
                        ]}>
                            <Text style={styles.placeholderText}>
                                {item.type === 'movie' ? '🎬' : '📺'}
                            </Text>
                        </View>
                    )}

                    <View style={styles.calendarTypeOverlay}>
                        <View style={[
                            styles.calendarTypeBadgeSmall,
                            item.type === 'movie' ? styles.movieBadge : styles.episodeBadge
                        ]}>
                            <Text style={styles.calendarTypeBadgeSmallText}>
                                {item.type === 'movie' ? 'Movie' : 'EP'}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.mediaInfo}>
                    <Text style={styles.mediaTitle} numberOfLines={2}>
                        {item.title}
                    </Text>

                    {item.type === 'episode' && item.season && item.episode && (
                        <Text style={styles.episodeInfo} numberOfLines={1}>
                            S{item.season}E{item.episode}
                        </Text>
                    )}

                    {item.year && (
                        <Text style={styles.mediaYear}>{item.year}</Text>
                    )}
                </View>
            </Pressable>
        );
    }, [dimensions, handleCalendarItemPress]);

    const renderCalendarSection = useCallback((section: CalendarSection) => (
        <View key={section.date} style={styles.calendarSection}>
            <View style={styles.calendarSectionHeader}>
                <Text style={styles.calendarSectionTitle}>{section.dateLabel}</Text>
                <Text style={styles.calendarSectionDate}>
                    {new Date(section.date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                    })}
                </Text>
            </View>

            {section.items.length > 0 ? (
                <View style={styles.calendarItemsHorizontalContainer}>
                    <FlatList
                        data={section.items}
                        renderItem={renderCalendarItemHorizontal}
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        contentContainerStyle={{
                            ...styles.horizontalList,
                            paddingLeft: dimensions.containerMargin,
                            paddingRight: dimensions.containerMargin,
                        }}
                        keyExtractor={(item, index) => `${section.date}-${index}`}
                        removeClippedSubviews={true}
                        maxToRenderPerBatch={10}
                        windowSize={20}
                        initialNumToRender={8}
                    />
                </View>
            ) : (
                <View style={styles.emptyDayContainer}>
                    <Text style={styles.emptyDayText}>Nothing on this day</Text>
                </View>
            )}
        </View>
    ), [dimensions, renderCalendarItemHorizontal]);

    const renderSection = useCallback((section: ListSection) => (
        <View key={section.title} style={styles.section}>
            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.title}</Text>
                <Text style={styles.sectionCount}>{section.data.length} items</Text>
            </View>

            <FlatList
                data={section.data}
                renderItem={({ item }) => renderMediaItem({ item, sectionTitle: section.title })}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{
                    ...styles.horizontalList,
                    paddingLeft: dimensions.containerMargin,
                    paddingRight: dimensions.containerMargin,
                }}
                keyExtractor={(item, index) => `${section.title}-${index}`}
                removeClippedSubviews={true}
                maxToRenderPerBatch={10}
                windowSize={20}
                initialNumToRender={8}
            />
        </View>
    ), [dimensions, renderMediaItem]);

    const getCurrentSections = useCallback(() => {
        switch (selectedTab) {
            case 'movies':
                return movieSections;
            case 'shows':
                return showSections;
            case 'user-lists':
                return userListSections;
            default:
                return [];
        }
    }, [selectedTab, movieSections, showSections, userListSections]);

    const renderTabs = useCallback(() => (
        <View style={styles.tabContainer}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabScrollContent}
            >
                {[
                    { key: 'movies', icon: 'film-outline', label: 'Movies' },
                    { key: 'shows', icon: 'tv-outline', label: 'Series' },
                    { key: 'calendar', icon: 'calendar-outline', label: 'Calendar' },
                    { key: 'user-lists', icon: 'apps', label: 'Lists' }
                ].map((tab) => (
                    <Pressable
                        key={tab.key}
                        style={[
                            styles.tab,
                            selectedTab === tab.key && styles.activeTab
                        ]}
                        onPress={() => handleTabPress(tab.key as any)}
                    >
                        <Ionicons
                            name={tab.icon as any}
                            size={16}
                            color={selectedTab === tab.key ? '#fff' : '#bbb'}
                            style={{ marginRight: 6 }}
                        />
                        <Text style={[
                            styles.tabText,
                            selectedTab === tab.key && styles.activeTabText
                        ]}>
                            {tab.label}
                        </Text>
                    </Pressable>
                ))}
            </ScrollView>
        </View>
    ), [selectedTab, handleTabPress]);

    const renderTabContent = useCallback(() => {
        if (selectedTab === 'calendar') {
            return (
                <ScrollView
                    style={styles.contentContainer}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor="#535aff"
                        />
                    }
                    removeClippedSubviews={true}
                >
                    {calendarSections.map(renderCalendarSection)}
                </ScrollView>
            );
        }

        const sections = getCurrentSections();

        return (
            <ScrollView
                style={styles.contentContainer}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                        tintColor="#535aff"
                    />
                }
                removeClippedSubviews={true}
            >
                {sections.map(renderSection)}
            </ScrollView>
        );
    }, [selectedTab, calendarSections, getCurrentSections, refreshing, onRefresh, renderCalendarSection, renderSection]);

    const renderUnauthenticated = useCallback(() => (
        <View style={styles.unauthenticatedContainer}>
            <Text style={styles.unauthenticatedTitle}>Connect to Trakt.tv</Text>
            <Text style={styles.unauthenticatedText}>
                Please authenticate with Trakt.tv to view your data
            </Text>
        </View>
    ), []);

    if (isLoading && !allTabsLoaded) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#535aff" />
                    <Text style={styles.loadingText}>Loading...</Text>
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
                    {renderTabContent()}
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
    tabScrollContent: {
        paddingHorizontal: 16,
        alignItems: 'center',
    },
    tabContainer: {
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(15px)',
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
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        backdropFilter: 'blur(20px)',
        shadowColor: 'rgba(0, 0, 0, 0.2)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4,
    },
    activeTab: {
        backgroundColor: 'rgba(83, 90, 255, 0.3)',
        borderColor: 'rgba(83, 90, 255, 0.5)',
        backdropFilter: 'blur(25px)',
        shadowColor: '#535aff',
        shadowOffset: { width: 0, height: 2 },
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
    mediaItem: {
        // width and marginRight applied dynamically
    },
    mediaItemPressed: {
    },
    posterContainer: {
        position: 'relative',
        marginBottom: 8,
    },
    poster: {
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
    backdropProgressContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        overflow: 'hidden',
    },
    backdropProgressFill: {
        height: '100%',
        backgroundColor: 'rgba(83, 90, 255, 0.75)',
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
    },
    progressLabel: {
        fontSize: 11,
        color: '#aaa',
        fontWeight: '500',
        marginTop: 2,
    },
    episodeInfo: {
        fontSize: 12,
        color: '#aaa',
        fontWeight: '500',
        marginTop: 2,
    },
    calendarSection: {
        marginBottom: 32,
        maxWidth: 780,
        alignSelf: 'center',
        width: '100%',
        paddingHorizontal: 16,
    },
    calendarSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)',
    },
    calendarSectionTitle: {
        fontSize: 20,
        fontWeight: '500',
        color: '#fff',
    },
    calendarSectionDate: {
        fontSize: 14,
        color: '#ccc',
        fontWeight: '500',
    },
    calendarItemsHorizontalContainer: {
        maxWidth: 780,
        alignSelf: 'center',
        width: '100%',
    },
    calendarMediaItem: {
        // width and marginRight applied dynamically
    },
    calendarTypeOverlay: {
        position: 'absolute',
        top: 6,
        right: 6,
    },
    calendarTypeBadgeSmall: {
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 6,
    },
    calendarTypeBadgeSmallText: {
        fontSize: 10,
        fontWeight: '600',
        color: '#fff',
    },
    movieBadge: {
        backgroundColor: 'rgba(255, 193, 7, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255, 193, 7, 0.3)',
    },
    episodeBadge: {
        backgroundColor: 'rgba(83, 90, 255, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(83, 90, 255, 0.3)',
    },
    emptyDayContainer: {
        padding: 20,
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.04)',
        borderStyle: 'dashed',
    },
    emptyDayText: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
        fontWeight: '500',
    },
});

export default TraktScreen;