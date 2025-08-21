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
const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/w780';

interface TraktItem {
    type: 'movie' | 'show';
    movie?: any;
    show?: any;
    episode?: any;
    watched_at?: string;
    rating?: number;
    plays?: number;
    listed_at?: string; // For watchlist items
    updated_at?: string;
    last_watched_at?: string;
    last_updated_at?: string;
    progress?: number; // Playback progress (0-100)
    paused_at?: string; // When playback was paused
    action?: string; // 'start', 'pause', 'scrobble', 'watch'
    rank?: number; // For ranked lists
    id?: number; // List item ID
    notes?: string; // List item notes
}

interface TMDBDetails {
    poster_path?: string;
    backdrop_path?: string;
    vote_average?: number;
    release_date?: string;
    first_air_date?: string;
    runtime?: number; // Movie runtime in minutes
    episode_run_time?: number[]; // TV show episode runtime array
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

const TraktScreen = () => {
    const router = useRouter();
    const [screenData, setScreenData] = useState(Dimensions.get('window'));
    const [isAuthenticated, setIsAuthenticated] = useState<boolean>(true);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [refreshing, setRefreshing] = useState<boolean>(false);
    const [selectedTab, setSelectedTab] = useState<'user-lists' | 'movies' | 'shows' | 'calendar'>('movies');
    const [userListSections, setUserListSections] = useState<ListSection[]>([]);
    const [movieSections, setMovieSections] = useState<ListSection[]>([]);
    const [showSections, setShowSections] = useState<ListSection[]>([]);
    const [calendarSections, setCalendarSections] = useState<CalendarSection[]>([]);

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

    const getBackdropsPerScreen = () => {
        if (shortSide < 580) return isPortrait ? 2 : 3;       // mobile
        if (shortSide < 1024) return isPortrait ? 3 : 5;      // tablet
        if (shortSide < 1440) return isPortrait ? 5 : 7;      // laptop
        return isPortrait ? 7 : 9;                            // desktop
    };

    const postersPerScreen = getPostersPerScreen();
    const backdropsPerScreen = getBackdropsPerScreen();
    const spacing = 12;
    const containerMargin = 15;

    const posterWidth = useMemo(() => {
        const totalSpacing = spacing * (postersPerScreen - 1);
        const totalMargins = containerMargin * 2; // left + right
        return (width - totalSpacing - totalMargins) / postersPerScreen;
    }, [width, postersPerScreen]);

    const backdropWidth = useMemo(() => {
        const totalSpacing = spacing * (backdropsPerScreen - 1);
        const totalMargins = containerMargin * 2; // left + right
        return (width - totalSpacing - totalMargins) / backdropsPerScreen;
    }, [width, backdropsPerScreen]);

    const posterHeight = posterWidth * 1.5;
    const backdropHeight = backdropWidth * 0.56; // 16:9 aspect ratio

    // Helper function to sort items by rank first, then by most recent date
    const sortByRankThenDate = (items: TraktItem[]) => {
        return items.sort((a: any, b: any) => {
            // If both items have ranks, sort by rank (ascending)
            if (a.rank !== undefined && b.rank !== undefined) {
                return a.rank - b.rank;
            }

            // If only one has a rank, prioritize the ranked item
            if (a.rank !== undefined && b.rank === undefined) {
                return -1;
            }
            if (a.rank === undefined && b.rank !== undefined) {
                return 1;
            }

            // If neither has a rank, fall back to date sorting
            const getDate = (item: any) => {
                return item.listed_at ||
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

    // Helper function to sort items by most recent date (for non-list items)
    const sortByRecentDate = (items: TraktItem[]) => {
        return items.sort((a: any, b: any) => {
            // Priority order for date fields: listed_at > last_watched_at > last_updated_at > updated_at
            const getDate = (item: any) => {
                return item.listed_at ||
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

    // Helper function to format date labels
    const formatDateLabel = (dateString: string): string => {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(today.getDate() + 1);
        const yesterday = new Date(today);
        yesterday.setDate(today.getDate() - 1);

        // Normalize dates to compare only year, month, and day
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

    // Helper function to calculate remaining minutes
    const calculateRemainingMinutes = (progress: number, runtime?: number, episodeRuntime?: number[]): number | null => {
        if (progress === undefined || progress === null) return null;

        let totalMinutes: number;

        if (runtime) {
            // Movie runtime
            totalMinutes = runtime;
        } else if (episodeRuntime && episodeRuntime.length > 0) {
            // Use average episode runtime for TV shows
            totalMinutes = episodeRuntime.reduce((sum, time) => sum + time, 0) / episodeRuntime.length;
        } else {
            // Default fallback (typical episode/movie lengths)
            totalMinutes = 45; // Default episode length
        }

        const watchedMinutes = (progress / 100) * totalMinutes;
        const remainingMinutes = Math.max(0, totalMinutes - watchedMinutes);

        return Math.round(remainingMinutes);
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
            // Load all tabs simultaneously
            await loadAllData();
        }
    };

    const loadAllData = async () => {
        if (!isAuthenticated) return;

        try {
            setIsLoading(true);
            await Promise.all([
                loadUserListData(),
                loadMovieData(),
                loadShowData(),
                loadCalendarData()
            ]);
        } catch (error) {
            console.error('Error loading Trakt data:', error);
            showAlert('Error', 'Failed to load Trakt data. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const loadCalendarData = async () => {
        try {
            const today = new Date();
            const startDate = new Date(today);
            startDate.setDate(today.getDate());
            const endDate = new Date(today);
            endDate.setDate(today.getDate() + 30);

            const formatDate = (date: Date) => date.toISOString().split('T')[0];

            // Generate all dates in range
            const allDates: string[] = [];
            const currentDate = new Date(startDate);
            while (currentDate <= endDate) {
                allDates.push(formatDate(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }

            // Load calendar data for shows and movies
            const [showCalendar, movieCalendar] = await Promise.all([
                makeTraktApiCall(`/calendars/my/shows/${formatDate(startDate)}/60`),
                makeTraktApiCall(`/calendars/my/movies/${formatDate(startDate)}/60`)
            ]);

            // Process and group calendar items by date
            const calendarMap = new Map<string, CalendarItem[]>();

            // Initialize all dates with empty arrays
            allDates.forEach(date => {
                calendarMap.set(date, []);
            });

            // Process show episodes
            showCalendar.forEach((item: any) => {
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

            // Process movies
            movieCalendar.forEach((item: any) => {
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

            // Convert map to sorted sections (all dates, even empty ones)
            const newCalendarSections: CalendarSection[] = allDates.map(date => ({
                date,
                dateLabel: formatDateLabel(date),
                items: calendarMap.get(date) || []
            }));

            // Enhance with TMDB data only for sections that have items
            for (const section of newCalendarSections) {
                if (section.items.length > 0 && TMDB_API_KEY) {
                    const enhancedItems = await Promise.all(
                        section.items.map(async (item) => {
                            try {
                                if (item.tmdb_id) {
                                    const endpoint = item.type === 'movie' ? 'movie' : 'tv';
                                    const response = await fetch(
                                        `${TMDB_BASE_URL}/${endpoint}/${item.tmdb_id}?api_key=${TMDB_API_KEY}`
                                    );

                                    if (response.ok) {
                                        const tmdbData = await response.json();
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
    };

    const loadUserListData = async () => {
        const newUserListSections: ListSection[] = [];

        try {
            // Load User Created Lists (Both movies and shows)
            const userLists = await makeTraktApiCall('/users/me/lists');
            for (const list of userLists) {
                const listItems = await makeTraktApiCall(`/users/me/lists/${list.ids.slug}/items`);
                if (listItems.length > 0) {
                    // Sort list items by rank first, then by recent date
                    const sortedListItems = sortByRankThenDate(listItems);
                    const enhancedListItems = await enhanceWithTMDB(sortedListItems.slice(0, 20));
                    newUserListSections.push({
                        title: list.name,
                        data: enhancedListItems,
                    });
                }
            }

            // Load Watchlist as a special user list (combined movies and shows)
            // Note: Watchlist typically doesn't have ranks, so we'll use date sorting
            try {
                const watchlistItems = await makeTraktApiCall('/sync/watchlist');
                if (watchlistItems.length > 0) {
                    // Sort watchlist by most recent additions (no ranks in watchlist)
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
                        title: 'Currently Watching',
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
                        title: 'Currently Watching',
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

    const handleCalendarItemPress = async (item: CalendarItem) => {
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
    };

    const getCurrentSections = () => {
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
    };

    const onRefresh = async () => {
        setRefreshing(true);
        await loadAllData();
        setRefreshing(false);

        if (isHapticsSupported()) {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        }
    };

    const renderMediaItem = ({ item, sectionTitle }: { item: EnhancedTraktItem; sectionTitle?: string }) => {
        const content = item.movie || item.show;
        const title = content?.title || content?.name;
        const year = content?.year;
        const poster = item.tmdb?.poster_path;
        const backdrop = item.tmdb?.backdrop_path;
        const rating = item.tmdb?.vote_average;
        const userRating = item.rating;
        const progress = item.progress;

        // For episodes, extract episode info
        const episode = item.episode;
        const episodeTitle = episode?.title;
        const seasonNumber = episode?.season;
        const episodeNumber = episode?.number;

        // Determine if this is a "Currently Watching" item
        const isCurrentlyWatching = sectionTitle === 'Currently Watching';

        // Calculate remaining minutes for progress items
        const remainingMinutes = progress !== undefined ? calculateRemainingMinutes(
            progress,
            item.tmdb?.runtime,
            item.tmdb?.episode_run_time
        ) : null;

        // Use backdrop for currently watching items, poster for others
        const imageSource = isCurrentlyWatching && backdrop ?
            `${TMDB_BACKDROP_BASE}${backdrop}` :
            poster ? `${TMDB_IMAGE_BASE}${poster}` : null;

        // Use different dimensions based on item type
        const itemWidth = isCurrentlyWatching ? backdropWidth : posterWidth;
        const imageHeight = isCurrentlyWatching ? backdropHeight : posterHeight;

        return (
            <Pressable
                style={({ pressed }) => [
                    {
                        ...styles.mediaItem,
                        width: itemWidth,
                        marginRight: spacing,
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

                    {/* Progress Bar for Continue Watching items */}
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
                    {/* Show remaining time in title area for continue watching */}
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
    };

    const renderCalendarItem = ({ item }: { item: CalendarItem }) => {
        const imageSource = item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : null;

        return (
            <Pressable
                style={({ pressed }) => [
                    styles.calendarItem,
                    pressed && styles.calendarItemPressed
                ]}
                onPress={() => handleCalendarItemPress(item)}
            >
                <View style={styles.calendarItemImageContainer}>
                    {imageSource ? (
                        <Image
                            source={{ uri: imageSource }}
                            style={styles.calendarItemImage}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.calendarItemImage, styles.calendarItemImagePlaceholder]}>
                            <Text style={styles.calendarPlaceholderText}>
                                {item.type === 'movie' ? '🎬' : '📺'}
                            </Text>
                        </View>
                    )}
                </View>

                <View style={styles.calendarItemInfo}>
                    <Text style={styles.calendarItemTitle} numberOfLines={2}>
                        {item.title}
                    </Text>

                    {item.type === 'episode' && item.season && item.episode && (
                        <View style={styles.calendarEpisodeInfo}>
                            <Text style={styles.calendarEpisodeText}>
                                S{item.season}E{item.episode}
                            </Text>
                            {item.episode_title && (
                                <Text style={styles.calendarEpisodeTitle} numberOfLines={1}>
                                    {item.episode_title}
                                </Text>
                            )}
                        </View>
                    )}

                    {item.year && (
                        <Text style={styles.calendarItemYear}>{item.year}</Text>
                    )}
                </View>

                <View style={styles.calendarItemType}>
                    <View style={[
                        styles.calendarTypeBadge,
                        item.type === 'movie' ? styles.movieBadge : styles.episodeBadge
                    ]}>
                        <Text style={styles.calendarTypeBadgeText}>
                            {item.type === 'movie' ? 'Movie' : 'Episode'}
                        </Text>
                    </View>
                </View>
            </Pressable>
        );
    };

    const renderCalendarSection = (section: CalendarSection) => (
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
                            paddingLeft: containerMargin,
                            paddingRight: containerMargin,
                        }}
                        keyExtractor={(item, index) => `${section.date}-${index}`}
                    />
                </View>
            ) : (
                <View style={styles.emptyDayContainer}>
                    <Text style={styles.emptyDayText}>Nothing on this day</Text>
                </View>
            )}
        </View>
    );

    const renderSection = (section: ListSection) => (
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
                    paddingLeft: containerMargin,
                    paddingRight: containerMargin,
                }}
                keyExtractor={(item, index) => `${section.title}-${index}`}
            />
        </View>
    );

    const renderTabs = () => (
        <View style={styles.tabContainer}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabScrollContent}
            >
                <Pressable
                    style={[
                        styles.tab,
                        selectedTab === 'movies' && styles.activeTab
                    ]}
                    onPress={async () => {
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
                    onPress={async () => {
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
                        Series
                    </Text>
                </Pressable>

                <Pressable
                    style={[
                        styles.tab,
                        selectedTab === 'calendar' && styles.activeTab
                    ]}
                    onPress={async () => {
                        setSelectedTab('calendar');
                        if (isHapticsSupported()) {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
                        }
                    }}
                >
                    <Ionicons
                        name='calendar-outline'
                        size={16}
                        color={selectedTab === 'calendar' ? '#fff' : '#bbb'}
                        style={{ marginRight: 6 }}
                    />
                    <Text style={[
                        styles.tabText,
                        selectedTab === 'calendar' && styles.activeTabText
                    ]}>
                        Calendar
                    </Text>
                </Pressable>

                <Pressable
                    style={[
                        styles.tab,
                        selectedTab === 'user-lists' && styles.activeTab
                    ]}
                    onPress={async () => {
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
            </ScrollView>
        </View>
    );

    const renderCalendarItemHorizontal = ({ item }: { item: CalendarItem }) => {
        const imageSource = item.poster_path ? `${TMDB_IMAGE_BASE}${item.poster_path}` : null;

        return (
            <Pressable
                style={({ pressed }) => [
                    {
                        ...styles.calendarMediaItem,
                        width: posterWidth,
                        marginRight: spacing,
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

                    {/* Type badge overlay */}
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
    };

    const renderTabContent = () => {
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
            >
                {sections.map(renderSection)}
            </ScrollView>
        );
    };

    const renderUnauthenticated = () => (
        <View style={styles.unauthenticatedContainer}>
            <Text style={styles.unauthenticatedTitle}>Connect to Trakt.tv</Text>
            <Text style={styles.unauthenticatedText}>
                Please authenticate with Trakt.tv to view your data
            </Text>
        </View>
    );

    if (isLoading) {
        return (
            <SafeAreaView style={styles.container}>
                <StatusBar />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#535aff" />
                    <Text style={styles.loadingText}>Connecting to Trakt...</Text>
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
    tabIcon: {
        marginRight: 8,
        opacity: 0.8,
    },
    activeTabIcon: {
        opacity: 1,
        color: '#ffffff',
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
        minWidth: 60,
        textAlign: 'right',
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
    // Calendar-specific styles
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
    calendarItemsContainer: {
        gap: 12,
    },
    calendarItem: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 255, 255, 0.03)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.06)',
        overflow: 'hidden',
    },
    calendarItemPressed: {
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    calendarItemImageContainer: {
        width: 60,
        height: 90,
    },
    calendarItemImage: {
        width: '100%',
        height: '100%',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
    },
    calendarItemImagePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    calendarPlaceholderText: {
        fontSize: 20,
        opacity: 0.5,
    },
    calendarItemInfo: {
        flex: 1,
        padding: 12,
        justifyContent: 'center',
        gap: 4,
    },
    calendarItemTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#fff',
        lineHeight: 20,
    },
    calendarEpisodeInfo: {
        gap: 2,
    },
    calendarEpisodeText: {
        fontSize: 13,
        color: '#535aff',
        fontWeight: '600',
    },
    calendarEpisodeTitle: {
        fontSize: 13,
        color: '#bbb',
        fontWeight: '400',
    },
    calendarItemYear: {
        fontSize: 12,
        color: '#888',
        fontWeight: '500',
    },
    calendarItemType: {
        justifyContent: 'center',
        paddingRight: 12,
    },
    calendarTypeBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
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
    calendarTypeBadgeText: {
        fontSize: 11,
        fontWeight: '600',
        color: '#fff',
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
    emptyCalendarContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        gap: 16,
        marginTop: 60,
    },
    emptyCalendarTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
        textAlign: 'center',
    },
    emptyCalendarText: {
        fontSize: 15,
        color: '#888',
        textAlign: 'center',
        lineHeight: 22,
        maxWidth: 280,
    },
    calendarMediaItem: {
        // width and marginRight applied dynamically
    },

    calendarItemsHorizontalContainer: {
        maxWidth: 780, // Max width constraint
        alignSelf: 'center',
        width: '100%',
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
});

export default TraktScreen;

