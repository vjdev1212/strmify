import { CatalogUrl } from '@/constants/Tmdb';
import { StorageKeys, storageService } from '@/utils/StorageService';

export type HomeMediaType = 'movie' | 'series';
export type HomeFilter = 'all' | 'movies' | 'series';
export type HomeSortOrder =
    | 'popularity.desc'
    | 'popularity.asc'
    | 'release_date.desc'
    | 'release_date.asc'
    | 'vote_average.desc'
    | 'vote_average.asc'
    | 'vote_count.desc'
    | 'vote_count.asc'
    | 'title.asc'
    | 'title.desc'
    | 'original_title.asc'
    | 'original_title.desc'
    | 'revenue.asc'
    | 'revenue.desc';

export interface HomeSection {
    id: string;
    title: string;
    mediaType: HomeMediaType;
    kind: 'catalog' | 'discover';
    enabled: boolean;
    languageCode?: string;
    displayLanguage?: string;
    region?: string;
    originCountry?: string;
    sortBy: HomeSortOrder;
    releaseAfterDaysAgo?: number;
    releaseBeforeDaysAgo?: number;
    genreIds?: string;
    certificationCountry?: string;
    certification?: string;
    certificationGte?: string;
    certificationLte?: string;
    minimumVoteAverage?: number;
    minimumVoteCount?: number;
    minimumRuntime?: number;
    maximumRuntime?: number;
    watchRegion?: string;
    watchProviders?: string;
}

export interface HomePreferences {
    sections: HomeSection[];
}

export interface HomeListItem {
    id: string;
    title: string;
    mediaType: HomeMediaType;
    apiUrl: string;
    minimumPopularity?: number;
}

interface HomeCatalogDefinition {
    id: string;
    title: string;
    allTitle?: string;
    mediaType: HomeMediaType;
    apiUrl: string;
    visibleIn: HomeFilter[];
}

const movieGenreKeys = [
    'action', 'adventure', 'scifi', 'comedy', 'family', 'animation',
    'thriller', 'crime', 'horror', 'mystery', 'fantasy', 'drama',
];
const seriesGenreKeys = [
    'actionAdventure', 'drama', 'crime', 'comedy', 'mystery',
    'scifiFantsy', 'animation', 'family', 'kids',
];

const legacyGenreCatalogIds = new Set([
    ...movieGenreKeys.map((name) => `catalog:movie:${name}`),
    ...seriesGenreKeys.map((name) => `catalog:series:${name}`),
]);
const removedCatalogIds = new Set(['catalog:movie:upcoming']);

export const HOME_CATALOG: HomeCatalogDefinition[] = [
    { id: 'catalog:movie:trending', title: 'Movies - Trending', allTitle: 'Movies - Trending', mediaType: 'movie', apiUrl: CatalogUrl.trendingMovies, visibleIn: ['all', 'movies'] },
    { id: 'catalog:series:trending', title: 'Series - Trending', allTitle: 'Series - Trending', mediaType: 'series', apiUrl: CatalogUrl.trendingSeries, visibleIn: ['all', 'series'] },
    { id: 'catalog:movie:popular', title: 'Movies - Popular', mediaType: 'movie', apiUrl: CatalogUrl.popularMovies, visibleIn: ['all', 'movies'] },
    { id: 'catalog:series:popular', title: 'Series - Popular', mediaType: 'series', apiUrl: CatalogUrl.popularSeries, visibleIn: ['all', 'series'] },
    { id: 'catalog:movie:top-rated', title: 'Movies - Top Rated', mediaType: 'movie', apiUrl: CatalogUrl.topMovies, visibleIn: ['all', 'movies'] },
    { id: 'catalog:series:top-rated', title: 'Series - Top Rated', mediaType: 'series', apiUrl: CatalogUrl.topSeries, visibleIn: ['all', 'series'] },
    { id: 'catalog:movie:now-playing', title: 'Movies - Now Playing', allTitle: 'Movies - Now Playing', mediaType: 'movie', apiUrl: CatalogUrl.nowPlayingMovies, visibleIn: ['all', 'movies'] },
    { id: 'catalog:series:on-the-air', title: 'Series - On the Air', mediaType: 'series', apiUrl: CatalogUrl.onTheAirTv, visibleIn: ['all', 'series'] },
    { id: 'catalog:series:airing-today', title: 'Series - Airing Today', mediaType: 'series', apiUrl: CatalogUrl.airingTodayTv, visibleIn: ['all', 'series'] },
];

