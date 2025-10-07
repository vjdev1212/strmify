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
    back: (event: BackEvent) => void;
    progress?: number;
    artwork?: string;
    subtitles?: Subtitle[];
    openSubtitlesClient: OpenSubtitlesClient;
    // switchMediaPlayer?: (error: PlayerSwitchEvent) => void;
    updateProgress: (event: UpdateProgessEvent) => void;
}

interface PlayerSwitchEvent {
    message: string;
    code?: string;
    player: "native" | "vlc",
    progress: number;
}

interface UpdateProgessEvent {
    progress: number
}

interface BackEvent {
    message: string;
    code?: string;
    player: "native" | "vlc",
    // progress: number
}