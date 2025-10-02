import OpenSubtitlesClient, { SubtitleResult } from "@/clients/opensubtitles";
import { Subtitle } from "@/components/nativeplayer/models";
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

      if (apiKey && apiKey.trim() !== '') {
        const client = new OpenSubtitlesClient(userAgent, apiKey);
        setOpenSubtitlesClient(client);
      } else {
        console.log('No API key provided, subtitles will not be loaded');
        setOpenSubtitlesClient(null);
        setSubtitles([]);
        setIsLoadingSubtitles(false);
      }
    } catch (error) {
      console.error('Failed to initialize OpenSubtitles client:', error);
      setOpenSubtitlesClient(null);
      setSubtitles([]);
      setIsLoadingSubtitles(false);
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
      if (type === 'series' && season && episode) {
        response = await openSubtitlesClient.searchTVSubtitles(
          imdbid as string,
          parseInt(season as string),
          parseInt(episode as string),
          'episode',
          ['en'],
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
          'movie',
          ['en'],
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

        const transformedSubtitles: Subtitle[] = sortedData.map((subtitle: SubtitleResult) => ({
          fileId: subtitle.file_id,
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

  function getPlayer(videoUrl: string) {
    if (Platform.OS === "web") {
      return require("../../components/nativeplayer").MediaPlayer;
    }

    // if (videoUrl.toLowerCase().endsWith(".mkv")) {
    //   return require("../../components/vlcplayer").MediaPlayer;
    // }

    return require("../../components/vlcplayer").MediaPlayer;
  }

  const Player = getPlayer(videoUrl as string);

  return (
    <Player
      videoUrl={videoUrl as string}
      title={title as string}
      onBack={handleBack}
      artwork={artwork as string}
      subtitles={subtitles}
      openSubtitlesClient={openSubtitlesClient}
      isLoadingSubtitles={isLoadingSubtitles}
    />
  );
};

export default MediaPlayerScreen;