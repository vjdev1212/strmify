export interface TraktItem {
    type: 'movie' | 'show';
    movie?: any;
    show?: any;
    episode?: any;
    watched_at?: string;
    rating?: number;
    plays?: number;
    listed_at?: string;
    updated_at?: string;
    last_watched_at?: string;
    last_updated_at?: string;
    progress?: number;
    paused_at?: string;
    action?: string;
    rank?: number;
    id?: number;
    notes?: string;
}

export interface TMDBDetails {
    poster_path?: string;
    backdrop_path?: string;
    vote_average?: number;
    release_date?: string;
    first_air_date?: string;
    runtime?: number;
    episode_run_time?: number[];
}

export interface EnhancedTraktItem extends TraktItem {
    tmdb?: TMDBDetails;
    tmdb_id?: number;
}

export interface ListSection {
    title: string;
    data: EnhancedTraktItem[];
}

export interface CalendarItem {
    type: 'movie' | 'episode';
    date: string;
    title: string;
    show_title?: string;
    year?: number;
    season?: number;
    episode?: number;
    episode_title?: string;
    first_aired?: string;
    tmdb_id?: number;
    poster_path?: string;
    backdrop_path?: string;
    ids?: any;
}

export interface CalendarSection {
    date: string;
    dateLabel: string;
    items: CalendarItem[];
}
