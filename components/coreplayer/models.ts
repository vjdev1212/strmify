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

export interface MediaPlayerProps {
    videoUrl: string;
    title: string;
    audioTracks?: AudioTrack[];
    back: (event: BackEvent) => void;
    progress?: number;
    autoPlay?: boolean;
    artwork?: string;
    subtitles?: Subtitle[];
    openSubtitlesClient: OpenSubtitlesClient;
    updateProgress: (event: UpdateProgessEvent) => void;
    onPlaybackError: (event: PlaybackErrorEvent) => void;
}

interface PlayerSwitchEvent {
    message: string;
    code?: string;
    player: "native" | "vlc";
    progress: number;
}

interface UpdateProgessEvent {
    progress: number;
}

interface PlaybackErrorEvent {
    error: string;
}

interface BackEvent {
    message: string;
    progress: number;
    code?: string;
    player: "native" | "vlc";
}