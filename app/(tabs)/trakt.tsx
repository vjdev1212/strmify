import { SafeAreaView, ScrollView, StyleSheet, Pressable, ActivityIndicator, RefreshControl, Image, FlatList, Dimensions } from 'react-native';
import { StatusBar, Text, View } from '../../components/Themed';
import { isHapticsSupported, showAlert } from '@/utils/platform';
import * as Haptics from 'expo-haptics';
import { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { isUserAuthenticated, makeTraktApiCall } from '@/utils/Trakt';
import BottomSpacing from '@/components/BottomSpacing';

const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/w780';

// Constants for optimization
const INITIAL_LOAD_LIMIT = 12; // Reduce initial items per section
const MAX_CONCURRENT_REQUESTS = 3; // Limit concurrent API calls
const TMDB_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes cache

interface TraktItem {
    type: 'movie' | 'show';
    movie?: any;
    show?: any;
    episode?: any;
    watched_at?: string;
    rating?: number;
    plays?: number;
    listed_at?: string;
    updated_at?: string;
    last_watched_at?: string;
    last_updated_at?: string;
    progress?: number;
    paused_at?: string;
    action?: string;
    rank?: number;
    id?: number;
    notes?: string;
}

interface TMDBDetails {
    poster_path?: string;
    backdrop_path?: string;
    vote_average?: number;
    release_date?: string;
    first_air_date?: string;
    runtime?: number;
    episode_run_time?: number[];
}

interface EnhancedTraktItem extends TraktItem {
    tmdb?: TMDBDetails;
    tmdb_id?: number;
}

interface ListSection {
    title: string;
    data: EnhancedTraktItem[];
}

interface CalendarItem {
    type: 'movie' | 'episode';
    date: string;
    title: string;
    show_title?: string;
    year?: number;
    season?: number;
    episode?: number;
    episode_title?: string;
    first_aired?: string;
    tmdb_id?: number;
    poster_path?: string;
    backdrop_path?: string;
    ids?: any;
}

interface CalendarSection {
    date: string;
    dateLabel: string;
    items: CalendarItem[];
}

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
    const [tabDataLoaded, setTabDataLoaded] = useState({
        'movies': false,
        'shows': false,
        'user-lists': false,
        'calendar': false
    });

    // Refs for optimization
    const loadingRef = useRef<Set<string>>(new Set());
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

    // Optimized TMDB enhancement with caching and batching
    const enhanceWithTMDB = useCallback(async (items: TraktItem[], limit = INITIAL_LOAD_LIMIT): Promise<EnhancedTraktItem[]> => {
        if (!TMDB_API_KEY || !items.length) return items;

        const itemsToProcess = items.slice(0, limit);
        const batches: TraktItem[][] = [];
        
        // Create batches for concurrent processing
        for (let i = 0; i < itemsToProcess.length; i += MAX_CONCURRENT_REQUESTS) {
            batches.push(itemsToProcess.slice(i, i + MAX_CONCURRENT_REQUESTS));
        }

        const enhancedItems: EnhancedTraktItem[] = [];

        for (const batch of batches) {
            if (!mountedRef.current) break;

            const batchPromises = batch.map(async (item): Promise<EnhancedTraktItem> => {
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

            const batchResults = await Promise.all(batchPromises);
            enhancedItems.push(...batchResults);
        }

        return enhancedItems;
    }, []);

    // Optimized sorting functions with memoization
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

    // Lazy loading for tabs - only load data when tab is selected
    const loadTabData = useCallback(async (tab: string) => {
        if (loadingRef.current.has(tab) || tabDataLoaded[tab as keyof typeof tabDataLoaded]) return;
        
        loadingRef.current.add(tab);
        setIsLoading(true);

        try {
            switch (tab) {
                case 'movies':
                    await loadMovieData();
                    break;
                case 'shows':
                    await loadShowData();
                    break;
                case 'user-lists':
                    await loadUserListData();
                    break;
                case 'calendar':
                    await loadCalendarData();
                    break;
            }
            
            setTabDataLoaded(prev => ({ ...prev, [tab]: true }));
        } catch (error) {
            console.error(`Error loading ${tab} data:`, error);
            showAlert('Error', `Failed to load ${tab} data. Please try again.`);
        } finally {
            loadingRef.current.delete(tab);
            setIsLoading(false);
        }
    }, [tabDataLoaded]);

    // Effect for dimension changes
    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setScreenData(window);
        });
        return () => subscription?.remove();
    }, []);

    useEffect(() => {
        mountedRef.current = true;
        checkAuthentication();
        return () => {
            mountedRef.current = false;
        };
    }, []);

    // Load initial tab data only
    useEffect(() => {
        if (isAuthenticated && !tabDataLoaded[selectedTab]) {
            loadTabData(selectedTab);
        }
    }, [isAuthenticated, selectedTab, loadTabData, tabDataLoaded]);

    const checkAuthentication = useCallback(async () => {
        const authenticated = await isUserAuthenticated();
        setIsAuthenticated(authenticated);
    }, []);

    // Optimized data loading functions
    const loadMovieData = useCallback(async () => {
        const newMovieSections: ListSection[] = [];

        try {
            // Load most important sections first (Currently Watching, Trending)
            const prioritySections = await Promise.allSettled([
                makeTraktApiCall('/sync/playback/movies'),
                makeTraktApiCall('/movies/trending')
            ]);

            // Currently Watching
            if (prioritySections[0].status === 'fulfilled' && prioritySections[0].value?.length > 0) {
                const movieProgress = prioritySections[0].value
                    .sort((a: any, b: any) => {
                        const dateA = new Date(a.paused_at || a.updated_at || '1970-01-01').getTime();
                        const dateB = new Date(b.paused_at || b.updated_at || '1970-01-01').getTime();
                        return dateB - dateA;
                    })
                    .slice(0, INITIAL_LOAD_LIMIT)
                    .map((item: any) => ({
                        ...item,
                        type: 'movie' as const,
                        progress: item.progress || 0,
                        paused_at: item.paused_at,
                    }));

                const enhancedMovieProgress = await enhanceWithTMDB(movieProgress);
                newMovieSections.push({
                    title: 'Currently Watching',
                    data: enhancedMovieProgress,
                });
            }

            // Trending
            if (prioritySections[1].status === 'fulfilled' && prioritySections[1].value?.length > 0) {
                const trendingMovies = prioritySections[1].value;
                const enhancedTrendingMovies = await enhanceWithTMDB(
                    trendingMovies.slice(0, INITIAL_LOAD_LIMIT).map((item: any) => ({ movie: item.movie, type: 'movie' as const }))
                );
                newMovieSections.push({
                    title: 'Trending',
                    data: enhancedTrendingMovies,
                });
            }

            setMovieSections(newMovieSections);

            // Load remaining sections in background
            setTimeout(async () => {
                if (!mountedRef.current) return;
                
                const backgroundSections = await Promise.allSettled([
                    makeTraktApiCall('/recommendations/movies'),
                    makeTraktApiCall('/movies/popular'),
                    makeTraktApiCall('/sync/favorites/movies'),
                    makeTraktApiCall('/sync/watched/movies'),
                    makeTraktApiCall('/sync/collection/movies')
                ]);

                const additionalSections: ListSection[] = [];

                // Process background sections
                for (let i = 0; i < backgroundSections.length; i++) {
                    const result = backgroundSections[i];
                    if (result.status === 'fulfilled' && result.value?.length > 0) {
                        const sectionTitles = ['Recommendations', 'Popular', 'Favorited', 'Watched', 'Collected'];
                        const items = result.value;
                        
                        let processedItems;
                        if (i >= 2) { // Favorited, Watched, Collected
                            processedItems = sortByRecentDate(items)
                                .slice(0, INITIAL_LOAD_LIMIT)
                                .map((item: any) => ({ ...item, type: 'movie' as const }));
                        } else {
                            processedItems = items
                                .slice(0, INITIAL_LOAD_LIMIT)
                                .map((item: any) => ({ movie: item, type: 'movie' as const }));
                        }

                        const enhanced = await enhanceWithTMDB(processedItems);
                        additionalSections.push({
                            title: sectionTitles[i],
                            data: enhanced,
                        });
                    }
                }

                if (mountedRef.current) {
                    setMovieSections(prev => [...prev, ...additionalSections]);
                }
            }, 100);

        } catch (error) {
            console.error('Error loading movie data:', error);
        }
    }, [enhanceWithTMDB, sortByRecentDate]);

    const loadShowData = useCallback(async () => {
        const newShowSections: ListSection[] = [];

        try {
            // Load priority sections first
            const prioritySections = await Promise.allSettled([
                makeTraktApiCall('/sync/playback/episodes'),
                makeTraktApiCall('/shows/trending')
            ]);

            // Currently Watching
            if (prioritySections[0].status === 'fulfilled' && prioritySections[0].value?.length > 0) {
                const showProgress = prioritySections[0].value
                    .sort((a: any, b: any) => {
                        const dateA = new Date(a.paused_at || a.updated_at || '1970-01-01').getTime();
                        const dateB = new Date(b.paused_at || b.updated_at || '1970-01-01').getTime();
                        return dateB - dateA;
                    })
                    .slice(0, INITIAL_LOAD_LIMIT)
                    .map((item: any) => ({
                        ...item,
                        show: item.show || (item.episode && item.episode.show),
                        type: 'show' as const,
                        progress: item.progress || 0,
                        paused_at: item.paused_at,
                    }));

                const enhancedShowProgress = await enhanceWithTMDB(showProgress);
                newShowSections.push({
                    title: 'Currently Watching',
                    data: enhancedShowProgress,
                });
            }

            // Trending
            if (prioritySections[1].status === 'fulfilled' && prioritySections[1].value?.length > 0) {
                const trendingShows = prioritySections[1].value;
                const enhancedTrendingShows = await enhanceWithTMDB(
                    trendingShows.slice(0, INITIAL_LOAD_LIMIT).map((item: any) => ({ show: item.show, type: 'show' as const }))
                );
                newShowSections.push({
                    title: 'Trending',
                    data: enhancedTrendingShows,
                });
            }

            setShowSections(newShowSections);

            // Load remaining sections in background
            setTimeout(async () => {
                if (!mountedRef.current) return;
                
                const backgroundSections = await Promise.allSettled([
                    makeTraktApiCall('/recommendations/shows'),
                    makeTraktApiCall('/shows/popular'),
                    makeTraktApiCall('/sync/favorites/shows'),
                    makeTraktApiCall('/sync/watched/shows?extended=noseasons'),
                    makeTraktApiCall('/sync/collection/shows')
                ]);

                const additionalSections: ListSection[] = [];

                for (let i = 0; i < backgroundSections.length; i++) {
                    const result = backgroundSections[i];
                    if (result.status === 'fulfilled' && result.value?.length > 0) {
                        const sectionTitles = ['Recommendations', 'Popular', 'Favorited', 'Watched', 'Collected'];
                        const items = result.value;
                        
                        let processedItems;
                        if (i >= 2) {
                            processedItems = sortByRecentDate(items)
                                .slice(0, INITIAL_LOAD_LIMIT)
                                .map((item: any) => ({ ...item, type: 'show' as const }));
                        } else {
                            processedItems = items
                                .slice(0, INITIAL_LOAD_LIMIT)
                                .map((item: any) => ({ show: item, type: 'show' as const }));
                        }

                        const enhanced = await enhanceWithTMDB(processedItems);
                        additionalSections.push({
                            title: sectionTitles[i],
                            data: enhanced,
                        });
                    }
                }

                if (mountedRef.current) {
                    setShowSections(prev => [...prev, ...additionalSections]);
                }
            }, 100);

        } catch (error) {
            console.error('Error loading show data:', error);
        }
    }, [enhanceWithTMDB, sortByRecentDate]);

    const loadUserListData = useCallback(async () => {
        const newUserListSections: ListSection[] = [];

        try {
            // Load watchlist first (most important)
            const watchlistItems = await makeTraktApiCall('/sync/watchlist');
            if (watchlistItems.length > 0) {
                const sortedWatchlistItems = sortByRecentDate(watchlistItems);
                const enhancedWatchlistItems = await enhanceWithTMDB(sortedWatchlistItems.slice(0, INITIAL_LOAD_LIMIT));
                newUserListSections.push({
                    title: 'Watchlist',
                    data: enhancedWatchlistItems,
                });
            }

            setUserListSections(newUserListSections);

            // Load user lists in background
            setTimeout(async () => {
                if (!mountedRef.current) return;
                
                const userLists = await makeTraktApiCall('/users/me/lists');
                const additionalSections: ListSection[] = [];
                
                for (const list of userLists.slice(0, 5)) { // Limit to 5 lists initially
                    const listItems = await makeTraktApiCall(`/users/me/lists/${list.ids.slug}/items`);
                    if (listItems.length > 0) {
                        const sortedListItems = sortByRankThenDate(listItems);
                        const enhancedListItems = await enhanceWithTMDB(sortedListItems.slice(0, INITIAL_LOAD_LIMIT));
                        additionalSections.push({
                            title: list.name,
                            data: enhancedListItems,
                        });
                    }
                }

                if (mountedRef.current) {
                    setUserListSections(prev => [...prev, ...additionalSections]);
                }
            }, 100);

        } catch (error) {
            console.error('Error loading user lists:', error);
        }
    }, [enhanceWithTMDB, sortByRecentDate, sortByRankThenDate]);

    const loadCalendarData = useCallback(async () => {
        try {
            const today = new Date();
            const startDate = new Date(today);
            const endDate = new Date(today);
            endDate.setDate(today.getDate() + 14); // Reduced to 2 weeks for faster loading

            const formatDate = (date: Date) => date.toISOString().split('T')[0];

            // Load only next 14 days for faster initial load
            const [showCalendar, movieCalendar] = await Promise.allSettled([
                makeTraktApiCall(`/calendars/my/shows/${formatDate(startDate)}/14`),
                makeTraktApiCall(`/calendars/my/movies/${formatDate(startDate)}/14`)
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

            // Enhance with TMDB data only for sections with items
            const sectionsWithItems = newCalendarSections.filter(section => section.items.length > 0);
            
            for (const section of sectionsWithItems.slice(0, 7)) { // Limit TMDB calls initially
                if (TMDB_API_KEY) {
                    const enhancedItems = await Promise.all(
                        section.items.slice(0, 5).map(async (item) => { // Limit items per day
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
        // Trigger loading if not already loaded
        if (!tabDataLoaded[tab]) {
            loadTabData(tab);
        }
    }, [tabDataLoaded, loadTabData]);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        // Clear cache on refresh
        tmdbCache.clear();
        setTabDataLoaded({
            'movies': false,
            'shows': false,
            'user-lists': false,
            'calendar': false
        });
        await loadTabData(selectedTab);
        setRefreshing(false);

        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    }, [selectedTab, loadTabData]);

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
                        maxToRenderPerBatch={5}
                        windowSize={10}
                        initialNumToRender={3}
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
                maxToRenderPerBatch={5}
                windowSize={10}
                initialNumToRender={3}
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

    if (isLoading && !tabDataLoaded[selectedTab]) {
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