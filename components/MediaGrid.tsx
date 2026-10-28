import React, { useCallback, useEffect, useState } from 'react';
import {
    Image,
    Platform,
    Pressable,
    Share,
    StyleSheet,
    useWindowDimensions,
    View as RNView,
} from 'react-native';
import { MenuView, type MenuAction } from '@expo/ui/community/menu';
import { Button as NativeButton, Column as NativeColumn, RNHostView, Row as NativeRow, Text as NativeText } from '@expo/ui';
import { Ionicons } from '@expo/vector-icons';
import { ActivityIndicator, StatusBar, Text, View } from '@/components/Themed';
import { WebMenu } from '@/components/WebMenuView';
import PosterArtwork from '@/components/PosterArtwork';
import { useRouter } from 'expo-router';
import { getYear } from '@/utils/Date';
import { SafeAreaView, useSafeAreaInsets, type Edge } from 'react-native-safe-area-context';
import { useTheme } from '@/context/ThemeContext';
import { libraryService } from '@/utils/LibraryService';
import { showAlert } from '@/utils/platform';
import NativeStackList from '@/components/native-stack-list';
import { spacing, typography } from '@/constants/theme';

const EXPO_PUBLIC_TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

interface MediaGridProps {
    apiUrl?: string;
    detailsPath: '/movie/details' | '/series/details';
    items?: MediaGridItem[];
    compact?: boolean;
    safeAreaEdges?: Edge[];
}

export interface MediaGridItem {
    tmdbid: number;
    name: string;
    year: string;
    poster: string;
    background: string;
    imdbRating?: string;
    imdbid?: string;
    genres: string[];
    type?: 'movie' | 'series';
    popularity?: number;
}

interface TMDBMediaItem {
    id: number;
    title?: string;
    name?: string;
    poster_path?: string | null;
    backdrop_path?: string | null;
    release_date?: string;
    first_air_date?: string;
    vote_average?: number;
    imdb_id?: string;
    genre_ids?: number[];
}

export const GENRE_NAMES: Record<number, string> = {
    12: 'Adventure',
    14: 'Fantasy',
    16: 'Animation',
    18: 'Drama',
    27: 'Horror',
    28: 'Action',
    35: 'Comedy',
    36: 'History',
    37: 'Western',
    53: 'Thriller',
    80: 'Crime',
    99: 'Documentary',
    10402: 'Music',
    9648: 'Mystery',
    10749: 'Romance',
    10751: 'Family',
    10752: 'War',
    10759: 'Action & Adventure',
    10762: 'Kids',
    10763: 'News',
    10764: 'Reality',
    10765: 'Sci-Fi & Fantasy',
    10766: 'Soap',
    10767: 'Talk',
    10768: 'War & Politics',
    10770: 'TV Movie',
    878: 'Science Fiction',
};

const MEDIA_MENU_ACTIONS: MenuAction[] = [
    { id: 'open', title: 'Go to Show', image: 'arrow.up.right' },
    { id: 'watchlist', title: 'Add to Watchlist', image: 'bookmark' },
    { id: 'share', title: 'Share Show', image: 'square.and.arrow.up' },
];

const WEB_MENU_ACTIONS = MEDIA_MENU_ACTIONS.map(({ id, title }) => ({
    id: id ?? title,
    title,
}));

const ROW_HORIZONTAL_PADDING = 16;
const POSTER_WIDTH = 88;
const POSTER_TEXT_GAP = 16;
const MENU_ACTION_WIDTH = 56;

