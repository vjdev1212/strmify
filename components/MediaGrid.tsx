import React, { useEffect, useState } from 'react';
import {
    FlatList,
    Image,
    StyleSheet,
    Pressable,
    useWindowDimensions,
} from 'react-native';
import { ActivityIndicator, StatusBar, Text, View } from '@/components/Themed';
import { useRouter } from 'expo-router';
import { getYear } from '@/utils/Date';
import { SafeAreaView } from 'react-native-safe-area-context';
import BottomSpacing from './BottomSpacing';

const EXPO_PUBLIC_TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

interface MediaGridProps {
    apiUrl: string;
    detailsPath: '/movie/details' | '/series/details';
}

const MediaGrid: React.FC<MediaGridProps> = ({ apiUrl, detailsPath }) => {
    const router = useRouter();
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const { width, height } = useWindowDimensions();
    const isPortrait = height >= width;
    const shortSide = Math.min(width, height);

    const isMobile = shortSide < 580;
    const isTablet = shortSide >= 580 && shortSide < 1024;
    const isLaptop = shortSide >= 1024 && shortSide < 1440;
    const isDesktop = shortSide >= 1440;

    const getNumColumns = () => {
        if (isMobile) return isPortrait ? 3 : 5;
        if (isTablet) return isPortrait ? 5 : 8;
        if (isLaptop) return isPortrait ? 6 : 9;
        if (isDesktop) return isPortrait ? 7 : 10;
        return 5;
    };

    const numColumns = getNumColumns();
    const spacing = isMobile ? 12 : 16;

    useEffect(() => {
        const fetchData = async () => {
            try {
                const separator = apiUrl.includes('?') ? '&' : '?';
                const response = await fetch(`${apiUrl}${separator}api_key=${EXPO_PUBLIC_TMDB_API_KEY}`);
                const result = await response.json();
                if (result?.results) {
                    const list = result.results
                        .filter((item: any) => item.poster_path && item.backdrop_path)
                        .map((item: any) => ({
                            moviedbid: item.id,
                            name: item.title || item.name,
                            year: getYear(item.release_date || item.first_air_date),
                            poster: `https://image.tmdb.org/t/p/w780${item.poster_path}`,
                            background: `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`,
                            imdbRating: item.vote_average?.toFixed(1),
                            imdbid: item.imdb_id,
                        }));
                    setData(list);
                }
            } catch (error) {
                console.error('Error fetching data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [apiUrl]);

    const renderItem = ({ item }: { item: any }) => {
        const year = item.year?.split('–')[0] || item.year;

        const handlePress = () => {
            router.push({
                pathname: detailsPath,
                params: { moviedbid: item.moviedbid || item.id },
            });
        };

        return (
            <Pressable
                style={({ pressed }) => [
                    styles.posterContainer,
                    {
                        flexBasis: `${100 / numColumns}%`,
                        paddingHorizontal: spacing / 2,
                        opacity: pressed ? 0.7 : 1,
                    },
                ]}
                onPress={handlePress}
            >
                <View style={styles.imageContainer}>
                    <Image
                        source={{ uri: item.poster }}
                        style={styles.posterImage}
                        resizeMode="cover"
                    />
                </View>
                <View style={styles.infoContainer}>
                    <Text numberOfLines={2} ellipsizeMode="tail" style={styles.posterTitle}>
                        {item.name}
                    </Text>
                    <Text style={styles.posterYear}>{year}</Text>
                </View>
            </Pressable>
        );
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar />
            {loading ? (
                <View style={styles.centeredContainer}>
                    <ActivityIndicator size="large" color="#535aff" />
                    <Text style={styles.loadingText}>Loading content...</Text>
                </View>
            ) : (
                <FlatList
                    data={data}
                    renderItem={renderItem}
                    keyExtractor={(_, index) => index.toString()}
                    numColumns={numColumns}
                    key={numColumns}
                    columnWrapperStyle={{ paddingHorizontal: spacing / 2 }}
                    contentContainerStyle={[styles.listContent, { paddingBottom: 30 }]}
                    showsVerticalScrollIndicator={false}
                />
            )}                        
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        marginTop: 30
    },
    listContent: {
        paddingTop: 8,
    },
    posterContainer: {
        marginBottom: 24,
    },
    imageContainer: {
        position: 'relative',
        width: '100%',
        aspectRatio: 2 / 3,
        borderRadius: 12,
        overflow: 'hidden',
        backgroundColor: '#1a1a1a',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
    posterImage: {
        width: '100%',
        height: '100%',
    },
    infoContainer: {
        marginTop: 10,
        paddingHorizontal: 2,
        gap: 4,
    },
    posterTitle: {
        fontSize: 14,
        fontWeight: '600',
        lineHeight: 18,
    },
    posterYear: {
        fontSize: 12,
        color: '#999',
        fontWeight: '500',
    },
    centeredContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        gap: 16,
    },
    loadingText: {
        fontSize: 16,
        textAlign: 'center',
        opacity: 0.7,
    },
});

export default MediaGrid;