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

export interface MediaPlayerProps {
    videoUrl: string;
    title: string;
    audioTracks?: AudioTrack[];
    onBack: () => void;
    autoPlay?: boolean;
    artwork?: string;
    subtitles?: Subtitle[];
    openSubtitlesClient: OpenSubtitlesClient;
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
