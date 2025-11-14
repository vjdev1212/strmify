
// Helper function to extract quality from stream name
export const extractQuality = (name: string, title: string | undefined): string => {
    const qualities = ['2160p', '1440p', '1080p', '720p', '480p', '360p', '4K', '2K', 'TeleSync', 'HDTS', 'DVD', 'WEB-DL', 'WEBDL', 'CAM'];

    for (const quality of qualities) {
        const lowerQuality = quality.toLowerCase();

        if (name.toLowerCase().includes(lowerQuality)) {
            return quality;
        }

        if (title && title.toLowerCase().includes(lowerQuality)) {
            return quality;
        }
    }

    return '';
};

export const extractVideoCodec = (text: string): string => {
    const codecs = [
        'AV1',
        'HEVC', 'H.265', 'X265',
        'AVC', 'H.264', 'X264',
        'VP9'
    ];

    const lower = text.toLowerCase();

    for (const codec of codecs) {
        if (lower.includes(codec.toLowerCase())) {
            return codec; // Return normalized codec name
        }
    }

    return '';
};

export const extractAudioCodec = (text: string): string => {
    const codecs = [
        'Dolby Atmos',
        'TrueHD',
        'DTS-HD', 'DTSHD', 'DTS',
        'EAC3', 'DD+', 'DDP',
        'AC3', 'DD',
        'AAC',
        'FLAC',
        'Opus'
    ];

    const lower = text.toLowerCase();

    for (const codec of codecs) {
        if (lower.includes(codec.toLowerCase())) {
            return codec; // Return normalized codec name
        }
    }

    return '';
};


// Helper function to extract size from description or title
export const extractSize = (text: string): string => {
    const sizeMatch = text?.match(/(\d+(?:\.\d+)?)\s*(GB|MB|TB)/i);
    return sizeMatch ? `${sizeMatch[1]} ${sizeMatch[2]}` : '';
};

// Helper function to check if stream is a torrent
export const getStreamType = (stream: any): string => {
    if (!!stream.infoHash || stream.name?.toLowerCase().includes('torrent')) {
        return 'Torrent';
    }
    if (!!stream.embed) {
        return 'Embed';
    }
    return 'Direct';
};