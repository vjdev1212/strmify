import React, { useEffect, useState } from 'react';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Text as RNText, View as RNView } from 'react-native';
import {
  FieldGroup,
  Host,
  ListItem,
  Picker,
  RNHostView,
  Text as NativeText,
  TextInput,
  useNativeState,
} from '@expo/ui';
import { MenuView, type MenuAction } from '@expo/ui/community/menu';
import { SettingsRow, SettingsSection, StatusBar, View } from '@vjdev1212/media-ui-kit';
import { settingsActionBlue, settingsIconColors } from '@/constants/theme';
import PosterSectionsManager from '@/components/PosterSectionsManager';
import { useTheme } from '@/context/ThemeContext';
import { showAlert } from '@/utils/platform';
import {
  DEFAULT_HOME_PREFERENCES,
  loadHomePreferences,
  normalizeHomeGenreIds,
  saveHomePreferences,
  type HomeMediaType,
  type HomeSectionMediaType,
  type HomePreferences,
  type HomeSection,
  type HomeSortOrder,
} from '@/utils/HomeCustomization';

const TMDB_API_KEY = process.env.EXPO_PUBLIC_TMDB_API_KEY;

interface TmdbGenre {
  id: number;
  name: string;
}

interface TmdbCertification {
  certification: string;
  meaning?: string;
  order?: number;
}

interface FilterMetadata {
  mediaType: HomeSectionMediaType;
  genres: TmdbGenre[];
  certifications: Record<string, TmdbCertification[]>;
}

interface FilterMetadataState {
  mediaType: HomeSectionMediaType | null;
  genres: TmdbGenre[];
  certifications: Record<string, TmdbCertification[]>;
  loading: boolean;
  error: string | null;
}

interface TmdbWatchRegion {
  iso_3166_1: string;
  english_name: string;
  native_name?: string;
}

interface TmdbWatchProvider {
  provider_id: number;
  provider_name: string;
  display_priority: number;
}

interface WatchRegionsState {
  regions: TmdbWatchRegion[];
  loading: boolean;
  error: string | null;
}

interface WatchProvidersState {
  mediaType: HomeSectionMediaType | null;
  region: string | null;
  providers: TmdbWatchProvider[];
  loading: boolean;
  error: string | null;
}

const filterMetadataCache = new Map<HomeSectionMediaType, FilterMetadata>();
let watchRegionsCache: TmdbWatchRegion[] | null = null;
const watchProvidersCache = new Map<string, TmdbWatchProvider[]>();

interface SectionDraft {
  title: string;
  mediaType: HomeSectionMediaType;
  languageCode: string;
  displayLanguage: string;
  region: string;
  originCountry: string;
  sortBy: HomeSortOrder;
  releaseAfterDaysAgo: string;
  releaseBeforeDaysAgo: string;
  genreIds: string;
  certificationCountry: string;
  certification: string;
  certificationGte: string;
  certificationLte: string;
  minimumVoteAverage: string;
  minimumVoteCount: string;
  minimumRuntime: string;
  maximumRuntime: string;
  watchRegion: string;
  watchProviders: string;
}

const newSectionDraft = (mediaType: HomeSectionMediaType = 'movie'): SectionDraft => ({
  title: '',
  mediaType,
  languageCode: '',
  displayLanguage: 'en-US',
  region: '',
  originCountry: '',
  sortBy: 'popularity.desc',
  releaseAfterDaysAgo: '',
  releaseBeforeDaysAgo: '',
  genreIds: '',
  certificationCountry: '',
  certification: '',
  certificationGte: '',
  certificationLte: '',
  minimumVoteAverage: '',
  minimumVoteCount: '',
  minimumRuntime: '',
  maximumRuntime: '',
  watchRegion: '',
  watchProviders: '',
});

function draftFromSection(section: HomeSection): SectionDraft {
  return {
    title: section.title,
    mediaType: section.mediaType,
    languageCode: section.languageCode ?? '',
    displayLanguage: section.displayLanguage ?? '',
    region: section.region ?? '',
    originCountry: section.originCountry ?? '',
    sortBy: section.sortBy,
    releaseAfterDaysAgo: section.releaseAfterDaysAgo?.toString() ?? '',
    releaseBeforeDaysAgo: section.releaseBeforeDaysAgo?.toString() ?? '',
    genreIds: section.genreIds ?? '',
    certificationCountry: section.certificationCountry ?? '',
    certification: section.certification ?? '',
    certificationGte: section.certificationGte ?? '',
    certificationLte: section.certificationLte ?? '',
    minimumVoteAverage: section.minimumVoteAverage?.toString() ?? '',
    minimumVoteCount: section.minimumVoteCount?.toString() ?? '',
    minimumRuntime: section.minimumRuntime?.toString() ?? '',
    maximumRuntime: section.maximumRuntime?.toString() ?? '',
    watchRegion: section.watchRegion ?? '',
    watchProviders: section.watchProviders ?? '',
  };
}

const commonSortOptions: { label: string; value: HomeSortOrder }[] = [
  { label: 'Popularity (high to low)', value: 'popularity.desc' },
  { label: 'Popularity (low to high)', value: 'popularity.asc' },
  { label: 'Newest releases', value: 'release_date.desc' },
  { label: 'Oldest releases', value: 'release_date.asc' },
  { label: 'Highest rated', value: 'vote_average.desc' },
  { label: 'Lowest rated', value: 'vote_average.asc' },
  { label: 'Most votes', value: 'vote_count.desc' },
  { label: 'Fewest votes', value: 'vote_count.asc' },
  { label: 'Title (A–Z)', value: 'title.asc' },
  { label: 'Title (Z–A)', value: 'title.desc' },
  { label: 'Original title (A–Z)', value: 'original_title.asc' },
  { label: 'Original title (Z–A)', value: 'original_title.desc' },
];

