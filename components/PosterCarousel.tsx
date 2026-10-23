import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    View,
    Dimensions,
    StyleSheet,
    ImageBackground,
    Pressable,
} from 'react-native';
import type { ScaledSize } from 'react-native';
import { ActivityIndicator, Text } from '@/components/Themed';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { getYear } from '@/utils/Date';
import { useTheme } from '@/context/ThemeContext';
import NativePager from '@/components/native-pager';
import { NativeButton } from '@/components/native-ui-controls';

const EXPO_PUBLIC_TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

interface CarouselItem {
    id: string;
    title: string;
    subtitle?: string;
    posterUrl: string;
    backdropUrl: string;
    type: 'movie' | 'series';
    year: string;
    rating: string;
    tmdbid: number;
}

interface AppleTVCarouselProps {
    filter?: 'all' | 'movies' | 'series';
    onItemPress?: (item: CarouselItem) => void;
    autoPlay?: boolean;
    autoPlayInterval?: number;
    topInset?: number;
}

export default function AppleTVCarousel({
    filter = 'all',
    onItemPress,
    autoPlay = true,
    autoPlayInterval = 5000,
    topInset = 0,
}: AppleTVCarouselProps) {
    const { colors } = useTheme();
    const [activeIndex, setActiveIndex] = useState(0);
    const [data, setData] = useState<CarouselItem[]>([]);
    const [loading, setLoading] = useState(true);
    const touchStartRef = useRef<{ pageX: number; pageY: number } | null>(null);
    const didSwipeRef = useRef(false);
    const [dimensions, setDimensions] = useState(() => {
        const { width, height } = Dimensions.get('window');
        return { width, height, isLandscape: width > height };
    });

    const autoPlayRef = useRef<any>(null);

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window }: { window: ScaledSize }) => {
            setDimensions({ width: window.width, height: window.height, isLandscape: window.width > window.height });
        });
        return () => subscription?.remove();
    }, []);

    const responsiveDims = useMemo(() => {
        const { width, height, isLandscape } = dimensions;
        return {
            screenWidth: width,
            screenHeight: height,
            carouselHeight: isLandscape ? height * 0.9 : height * 0.5,
            itemWidth: width,
            posterWidth: isLandscape ? 180 : 120,
            posterHeight: isLandscape ? 270 : 120,
            titleSize: isLandscape ? 28 : 26,
            subtitleSize: isLandscape ? 14 : 14,
            contentPadding: isLandscape ? 40 : 20,
            bottomPadding: isLandscape ? 40 : 40,
        };
    }, [dimensions]);
    const carouselHeight = responsiveDims.carouselHeight + topInset;
    const carouselFrameStyle = {
        height: carouselHeight,
        marginTop: -topInset,
    };

    useEffect(() => {
        const fetchCarouselData = async () => {
            try {
                const { isLandscape } = dimensions;
                setLoading(true);
                const promises: Promise<any>[] = [];

                if (filter === 'all' || filter === 'movies') {
                    promises.push(fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${EXPO_PUBLIC_TMDB_API_KEY}`).then(r => r.json()));
                }
                if (filter === 'all' || filter === 'series') {
                    promises.push(fetch(`https://api.themoviedb.org/3/trending/tv/week?api_key=${EXPO_PUBLIC_TMDB_API_KEY}`).then(r => r.json()));
                }

                const results = await Promise.all(promises);
                const allItems: any[] = [];

                results.forEach((result, index) => {
                    let type: 'movie' | 'series';
                    if (filter === 'movies') type = 'movie';
                    else if (filter === 'series') type = 'series';
                    else type = index === 0 ? 'movie' : 'series';

                    const items = result?.results?.slice(0, 5) || [];
                    items.forEach((item: any) => {
                        if (item.poster_path && item.backdrop_path) {
                            allItems.push({
                                id: `${type}-${item.id}`,
                                title: item.title || item.name,
                                subtitle: item.overview,
                                posterUrl: `https://image.tmdb.org/t/p/w780${item.poster_path}`,
                                backdropUrl: `https://image.tmdb.org/t/p/${isLandscape ? 'original' : 'w1280'}${item.backdrop_path}`,
                                type,
                                year: getYear(item.release_date || item.first_air_date),
                                rating: item.vote_average?.toFixed(1) || '0.0',
                                tmdbid: item.id,
                            });
                        }
                    });
                });

                const shuffled = allItems.sort(() => 0.5 - Math.random()).slice(0, 6);
                setData(shuffled);
            } catch (error) {
                console.error('Error fetching carousel data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchCarouselData();
    }, [filter]);

    useEffect(() => {
        if (autoPlay && data.length > 1) {
            autoPlayRef.current = setInterval(() => {
                setActiveIndex((prevIndex) => {
                    return (prevIndex + 1) % data.length;
                });
            }, autoPlayInterval);
        }
        return () => {
            if (autoPlayRef.current) { clearInterval(autoPlayRef.current); autoPlayRef.current = null; }
        };
    }, [autoPlay, autoPlayInterval, data.length]);

    const handleIndexChange = useCallback((index: number) => {
        if (index !== activeIndex && index >= 0 && index < data.length) setActiveIndex(index);
    }, [activeIndex, data.length]);

    const handleItemPress = useCallback((item: CarouselItem) => {
        if (autoPlayRef.current) { clearInterval(autoPlayRef.current); autoPlayRef.current = null; }
        onItemPress?.(item);
    }, [onItemPress]);

    const scrollToIndex = useCallback((index: number) => {
        if (index >= 0 && index < data.length) {
            setActiveIndex(index);
            if (autoPlayRef.current) { clearInterval(autoPlayRef.current); autoPlayRef.current = null; }
        }
    }, [data.length]);

    const renderCarouselItem = useCallback((item: CarouselItem, index: number) => {
        const dims = responsiveDims;
        return (
            <View style={[styles.carouselItem, { width: dims.itemWidth, height: dims.carouselHeight + topInset }]}>
                <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${item.title}`}
                    style={styles.carouselTouchable}
                    onTouchStart={(event) => {
                        touchStartRef.current = {
                            pageX: event.nativeEvent.pageX,
                            pageY: event.nativeEvent.pageY,
                        };
                        didSwipeRef.current = false;
                    }}
                    onTouchMove={(event) => {
                        const start = touchStartRef.current;
                        if (!start) return;

                        const { pageX, pageY } = event.nativeEvent;
                        if (Math.abs(pageX - start.pageX) > 10 || Math.abs(pageY - start.pageY) > 10) {
                            didSwipeRef.current = true;
                        }
                    }}
                    onPress={() => {
                        if (!didSwipeRef.current) handleItemPress(item);
                    }}
                >
                    <ImageBackground
                        key={`${item.id}-${index}`}
                        source={{ uri: item.backdropUrl || item.posterUrl }}
                        style={styles.backdropImage}
                        resizeMode="cover"
                    >
                        <LinearGradient
                            colors={colors.gradientOverlay as any}
                            style={styles.gradient}
                        />
                        <View style={[styles.contentContainer, { paddingHorizontal: dims.contentPadding, paddingBottom: dims.bottomPadding, flexDirection: 'row' }]}>
                            <View style={[styles.textContainer, { flex: 1 }]}>
                                <Text style={[styles.title, { fontSize: dims.titleSize, color: colors.text }]} numberOfLines={1}>
                                    {item.title}
                                </Text>
                                {item.subtitle && (
                                    <Text style={[styles.subtitle, { fontSize: dims.subtitleSize, color: colors.textMuted }]} numberOfLines={2}>
                                        {item.subtitle}
                                    </Text>
                                )}
                                <View style={[styles.metaContainer, { flexDirection: 'row', alignItems: dimensions.isLandscape ? 'flex-start' : 'center', gap: dimensions.isLandscape ? 8 : 0 }]}>
                                    <Text style={[styles.metaText, { fontSize: dimensions.isLandscape ? 12 : 14, color: colors.text }]}>
                                        ★ {item.rating}   {item.year}
                                    </Text>
                                    <View style={[styles.typeIndicator, { backgroundColor: colors.primaryMuted, borderColor: colors.primaryBorder }]}>
                                        <Text style={[styles.typeText, { fontSize: dimensions.isLandscape ? 10 : 12, color: colors.text }]}>
                                            {item.type === 'movie' ? 'MOVIE' : 'SERIES'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </ImageBackground>
                </Pressable>
            </View>
        );
    }, [colors.gradientOverlay, colors.primaryBorder, colors.primaryMuted, colors.text, colors.textMuted, dimensions.isLandscape, handleItemPress, responsiveDims, topInset]);

    const renderPaginationDot = useCallback((index: number) => (
        <NativeButton
            variant="text"
            key={`dot-${index}`}
            style={[
                styles.paginationDot,
                { backgroundColor: colors.primaryMuted },
                activeIndex === index && { backgroundColor: colors.primary, width: 12 },
            ]}
            onPress={() => scrollToIndex(index)}
            seedColor={colors.primary}
        />
    ), [activeIndex, colors.primary, colors.primaryMuted, scrollToIndex]);

    if (loading || !data.length) {
        return (
            <View style={[styles.container, styles.loadingContainer, carouselFrameStyle, { backgroundColor: colors.backgroundOverlay }]}>
                <ActivityIndicator color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, carouselFrameStyle, { backgroundColor: colors.backgroundOverlay }]}>
            <NativePager
                data={data}
                renderPage={renderCarouselItem}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                activeIndex={activeIndex}
                onIndexChange={handleIndexChange}
                style={{ width: responsiveDims.screenWidth, height: carouselHeight }}
            />
            {data.length > 1 && (
                <View style={styles.paginationContainer}>
                    <BlurView intensity={20} style={styles.paginationBlur}>
                        <View style={styles.paginationDots}>
                            {data.map((_, index) => renderPaginationDot(index))}
                        </View>
                    </BlurView>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { position: 'relative' },
    carouselItem: { marginBottom: 10 },
    carouselTouchable: { flex: 1 },
    backdropImage: { flex: 1, justifyContent: 'flex-end' },
    gradient: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    contentContainer: { alignItems: 'flex-end', zIndex: 1 },
    textContainer: { justifyContent: 'flex-end', paddingBottom: 10 },
    title: { fontWeight: '700', marginBottom: 6, textShadowColor: 'rgba(0,0,0,0.8)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4 },
    subtitle: { lineHeight: 22, textShadowColor: 'rgba(0,0,0,0.6)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2, maxWidth: 600 },
    metaContainer: { justifyContent: 'space-between', marginTop: 10 },
    metaText: { fontWeight: '500' },
    typeIndicator: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
    typeText: { fontWeight: '600', letterSpacing: 1 },
    loadingContainer: { justifyContent: 'center', alignItems: 'center' },
    paginationContainer: { position: 'absolute', left: 0, right: 0, bottom: 12, alignItems: 'center' },
    paginationBlur: { borderRadius: 20, overflow: 'hidden', paddingHorizontal: 8, paddingVertical: 8 },
    paginationDots: { flexDirection: 'row', alignItems: 'center' },
    paginationDot: { width: 8, height: 8, borderRadius: 4, marginHorizontal: 4 },
});
