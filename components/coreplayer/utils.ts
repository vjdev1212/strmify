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