const defaultSection = (definition: HomeCatalogDefinition): HomeSection => ({
    id: definition.id,
    title: definition.title,
    mediaType: definition.mediaType,
    kind: 'catalog',
    enabled: true,
    sortBy: 'popularity.desc',
});

export function createDefaultHomePreferences(): HomePreferences {
    return {
        sections: HOME_CATALOG.map(defaultSection),
    };
}

export const DEFAULT_HOME_PREFERENCES = createDefaultHomePreferences();

export function normalizeHomeGenreIds(value: string): string {
    return [...new Set(value.split(/[|,]/).map((id) => id.trim()).filter(Boolean))].join(',');
}

function isHomeSection(value: unknown): value is HomeSection {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const section = value as Record<string, unknown>;
    const isSortOrder = section.sortBy === 'popularity.desc'
        || section.sortBy === 'popularity.asc'
        || section.sortBy === 'release_date.desc'
        || section.sortBy === 'release_date.asc'
        || section.sortBy === 'vote_average.desc'
        || section.sortBy === 'vote_average.asc'
        || section.sortBy === 'vote_count.desc'
        || section.sortBy === 'vote_count.asc'
        || section.sortBy === 'title.asc'
        || section.sortBy === 'title.desc'
        || section.sortBy === 'original_title.asc'
        || section.sortBy === 'original_title.desc'
        || section.sortBy === 'revenue.asc'
        || section.sortBy === 'revenue.desc';

    return typeof section.id === 'string'
        && typeof section.title === 'string'
        && section.title.trim().length > 0
        && section.title.length <= 60
        && (section.mediaType === 'movie' || section.mediaType === 'series')
        && (section.kind === 'catalog' || section.kind === 'discover')
        && typeof section.enabled === 'boolean'
        && (section.kind !== 'catalog'
            || HOME_CATALOG.some((item) => item.id === section.id)
            || legacyGenreCatalogIds.has(section.id))
        && (section.languageCode === undefined || (typeof section.languageCode === 'string' && /^[a-z]{2}$/i.test(section.languageCode)))
        && (section.displayLanguage === undefined
            || (typeof section.displayLanguage === 'string' && /^[a-z]{2}-[a-z]{2}$/i.test(section.displayLanguage)))
        && (section.region === undefined || (typeof section.region === 'string' && /^[a-z]{2}$/i.test(section.region)))
        && (section.originCountry === undefined || (typeof section.originCountry === 'string' && /^[a-z]{2}$/i.test(section.originCountry)))
        && (section.certificationCountry === undefined
            || (typeof section.certificationCountry === 'string' && /^[a-z]{2}(?:-[a-z]{2})?$/i.test(section.certificationCountry)))
        && (section.certification === undefined || typeof section.certification === 'string')
        && (section.certificationGte === undefined || typeof section.certificationGte === 'string')
        && (section.certificationLte === undefined || typeof section.certificationLte === 'string')
        && isSortOrder
        && (section.mediaType === 'movie' || (section.sortBy !== 'revenue.asc' && section.sortBy !== 'revenue.desc'))
        && (section.releaseAfterDaysAgo === undefined
            || (typeof section.releaseAfterDaysAgo === 'number'
                && Number.isInteger(section.releaseAfterDaysAgo)
                && section.releaseAfterDaysAgo >= 0
                && section.releaseAfterDaysAgo <= 3650))
        && (section.releaseBeforeDaysAgo === undefined
            || (typeof section.releaseBeforeDaysAgo === 'number'
                && Number.isInteger(section.releaseBeforeDaysAgo)
                && section.releaseBeforeDaysAgo >= 0
                && section.releaseBeforeDaysAgo <= 3650))
        && (section.genreIds === undefined || (typeof section.genreIds === 'string' && /^\d+([,|]\d+)*$/.test(section.genreIds)))
        && (section.minimumVoteAverage === undefined
            || (typeof section.minimumVoteAverage === 'number' && section.minimumVoteAverage >= 0 && section.minimumVoteAverage <= 10))
        && (section.minimumVoteCount === undefined
            || (typeof section.minimumVoteCount === 'number' && Number.isInteger(section.minimumVoteCount) && section.minimumVoteCount >= 0))
        && (section.minimumRuntime === undefined
            || (typeof section.minimumRuntime === 'number' && Number.isInteger(section.minimumRuntime) && section.minimumRuntime >= 0))
        && (section.maximumRuntime === undefined
            || (typeof section.maximumRuntime === 'number' && Number.isInteger(section.maximumRuntime) && section.maximumRuntime >= 0))
        && (section.watchRegion === undefined || (typeof section.watchRegion === 'string' && /^[a-z]{2}$/i.test(section.watchRegion)))
        && (section.watchProviders === undefined
            || (typeof section.watchProviders === 'string' && /^\d+(,\d+|\|\d+)*$/.test(section.watchProviders)))
        && (section.watchProviders === undefined || section.watchRegion !== undefined)
        && (section.releaseAfterDaysAgo === undefined
            || section.releaseBeforeDaysAgo === undefined
            || section.releaseAfterDaysAgo > section.releaseBeforeDaysAgo)
        && (section.minimumRuntime === undefined
            || section.maximumRuntime === undefined
            || section.minimumRuntime <= section.maximumRuntime);
}

