export const extractQuality = (name: string, title: string | undefined): string => {
    const qualities = [
        '2160p', '1440p', '1080p', '720p', '480p', '360p', '240p',
        '4K', '2K', '8K',
        'UHD', 'FHD', 'HD', 'SD',
        'TeleSync', 'HDTS',
        'DVD',
        'WEB-DL', 'WEBDL',
        'CAM',
        '3D'
    ];

    for (const quality of qualities) {
        const lowerQuality = quality.toLowerCase();

        if (name.toLowerCase().includes(lowerQuality)) {
            if (quality === '4K') return '2160p';
            if (quality === '2K') return '1440p';
            if (quality === 'UHD') return '2160p';
            if (quality === 'FHD') return '1080p';
            return quality;
        }

        if (title && title.toLowerCase().includes(lowerQuality)) {
            if (quality === '4K') return '2160p';
            if (quality === '2K') return '1440p';
            if (quality === 'UHD') return '2160p';
            if (quality === 'FHD') return '1080p';
            return quality;
        }
    }

    return '';
};

export const extractVideoCodec = (text: string): string => {
    const codecs = [
        'AV1',
        'HEVC', 'H.265', 'H265', 'X265',
        'AVC', 'H.264', 'H264', 'X264',
        'VP9', 'VP8',
        'MPEG-2', 'MPEG2'
    ];

    const lower = text.toLowerCase();

    for (const codec of codecs) {
        if (lower.includes(codec.toLowerCase())) {
            switch (codec.toLowerCase()) {
                case 'h.265': case 'h265': case 'x265': return 'HEVC';
                case 'h.264': case 'h264': case 'x264': return 'AVC';
                case 'mpeg-2': case 'mpeg2': return 'MPEG-2';
                default: return codec.toUpperCase();
            }
        }
    }

    return '';
};

export const extractAudioCodec = (text: string): string => {
    const codecs = [
        'Dolby Atmos', 'Atmos', 'DDPA',
        'TrueHD',
        'DTS-HD MA', 'DTS-HD', 'DTSHD', 'DTS-X', 'DTS',
        'EAC3', 'DD+', 'DDP', 'E-AC-3',
        'AC3', 'DD',
        'AAC',
        'FLAC',
        'Opus',
        'MP3',
        'Vorbis'
    ];

    const lower = text.toLowerCase();

    for (const codec of codecs) {
        if (lower.includes(codec.toLowerCase())) {
            switch (codec.toLowerCase()) {
                case 'atmos': return 'Dolby Atmos';
                case 'ddpa': return 'DD+ Atmos';
                case 'dd+': case 'ddp': case 'e-ac-3': return 'EAC3';
                case 'dd': return 'AC3';
                case 'dtshd': case 'dts-hd': return 'DTS-HD';
                default: return codec;
            }
        }
    }

    return '';
};

export const extractSource = (text: string): string => {
    const sources = [
        'BluRay', 'Blu-ray', 'BDRip', 'BRRip', 'BD',
        'WEB-DL', 'WEBDL', 'WEBRip', 'WEB',
        'NF', 'Netflix',
        'AMZN', 'Amazon',
        'DSNP', 'Disney+', 'DisneyPlus',
        'HMAX', 'HBO Max', 'HBOMax',
        'HULU',
        'ATVP', 'AppleTV+',
        'PCOK', 'Peacock',
        'PMTP', 'Paramount+',
        'DVDRip', 'DVD',
        'HDTV', 'PDTV', 'SDTV',
        'CAM', 'CAMRIP',
        'TS', 'TELESYNC', 'HDTS',
        'TC', 'TELECINE',
        'SCREENER', 'SCR', 'DVDSCR',
        'WORKPRINT', 'WP',
        'PPVRIP', 'PPV',
        'HDTC', 'R5', 'DVDR'
    ];

    const lower = text.toLowerCase();

    for (const source of sources) {
        if (lower.includes(source.toLowerCase())) {
            switch (source.toLowerCase()) {
                case 'nf': return 'Netflix';
                case 'amzn': return 'Amazon';
                case 'dsnp': return 'Disney+';
                case 'hmax': return 'HBO Max';
                case 'atvp': return 'AppleTV+';
                case 'pcok': return 'Peacock';
                case 'pmtp': return 'Paramount+';
                case 'blu-ray': case 'bd': return 'BluRay';
                case 'webdl': return 'WEB-DL';
                case 'ts': case 'hdts': return 'TeleSync';
                case 'tc': return 'TeleCine';
                case 'scr': case 'dvdscr': return 'Screener';
                case 'wp': return 'WorkPrint';
                default: return source;
            }
        }
    }

    return '';
};

export const extractHDR = (text: string): string => {
    const hdrFormats = [
        'DV HDR', 'DV', 'Dolby Vision', 'DoVi',
        'HDR10+', 'HDR10',
        'HDR',
        'HLG'
    ];

    const lower = text.toLowerCase();

    for (const format of hdrFormats) {
        if (lower.includes(format.toLowerCase())) {
            switch (format.toLowerCase()) {
                case 'dv': case 'dovi': return 'DV';
                case 'dv hdr': return 'DV HDR';
                case 'hdr10+': return 'HDR10+';
                case 'hdr10': return 'HDR10';
                default: return format;
            }
        }
    }

    return '';
};

export const extractAudioChannels = (text: string): string => {
    const channels = ['7.1', '5.1', '2.1', '2.0', 'Stereo', 'Mono'];

    const lower = text.toLowerCase();

    for (const channel of channels) {
        if (lower.includes(channel.toLowerCase())) {
            return channel;
        }
    }

    return '';
};

export const getSourcePriority = (source: string): number => {
    const priorities: Record<string, number> = {
        'BluRay': 10, 'BDRip': 10, 'BRRip': 10,
        'WEB-DL': 9, 'WEBDL': 9,
        'WEBRip': 8,
        'HDTV': 7,
        'DVDRip': 6, 'DVD': 6,
        'Screener': 5,
        'TeleSync': 4, 'HDTS': 4,
        'TeleCine': 3,
        'CAM': 2
    };

    return priorities[source] || 0;
};

export const extractSize = (text: string): string => {
    const sizeMatch = text?.match(/(\d+(?:\.\d+)?)\s*(GB|MB|TB|GiB|MiB|TiB)/i);
    return sizeMatch ? `${sizeMatch[1]} ${sizeMatch[2].toUpperCase()}` : '';
};

export const getStreamType = (stream: any): string => {
    if (stream.infoHash || stream.name?.toLowerCase().includes('torrent')) {
        return 'Torrent';
    }
    if (stream.embed) {
        return 'Embed';
    }
    if (stream.url) {
        return 'Direct';
    }
    return 'Unknown';
};