import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { router } from 'expo-router';
import PersonDetailsSheet from '@/components/person-details-sheet';
import PersonDetailsContent from '@/components/person-details-content';
import type { Credit, Person } from '@/components/person-details-types';
import { useTheme } from '@/context/ThemeContext';

const EXPO_PUBLIC_TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;
const PROFILE_IMAGE_BASE = 'https://image.tmdb.org/t/p/w780';

interface PersonDetailsScreenProps {
  visible: boolean;
  personId: number | null;
  onClose: () => void;
}

export default function PersonDetailsScreen({ visible, personId, onClose }: PersonDetailsScreenProps) {
  const { colors } = useTheme();
  const [person, setPerson] = useState<Person | null>(null);
  const [castCredits, setCastCredits] = useState<Credit[]>([]);
  const [crewCredits, setCrewCredits] = useState<Credit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [profileImageLoading, setProfileImageLoading] = useState(true);
  const [profileImageError, setProfileImageError] = useState(false);
  const loadedPersonId = useRef<number | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    const loadPerson = async () => {
      if (!visible || personId === null) return;
      if (loadedPersonId.current === personId) return;
      loadedPersonId.current = null;
      setLoading(true);
      setError(null);
      setPerson(null);
      setCastCredits([]);
      setCrewCredits([]);
      setProfileImageLoading(true);
      setProfileImageError(false);

      try {
        if (!Number.isSafeInteger(personId) || personId <= 0) {
          throw new Error('Invalid person ID');
        }
        if (!EXPO_PUBLIC_TMDB_API_KEY) {
          throw new Error('TMDB API key is not configured');
        }

        const baseUrl = `https://api.themoviedb.org/3/person/${personId}`;
        const [personResponse, creditsResponse] = await Promise.all([
          fetch(`${baseUrl}?api_key=${EXPO_PUBLIC_TMDB_API_KEY}`, { signal: controller.signal }),
          fetch(`${baseUrl}/combined_credits?api_key=${EXPO_PUBLIC_TMDB_API_KEY}`, { signal: controller.signal }),
        ]);

        if (!personResponse.ok) throw new Error(`TMDB person request failed (${personResponse.status})`);
        if (!creditsResponse.ok) throw new Error(`TMDB filmography request failed (${creditsResponse.status})`);

        const [personResult, creditsResult] = await Promise.all([
          personResponse.json() as Promise<Person>,
          creditsResponse.json() as Promise<{ cast?: Credit[]; crew?: Credit[] }>,
        ]);
        if (!personResult?.id || !personResult.name) {
          throw new Error('TMDB returned an invalid person response');
        }

        const getRelevantCredits = (credits: Credit[]) => {
          const uniqueCredits = new Map<string, Credit>();
          credits
            .filter((credit) => (credit.media_type === 'movie' || credit.media_type === 'tv') && credit.id)
            .forEach((credit) => {
              const key = `${credit.media_type}-${credit.id}`;
              if (!uniqueCredits.has(key)) uniqueCredits.set(key, credit);
            });

          return Array.from(uniqueCredits.values())
            .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
            .slice(0, 30);
        };

        setPerson(personResult);
        setCastCredits(getRelevantCredits(creditsResult.cast ?? []));
        setCrewCredits(getRelevantCredits(creditsResult.crew ?? []));
        loadedPersonId.current = personId;
      } catch (loadError) {
        if (controller.signal.aborted) return;
        console.error('Error loading person details:', loadError);
        setError('Could not load this profile. Check your connection and try again.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void loadPerson();
    return () => controller.abort();
  }, [personId, retryCount, visible]);

  const handleFilmographyPress = useCallback((item: Credit) => {
    onClose();
    router.push({
      pathname: item.media_type === 'movie' ? '/movie/details' : '/series/details',
      params: { tmdbid: String(item.id) },
    });
  }, [onClose]);

  const profileImage = useMemo(
    () => person?.profile_path ? `${PROFILE_IMAGE_BASE}${person.profile_path}` : null,
    [person?.profile_path],
  );

  return (
    <PersonDetailsSheet
      visible={visible}
      onClose={onClose}
      backgroundColor={colors.background}
    >
      <PersonDetailsContent
        colors={colors}
        loading={loading}
        error={error}
        person={person}
        castCredits={castCredits}
        crewCredits={crewCredits}
        profileImage={profileImage}
        profileImageLoading={profileImageLoading}
        profileImageError={profileImageError}
        onProfileImageLoad={() => setProfileImageLoading(false)}
        onProfileImageError={() => {
          setProfileImageLoading(false);
          setProfileImageError(true);
        }}
        onRetry={() => setRetryCount((count) => count + 1)}
        onClose={onClose}
        onCreditPress={handleFilmographyPress}
      />
    </PersonDetailsSheet>
  );
}