function FormTextInput({
  value,
  onChangeText,
  ...props
}: Omit<React.ComponentProps<typeof TextInput>, 'value' | 'onChangeText'> & {
  value: string;
  onChangeText: (value: string) => void;
}) {
  const nativeValue = useNativeState(value);

  useEffect(() => {
    nativeValue.set(value);
  }, [nativeValue, value]);

  return (
    <TextInput
      {...props}
      value={nativeValue}
      onChangeText={(text) => {
        nativeValue.set(text);
        onChangeText(text);
      }}
    />
  );
}

function parseDaysAgo(value: string, label: string): number | undefined {
  if (!value.trim()) return undefined;
  if (!/^\d+$/.test(value.trim())) {
    throw new Error(`${label} must be a whole number of days.`);
  }

  const days = Number(value.trim());
  if (days > 3650) throw new Error(`${label} cannot be more than 3650 days.`);
  return days;
}

function parseOptionalNumber(
  value: string,
  label: string,
  maximum?: number,
  integer = true,
): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value.trim());
  if (!Number.isFinite(parsed) || parsed < 0 || (integer && !Number.isInteger(parsed))) {
    throw new Error(`${label} must be ${integer ? 'a non-negative whole number' : 'a non-negative number'}.`);
  }
  if (maximum !== undefined && parsed > maximum) {
    throw new Error(`${label} cannot be greater than ${maximum}.`);
  }
  return parsed;
}

function parseCountryCode(value: string, label: string): string | undefined {
  const code = value.trim();
  if (!code) return undefined;
  if (!/^[a-z]{2}$/i.test(code)) throw new Error(`${label} must be a two-letter country code.`);
  return code.toUpperCase();
}

async function fetchFilterMetadata(
  mediaType: HomeSectionMediaType,
  signal: AbortSignal,
): Promise<FilterMetadata> {
  if (!TMDB_API_KEY) {
    throw new Error('TMDB API key is not configured. Set EXPO_PUBLIC_TMDB_API_KEY to load home filters.');
  }

  const endpoints = mediaType === 'any'
    ? ['movie', 'tv']
    : [mediaType === 'movie' ? 'movie' : 'tv'];
  const [genreResponses, certificationResponse] = await Promise.all([
    Promise.all(endpoints.map((endpoint) => fetch(
      `https://api.themoviedb.org/3/genre/${endpoint}/list?language=en-US&api_key=${encodeURIComponent(TMDB_API_KEY)}`,
      { signal },
    ))),
    mediaType === 'movie'
      ? fetch(
        `https://api.themoviedb.org/3/certification/movie/list?api_key=${encodeURIComponent(TMDB_API_KEY)}`,
        { signal },
      )
      : Promise.resolve(null),
  ]);
  const failedGenreResponse = genreResponses.find((response) => !response.ok);
  if (failedGenreResponse) {
    throw new Error(`TMDB genre request failed (HTTP ${failedGenreResponse.status}).`);
  }
  if (certificationResponse && !certificationResponse.ok) {
    throw new Error(`TMDB certification request failed (HTTP ${certificationResponse.status}).`);
  }

  const [genrePayloads, certificationPayload]: [unknown[], unknown] = await Promise.all([
    Promise.all(genreResponses.map((response) => response.json())),
    certificationResponse ? certificationResponse.json() : Promise.resolve(null),
  ]);
  const genreLists = genrePayloads.map((payload) => {
    if (!payload || typeof payload !== 'object' || !('genres' in payload)) {
      throw new Error('TMDB returned an invalid genre list.');
    }
    const genreRows = (payload as { genres: unknown }).genres;
    if (!Array.isArray(genreRows)) throw new Error('TMDB returned an invalid genre list.');
    return genreRows.flatMap((genre): TmdbGenre[] => {
      if (
        !genre
        || typeof genre !== 'object'
        || !('id' in genre)
        || !('name' in genre)
        || typeof genre.id !== 'number'
        || typeof genre.name !== 'string'
      ) return [];
      return [{ id: genre.id, name: genre.name }];
    });
  });
  const sharedGenreIds = mediaType === 'any'
    ? new Set(genreLists[1].map((genre) => genre.id))
    : null;
  const genres = genreLists[0].filter((genre) => (
    !sharedGenreIds || sharedGenreIds.has(genre.id)
  ));
  if (genres.length === 0) throw new Error('TMDB returned no genres for this media type.');

  const certifications: Record<string, TmdbCertification[]> = {};
  if (mediaType === 'movie') {
    if (
      !certificationPayload
      || typeof certificationPayload !== 'object'
      || !('certifications' in certificationPayload)
      || !certificationPayload.certifications
      || typeof certificationPayload.certifications !== 'object'
      || Array.isArray(certificationPayload.certifications)
    ) {
      throw new Error('TMDB returned an invalid certification list.');
    }

    for (const [countryCode, rows] of Object.entries(certificationPayload.certifications)) {
      if (!Array.isArray(rows)) continue;
      certifications[countryCode] = rows.flatMap((row): TmdbCertification[] => {
        if (!row || typeof row !== 'object' || !('certification' in row) || typeof row.certification !== 'string') {
          return [];
        }
        return [{
          certification: row.certification,
          meaning: 'meaning' in row && typeof row.meaning === 'string' ? row.meaning : undefined,
          order: 'order' in row && typeof row.order === 'number' ? row.order : undefined,
        }];
      });
    }
  }

  if (mediaType === 'movie' && Object.keys(certifications).length === 0) {
    throw new Error('TMDB returned no certifications.');
  }
  return { mediaType, genres, certifications };
}

