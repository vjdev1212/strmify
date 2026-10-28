export interface Subtitle {
    fileId: string | number | null;
    language: string;
    url: string;
    label: string;
}

export interface AudioTrack {
    language: string;
    label: string;
    id: string;
}

export interface Chapter {
    title: string;
    start: number;
    thumbnail?: string;
}

export interface OpenSubtitlesClient {
    downloadSubtitle(fileId: string): Promise<DownloadResponse | ErrorResponse>;
}

export interface DownloadResponse {
    link: string;
    file_name: string;
    requests: number;
    remaining: number;
    message: string;
}

export interface ErrorResponse {
    message: string;
    status: number;
}

export interface PlaybackSettings {
    positionSeconds?: number;
    isMuted: boolean;
    playbackSpeed: number;
    contentFit: 'contain' | 'cover' | 'stretch';
    audioTrackIndex: number;
    subtitleMode: 'off' | 'custom' | 'embedded';
    subtitleIndex: number;
    subtitlePosition: number;
    subtitleDelay: number;
}

export interface MediaPlayerProps {
    videoUrl: string;
    title: string;
    isLoadingStream?: boolean;
    loadingMessage?: string;
    audioTracks?: AudioTrack[];
    back: (event: BackEvent) => void;
    resumePlaybackSettings?: PlaybackSettings;
    autoPlay?: boolean;
    pictureInPictureEnabled?: boolean;
    artwork?: string;
    subtitles?: Subtitle[];
    openSubtitlesClient: OpenSubtitlesClient;
    updateProgress: (event: PlaybackPositionEvent) => void;
    onPlaybackError: (event: PlaybackErrorEvent) => void;
    tvShow: TVShowMetadata
}

interface PlayerSwitchEvent {
    message: string;
    code?: string;
    player: "native" | "ksplayer";
    positionSeconds: number;
    durationSeconds: number;
}

export interface TVShowMetadata {
    imdbId: string;
    season: number;
    episode: number;
}

export interface PlaybackPositionEvent {
    positionSeconds: number;
    durationSeconds: number;
    playbackSettings?: PlaybackSettings;
}

interface PlaybackErrorEvent {
    error: string;
}

export interface BackEvent {
    message: string;
    positionSeconds: number;
    durationSeconds: number;
    playbackSettings?: PlaybackSettings;
    code?: string;
    player: "native" | "ksplayer";
}
