import { ScrollView, StyleSheet, Pressable, ActivityIndicator, RefreshControl, Image, FlatList, Dimensions } from 'react-native';
import { StatusBar, Text, View } from '../../components/Themed';
import { isHapticsSupported, showAlert } from '@/utils/platform';
import * as Haptics from 'expo-haptics';
import { useEffect, useState, useCallback } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import BottomSpacing from '@/components/BottomSpacing';
import { isUserAuthenticated, makeTraktApiCall } from '@/clients/trakt';
import { ListSection, CalendarSection, TraktItem, EnhancedTraktItem, CalendarItem } from '@/models/trakt';
import { SafeAreaView } from 'react-native-safe-area-context';

const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const TMDB_BASE_URL = 'https://api.themoviedb.org/3';
const TMDB_IMAGE_BASE = 'https://image.tmdb.org/t/p/w500';
const TMDB_BACKDROP_BASE = 'https://image.tmdb.org/t/p/w780';
const TMDB_CACHE_DURATION = 5 * 60 * 1000;

const tmdbCache = new Map<string, { data: any; timestamp: number }>();

const TraktScreen = () => {
    const router = useRouter();
    const [dimensions, setDimensions] = useState(Dimensions.get('window'));
    const [isAuthenticated, setIsAuthenticated] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    const [selectedTab, setSelectedTab] = useState<'user-lists' | 'movies' | 'shows' | 'calendar'>('movies');
    const [userListSections, setUserListSections] = useState<ListSection[]>([]);
    const [movieSections, setMovieSections] = useState<ListSection[]>([]);
    const [showSections, setShowSections] = useState<ListSection[]>([]);
    const [calendarSections, setCalendarSections] = useState<CalendarSection[]>([]);

    // Calculate responsive dimensions
    const getLayoutDimensions = () => {
        const { width, height } = dimensions;
        const isPortrait = height > width;
        const shortSide = Math.min(width, height);

        const postersPerScreen = shortSide < 580 ? (isPortrait ? 3 : 5) :
            shortSide < 1024 ? (isPortrait ? 6 : 8) :
            shortSide < 1440 ? (isPortrait ? 7 : 9) : (isPortrait ? 7 : 10);

        const backdropsPerScreen = shortSide < 580 ? (isPortrait ? 2 : 3) :
            shortSide < 1024 ? (isPortrait ? 3 : 5) :
            shortSide < 1440 ? (isPortrait ? 5 : 7) : (isPortrait ? 7 : 9);

        const spacing = 12;
        const containerMargin = 15;
        const posterWidth = (width - spacing * (postersPerScreen - 1) - containerMargin * 2) / postersPerScreen;
        const backdropWidth = (width - spacing * (backdropsPerScreen - 1) - containerMargin * 2) / backdropsPerScreen;

        return {
            posterWidth,
            backdropWidth,
            posterHeight: posterWidth * 1.5,
            backdropHeight: backdropWidth * 0.56,
            spacing,
            containerMargin,
        };
    };

    const layout = getLayoutDimensions();

    // Fetch TMDB data with caching
    const fetchTMDBData = async (tmdbId: number, type: 'movie' | 'tv') => {
        const cacheKey = `${type}-${tmdbId}`;
        const cached = tmdbCache.get(cacheKey);
        const now = Date.now();

        if (cached && (now - cached.timestamp) < TMDB_CACHE_DURATION) {
            return cached.data;
        }

        try {
            const response = await fetch(`${TMDB_BASE_URL}/${type}/${tmdbId}?api_key=${TMDB_API_KEY}`);
            if (response.ok) {
                const data = await response.json();
                tmdbCache.set(cacheKey, { data, timestamp: now });
                return data;
            }
        } catch (error) {
            console.error('TMDB fetch error:', error);
        }
        return null;
    };

    // Enhance items with TMDB data
    const enhanceWithTMDB = async (items: TraktItem[]): Promise<EnhancedTraktItem[]> => {
        if (!TMDB_API_KEY || !items.length) return items;

        return Promise.all(items.map(async (item) => {
            const content = item.movie || item.show;
            const tmdbId = content?.ids?.tmdb;
            if (!tmdbId) return item;

            const tmdbData = await fetchTMDBData(tmdbId, item.movie ? 'movie' : 'tv');
            return tmdbData ? { ...item, tmdb: tmdbData, tmdb_id: tmdbId } : item;
        }));
    };

    // Sort by date
    const sortByDate = (items: TraktItem[]) => {
        return [...items].sort((a: any, b: any) => {
            const getDate = (item: any) => item.listed_at || item.last_watched_at || 
                item.last_updated_at || item.updated_at || item.watched_at || '1970-01-01';
            return new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime();
        });
    };

    // Sort by rank then date
    const sortByRankThenDate = (items: TraktItem[]) => {
        return [...items].sort((a: any, b: any) => {
            if (a.rank !== undefined && b.rank !== undefined) return a.rank - b.rank;
            if (a.rank !== undefined) return -1;
            if (a.rank === undefined && b.rank !== undefined) return 1;
            
            const getDate = (item: any) => item.listed_at || item.last_watched_at || 
                item.last_updated_at || item.updated_at || item.watched_at || '1970-01-01';
            return new Date(getDate(b)).getTime() - new Date(getDate(a)).getTime();
        });
    };

    // Load movie data
    const loadMovieData = async () => {
        try {
            const [movieProgress, trending, recommended, popular, favorited, watched, collected] = 
                await Promise.allSettled([
                    makeTraktApiCall('/sync/playback/movies'),
                    makeTraktApiCall('/movies/trending'),
                    makeTraktApiCall('/recommendations/movies'),
                    makeTraktApiCall('/movies/popular'),
                    makeTraktApiCall('/sync/favorites/movies'),
                    makeTraktApiCall('/sync/watched/movies'),
                    makeTraktApiCall('/sync/collection/movies')
                ]);

            const sections: ListSection[] = [];

            if (movieProgress.status === 'fulfilled' && movieProgress.value?.length) {
                const items = sortByDate(movieProgress.value.map((item: any) => ({
                    ...item, type: 'movie', progress: item.progress || 0, paused_at: item.paused_at
                })));
                sections.push({ title: 'Currently Watching', data: await enhanceWithTMDB(items) });
            }

            if (trending.status === 'fulfilled' && trending.value?.length) {
                const items = trending.value.map((item: any) => ({ movie: item.movie, type: 'movie' }));
                sections.push({ title: 'Trending', data: await enhanceWithTMDB(items) });
            }

            if (recommended.status === 'fulfilled' && recommended.value?.length) {
                const items = recommended.value.map((item: any) => ({ movie: item, type: 'movie' }));
                sections.push({ title: 'Recommendations', data: await enhanceWithTMDB(items) });
            }

            if (popular.status === 'fulfilled' && popular.value?.length) {
                const items = popular.value.map((item: any) => ({ movie: item, type: 'movie' }));
                sections.push({ title: 'Popular', data: await enhanceWithTMDB(items) });
            }

            if (favorited.status === 'fulfilled' && favorited.value?.length) {
                const items = sortByDate(favorited.value.map((item: any) => ({ ...item, type: 'movie' })));
                sections.push({ title: 'Favorited', data: await enhanceWithTMDB(items) });
            }

            if (watched.status === 'fulfilled' && watched.value?.length) {
                const items = sortByDate(watched.value.map((item: any) => ({ ...item, type: 'movie' })));
                sections.push({ title: 'Watched', data: await enhanceWithTMDB(items) });
            }

            if (collected.status === 'fulfilled' && collected.value?.length) {
                const items = sortByDate(collected.value.map((item: any) => ({ ...item, type: 'movie' })));
                sections.push({ title: 'Collected', data: await enhanceWithTMDB(items) });
            }

            setMovieSections(sections);
        } catch (error) {
            console.error('Error loading movies:', error);
        }
    };

    // Load show data
    const loadShowData = async () => {
        try {
            const [showProgress, trending, recommended, popular, favorited, watched, collected] = 
                await Promise.allSettled([
                    makeTraktApiCall('/sync/playback/episodes'),
                    makeTraktApiCall('/shows/trending'),
                    makeTraktApiCall('/recommendations/shows'),
                    makeTraktApiCall('/shows/popular'),
                    makeTraktApiCall('/sync/favorites/shows'),
                    makeTraktApiCall('/sync/watched/shows?extended=noseasons'),
                    makeTraktApiCall('/sync/collection/shows')
                ]);

            const sections: ListSection[] = [];

            if (showProgress.status === 'fulfilled' && showProgress.value?.length) {
                const items = sortByDate(showProgress.value.map((item: any) => ({
                    ...item, show: item.show || item.episode?.show, type: 'show', 
                    progress: item.progress || 0, paused_at: item.paused_at
                })));
                sections.push({ title: 'Currently Watching', data: await enhanceWithTMDB(items) });
            }

            if (trending.status === 'fulfilled' && trending.value?.length) {
                const items = trending.value.map((item: any) => ({ show: item.show, type: 'show' }));
                sections.push({ title: 'Trending', data: await enhanceWithTMDB(items) });
            }

            if (recommended.status === 'fulfilled' && recommended.value?.length) {
                const items = recommended.value.map((item: any) => ({ show: item, type: 'show' }));
                sections.push({ title: 'Recommendations', data: await enhanceWithTMDB(items) });
            }

            if (popular.status === 'fulfilled' && popular.value?.length) {
                const items = popular.value.map((item: any) => ({ show: item, type: 'show' }));
                sections.push({ title: 'Popular', data: await enhanceWithTMDB(items) });
            }

            if (favorited.status === 'fulfilled' && favorited.value?.length) {
                const items = sortByDate(favorited.value.map((item: any) => ({ ...item, type: 'show' })));
                sections.push({ title: 'Favorited', data: await enhanceWithTMDB(items) });
            }

            if (watched.status === 'fulfilled' && watched.value?.length) {
                const items = sortByDate(watched.value.map((item: any) => ({ ...item, type: 'show' })));
                sections.push({ title: 'Watched', data: await enhanceWithTMDB(items) });
            }

            if (collected.status === 'fulfilled' && collected.value?.length) {
                const items = sortByDate(collected.value.map((item: any) => ({ ...item, type: 'show' })));
                sections.push({ title: 'Collected', data: await enhanceWithTMDB(items) });
            }

            setShowSections(sections);
        } catch (error) {
            console.error('Error loading shows:', error);
        }
    };

    // Load user lists
    const loadUserListData = async () => {
        try {
            const sections: ListSection[] = [];

            const watchlist = await makeTraktApiCall('/sync/watchlist');
            if (watchlist.length) {
                sections.push({ 
                    title: 'Watchlist', 
                    data: await enhanceWithTMDB(sortByDate(watchlist)) 
                });
            }

            const userLists = await makeTraktApiCall('/users/me/lists');
            for (const list of userLists) {
                const items = await makeTraktApiCall(`/users/me/lists/${list.ids.slug}/items`);
                if (items.length) {
                    sections.push({ 
                        title: list.name, 
                        data: await enhanceWithTMDB(sortByRankThenDate(items)) 
                    });
                }
            }

            setUserListSections(sections);
        } catch (error) {
            console.error('Error loading user lists:', error);
        }
    };

    // Load calendar data
    const loadCalendarData = async () => {
        try {
            const today = new Date();
            const endDate = new Date(today);
            endDate.setDate(today.getDate() + 30);

            const formatDate = (date: Date) => date.toISOString().split('T')[0];

            const [showCal, movieCal] = await Promise.allSettled([
                makeTraktApiCall(`/calendars/my/shows/${formatDate(today)}/30`),
                makeTraktApiCall(`/calendars/my/movies/${formatDate(today)}/30`)
            ]);

            const calendarMap = new Map<string, CalendarItem[]>();
            
            // Generate all dates
            for (let i = 0; i <= 30; i++) {
                const date = new Date(today);
                date.setDate(today.getDate() + i);
                calendarMap.set(formatDate(date), []);
            }

            // Add show episodes
            if (showCal.status === 'fulfilled' && showCal.value) {
                for (const item of showCal.value) {
                    const date = item.first_aired;
                    if (date && calendarMap.has(date)) {
                        calendarMap.get(date)!.push({
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
                        });
                    }
                }
            }

            // Add movies
            if (movieCal.status === 'fulfilled' && movieCal.value) {
                for (const item of movieCal.value) {
                    const date = item.released;
                    if (date && calendarMap.has(date)) {
                        calendarMap.get(date)!.push({
                            type: 'movie',
                            date,
                            title: item.movie?.title || 'Unknown Movie',
                            year: item.movie?.year,
                            first_aired: item.released,
                            tmdb_id: item.movie?.ids?.tmdb,
                            poster_path: '',
                            backdrop_path: '',
                            ids: item.movie?.ids
                        });
                    }
                }
            }

            // Format date labels
            const formatDateLabel = (dateStr: string) => {
                const date = new Date(dateStr);
                const now = new Date();
                const diff = Math.floor((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                
                if (diff === 0) return 'Today';
                if (diff === 1) return 'Tomorrow';
                if (diff === -1) return 'Yesterday';
                
                return date.toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'short',
                    day: 'numeric'
                });
            };

            // Create sections and enhance with TMDB
            const sections: CalendarSection[] = [];
            for (const [date, items] of calendarMap) {
                if (items.length && TMDB_API_KEY) {
                    for (const item of items) {
                        if (item.tmdb_id) {
                            const data = await fetchTMDBData(item.tmdb_id, item.type === 'movie' ? 'movie' : 'tv');
                            if (data) {
                                item.poster_path = data.poster_path;
                                item.backdrop_path = data.backdrop_path;
                            }
                        }
                    }
                }
                sections.push({
                    date,
                    dateLabel: formatDateLabel(date),
                    items
                });
            }

            setCalendarSections(sections);
        } catch (error) {
            console.error('Error loading calendar:', error);
        }
    };

    // Load all data
    const loadAllData = async () => {
        setIsLoading(true);
        await Promise.all([loadMovieData(), loadShowData(), loadUserListData(), loadCalendarData()]);
        setIsLoading(false);
    };

    // Effects
    useEffect(() => {
        const sub = Dimensions.addEventListener('change', ({ window }) => setDimensions(window));
        return () => sub?.remove();
    }, []);

    useEffect(() => {
        if (isAuthenticated) loadAllData();
    }, [isAuthenticated]);

    useFocusEffect(useCallback(() => {
        isUserAuthenticated().then(setIsAuthenticated);
    }, []));

    // Handlers
    const handleMediaPress = async (item: EnhancedTraktItem) => {
        if (isHapticsSupported()) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
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
        if (isHapticsSupported()) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        
        if (item.tmdb_id) {
            router.push({
                pathname: `/${item.type === 'movie' ? 'movie' : 'series'}/details`,
                params: { moviedbid: item.tmdb_id.toString() },
            });
        }
    };

    const handleTabPress = async (tab: typeof selectedTab) => {
        setSelectedTab(tab);
        if (isHapticsSupported()) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const onRefresh = async () => {
        setRefreshing(true);
        tmdbCache.clear();
        await loadAllData();
        setRefreshing(false);
        if (isHapticsSupported()) await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    // Calculate remaining time
    const getRemainingMinutes = (progress: number, runtime?: number, episodeRuntime?: number[]) => {
        const totalMinutes = runtime || 
            (episodeRuntime && episodeRuntime?.reduce((sum, time) => sum + time, 0) / episodeRuntime?.length) || 45;
        const remainingMinutes = Math.round(totalMinutes * (1 - progress / 100));
        return remainingMinutes > 0 ? remainingMinutes : null;
    };

    // Render media item
    const renderMediaItem = ({ item, sectionTitle }: { item: EnhancedTraktItem; sectionTitle?: string }) => {
        const content = item.movie || item.show;
        const isCurrentlyWatching = sectionTitle === 'Currently Watching';
        const imageSource = isCurrentlyWatching && item.tmdb?.backdrop_path ?
            `${TMDB_BACKDROP_BASE}${item.tmdb.backdrop_path}` :
            item.tmdb?.poster_path ? `${TMDB_IMAGE_BASE}${item.tmdb.poster_path}` : null;

        const itemWidth = isCurrentlyWatching ? layout.backdropWidth : layout.posterWidth;
        const imageHeight = isCurrentlyWatching ? layout.backdropHeight : layout.posterHeight;
        const remainingMinutes = item.progress !== undefined ? 
            getRemainingMinutes(item.progress, item.tmdb?.runtime, item.tmdb?.episode_run_time) : null;

        return (
            <Pressable
                style={[styles.mediaItem, { width: itemWidth, marginRight: layout.spacing }]}
                onPress={() => handleMediaPress(item)}
            >
                <View style={styles.posterContainer}>
                    {imageSource ? (
                        <Image
                            source={{ uri: imageSource }}
                            style={[styles.poster, { width: itemWidth, height: imageHeight }]}
                            resizeMode="cover"
                        />
                    ) : (
                        <View style={[styles.poster, styles.placeholderPoster, 
                            { width: itemWidth, height: imageHeight }]}>
                            <Text style={styles.placeholderText}>
                                {item.type === 'movie' ? '🎬' : '📺'}
                            </Text>
                        </View>
                    )}

                    {item.progress !== undefined && item.progress > 0 && isCurrentlyWatching && (
                        <View style={styles.backdropProgressContainer}>
                            <View style={[styles.backdropProgressFill, { width: `${item.progress}%` }]} />
                        </View>
                    )}

                    {item.rating && (
                        <View style={styles.userRatingOverlay}>
                            <Text style={styles.userRatingOverlayText}>{item.rating}</Text>
                        </View>
                    )}
                </View>

                <View style={styles.mediaInfo}>
                    <Text style={styles.mediaTitle} numberOfLines={1}>{content?.title}</Text>
                    {item.episode && (
                        <Text style={styles.episodeInfo} numberOfLines={1}>
                            S{item.episode.season}E{item.episode.number}
                            {item.episode.title && ` • ${item.episode.title}`}
                        </Text>
                    )}
                    {content?.year && <Text style={styles.mediaYear}>{content.year}</Text>}
                    {remainingMinutes && (
                        <Text style={styles.progressLabel}>
                            {remainingMinutes < 60 ? 
                                `${remainingMinutes} min left` : 
                                `${Math.floor(remainingMinutes / 60)}h ${remainingMinutes % 60}m left`}
                        </Text>
                    )}
                </View>
            </Pressable>
        );
    };

    // Render calendar item
    const renderCalendarItem = ({ item }: { item: CalendarItem }) => (
        <Pressable
            style={[styles.mediaItem, { width: layout.posterWidth, marginRight: layout.spacing }]}
            onPress={() => handleCalendarItemPress(item)}
        >
            <View style={styles.posterContainer}>
                {item.poster_path ? (
                    <Image
                        source={{ uri: `${TMDB_IMAGE_BASE}${item.poster_path}` }}
                        style={[styles.poster, { width: layout.posterWidth, height: layout.posterHeight }]}
                        resizeMode="cover"
                    />
                ) : (
                    <View style={[styles.poster, styles.placeholderPoster,
                        { width: layout.posterWidth, height: layout.posterHeight }]}>
                        <Text style={styles.placeholderText}>
                            {item.type === 'movie' ? '🎬' : '📺'}
                        </Text>
                    </View>
                )}

                <View style={styles.calendarTypeOverlay}>
                    <View style={[styles.calendarTypeBadgeSmall, 
                        item.type === 'movie' ? styles.movieBadge : styles.episodeBadge]}>
                        <Text style={styles.calendarTypeBadgeSmallText}>
                            {item.type === 'movie' ? 'Movie' : 'EP'}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.mediaInfo}>
                <Text style={styles.mediaTitle} numberOfLines={2}>{item.title}</Text>
                {item.type === 'episode' && item.season && item.episode && (
                    <Text style={styles.episodeInfo} numberOfLines={1}>
                        S{item.season}E{item.episode}
                    </Text>
                )}
                {item.year && <Text style={styles.mediaYear}>{item.year}</Text>}
            </View>
        </Pressable>
    );

    // Render section
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
                contentContainerStyle={[styles.horizontalList, 
                    { paddingLeft: layout.containerMargin, paddingRight: layout.containerMargin }]}
                keyExtractor={(item, i) => `${section.title}-${i}`}
            />
        </View>
    );

    // Render calendar section
    const renderCalendarSection = (section: CalendarSection) => (
        <View key={section.date} style={styles.calendarSection}>
            <View style={styles.calendarSectionHeader}>
                <Text style={styles.calendarSectionTitle}>{section.dateLabel}</Text>
                <Text style={styles.calendarSectionDate}>
                    {new Date(section.date).toLocaleDateString('en-US', 
                        { month: 'short', day: 'numeric' })}
                </Text>
            </View>

            {section.items.length > 0 ? (
                <FlatList
                    data={section.items}
                    renderItem={renderCalendarItem}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={[styles.horizontalList,
                        { paddingLeft: layout.containerMargin, paddingRight: layout.containerMargin }]}
                    keyExtractor={(item, i) => `${section.date}-${i}`}
                />
            ) : (
                <View style={styles.emptyDayContainer}>
                    <Text style={styles.emptyDayText}>Nothing on this day</Text>
                </View>
            )}
        </View>
    );

    // Get current sections
    const getCurrentSections = () => {
        switch (selectedTab) {
            case 'movies': return movieSections;
            case 'shows': return showSections;
            case 'user-lists': return userListSections;
            default: return [];
        }
    };

    if (isLoading) {
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
            <View style={styles.headerContainer}>
                <Text style={styles.headerTitle}>Trakt</Text>
            </View>

            {!isAuthenticated ? (
                <View style={styles.unauthenticatedContainer}>
                    <Text style={styles.unauthenticatedTitle}>Connect to Trakt.tv</Text>
                    <Text style={styles.unauthenticatedText}>
                        Please authenticate with Trakt.tv to view your data
                    </Text>
                </View>
            ) : (
                <View style={styles.mainContainer}>
                    <View style={styles.tabContainer}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} 
                            contentContainerStyle={styles.tabScrollContent}>
                            {[
                                { key: 'movies', icon: 'film-outline', label: 'Movies' },
                                { key: 'shows', icon: 'tv-outline', label: 'Series' },
                                { key: 'calendar', icon: 'calendar-outline', label: 'Calendar' },
                                { key: 'user-lists', icon: 'apps', label: 'Lists' }
                            ].map((tab) => (
                                <Pressable
                                    key={tab.key}
                                    style={[styles.tab, selectedTab === tab.key && styles.activeTab]}
                                    onPress={() => handleTabPress(tab.key as any)}
                                >
                                    <Ionicons
                                        name={tab.icon as any}
                                        size={18}
                                        color={selectedTab === tab.key ? '#fff' : '#bbb'}
                                        style={{ marginRight: 6 }}
                                    />
                                    <Text style={[styles.tabText, 
                                        selectedTab === tab.key && styles.activeTabText]}>
                                        {tab.label}
                                    </Text>
                                </Pressable>
                            ))}
                        </ScrollView>
                    </View>

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
                        {selectedTab === 'calendar' 
                            ? calendarSections.map(renderCalendarSection)
                            : getCurrentSections().map(renderSection)}
                    </ScrollView>

                    <BottomSpacing space={50} />
                </View>
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    headerContainer: { paddingHorizontal: 15, paddingTop: 10 },
    headerTitle: { fontSize: 30, fontWeight: '700', color: '#fff', marginBottom: 4 },
    mainContainer: { flex: 1 },
    loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 20 },
    loadingText: { fontSize: 16, color: '#888', fontWeight: '500' },
    unauthenticatedContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 20 },
    unauthenticatedTitle: { fontSize: 24, fontWeight: '700', color: '#fff', textAlign: 'center' },
    unauthenticatedText: { fontSize: 16, color: '#888', textAlign: 'center', lineHeight: 24, maxWidth: 300 },
    tabContainer: { paddingVertical: 16, backdropFilter: 'blur(15px)' },
    tabScrollContent: { paddingHorizontal: 16, alignItems: 'center' },
    tab: {
        flexDirection: 'row',
        paddingVertical: 14,
        paddingHorizontal: 24,
        borderRadius: 25,
        marginRight: 14,
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        shadowColor: 'rgba(0, 0, 0, 0.2)',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 4
    },
    activeTab: {
        backgroundColor: 'rgba(83, 90, 255, 0.5)',
        shadowColor: '#535aff',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8
    },
    tabText: { fontWeight: '500', color: '#ccc' },
    activeTabText: { color: '#fff' },
    contentContainer: { flex: 1, paddingVertical: 20 },
    section: { marginBottom: 32 },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        marginBottom: 16
    },
    sectionTitle: { fontSize: 20, fontWeight: '600', color: '#fff' },
    sectionCount: { fontSize: 14, color: '#ccc', fontWeight: '500' },
    horizontalList: {},
    mediaItem: {},
    posterContainer: { position: 'relative', marginBottom: 8 },
    poster: { borderRadius: 8, backgroundColor: 'rgba(255, 255, 255, 0.01)' },
    placeholderPoster: { justifyContent: 'center', alignItems: 'center' },
    placeholderText: { fontSize: 32, opacity: 0.5 },
    userRatingOverlay: {
        position: 'absolute',
        top: 6,
        left: 6,
        backgroundColor: '#535aff',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 12,
        minWidth: 24,
        alignItems: 'center'
    },
    userRatingOverlayText: { fontSize: 12, fontWeight: '700', color: '#fff' },
    mediaInfo: { gap: 4 },
    mediaTitle: { fontSize: 14, fontWeight: '500', color: '#fff', lineHeight: 18 },
    mediaYear: { fontSize: 12, color: '#ccc', fontWeight: '500' },
    backdropProgressContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 4,
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        overflow: 'hidden'
    },
    backdropProgressFill: {
        height: '100%',
        backgroundColor: 'rgba(83, 90, 255, 0.75)',
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8
    },
    progressLabel: { fontSize: 11, color: '#aaa', fontWeight: '500', marginTop: 2 },
    episodeInfo: { fontSize: 12, color: '#aaa', fontWeight: '500', marginTop: 2 },
    calendarSection: {
        marginBottom: 32,
        maxWidth: 780,
        alignSelf: 'center',
        width: '100%',
        paddingHorizontal: 16
    },
    calendarSectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255, 255, 255, 0.08)'
    },
    calendarSectionTitle: { fontSize: 20, fontWeight: '500', color: '#fff' },
    calendarSectionDate: { fontSize: 14, color: '#ccc', fontWeight: '500' },
    calendarTypeOverlay: { position: 'absolute', top: 6, right: 6 },
    calendarTypeBadgeSmall: { paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
    calendarTypeBadgeSmallText: { fontSize: 10, fontWeight: '600', color: '#fff' },
    movieBadge: {
        backgroundColor: 'rgba(255, 193, 7, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(255, 193, 7, 0.3)'
    },
    episodeBadge: {
        backgroundColor: 'rgba(83, 90, 255, 0.15)',
        borderWidth: 1,
        borderColor: 'rgba(83, 90, 255, 0.3)'
    },
    emptyDayContainer: {
        padding: 20,
        alignItems: 'center',
        backgroundColor: 'rgba(255, 255, 255, 0.02)',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.04)',
        borderStyle: 'dashed'
    },
    emptyDayText: { fontSize: 14, color: '#666', fontStyle: 'italic', fontWeight: '500' }
});

export default TraktScreen;