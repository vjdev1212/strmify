import OpenSubtitlesClient from "@/clients/opensubtitles";
import { Subtitle, Chapter, MediaPlayer } from "@/components/MediaPlayer";
import { StorageKeys, storageService } from "@/utils/StorageService";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform } from "react-native";

const MediaPlayerScreen: React.FC = () => {
  const router = useRouter();
  const { videoUrl, title, imdbid, type, season, episode } = useLocalSearchParams();
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [isLoadingSubtitles, setIsLoadingSubtitles] = useState(true);
  const [openSubtitlesClient, setOpenSubtitlesClient] = useState<OpenSubtitlesClient | null>(null);
  const chapters: Chapter[] = [];
  const artwork = `https://images.metahub.space/background/medium/${imdbid}/img`;

  useEffect(() => {
    initializeClient();
  }, []);

  useEffect(() => {
    if (openSubtitlesClient) {
      fetchSubtitles();
    }
  }, [imdbid, type, season, episode, openSubtitlesClient]);

  const initializeClient = async () => {
    try {
      const userAgent = await storageService.getItem(StorageKeys.OPENSUBTITLES_USER_AGENT) || 'Strmify';
      const apiKey = await storageService.getItem(StorageKeys.OPENSUBTITLES_API_KEY) || '';

      const client = new OpenSubtitlesClient(userAgent, apiKey);
      setOpenSubtitlesClient(client);
    } catch (error) {
      console.error('Failed to initialize OpenSubtitles client:', error);
      // Fallback to default client
      const client = new OpenSubtitlesClient('Strmify', '');
      setOpenSubtitlesClient(client);
    }
  };

  const fetchSubtitles = async () => {
    if (!imdbid || !openSubtitlesClient) {
      setIsLoadingSubtitles(false);
      return;
    }

    try {
      setIsLoadingSubtitles(true);
      let response;

      // Check if it's a TV show episode
      if (type === 'tvshow' && season && episode) {
        response = await openSubtitlesClient.searchTVSubtitles(
          imdbid as string,
          parseInt(season as string),
          parseInt(episode as string),
          ['en', 'es', 'fr', 'de', 'it', 'pt'], // Multiple languages
          {
            format: 'srt',
            ai_translated: 'include',
            machine_translated: 'include',
            trusted_sources: 'include',
            hearing_impaired: 'include'
          }
        );
      } else {
        // For movies
        response = await openSubtitlesClient.searchMovieSubtitles(
          imdbid as string,
          ['en', 'es', 'fr', 'de', 'it', 'pt'], // Multiple languages
          {
            format: 'srt',
            ai_translated: 'include',
            machine_translated: 'include',
            trusted_sources: 'include',
            hearing_impaired: 'include'
          }
        );
      }

      if (response.success) {
        if (response.data.length === 0) {
          setSubtitles([]);
          setIsLoadingSubtitles(false);
          return;
        }
        const sortedData = response.data.sort((a, b) => b.download_count - a.download_count);
        console.log('Fetched subtitles:', sortedData);

        const transformedSubtitles: Subtitle[] = sortedData.map((subtitle) => ({
          language: subtitle.language,
          url: subtitle.url,
          label: `${getLanguageName(subtitle.language)} - ${subtitle.name}`
        }));

        setSubtitles(transformedSubtitles);
      } else {
        console.error('Failed to fetch subtitles:', response.error);

        if (response.error.includes('You cannot consume this service')) {
          console.error('Authentication issue: Please check your API key or registration status');
        }

        setSubtitles([]);
      }
    } catch (error) {
      console.error('Error fetching subtitles:', error);
      setSubtitles([]);
    } finally {
      setIsLoadingSubtitles(false);
    }
  };

  // Helper function to get language name from language code
  const getLanguageName = (languageCode: string): string => {
    const languageMap: { [key: string]: string } = {
      'en': 'English',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'it': 'Italian',
      'pt': 'Portuguese',
      'zh': 'Chinese',
      'ja': 'Japanese',
      'ko': 'Korean',
      'ru': 'Russian',
      'ar': 'Arabic',
      'hi': 'Hindi',
      'nl': 'Dutch',
      'sv': 'Swedish',
      'da': 'Danish',
      'no': 'Norwegian',
      'fi': 'Finnish',
      'pl': 'Polish',
      'cs': 'Czech',
      'hu': 'Hungarian',
      'ro': 'Romanian',
      'bg': 'Bulgarian',
      'hr': 'Croatian',
      'sk': 'Slovak',
      'sl': 'Slovenian',
      'et': 'Estonian',
      'lv': 'Latvian',
      'lt': 'Lithuanian',
      'el': 'Greek',
      'tr': 'Turkish',
      'he': 'Hebrew',
      'th': 'Thai',
      'vi': 'Vietnamese',
      'id': 'Indonesian',
      'ms': 'Malay',
      'tl': 'Filipino',
      'uk': 'Ukrainian',
      'be': 'Belarusian',
      'ka': 'Georgian',
      'hy': 'Armenian',
      'az': 'Azerbaijani',
      'kk': 'Kazakh',
      'ky': 'Kyrgyz',
      'uz': 'Uzbek',
      'tj': 'Tajik',
      'mn': 'Mongolian',
      'my': 'Burmese',
      'km': 'Khmer',
      'lo': 'Lao',
      'si': 'Sinhala',
      'ta': 'Tamil',
      'te': 'Telugu',
      'ml': 'Malayalam',
      'kn': 'Kannada',
      'bn': 'Bengali',
      'gu': 'Gujarati',
      'pa': 'Punjabi',
      'ur': 'Urdu',
      'fa': 'Persian',
      'ps': 'Pashto',
      'sw': 'Swahili',
      'am': 'Amharic',
      'ha': 'Hausa',
      'ig': 'Igbo',
      'yo': 'Yoruba',
      'zu': 'Zulu',
      'af': 'Afrikaans'
    };

    return languageMap[languageCode] || languageCode.toUpperCase();
  };

  const handleBack = (): void => {
    router.back();
  };

  const Player =
    Platform.OS === "web"
      ? require("../../components/MediaPlayer").MediaPlayer
      : require("../../components/NativeMediaPlayer").NativeMediaPlayer;

  return (
    <Player
      videoUrl={videoUrl as string}
      title={title as string}
      onBack={handleBack}
      artwork={artwork as string}
      subtitles={subtitles}
      chapters={chapters}
      isLoadingSubtitles={isLoadingSubtitles}
    />
  );
};

export default MediaPlayerScreen;