function parseSavedSection(value: unknown, legacy = false): HomeSection {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error('Saved home section is invalid.');
    }

    const section = value as Record<string, unknown>;
    const normalized = {
        ...section,
        kind: section.kind ?? (legacy ? 'discover' : undefined),
        enabled: section.enabled ?? true,
        displayLanguage: section.displayLanguage ?? 'en-US',
    };
    if (!isHomeSection(normalized)) throw new Error('Saved home section is invalid.');
    return normalized;
}

export function loadHomePreferences(): HomePreferences {
    const savedPreferences = storageService.getItem(StorageKeys.HOME_PREFERENCES_KEY);
    if (!savedPreferences) return createDefaultHomePreferences();

    const parsed: unknown = JSON.parse(savedPreferences);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        throw new Error('Saved home screen preferences are invalid.');
    }

    const stored = parsed as Record<string, unknown>;

    if (Array.isArray(stored.sections)) {
        const savedSections = stored.sections
            .filter((section) => {
                if (!section || typeof section !== 'object' || Array.isArray(section)) return true;
                const id = (section as Record<string, unknown>).id;
                return typeof id !== 'string' || !removedCatalogIds.has(id);
            })
            .map((section) => parseSavedSection(section))
            .filter((section) => (
                section.kind !== 'catalog' || !legacyGenreCatalogIds.has(section.id)
            ))
            .map((section) => {
                if (section.kind !== 'catalog') return section;
                const definition = HOME_CATALOG.find((item) => item.id === section.id);
                return definition ? { ...section, title: definition.title } : section;
            });
        const ids = new Set<string>();
        for (const section of savedSections) {
            if (ids.has(section.id)) throw new Error('Saved home sections contain duplicate IDs.');
            ids.add(section.id);
        }
        const missingCatalog = HOME_CATALOG
            .filter((definition) => !ids.has(definition.id))
            .map(defaultSection);
        return { sections: [...savedSections, ...missingCatalog] };
    }

    const showDefaultLists = typeof stored.showDefaultLists === 'boolean' ? stored.showDefaultLists : true;
    const customSections = Array.isArray(stored.customSections)
        ? stored.customSections.map((section) => parseSavedSection(section, true))
        : [];
    return {
        sections: [
            ...HOME_CATALOG.map((definition) => ({ ...defaultSection(definition), enabled: showDefaultLists })),
            ...customSections,
        ],
    };
}

export function saveHomePreferences(preferences: HomePreferences): void {
    storageService.setItem(StorageKeys.HOME_PREFERENCES_KEY, JSON.stringify(preferences));
}