async function fetchWatchRegions(signal: AbortSignal): Promise<TmdbWatchRegion[]> {
  if (!TMDB_API_KEY) {
    throw new Error('TMDB API key is not configured. Set EXPO_PUBLIC_TMDB_API_KEY to load watch regions.');
  }

  const response = await fetch(
    `https://api.themoviedb.org/3/watch/providers/regions?language=en-US&api_key=${encodeURIComponent(TMDB_API_KEY)}`,
    { signal },
  );
  if (!response.ok) throw new Error(`TMDB watch-region request failed (HTTP ${response.status}).`);

  const payload: unknown = await response.json();
  if (!payload || typeof payload !== 'object' || !('results' in payload) || !Array.isArray(payload.results)) {
    throw new Error('TMDB returned an invalid watch-region list.');
  }

  return payload.results.flatMap((region): TmdbWatchRegion[] => {
    if (
      !region
      || typeof region !== 'object'
      || !('iso_3166_1' in region)
      || !('english_name' in region)
      || typeof region.iso_3166_1 !== 'string'
      || typeof region.english_name !== 'string'
    ) return [];

    return [{
      iso_3166_1: region.iso_3166_1,
      english_name: region.english_name,
      native_name: 'native_name' in region && typeof region.native_name === 'string'
        ? region.native_name
        : undefined,
    }];
  }).sort((a, b) => a.english_name.localeCompare(b.english_name));
}

async function fetchWatchProviders(
  mediaType: HomeSectionMediaType,
  region: string,
  signal: AbortSignal,
): Promise<TmdbWatchProvider[]> {
  if (!TMDB_API_KEY) {
    throw new Error('TMDB API key is not configured. Set EXPO_PUBLIC_TMDB_API_KEY to load watch providers.');
  }

  const endpoints = mediaType === 'any'
    ? ['movie', 'tv']
    : [mediaType === 'movie' ? 'movie' : 'tv'];
  const query = new URLSearchParams({
    language: 'en-US',
    watch_region: region,
    api_key: TMDB_API_KEY,
  });
  const responses = await Promise.all(endpoints.map((endpoint) => fetch(
    `https://api.themoviedb.org/3/watch/providers/${endpoint}?${query.toString()}`,
    { signal },
  )));
  const failedResponse = responses.find((response) => !response.ok);
  if (failedResponse) {
    throw new Error(`TMDB watch-provider request failed (HTTP ${failedResponse.status}).`);
  }

  const payloads: unknown[] = await Promise.all(responses.map((response) => response.json()));
  const providersById = new Map<number, TmdbWatchProvider>();
  for (const payload of payloads) {
    if (!payload || typeof payload !== 'object' || !('results' in payload) || !Array.isArray(payload.results)) {
      throw new Error('TMDB returned an invalid watch-provider list.');
    }

    for (const provider of payload.results) {
      if (
        !provider
        || typeof provider !== 'object'
        || !('provider_id' in provider)
        || !('provider_name' in provider)
        || typeof provider.provider_id !== 'number'
        || typeof provider.provider_name !== 'string'
      ) continue;

      providersById.set(provider.provider_id, {
        provider_id: provider.provider_id,
        provider_name: provider.provider_name,
        display_priority: 'display_priority' in provider && typeof provider.display_priority === 'number'
          ? provider.display_priority
          : Number.MAX_SAFE_INTEGER,
      });
    }
  }

  return [...providersById.values()]
    .sort((a, b) => a.display_priority - b.display_priority || a.provider_name.localeCompare(b.provider_name));
}

