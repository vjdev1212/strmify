import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    FlatList,
    Dimensions,
    TouchableOpacity,
    StyleSheet,
    Image,
    ImageBackground,
} from 'react-native';
import { ActivityIndicator, Text } from '@/components/Themed';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { getYear } from '@/utils/Date';
import { Colors } from '@/constants/theme';

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
    moviedbid: number;
}

interface AppleTVCarouselProps {
    filter?: 'all' | 'movies' | 'series';
    onItemPress?: (item: CarouselItem) => void;
    autoPlay?: boolean;
    autoPlayInterval?: number;
}

export default function AppleTVCarousel({
    filter = 'all',
    onItemPress,
    autoPlay = true,
    autoPlayInterval = 5000
}: AppleTVCarouselProps) {
    const [activeIndex, setActiveIndex] = useState(0);
    const [data, setData] = useState<CarouselItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [dimensions, setDimensions] = useState(() => {
        const { width, height } = Dimensions.get('window');
        return { width, height, isLandscape: width > height };
    });

    const flatListRef = useRef<FlatList>(null);
    const autoPlayRef = useRef<any>(null);

    useEffect(() => {
        const subscription = Dimensions.addEventListener('change', ({ window }) => {
            setDimensions({
                width: window.width,
                height: window.height,
                isLandscape: window.width > window.height
            });
        });
        return () => subscription?.remove();
    }, []);

    const getResponsiveDimensions = () => {
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
    };

    const responsiveDims = getResponsiveDimensions();

    useEffect(() => {
        const fetchCarouselData = async () => {
            try {
                const { isLandscape } = dimensions;
                setLoading(true);
                const promises: Promise<any>[] = [];

                if (filter === 'all' || filter === 'movies') {
                    promises.push(
                        fetch(`https://api.themoviedb.org/3/trending/movie/week?api_key=${EXPO_PUBLIC_TMDB_API_KEY}`).then(r => r.json()),
                    );
                }

                if (filter === 'all' || filter === 'series') {
                    promises.push(
                        fetch(`https://api.themoviedb.org/3/trending/tv/week?api_key=${EXPO_PUBLIC_TMDB_API_KEY}`).then(r => r.json()),
                    );
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
                                moviedbid: item.id,
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
                    const nextIndex = (prevIndex + 1) % data.length;
                    flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
                    return nextIndex;
                });
            }, autoPlayInterval);
        }
        return () => {
            if (autoPlayRef.current) {
                clearInterval(autoPlayRef.current);
                autoPlayRef.current = null;
            }
        };
    }, [autoPlay, autoPlayInterval, data.length]);

    const handleScroll = (event: any) => {
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollPosition / responsiveDims.itemWidth);
        if (index !== activeIndex && index >= 0 && index < data.length) {
            setActiveIndex(index);
        }
    };

    const handleItemPress = (item: CarouselItem) => {
        if (autoPlayRef.current) {
            clearInterval(autoPlayRef.current);
            autoPlayRef.current = null;
        }
        onItemPress?.(item);
    };

    const scrollToIndex = (index: number) => {
        if (flatListRef.current && index >= 0 && index < data.length) {
            flatListRef.current.scrollToIndex({ index, animated: true, viewPosition: 0 });
            setActiveIndex(index);
            if (autoPlayRef.current) {
                clearInterval(autoPlayRef.current);
                autoPlayRef.current = null;
            }
        }
    };

    const renderCarouselItem = ({ item, index }: { item: CarouselItem; index: number }) => {
        const dims = responsiveDims;
        return (
            <View style={[styles.carouselItem, { width: dims.itemWidth, height: dims.carouselHeight }]}>
                <TouchableOpacity
                    style={styles.carouselTouchable}
                    onPress={() => handleItemPress(item)}
                    activeOpacity={0.9}
                >
                    <ImageBackground
                        key={`${item.id}-${index}`}
                        source={{ uri: item.backdropUrl || item.posterUrl }}
                        style={styles.backdropImage}
                        resizeMode="cover"
                    >
                        <LinearGradient
                            colors={Colors.gradientOverlay as any}
                            style={styles.gradient}
                        />

                        <View style={[styles.contentContainer, {
                            paddingHorizontal: dims.contentPadding,
                            paddingBottom: dims.bottomPadding,
                            flexDirection: 'row',
                        }]}>
                            <View style={[styles.textContainer, { flex: 1 }]}>
                                <Text style={[styles.title, { fontSize: dims.titleSize }]} numberOfLines={1}>
                                    {item.title}
                                </Text>
                                {item.subtitle && (
                                    <Text
                                        style={[styles.subtitle, { fontSize: dims.subtitleSize }]}
                                        numberOfLines={dimensions.isLandscape ? 2 : 2}
                                    >
                                        {item.subtitle}
                                    </Text>
                                )}
                                <View style={[styles.metaContainer, {
                                    flexDirection: 'row',
                                    alignItems: dimensions.isLandscape ? 'flex-start' : 'center',
                                    gap: dimensions.isLandscape ? 8 : 0,
                                }]}>
                                    <Text style={[styles.metaText, { fontSize: dimensions.isLandscape ? 12 : 14 }]}>
                                        ★ {item.rating}   {item.year}
                                    </Text>
                                    <View style={styles.typeIndicator}>
                                        <Text style={[styles.typeText, { fontSize: dimensions.isLandscape ? 10 : 12 }]}>
                                            {item.type === 'movie' ? 'MOVIE' : 'SERIES'}
                                        </Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </ImageBackground>
                </TouchableOpacity>
            </View>
        );
    };

    const renderPaginationDot = (index: number) => (
        <TouchableOpacity
            key={`dot-${index}`}
            style={[
                styles.paginationDot,
                activeIndex === index && styles.paginationDotActive
            ]}
            onPress={() => scrollToIndex(index)}
        />
    );

    if (loading || !data.length) {
        return (
            <View style={[styles.container, styles.loadingContainer, { height: responsiveDims.carouselHeight }]}>
                <ActivityIndicator color={Colors.primary} />
            </View>
        );
    }

    return (
        <View style={[styles.container, { height: responsiveDims.carouselHeight }]}>
            <FlatList
                ref={flatListRef}
                data={data}
                renderItem={renderCarouselItem}
                keyExtractor={(item, index) => `${item.id}-${index}`}
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onMomentumScrollEnd={handleScroll}
                decelerationRate="fast"
                snapToInterval={responsiveDims.itemWidth}
                snapToAlignment="start"
                style={styles.carousel}
                removeClippedSubviews={false}
                initialNumToRender={3}
                maxToRenderPerBatch={3}
                windowSize={5}
                getItemLayout={(data, index) => ({
                    length: responsiveDims.itemWidth,
                    offset: responsiveDims.itemWidth * index,
                    index,
                })}
            />

            {data.length > 1 && (
                <View style={[styles.paginationContainer, {
                    bottom: dimensions.isLandscape ? 15 : 20,
                    left: dimensions.isLandscape ? 35 : 20,
                }]}>
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
    container: {
        position: 'relative',
        backgroundColor: Colors.backgroundOverlay,
    },
    carousel: {
        flex: 1,
    },
    carouselItem: {
        marginBottom: 10
    },
    carouselTouchable: {
        flex: 1,
    },
    backdropImage: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    gradient: {
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
    },
    contentContainer: {
        alignItems: 'flex-end',
        zIndex: 1,
    },
    textContainer: {
        justifyContent: 'flex-end',
        paddingBottom: 10,
    },
    title: {
        fontWeight: '700',
        color: Colors.text,
        marginBottom: 6,
        textShadowColor: 'rgba(0,0,0,0.8)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    subtitle: {
        color: Colors.textMuted,
        lineHeight: 22,
        textShadowColor: 'rgba(0,0,0,0.6)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
        maxWidth: 600
    },
    metaContainer: {
        justifyContent: 'space-between',
        marginTop: 10,
    },
    metaText: {
        color: Colors.text,
        fontWeight: '500',
    },
    typeIndicator: {
        backgroundColor: Colors.primaryMuted,
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: Colors.primaryBorder,
    },
    typeText: {
        fontWeight: '600',
        color: Colors.text,
        letterSpacing: 1,
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: Colors.background,
    },
    paginationContainer: {
        position: 'absolute',
        borderRadius: 20,
        overflow: 'hidden'
    },
    paginationBlur: {
        paddingHorizontal: 8,
        paddingVertical: 8,
    },
    paginationDots: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: Colors.primaryMuted,
        marginHorizontal: 4,
    },
    paginationDotActive: {
        backgroundColor: Colors.primary,
        width: 12,
        height: 8,
        borderRadius: 4,
    },
});