const MediaGrid: React.FC<MediaGridProps> = ({
    apiUrl,
    detailsPath,
    items,
    compact = false,
    safeAreaEdges = ['left', 'right', 'bottom'],
}) => {
    const { colors } = useTheme();
    const router = useRouter();
    const { width } = useWindowDimensions();
    const insets = useSafeAreaInsets();
    const [data, setData] = useState<MediaGridItem[]>([]);
    const [loading, setLoading] = useState(true);
    const rowWidth = Math.max(0, width - insets.left - insets.right);
    const posterWidth = compact ? 64 : POSTER_WIDTH;
    const posterHeight = compact ? 96 : 132;
    const posterTextGap = compact ? 12 : POSTER_TEXT_GAP;
    const rowHorizontalPadding = compact ? 24 : ROW_HORIZONTAL_PADDING;
    const menuActionWidth = compact ? 40 : MENU_ACTION_WIDTH;
    const mediaButtonWidth = Math.max(
        0,
        rowWidth - rowHorizontalPadding * 2 - menuActionWidth,
    );
    const mediaInfoWidth = Math.max(
        0,
        mediaButtonWidth - posterWidth - posterTextGap,
    );

    useEffect(() => {
        if (items !== undefined) return;
        if (!apiUrl) {
            setLoading(false);
            return;
        }
        const fetchData = async () => {
            try {
                const separator = apiUrl.includes('?') ? '&' : '?';
                const response = await fetch(`${apiUrl}${separator}api_key=${EXPO_PUBLIC_TMDB_API_KEY}`);
                const result = await response.json();
                if (result?.results) {
                    setData(result.results
                        .filter((item: TMDBMediaItem) => item.poster_path && item.backdrop_path)
                        .map((item: TMDBMediaItem) => ({
                            tmdbid: item.id,
                            name: item.title || item.name || '',
                            year: getYear(item.release_date || item.first_air_date || ''),
                            poster: `https://image.tmdb.org/t/p/w342${item.poster_path}`,
                            background: `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`,
                            imdbRating: item.vote_average?.toFixed(1),
                            imdbid: item.imdb_id,
                            type: detailsPath === '/movie/details' ? 'movie' : 'series',
                            genres: (item.genre_ids ?? [])
                                .map((genreId) => GENRE_NAMES[genreId])
                                .filter((genre): genre is string => Boolean(genre)),
                        })));
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [apiUrl, detailsPath, items]);

    const openDetails = useCallback((item: MediaGridItem) => {
        const type = item.type ?? (detailsPath === '/movie/details' ? 'movie' : 'series');
        router.push({
            pathname: type === 'movie' ? '/movie/details' : '/series/details',
            params: { tmdbid: item.tmdbid },
        });
    }, [detailsPath, router]);

    const handleMenuAction = useCallback(async (actionId: string, item: MediaGridItem) => {
        if (actionId === 'open') {
            openDetails(item);
            return;
        }

        if (actionId === 'watchlist') {
            const type = item.type ?? (detailsPath === '/movie/details' ? 'movie' : 'series');
            const added = await libraryService.addToLibrary({
                id: `${type}-${item.tmdbid}`,
                tmdbid: String(item.tmdbid),
                type,
                title: item.name,
                poster: item.poster,
                backdrop: item.background,
                year: item.year,
                rating: item.imdbRating,
                genres: item.genres,
            });
            if (!added) {
                showAlert('Watchlist', 'This title could not be added. It may already be in your watchlist.');
            }
            return;
        }

        if (actionId === 'share') {
            const type = (item.type ?? (detailsPath === '/movie/details' ? 'movie' : 'series')) === 'movie'
                ? 'movie'
                : 'tv';
            const url = `https://www.themoviedb.org/${type}/${item.tmdbid}`;
            try {
                await Share.share({ message: `${item.name}\n${url}`, url });
            } catch (error) {
                console.error('Error sharing title:', error);
                showAlert('Share', 'Unable to share this title.');
            }
        }
    }, [detailsPath, openDetails]);

    const renderItem = useCallback((item: MediaGridItem) => {
        const genreMetadata = item.genres.length > 0
            ? item.genres.join(' · ')
            : [item.year?.split('–')[0], item.imdbRating ? `★ ${item.imdbRating}` : undefined]
                .filter(Boolean)
                .join(' · ');
        const metadata = compact
            ? [
                item.type === 'series' ? 'TV Show' : 'Movie',
                genreMetadata,
                item.year?.split('–')[0],
            ].filter(Boolean).join(' · ')
            : genreMetadata;
        const menuButton = (
            <Pressable
                accessibilityRole="button"
                accessibilityLabel={`More actions for ${item.name}`}
                hitSlop={10}
                style={styles.menuButton}
            >
                <Ionicons name="ellipsis-horizontal" size={21} color={colors.text} />
            </Pressable>
        );

        const menu = Platform.OS === 'web' ? (
            <WebMenu
                title={item.name}
                actions={WEB_MENU_ACTIONS}
                onPressAction={(actionId) => void handleMenuAction(actionId, item)}
            >
                {menuButton}
            </WebMenu>
        ) : (
            <MenuView
                title={item.name}
                actions={MEDIA_MENU_ACTIONS}
                shouldOpenOnLongPress={false}
                colorScheme="dark"
                onPressAction={({ nativeEvent }) => void handleMenuAction(nativeEvent.event, item)}
            >
                {menuButton}
            </MenuView>
        );

        return (
            <NativeColumn style={{ width: rowWidth }}>
                <NativeRow
                    alignment="start"
                    spacing={posterTextGap}
                    style={{ width: rowWidth, paddingHorizontal: rowHorizontalPadding, paddingVertical: compact ? 10 : 12 }}
                >
                    <NativeButton
                        variant="text"
                        onPress={() => openDetails(item)}
                        style={{ width: mediaButtonWidth }}
                    >
                        <NativeRow alignment="start" spacing={posterTextGap}>
                            <RNHostView matchContents>
                                <PosterArtwork key={item.poster ?? 'placeholder'} style={[
                                    styles.posterFrame,
                                    { width: posterWidth, height: posterHeight },
                                ]}>
                                    {(onImageLoad) => item.poster ? (
                                        <Image
                                            source={{ uri: item.poster }}
                                            onLoad={onImageLoad}
                                            style={[
                                                styles.poster,
                                                { width: posterWidth, height: posterHeight, backgroundColor: colors.backgroundOverlay },
                                            ]}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <RNView style={[
                                            styles.posterPlaceholder,
                                            { width: posterWidth, height: posterHeight, backgroundColor: colors.backgroundOverlay },
                                        ]}>
                                            <Ionicons name="film-outline" size={compact ? 20 : 30} color={colors.textDim} />
                                        </RNView>
                                    )}
                                </PosterArtwork>
                            </RNHostView>
                            <NativeColumn alignment="start" spacing={compact ? 3 : 7} style={{ width: mediaInfoWidth, paddingTop: spacing.xs }}>
                                <NativeText textStyle={compact ? styles.compactMediaTitle : styles.mediaTitle}>
                                    {item.name}
                                </NativeText>
                                {metadata.length > 0 && (
                                    <NativeText textStyle={{
                                        ...(compact ? styles.compactMediaMetadata : styles.mediaMetadata),
                                        color: `${colors.text}CC`,
                                    }}>
                                        {metadata}
                                    </NativeText>
                                )}
                            </NativeColumn>
                        </NativeRow>
                    </NativeButton>
                    <RNHostView matchContents>
                        <RNView style={[styles.menuActionSlot, { width: menuActionWidth, minWidth: menuActionWidth }]}>{menu}</RNView>
                    </RNHostView>
                </NativeRow>
                <RNHostView matchContents>
                    <RNView style={[
                        styles.divider,
                        compact
                            ? { width: rowWidth - rowHorizontalPadding * 2, marginHorizontal: rowHorizontalPadding }
                            : { width: rowWidth },
                    ]} />
                </RNHostView>
            </NativeColumn>
        );
    }, [
        colors.backgroundOverlay,
        colors.textMuted,
        compact,
        handleMenuAction,
        mediaButtonWidth,
        mediaInfoWidth,
        menuActionWidth,
        openDetails,
        posterHeight,
        posterTextGap,
        posterWidth,
        rowHorizontalPadding,
        rowWidth,
    ]);

    return (
        <SafeAreaView edges={safeAreaEdges} style={styles.container}>
            <StatusBar />
            {items === undefined && loading ? (
                <View style={styles.centeredContainer}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading content...</Text>
                </View>
            ) : (items ?? data).length === 0 ? (
                <View style={styles.centeredContainer}>
                    <Text style={styles.loadingText}>No titles found.</Text>
                </View>
            ) : (
                <NativeStackList
                    data={items ?? data}
                    axis="vertical"
                    nativeItems
                    keyExtractor={(item) => String(item.tmdbid)}
                    renderItem={renderItem}
                    style={styles.listContent}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    listContent: { flex: 1, paddingTop: spacing.sm, paddingBottom: spacing.lg },
    poster: {
        width: 88,
        height: 132,
    },
    posterFrame: {
        width: 88,
        height: 132,
    },
    mediaTitle: {
        ...typography.headline,
    },
    compactMediaTitle: {
        ...typography.body,
    },
    mediaMetadata: {
        ...typography.subhead,
    },
    compactMediaMetadata: {
        ...typography.caption,
    },
    divider: {
        height: StyleSheet.hairlineWidth,
        backgroundColor: 'rgba(255,255,255,0.12)',
    },
    menuButton: {
        width: 40,
        minWidth: 40,
        minHeight: 48,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuActionSlot: {
        flexShrink: 0,
        alignItems: 'center',
        justifyContent: 'center',
    },
    posterPlaceholder: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    centeredContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: spacing.lg, gap: spacing.md },
    loadingText: { ...typography.body, textAlign: 'center', opacity: 0.7 },
});

export default MediaGrid;
