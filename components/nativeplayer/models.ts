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

export interface MediaPlayerProps {
    videoUrl: string;
    title: string;
    subtitles?: Subtitle[];
    audioTracks?: AudioTrack[];
    onBack: () => void;
    autoPlay?: boolean;
    artwork?: string;
}

type ResizeMode = 'contain' | 'cover' | 'stretch';