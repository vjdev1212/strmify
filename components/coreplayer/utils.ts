import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

interface CodecInfo {
    videoCodec?: string;
    audioCodec?: string;
    container?: string;
}

export const playHaptic = async () => {
    try {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Soft);
    } catch (error) {
        console.log('Haptics not supported');
    }
}

export const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
        return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
};


// AVFoundation (iOS) supported codecs
const AVF_SUPPORTED_VIDEO_CODECS = [
    'h264', 'avc1', 'avc',
    'hevc', 'hvc1', 'hev1', 'h265',
    'mp4v'
];

const AVF_SUPPORTED_AUDIO_CODECS = [
    'aac',
    'mp4a',
    'mp3',
    'alac',
];

const AVF_SUPPORTED_CONTAINERS = [
    'mp4', 'm4v', 'mov',
    'hls', 'm3u8'
];

// ExoPlayer (Android) supported codecs
const EXOPLAYER_SUPPORTED_VIDEO_CODECS = [
    'h264', 'avc1', 'avc',
    'h265', 'hevc', 'hvc1',
    'vp8', 'vp9',
    'av1',
    'mpeg4'
];

const EXOPLAYER_SUPPORTED_AUDIO_CODECS = [
    'aac', 'mp4a',
    'mp3',
    'opus',
    'vorbis',
    'flac',
    'ac3', 'eac3'
];

const EXOPLAYER_SUPPORTED_CONTAINERS = [
    'mp4', 'm4v', 'mov',
    'mkv', 'webm',
    'ts', 'm3u8', 'hls',
    'avi',
];

// Check if codec/format is supported by native player
const isNativePlayerSupported = (codecInfo: CodecInfo): boolean => {
    const { videoCodec, audioCodec, container } = codecInfo;

    console.log('CodecInfo', codecInfo)

    if (Platform.OS === 'ios') {
        // Check container
        if (container && !AVF_SUPPORTED_CONTAINERS.some(c => container.toLowerCase().includes(c))) {
            console.log(`[Native Player Check] Unsupported container on iOS: ${container}`);
            return false;
        }

        // Check video codec
        if (videoCodec && !AVF_SUPPORTED_VIDEO_CODECS.some(c => videoCodec.toLowerCase().includes(c))) {
            console.log(`[Native Player Check] Unsupported video codec on iOS: ${videoCodec}`);
            return false;
        }

        // Check audio codec
        if (audioCodec && !AVF_SUPPORTED_AUDIO_CODECS.some(c => audioCodec.toLowerCase().includes(c))) {
            console.log(`[Native Player Check] Unsupported audio codec on iOS: ${audioCodec}`);
            return false;
        }

        // Special case: HEVC on iOS might play audio only on some devices
        if (videoCodec && (videoCodec.toLowerCase().includes('hevc') || videoCodec.toLowerCase().includes('h265'))) {
            console.log(`[Native Player Check] HEVC detected on iOS - may have playback issues, using VLC`);
            return false;
        }

        return true;
    }
    else if (Platform.OS === 'android') {
        // Check container
        if (container && !EXOPLAYER_SUPPORTED_CONTAINERS.some(c => container.toLowerCase().includes(c))) {
            console.log(`[Native Player Check] Unsupported container on Android: ${container}`);
            return false;
        }

        // Check video codec
        if (videoCodec && !EXOPLAYER_SUPPORTED_VIDEO_CODECS.some(c => videoCodec.toLowerCase().includes(c))) {
            console.log(`[Native Player Check] Unsupported video codec on Android: ${videoCodec}`);
            return false;
        }

        // Check audio codec
        if (audioCodec && !EXOPLAYER_SUPPORTED_AUDIO_CODECS.some(c => audioCodec.toLowerCase().includes(c))) {
            console.log(`[Native Player Check] Unsupported audio codec on Android: ${audioCodec}`);
            return false;
        }

        return true;
    }

    // Web always uses native
    return true;
};

// Extract codec information from URL or metadata
const extractCodecInfo = (url: string): CodecInfo => {
    const codecInfo: CodecInfo = {};

    // Extract container from URL
    const urlLower = url.toLowerCase();
    if (urlLower.includes('.mkv')) codecInfo.container = 'mkv';
    else if (urlLower.includes('.avi')) codecInfo.container = 'avi';
    else if (urlLower.includes('.mp4')) codecInfo.container = 'mp4';
    else if (urlLower.includes('.mov')) codecInfo.container = 'mov';
    else if (urlLower.includes('.webm')) codecInfo.container = 'webm';
    else if (urlLower.includes('.flv')) codecInfo.container = 'flv';
    else if (urlLower.includes('.wmv')) codecInfo.container = 'wmv';
    else if (urlLower.includes('m3u8') || urlLower.includes('.m3u')) codecInfo.container = 'm3u8';

    // Try to extract codec from URL parameters or filename
    const hevcPatterns = ['hevc', 'h265', 'x265', 'hvc1'];
    const h264Patterns = ['h264', 'x264', 'avc1', 'avc'];
    const vp9Patterns = ['vp9', 'vp09'];
    const av1Patterns = ['av1', 'av01'];

    if (hevcPatterns.some(p => urlLower.includes(p))) {
        codecInfo.videoCodec = 'hevc';
    } else if (h264Patterns.some(p => urlLower.includes(p))) {
        codecInfo.videoCodec = 'h264';
    } else if (vp9Patterns.some(p => urlLower.includes(p))) {
        codecInfo.videoCodec = 'vp9';
    } else if (av1Patterns.some(p => urlLower.includes(p))) {
        codecInfo.videoCodec = 'av1';
    }

    // Extract audio codec hints
    if (urlLower.includes('aac')) codecInfo.audioCodec = 'aac';
    else if (urlLower.includes('opus')) codecInfo.audioCodec = 'opus';
    else if (urlLower.includes('vorbis')) codecInfo.audioCodec = 'vorbis';
    else if (urlLower.includes('ac3') || urlLower.includes('eac3')) codecInfo.audioCodec = 'ac3';

    return codecInfo;
};

// Check if we should fallback to VLC based on codec info
export const shouldFallbackToVLC = (url: string): boolean => {
    if (Platform.OS === 'web') {
        return false; // Web always uses native player
    }

    const codecInfo = extractCodecInfo(url);
    const supported = isNativePlayerSupported(codecInfo);

    if (!supported) {
        console.log('[Player Selection] Falling back to VLC due to unsupported format/codec');
        console.log('[Player Selection] Codec Info:', codecInfo);
    }

    return !supported;
};