function formatDateDaysAgo(daysAgo: number): string {
    const date = new Date();
    date.setDate(date.getDate() - daysAgo);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

export function buildHomeSectionApiUrl(section: HomeSection): string {
    const endpoint = section.mediaType === 'movie' ? 'movie' : 'tv';
    const sortBy = section.sortBy === 'release_date.desc'
        ? section.mediaType === 'movie' ? 'primary_release_date.desc' : 'first_air_date.desc'
        : section.sortBy === 'release_date.asc'
            ? section.mediaType === 'movie' ? 'primary_release_date.asc' : 'first_air_date.asc'
            : section.sortBy === 'title.asc' || section.sortBy === 'title.desc'
                ? section.mediaType === 'movie' ? section.sortBy : section.sortBy.replace('title', 'name')
                : section.sortBy === 'original_title.asc' || section.sortBy === 'original_title.desc'
                    ? section.mediaType === 'movie' ? section.sortBy : section.sortBy.replace('original_title', 'original_name')
                    : section.sortBy;
    const query = new URLSearchParams({ sort_by: sortBy, language: section.displayLanguage ?? 'en-US' });

    if (section.languageCode) query.set('with_original_language', section.languageCode);
    if (section.region) query.set('region', section.region.toUpperCase());
    if (section.originCountry) query.set('with_origin_country', section.originCountry.toUpperCase());
    if (section.genreIds) query.set('with_genres', normalizeHomeGenreIds(section.genreIds));
    const hasCertificationFilter = Boolean(
        section.certification || section.certificationGte || section.certificationLte,
    );
    if (
        section.mediaType === 'movie'
        && hasCertificationFilter
        && section.certificationCountry
        && section.region
    ) {
        query.set('certification_country', section.certificationCountry.toUpperCase());
        if (section.certification) query.set('certification', section.certification);
        if (section.certificationGte) query.set('certification.gte', section.certificationGte);
        if (section.certificationLte) query.set('certification.lte', section.certificationLte);
    }
    if (section.minimumVoteAverage !== undefined) query.set('vote_average.gte', String(section.minimumVoteAverage));
    if (section.minimumVoteCount !== undefined) query.set('vote_count.gte', String(section.minimumVoteCount));
    if (section.minimumRuntime !== undefined) query.set('with_runtime.gte', String(section.minimumRuntime));
    if (section.maximumRuntime !== undefined) query.set('with_runtime.lte', String(section.maximumRuntime));
    if (section.watchProviders && section.watchRegion) {
        query.set('watch_region', section.watchRegion.toUpperCase());
        query.set('with_watch_providers', section.watchProviders);
    }

    const dateField = section.mediaType === 'movie' ? 'release_date' : 'first_air_date';
    if (section.releaseAfterDaysAgo !== undefined) {
        query.set(`${dateField}.gte`, formatDateDaysAgo(section.releaseAfterDaysAgo));
    }
    if (section.releaseBeforeDaysAgo !== undefined) {
        query.set(`${dateField}.lte`, formatDateDaysAgo(section.releaseBeforeDaysAgo));
    }

    return `https://api.themoviedb.org/3/discover/${endpoint}?${query.toString()}`;
}

export function getVisibleHomeSections(
    preferences: HomePreferences,
    filter: HomeFilter,
): HomeListItem[] {
    const catalogById = new Map(HOME_CATALOG.map((definition) => [definition.id, definition]));
    return preferences.sections.flatMap((section) => {
        if (!section.enabled) return [];

        if (section.kind === 'catalog') {
            const definition = catalogById.get(section.id);
            if (!definition || !definition.visibleIn.includes(filter)) return [];
            return [{
                id: section.id,
                title: filter === 'all' ? definition.allTitle ?? definition.title : definition.title,
                mediaType: definition.mediaType,
                apiUrl: definition.apiUrl,
            }];
        }

        if (filter !== 'all' && section.mediaType !== (filter === 'movies' ? 'movie' : 'series')) return [];
        return [{
            id: section.id,
            title: section.title,
            mediaType: section.mediaType,
            apiUrl: buildHomeSectionApiUrl(section),
            minimumPopularity: 1,
        }];
    });
}