export default function HomeSettingsScreen({ editorOnly = false }: { editorOnly?: boolean }) {
  const { colors, colorScheme } = useTheme();
  const routeParams = useLocalSearchParams();
  const requestedEditId = typeof routeParams.editSectionId === 'string'
    ? routeParams.editSectionId
    : undefined;
  const requestedMediaType: HomeSectionMediaType = routeParams.mediaType === 'series'
    || routeParams.mediaType === 'any'
    ? routeParams.mediaType
    : 'movie';
  const shouldCreateSection = routeParams.createSection === '1';
  const isEditorScreen = editorOnly || Boolean(requestedEditId || shouldCreateSection);
  const [preferences, setPreferences] = useState<HomePreferences>(DEFAULT_HOME_PREFERENCES);
  const [selectedPosterMediaType, setSelectedPosterMediaType] = useState<'movies' | 'series'>('movies');
  const [draft, setDraft] = useState<SectionDraft>(() => newSectionDraft(requestedMediaType));
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [metadataRetry, setMetadataRetry] = useState(0);
  const [watchRegionsRetry, setWatchRegionsRetry] = useState(0);
  const [watchProvidersRetry, setWatchProvidersRetry] = useState(0);
  const [metadata, setMetadata] = useState<FilterMetadataState>({
    mediaType: null,
    genres: [],
    certifications: {},
    loading: false,
    error: null,
  });
  const [watchRegions, setWatchRegions] = useState<WatchRegionsState>({
    regions: [],
    loading: false,
    error: null,
  });
  const [watchProviders, setWatchProviders] = useState<WatchProvidersState>({
    mediaType: null,
    region: null,
    providers: [],
    loading: false,
    error: null,
  });
  const currentMetadata = metadata.mediaType === draft.mediaType ? metadata : null;
  const availableCertifications = currentMetadata?.certifications[draft.certificationCountry] ?? [];
  const sortedCertifications = [...availableCertifications]
    .sort((a, b) => (a.order ?? Number.MAX_SAFE_INTEGER) - (b.order ?? Number.MAX_SAFE_INTEGER));
  const selectedGenreIds = normalizeHomeGenreIds(draft.genreIds).split(',').filter(Boolean);
  const selectedGenreIdSet = new Set(selectedGenreIds);
  const selectedGenreNames = currentMetadata?.genres
    .filter((genre) => selectedGenreIdSet.has(String(genre.id)))
    .map((genre) => genre.name) ?? [];
  const genreSelectionLabel = selectedGenreIds.length === 0
    ? 'Any genre'
    : `${selectedGenreIds.length} selected`;
  const genreAccessibilityLabel = `Genres: ${
    selectedGenreNames.length > 0
      ? selectedGenreNames.join(', ')
      : selectedGenreIds.length > 0 ? selectedGenreIds.join(', ') : 'Any genre'
  }`;
  const selectedWatchProviderIds = draft.watchProviders.split(/[|,]/).filter(Boolean);
  const selectedWatchProviderIdSet = new Set(selectedWatchProviderIds);
  const activeWatchProviders = watchProviders.mediaType === draft.mediaType
    && watchProviders.region === draft.watchRegion
    ? watchProviders.providers
    : [];
  const watchProviderSelectionLabel = selectedWatchProviderIds.length === 0
    ? 'Any provider'
    : selectedWatchProviderIds.length === 1
      ? activeWatchProviders.find(
        (provider) => String(provider.provider_id) === selectedWatchProviderIds[0],
      )?.provider_name ?? '1 selected'
      : `${selectedWatchProviderIds.length} selected`;
  const watchProviderAccessibilityLabel = `Streaming providers: ${
    selectedWatchProviderIds.map((id) => (
      activeWatchProviders.find((provider) => String(provider.provider_id) === id)?.provider_name
      ?? `provider ${id}`
    )).join(', ') || 'Any provider'
  }`;
  const providerActions: MenuAction[] = [
    {
      id: 'clear',
      title: 'Any provider',
      state: selectedWatchProviderIds.length === 0 ? 'on' : 'off',
    },
    ...activeWatchProviders.map((provider) => ({
      id: String(provider.provider_id),
      title: provider.provider_name,
      state: selectedWatchProviderIdSet.has(String(provider.provider_id)) ? 'on' as const : 'off' as const,
    })),
    ...selectedWatchProviderIds
      .filter((id) => !activeWatchProviders.some((provider) => String(provider.provider_id) === id))
      .map((id) => ({
        id,
        title: `Saved provider (${id})`,
        state: 'on' as const,
      })),
  ];
  const sortOptions = [
    ...commonSortOptions,
    ...(draft.mediaType === 'movie'
      ? [
        { label: 'Revenue (high to low)', value: 'revenue.desc' as const },
        { label: 'Revenue (low to high)', value: 'revenue.asc' as const },
      ]
      : []),
  ];

  useEffect(() => {
    try {
      const savedPreferences = loadHomePreferences();
      setPreferences(savedPreferences);

      if (requestedEditId) {
        const section = savedPreferences.sections.find(
          (item) => item.id === requestedEditId && item.kind === 'discover',
        );
        if (section) {
          setEditingId(section.id);
          setDraft(draftFromSection(section));
        } else {
          showAlert('Section Not Found', 'This Discover section may have been deleted.');
          if (editorOnly) {
            if (router.canGoBack()) {
              router.back();
            } else {
              router.replace('/settings/home');
            }
          }
        }
      } else if (shouldCreateSection || editorOnly) {
        setEditingId(null);
        setDraft(newSectionDraft(requestedMediaType));
      }
    } catch (error) {
      console.error('Failed to load home screen preferences:', error);
      showAlert('Unable to Load Catalogues', 'Your saved catalogue settings could not be read.');
    } finally {
      setLoading(false);
    }
  }, [editorOnly, requestedEditId, requestedMediaType, shouldCreateSection]);

  useEffect(() => {
    const cached = filterMetadataCache.get(draft.mediaType);
    if (cached) {
      setMetadata({ ...cached, loading: false, error: null });
      return;
    }

    const controller = new AbortController();
    setMetadata((current) => ({
      ...current,
      mediaType: draft.mediaType,
      loading: true,
      error: null,
    }));

    void fetchFilterMetadata(draft.mediaType, controller.signal)
      .then((result) => {
        filterMetadataCache.set(draft.mediaType, result);
        setMetadata({ ...result, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setMetadata({
          mediaType: draft.mediaType,
          genres: [],
          certifications: {},
          loading: false,
          error: error instanceof Error ? error.message : 'TMDB metadata could not be loaded.',
        });
      });

    return () => controller.abort();
  }, [draft.mediaType, metadataRetry]);

  useEffect(() => {
    if (watchRegionsCache) {
      setWatchRegions({ regions: watchRegionsCache, loading: false, error: null });
      return;
    }

    const controller = new AbortController();
    setWatchRegions((current) => ({ ...current, loading: true, error: null }));

    void fetchWatchRegions(controller.signal)
      .then((regions) => {
        watchRegionsCache = regions;
        setWatchRegions({ regions, loading: false, error: null });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setWatchRegions((current) => ({
          ...current,
          loading: false,
          error: error instanceof Error ? error.message : 'TMDB watch regions could not be loaded.',
        }));
      });

    return () => controller.abort();
  }, [watchRegionsRetry]);

  useEffect(() => {
    const region = draft.watchRegion;
    if (!region) {
      setWatchProviders({
        mediaType: draft.mediaType,
        region: null,
        providers: [],
        loading: false,
        error: null,
      });
      return;
    }

    const cacheKey = `${draft.mediaType}:${region}`;
    const cachedProviders = watchProvidersCache.get(cacheKey);
    if (cachedProviders) {
      setWatchProviders({
        mediaType: draft.mediaType,
        region,
        providers: cachedProviders,
        loading: false,
        error: null,
      });
      return;
    }

    const controller = new AbortController();
    setWatchProviders({
      mediaType: draft.mediaType,
      region,
      providers: [],
      loading: true,
      error: null,
    });

    void fetchWatchProviders(draft.mediaType, region, controller.signal)
      .then((providers) => {
        watchProvidersCache.set(cacheKey, providers);
        setWatchProviders({
          mediaType: draft.mediaType,
          region,
          providers,
          loading: false,
          error: null,
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setWatchProviders({
          mediaType: draft.mediaType,
          region,
          providers: [],
          loading: false,
          error: error instanceof Error ? error.message : 'TMDB watch providers could not be loaded.',
        });
      });

    return () => controller.abort();
  }, [draft.mediaType, draft.watchRegion, watchProvidersRetry]);

  const persistPreferences = (nextPreferences: HomePreferences): boolean => {
    try {
      saveHomePreferences(nextPreferences);
      setPreferences(nextPreferences);
      return true;
    } catch (error) {
      console.error('Failed to save home screen preferences:', error);
      showAlert('Unable to Save Home Settings', 'Your changes could not be saved. Please try again.');
      return false;
    }
  };

  const updateDraft = <K extends keyof SectionDraft>(key: K, value: SectionDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const saveSection = () => {
    try {
      const title = draft.title.trim();
      if (!title) throw new Error('Enter a title for this home section.');
      if (title.length > 60) throw new Error('Section titles must be 60 characters or fewer.');

      const languageCode = draft.languageCode.trim().toLowerCase();
      if (languageCode && !/^[a-z]{2}$/.test(languageCode)) {
        throw new Error('Enter a two-letter original language code, such as ta or en.');
      }

      const displayLanguage = draft.displayLanguage.trim() || 'en-US';
      if (!/^[a-z]{2}-[a-z]{2}$/i.test(displayLanguage)) {
        throw new Error('Enter a language and region tag, such as ta-IN or en-US.');
      }

      const releaseAfterDaysAgo = parseDaysAgo(draft.releaseAfterDaysAgo, 'Released no earlier than');
      const releaseBeforeDaysAgo = parseDaysAgo(draft.releaseBeforeDaysAgo, 'Released no later than');
      if (
        releaseAfterDaysAgo !== undefined
        && releaseBeforeDaysAgo !== undefined
        && releaseAfterDaysAgo <= releaseBeforeDaysAgo
      ) {
        throw new Error('The earlier release limit must be a larger number of days ago.');
      }

      const genreIds = normalizeHomeGenreIds(draft.genreIds);
      if (genreIds && !/^\d+(,\d+)*$/.test(genreIds)) {
        throw new Error('Genre IDs must be numeric.');
      }

      const region = parseCountryCode(draft.region, 'Release region');
      const originCountry = parseCountryCode(draft.originCountry, 'Origin country');
      const certificationCountry = draft.mediaType === 'movie'
        ? draft.certificationCountry.trim().toUpperCase()
        : '';
      if (certificationCountry && !/^[A-Z]{2}(?:-[A-Z]{2})?$/.test(certificationCountry)) {
        throw new Error('Choose a valid certification country.');
      }
      const certification = draft.mediaType === 'movie' ? draft.certification.trim() : '';
      const certificationGte = draft.mediaType === 'movie' ? draft.certificationGte.trim() : '';
      const certificationLte = draft.mediaType === 'movie' ? draft.certificationLte.trim() : '';
      const hasCertificationFilter = Boolean(certification || certificationGte || certificationLte);
      if (hasCertificationFilter && !region) {
        throw new Error('A release region is required when filtering by certification.');
      }
      if (hasCertificationFilter && !certificationCountry) {
        throw new Error('Choose a certification country when filtering by certification.');
      }
      if (certificationGte && certificationLte) {
        const minimumOrder = availableCertifications.find(
          (item) => item.certification === certificationGte,
        )?.order;
        const maximumOrder = availableCertifications.find(
          (item) => item.certification === certificationLte,
        )?.order;
        if (minimumOrder !== undefined && maximumOrder !== undefined && minimumOrder > maximumOrder) {
          throw new Error('The minimum certification must not be higher than the maximum certification.');
        }
      }
      const minimumVoteAverage = parseOptionalNumber(draft.minimumVoteAverage, 'Minimum rating', 10, false);
      const minimumVoteCount = parseOptionalNumber(draft.minimumVoteCount, 'Minimum vote count');
      const minimumRuntime = parseOptionalNumber(draft.minimumRuntime, 'Minimum runtime');
      const maximumRuntime = parseOptionalNumber(draft.maximumRuntime, 'Maximum runtime');
      if (minimumRuntime !== undefined && maximumRuntime !== undefined && minimumRuntime > maximumRuntime) {
        throw new Error('Maximum runtime must be greater than or equal to minimum runtime.');
      }

      const watchRegion = parseCountryCode(draft.watchRegion, 'Watch region');
      const watchProviders = draft.watchProviders.trim().replace(/\s+/g, '');
      if (watchProviders && !/^\d+(,\d+|\|\d+)*$/.test(watchProviders)) {
        throw new Error('Provider IDs must be numeric and separated by commas or pipes.');
      }
      if (watchProviders && !watchRegion) {
        throw new Error('A watch region is required when filtering by streaming providers.');
      }

      const section: HomeSection = {
        id: editingId ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title,
        mediaType: draft.mediaType,
        kind: 'discover',
        enabled: true,
        languageCode: languageCode || undefined,
        displayLanguage: `${displayLanguage.slice(0, 2).toLowerCase()}-${displayLanguage.slice(3).toUpperCase()}`,
        region,
        originCountry,
        sortBy: draft.sortBy,
        releaseAfterDaysAgo,
        releaseBeforeDaysAgo,
        genreIds: genreIds || undefined,
        certificationCountry: certificationCountry || undefined,
        certification: certification || undefined,
        certificationGte: certificationGte || undefined,
        certificationLte: certificationLte || undefined,
        minimumVoteAverage,
        minimumVoteCount,
        minimumRuntime,
        maximumRuntime,
        watchRegion,
        watchProviders: watchProviders || undefined,
      };
      const sections = editingId
        ? preferences.sections.map((savedSection) => (
          savedSection.id === editingId
            ? { ...section, enabled: savedSection.enabled }
            : savedSection
        ))
        : [...preferences.sections, section];

      if (persistPreferences({ ...preferences, sections })) {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/settings/home');
        }
      }
    } catch (error) {
      showAlert('Check Section Details', error instanceof Error ? error.message : 'The section details are invalid.');
    }
  };

  const startNewSection = (mediaType: HomeMediaType) => {
    router.push({
      pathname: '/settings/home-editor',
      params: { createSection: '1', mediaType },
    });
  };

  const editExistingSection = (section: HomeSection) => {
    router.push({
      pathname: '/settings/home-editor',
      params: { editSectionId: section.id, mediaType: section.mediaType },
    });
  };

  const cancelEditor = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/settings/home');
    }
  };

  const isEditingSection = Boolean(editingId || requestedEditId);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Stack.Screen
        options={{
          title: isEditorScreen ? (isEditingSection ? 'Edit Catalogue' : 'Add Catalogue') : 'Catalogues',
          headerTitle: isEditorScreen ? (isEditingSection ? 'Edit Catalogue' : 'Add Catalogue') : 'Catalogues',
          ...(isEditorScreen
            ? { headerBackButtonDisplayMode: 'minimal' as const, headerBackTitle: '' }
            : {}),
        }}
      />
      <StatusBar />
      {isEditorScreen ? (
        <Host style={{ flex: 1 }} colorScheme={colorScheme}>
          <FieldGroup>

          <FieldGroup.Section title={isEditingSection ? 'Edit Catalogue' : 'New Catalogue'}>
            <FormTextInput
              value={draft.title}
              onChangeText={(value) => updateDraft('title', value)}
              placeholder="Latest Movies"
              accessibilityLabel="Section title"
              editable={!loading}
              maxLength={60}
              returnKeyType="next"
            />
            <FieldGroup.SectionFooter>
              <NativeText>Give this catalogue a name, then choose the TMDB Discover filters below.</NativeText>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>

          <FieldGroup.Section title="Original language (optional)">
            <FormTextInput
              value={draft.languageCode}
              onChangeText={(value) => updateDraft('languageCode', value)}
              placeholder="en"
              accessibilityLabel="Original language code"
              editable={!loading}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={2}
            />
            <FieldGroup.SectionFooter>
              <NativeText>Use a two-letter language code. For example, en filters for English-language titles.</NativeText>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>

          <FieldGroup.Section title="Display language">
            <FormTextInput
              value={draft.displayLanguage}
              onChangeText={(value) => updateDraft('displayLanguage', value)}
              placeholder="en-US"
              accessibilityLabel="TMDB display language tag"
              editable={!loading}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={5}
            />
            <FieldGroup.SectionFooter>
              <NativeText>
                Requests translated metadata in this language. Defaults to en-US for new sections.
              </NativeText>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>

          <FieldGroup.Section title="Sort by">
            <Picker
              selectedValue={draft.sortBy}
              enabled={!loading}
              onValueChange={(value) => {
                const selectedOption = sortOptions.find((option) => option.value === value);
                if (selectedOption) updateDraft('sortBy', selectedOption.value);
              }}
            >
              {sortOptions.map((option) => (
                <Picker.Item key={option.value} label={option.label} value={option.value} />
              ))}
            </Picker>
          </FieldGroup.Section>

          <FieldGroup.Section title="Release region (optional)">
            <FormTextInput
              value={draft.region}
              onChangeText={(value) => updateDraft('region', value)}
              placeholder="US"
              accessibilityLabel="Release region country code"
              editable={!loading}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={2}
            />
            <FieldGroup.SectionFooter>
              <NativeText>
                Uses this region’s release dates and is required when applying movie certification filters.
              </NativeText>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>

          <FieldGroup.Section title="Release date from (days ago, optional)">
            <FormTextInput
              value={draft.releaseAfterDaysAgo}
              onChangeText={(value) => updateDraft('releaseAfterDaysAgo', value)}
              placeholder="365"
              accessibilityLabel="Release date from days ago"
              editable={!loading}
              keyboardType="number-pad"
              maxLength={4}
            />
          </FieldGroup.Section>

          <FieldGroup.Section title="Release date to (days ago, optional)">
            <FormTextInput
              value={draft.releaseBeforeDaysAgo}
              onChangeText={(value) => updateDraft('releaseBeforeDaysAgo', value)}
              placeholder="28"
              accessibilityLabel="Release date to days ago"
              editable={!loading}
              keyboardType="number-pad"
              maxLength={4}
            />
            <FieldGroup.SectionFooter>
              <NativeText>
                Enter days ago for each limit. For releases 28 days to 6 months ago, use 180 for “from” and 28 for “to”.
              </NativeText>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>

          <FieldGroup.Section title="Genre (optional)">
            {currentMetadata?.loading ? (
              <NativeText>Loading genres…</NativeText>
            ) : currentMetadata?.error ? (
              <>
                <NativeText>{currentMetadata.error}</NativeText>
                <ListItem onPress={loading ? undefined : () => setMetadataRetry((attempt) => attempt + 1)}>
                  <NativeText>Retry loading filters</NativeText>
                </ListItem>
              </>
            ) : currentMetadata ? (
              <>
                <ListItem
                  trailing={(
                    <RNHostView matchContents>
                      <MenuView
                        title="Genres"
                        actions={[
                          {
                            id: 'clear',
                            title: 'Any genre',
                            state: selectedGenreIds.length === 0 ? 'on' : 'off',
                          },
                          ...currentMetadata.genres.map((genre) => ({
                            id: String(genre.id),
                            title: genre.name,
                            state: selectedGenreIdSet.has(String(genre.id)) ? 'on' as const : 'off' as const,
                          })),
                        ]}
                        onPressAction={({ nativeEvent }) => {
                          if (nativeEvent.event === 'clear') {
                            updateDraft('genreIds', '');
                            return;
                          }
                          if (!/^\d+$/.test(nativeEvent.event)) return;
                          setDraft((current) => {
                            const nextGenreIds = new Set(
                              normalizeHomeGenreIds(current.genreIds).split(',').filter(Boolean),
                            );
                            if (nextGenreIds.has(nativeEvent.event)) {
                              nextGenreIds.delete(nativeEvent.event);
                            } else {
                              nextGenreIds.add(nativeEvent.event);
                            }
                            return { ...current, genreIds: [...nextGenreIds].join(',') };
                          });
                        }}
                      >
                        <RNView
                          accessible
                          accessibilityRole="button"
                          accessibilityLabel={genreAccessibilityLabel}
                          style={{
                            alignItems: 'center',
                            flexDirection: 'row',
                            gap: 6,
                            minHeight: 44,
                            paddingHorizontal: 8,
                          }}
                        >
                          <RNText style={{ color: colors.textMuted }}>{genreSelectionLabel}</RNText>
                          <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                        </RNView>
                      </MenuView>
                    </RNHostView>
                  )}
                >
                  <NativeText>Genres</NativeText>
                </ListItem>
                <FieldGroup.SectionFooter>
                  <NativeText>
                    Select multiple genres from the dropdown. TMDB receives their IDs as a comma-separated filter.
                  </NativeText>
                </FieldGroup.SectionFooter>
              </>
            ) : (
              <NativeText>Loading genres…</NativeText>
            )}
          </FieldGroup.Section>

          {draft.mediaType === 'movie' ? (
            <FieldGroup.Section title="Certification filters (optional)">
              {currentMetadata?.loading ? (
                <NativeText>Loading certifications…</NativeText>
              ) : currentMetadata?.error ? (
                <>
                  <NativeText>{currentMetadata.error}</NativeText>
                  <ListItem onPress={loading ? undefined : () => setMetadataRetry((attempt) => attempt + 1)}>
                    <NativeText>Retry loading filters</NativeText>
                  </ListItem>
                </>
              ) : currentMetadata ? (
                <>
                  <Picker
                    selectedValue={draft.certificationCountry}
                    enabled={!loading}
                    onValueChange={(value) => {
                      setDraft((current) => ({
                        ...current,
                        certificationCountry: String(value ?? ''),
                        certification: '',
                        certificationGte: '',
                        certificationLte: '',
                      }));
                    }}
                  >
                    <Picker.Item label="Any country" value="" />
                    {Object.keys(currentMetadata.certifications)
                      .sort((a, b) => a.localeCompare(b))
                      .map((countryCode) => (
                        <Picker.Item key={countryCode} label={countryCode} value={countryCode} />
                      ))}
                  </Picker>
                  <Picker
                    selectedValue={draft.certification}
                    enabled={!loading && !!draft.certificationCountry && sortedCertifications.length > 0}
                    onValueChange={(value) => updateDraft('certification', String(value ?? ''))}
                  >
                    <Picker.Item label="Any certification" value="" />
                    {draft.certification
                      && !sortedCertifications.some((item) => item.certification === draft.certification) ? (
                        <Picker.Item label={`Saved selection (${draft.certification})`} value={draft.certification} />
                      ) : null}
                    {sortedCertifications.map((item) => (
                      <Picker.Item
                        key={item.certification}
                        label={item.certification}
                        value={item.certification}
                      />
                    ))}
                  </Picker>
                  <Picker
                    selectedValue={draft.certificationGte}
                    enabled={!loading && !!draft.certificationCountry && sortedCertifications.length > 0}
                    onValueChange={(value) => updateDraft('certificationGte', String(value ?? ''))}
                  >
                    <Picker.Item label="Minimum certification (any)" value="" />
                    {draft.certificationGte
                      && !sortedCertifications.some((item) => item.certification === draft.certificationGte) ? (
                        <Picker.Item
                          label={`Saved minimum (${draft.certificationGte})`}
                          value={draft.certificationGte}
                        />
                      ) : null}
                    {sortedCertifications.map((item) => (
                      <Picker.Item
                        key={item.certification}
                        label={item.certification}
                        value={item.certification}
                      />
                    ))}
                  </Picker>
                  <Picker
                    selectedValue={draft.certificationLte}
                    enabled={!loading && !!draft.certificationCountry && sortedCertifications.length > 0}
                    onValueChange={(value) => updateDraft('certificationLte', String(value ?? ''))}
                  >
                    <Picker.Item label="Maximum certification (any)" value="" />
                    {draft.certificationLte
                      && !sortedCertifications.some((item) => item.certification === draft.certificationLte) ? (
                        <Picker.Item
                          label={`Saved maximum (${draft.certificationLte})`}
                          value={draft.certificationLte}
                        />
                      ) : null}
                    {sortedCertifications.map((item) => (
                      <Picker.Item
                        key={item.certification}
                        label={item.certification}
                        value={item.certification}
                      />
                    ))}
                  </Picker>
                  {draft.certificationCountry && sortedCertifications.length === 0 ? (
                    <NativeText>No certifications are available for this country.</NativeText>
                  ) : null}
                  <FieldGroup.SectionFooter>
                    <NativeText>
                      Choose a certification country and release region. Exact, minimum, and maximum values map to
                      TMDB’s certification, certification.gte, and certification.lte filters.
                    </NativeText>
                  </FieldGroup.SectionFooter>
                </>
              ) : (
                <NativeText>Loading certifications…</NativeText>
              )}
            </FieldGroup.Section>
          ) : null}

          <FieldGroup.Section title="Origin country (optional)">
            <FormTextInput
              value={draft.originCountry}
              onChangeText={(value) => updateDraft('originCountry', value)}
              placeholder="US"
              accessibilityLabel="Origin country code"
              editable={!loading}
              autoCapitalize="characters"
              autoCorrect={false}
              maxLength={2}
            />
          </FieldGroup.Section>

          <FieldGroup.Section title="Minimum rating (optional, 0–10)">
            <FormTextInput
              value={draft.minimumVoteAverage}
              onChangeText={(value) => updateDraft('minimumVoteAverage', value)}
              placeholder="6"
              accessibilityLabel="Minimum TMDB vote average"
              editable={!loading}
              keyboardType="decimal-pad"
              maxLength={2}
            />
          </FieldGroup.Section>

          <FieldGroup.Section title="Minimum vote count (optional)">
            <FormTextInput
              value={draft.minimumVoteCount}
              onChangeText={(value) => updateDraft('minimumVoteCount', value)}
              placeholder="100"
              accessibilityLabel="Minimum TMDB vote count"
              editable={!loading}
              keyboardType="number-pad"
              maxLength={7}
            />
          </FieldGroup.Section>

          <FieldGroup.Section title="Runtime range in minutes (optional)">
            <FormTextInput
              value={draft.minimumRuntime}
              onChangeText={(value) => updateDraft('minimumRuntime', value)}
              placeholder="Minimum runtime"
              accessibilityLabel="Minimum runtime in minutes"
              editable={!loading}
              keyboardType="number-pad"
              maxLength={4}
            />
            <FormTextInput
              value={draft.maximumRuntime}
              onChangeText={(value) => updateDraft('maximumRuntime', value)}
              placeholder="Maximum runtime"
              accessibilityLabel="Maximum runtime in minutes"
              editable={!loading}
              keyboardType="number-pad"
              maxLength={4}
            />
          </FieldGroup.Section>

          <FieldGroup.Section title="Watch region and providers (optional)">
            <Picker
              selectedValue={draft.watchRegion}
              enabled={!loading && !watchRegions.loading}
              onValueChange={(value) => {
                const region = String(value ?? '');
                setDraft((current) => ({
                  ...current,
                  watchRegion: region,
                  watchProviders: current.watchRegion === region ? current.watchProviders : '',
                }));
              }}
            >
              <Picker.Item label="Any region" value="" />
              {draft.watchRegion && !watchRegions.regions.some(
                (region) => region.iso_3166_1 === draft.watchRegion,
              ) ? (
                <Picker.Item label={`Saved region (${draft.watchRegion})`} value={draft.watchRegion} />
              ) : null}
              {watchRegions.regions.map((region) => (
                <Picker.Item
                  key={region.iso_3166_1}
                  label={`${region.english_name} (${region.iso_3166_1})`}
                  value={region.iso_3166_1}
                />
              ))}
            </Picker>
            {watchRegions.loading ? <NativeText>Loading watch regions…</NativeText> : null}
            {watchRegions.error ? (
              <>
                <NativeText>{watchRegions.error}</NativeText>
                <ListItem onPress={loading ? undefined : () => setWatchRegionsRetry((attempt) => attempt + 1)}>
                  <NativeText>Retry loading regions</NativeText>
                </ListItem>
              </>
            ) : null}
            {!watchRegions.loading && !watchRegions.error && watchRegions.regions.length === 0 ? (
              <NativeText>No watch regions are available.</NativeText>
            ) : null}

            {!draft.watchRegion ? (
              <NativeText>Select a region to load its streaming providers.</NativeText>
            ) : watchProviders.mediaType === draft.mediaType
              && watchProviders.region === draft.watchRegion
              && watchProviders.loading ? (
                <NativeText>Loading streaming providers…</NativeText>
              ) : watchProviders.mediaType === draft.mediaType
                && watchProviders.region === draft.watchRegion
                && watchProviders.error ? (
                  <>
                    <NativeText>{watchProviders.error}</NativeText>
                    <ListItem onPress={loading ? undefined : () => setWatchProvidersRetry((attempt) => attempt + 1)}>
                      <NativeText>Retry loading providers</NativeText>
                    </ListItem>
                  </>
                ) : activeWatchProviders.length === 0 && selectedWatchProviderIds.length === 0 ? (
                  <NativeText>No streaming providers are available for this region.</NativeText>
                ) : (
                  <ListItem
                    trailing={(
                      <RNHostView matchContents>
                        <MenuView
                          title="Streaming providers"
                          actions={providerActions}
                          onPressAction={({ nativeEvent }) => {
                            if (nativeEvent.event === 'clear') {
                              updateDraft('watchProviders', '');
                              return;
                            }
                            if (!/^\d+$/.test(nativeEvent.event)) return;
                            setDraft((current) => {
                              const selectedIds = new Set(
                                current.watchProviders.split(/[|,]/).filter(Boolean),
                              );
                              if (selectedIds.has(nativeEvent.event)) {
                                selectedIds.delete(nativeEvent.event);
                              } else {
                                selectedIds.add(nativeEvent.event);
                              }
                              return { ...current, watchProviders: [...selectedIds].join('|') };
                            });
                          }}
                        >
                          <RNView
                            accessible
                            accessibilityRole="button"
                            accessibilityLabel={watchProviderAccessibilityLabel}
                            style={{
                              alignItems: 'center',
                              flexDirection: 'row',
                              gap: 6,
                              minHeight: 44,
                              paddingHorizontal: 8,
                            }}
                          >
                            <RNText style={{ color: colors.textMuted }}>{watchProviderSelectionLabel}</RNText>
                            <Ionicons name="chevron-down" size={16} color={colors.textMuted} />
                          </RNView>
                        </MenuView>
                      </RNHostView>
                    )}
                  >
                    <NativeText>Streaming providers</NativeText>
                  </ListItem>
                )}
            <FieldGroup.SectionFooter>
              <NativeText>
                Select one or more services. Selected providers are combined as alternatives for this region.
              </NativeText>
            </FieldGroup.SectionFooter>
          </FieldGroup.Section>

          <SettingsSection title="Actions">
            <SettingsRow
              title={isEditingSection ? 'Save changes' : 'Add Catalogue'}
              leading={
                <Ionicons
                  name={isEditingSection ? 'checkmark-circle-outline' : 'add-circle-outline'}
                  size={20}
                  color={settingsActionBlue}
                />
              }
              onPress={saveSection}
              disabled={loading}
              titleColor={settingsActionBlue}
            />
            <SettingsRow
              title="Cancel"
              leading={<Ionicons name="close-circle-outline" size={20} color={settingsIconColors.danger} />}
              onPress={cancelEditor}
              disabled={loading}
              destructive
              isLast
            />
          </SettingsSection>

          </FieldGroup>
        </Host>
      ) : (
        <PosterSectionsManager
          selectedMediaType={selectedPosterMediaType}
          onSelectedMediaTypeChange={setSelectedPosterMediaType}
          onPreferencesChange={setPreferences}
          onAddDiscoverList={startNewSection}
          onEditDiscoverList={editExistingSection}
        />
      )}
    </View>
  );
}
