import { Platform } from 'react-native';

export interface MediaCapabilities {
  videoCodecs: string[];
  audioCodecs: string[];
  maxAudioChannels: number;
  formats: string[];
}

export interface ProbeResult {
  format: {
    name: string;
    duration: number;
  };
  streams: Array<{
    track: 'video' | 'audio' | 'subtitle';
    codec: string;
    channels?: number;
  }>;
}

export interface StreamResult {
  url: string;
  needsTranscoding: boolean;
  reason?: string;
  serverType?: 'local' | 'remote';
}

export interface StatsResult {
  downloadSpeed?: number;
  uploadSpeed?: number;
  peers?: number;
  downloaded?: number;
}

export interface CompatibilityResult {
  compatible: boolean;
  reason?: string;
}

const IOS_CAPABILITIES: MediaCapabilities = {
  videoCodecs: ['h264', 'avc', 'avc1', 'hevc', 'hvc1', 'hev1', 'mp4v'],
  audioCodecs: ['aac', 'mp4a', 'mp3', 'alac', 'flac', 'ac3', 'eac3', 'pcm', 'lpcm', 'amr'],
  maxAudioChannels: 6,
  formats: ['mp4', 'm4v', 'mov', 'm4a', 'm3u8', 'ts', '3gp', '3g2', 'wav', 'caf'],
};

const ANDROID_CAPABILITIES: MediaCapabilities = {
  videoCodecs: ['h264', 'avc', 'avc1', 'h265', 'hevc', 'hvc1', 'hev1', 'vp8', 'vp9', 'av01', 'mp4v', 'h263'],
  audioCodecs: ['aac', 'mp4a', 'mp3', 'opus', 'vorbis', 'flac', 'alac', 'ac3', 'eac3', 'dtsc', 'dtsh', 'dtsl', 'pcm', 'lpcm', 'amr'],
  maxAudioChannels: 8,
  formats: ['mp4', 'm4v', 'm4a', 'mkv', 'webm', 'm3u8', 'ts', 'mp3', 'ogg', 'wav', 'flac', '3gp', '3g2', 'mpg', 'mpeg'],
};

const WEB_CAPABILITIES: MediaCapabilities = {
  videoCodecs: ['h264', 'avc', 'avc1', 'vp8', 'vp9'],
  audioCodecs: ['aac', 'mp4a', 'mp3', 'opus', 'vorbis'],
  maxAudioChannels: 2,
  formats: ['mp4', 'webm'],
};

const SERVER_TRANSCODE_CAPABILITIES: MediaCapabilities = {
  videoCodecs: ['h264'],
  audioCodecs: ['aac', 'mp3', 'ac3', 'eac3', 'opus'],
  maxAudioChannels: Platform.OS === 'web' ? 2 : 8,
  formats: ['mp4'],
};

const CODEC_ALIASES: Record<string, string[]> = {
  h264: ['avc', 'avc1'],
  h265: ['hevc', 'hev1', 'hvc1'],
  aac: ['mp4a'],
  eac3: ['ec-3'],
};

export class StreamingServerClient {
  private baseURL: string;
  private capabilities: MediaCapabilities;
  private platform: string;

  constructor(
    streamingServerURL: string,
    customCapabilities?: MediaCapabilities
  ) {
    this.baseURL = streamingServerURL.replace(/\/$/, '');
    this.platform = Platform.OS;

    if (customCapabilities) {
      this.capabilities = customCapabilities;
    } else {
      this.capabilities = this.getPlatformCapabilities();
    }

    console.log('StreamingServerClient Initialized:', {
      baseURL: this.baseURL,
      platform: this.platform,
      isLocal: this.isLocal(),
      capabilities: this.capabilities,
    });
  }

  private isLocal(): boolean {
    return this.baseURL.includes('localhost') || this.baseURL.includes('127.0.0.1');
  }

  private getPlatformCapabilities(): MediaCapabilities {
    switch (Platform.OS) {
      case 'ios':
        console.log('Using iOS/AVFoundation capabilities');
        return IOS_CAPABILITIES;
      case 'android':
        console.log('Using Android/ExoPlayer capabilities');
        return ANDROID_CAPABILITIES;
      case 'web':
        console.log('Using Web/HTML5 capabilities');
        return WEB_CAPABILITIES;
      default:
        console.log('Unknown platform, using web capabilities');
        return WEB_CAPABILITIES;
    }
  }

  /**
   * Get streaming URL for a torrent file
   * - Local (localhost/127.0.0.1): Always returns direct URL
   * - Remote: Checks compatibility and may return HLS URL with transcoding
   * @param infoHash - Torrent info hash
   * @param fileIdx - File index (default -1 for largest file)
   * @returns Streaming URL (direct or HLS)
   */
  async getStreamingURL(infoHash: string, fileIdx: number = -1): Promise<string> {
    console.log('Getting streaming URL:', { infoHash, fileIdx });

    const directURL = `${this.baseURL}/${encodeURIComponent(infoHash)}/${fileIdx}`;
    console.log('Direct URL:', directURL);

    // If local server, always use direct URL
    const isLocal = this.baseURL.includes('localhost') || this.baseURL.includes('127.0.0.1');
    
    if (isLocal) {
      console.log('✓ Local server - using direct URL');
      return directURL;
    }

    // Remote server - check compatibility
    console.log('Remote server - checking compatibility...');
    const result = await this.checkCompatibility(directURL);

    if (result.compatible) {
      console.log('✓ Can play directly');
      return directURL;
    }

    console.log('✗ Needs transcoding:', result.reason);
    console.log('Generating HLS URL with server transcode capabilities');
    const hlsURL = this.generateHLSURL(directURL);
    console.log('HLS URL:', hlsURL);

    return hlsURL;
  }

  /**
   * Get stream info with URL
   * @param infoHash - Torrent info hash
   * @param fileIdx - File index (default -1 for largest file)
   * @returns Stream result with URL and metadata
   */
  async getStream(infoHash: string, fileIdx: number = -1): Promise<StreamResult> {
    const directURL = `${this.baseURL}/${encodeURIComponent(infoHash)}/${fileIdx}`;
    const isLocal = this.baseURL.includes('localhost') || this.baseURL.includes('127.0.0.1');

    // Local - always direct
    if (isLocal) {
      return {
        url: directURL,
        needsTranscoding: false,
        serverType: 'local',
      };
    }

    // Remote - check compatibility
    const result = await this.checkCompatibility(directURL);

    if (result.compatible) {
      return {
        url: directURL,
        needsTranscoding: false,
        serverType: 'remote',
      };
    }

    return {
      url: this.generateHLSURL(directURL),
      needsTranscoding: true,
      reason: result.reason,
      serverType: 'remote',
    };
  }

  /**
   * Get streaming stats for a torrent
   * @param infoHash - Torrent info hash
   * @param fileIdx - File index (default -1 for largest file)
   * @returns Stats or null if failed
   */
  async getStats(infoHash: string, fileIdx: number = -1): Promise<StatsResult | null> {
    try {
      const statsURL = `${this.baseURL}/${encodeURIComponent(infoHash)}/${fileIdx}/stats.json`;
      console.log('Getting stats from:', statsURL);

      const response = await fetch(statsURL);

      if (!response.ok) {
        console.warn('Stats request failed:', response.status);
        return null;
      }

      const stats = await response.json();
      console.log('Stats:', stats);
      
      return stats;
    } catch (error) {
      console.error('Stats error:', error);
      return null;
    }
  }

  /**
   * Check if a media URL is compatible with current platform capabilities
   * Only works with remote servers that have /hlsv2/probe endpoint
   * @param mediaURL - The URL of the media to check
   * @returns Promise with compatibility result
   */
  async checkCompatibility(mediaURL: string): Promise<CompatibilityResult> {
    try {
      console.log('Probing media...');

      const probeURL = `${this.baseURL}/hlsv2/probe?${new URLSearchParams({
        mediaURL: mediaURL,
      })}`;

      const response = await fetch(probeURL);

      if (!response.ok) {
        console.warn('Probe failed, assuming transcoding needed');
        return { compatible: false, reason: 'Probe request failed' };
      }

      const probe: ProbeResult = await response.json();
      console.log('Probe result:', probe);

      // Check format compatibility
      const formatSupported = this.isFormatSupported(probe.format.name);

      if (!formatSupported) {
        const reason = `Container format '${probe.format.name}' not supported on ${this.platform}`;
        console.log('Format check:', reason);
        return {
          compatible: false,
          reason
        };
      }

      // Check video and audio streams
      for (const stream of probe.streams) {
        if (stream.track === 'video') {
          const isSupported = this.isCodecSupported(stream.codec, this.capabilities.videoCodecs);
          console.log('Video codec check:', {
            codec: stream.codec,
            supported: isSupported,
          });

          if (!isSupported) {
            const reason = `Video codec '${stream.codec}' not supported on ${this.platform}`;
            return {
              compatible: false,
              reason
            };
          }
        } else if (stream.track === 'audio') {
          const channels = stream.channels || 0;
          const isSupported = this.isCodecSupported(stream.codec, this.capabilities.audioCodecs);

          console.log('Audio codec check:', {
            codec: stream.codec,
            channels,
            supported: isSupported,
          });

          if (!isSupported) {
            const reason = `Audio codec '${stream.codec}' not supported on ${this.platform}`;
            return {
              compatible: false,
              reason
            };
          }

          if (channels > this.capabilities.maxAudioChannels) {
            const reason = `${channels} audio channels exceeds max ${this.capabilities.maxAudioChannels}`;
            return {
              compatible: false,
              reason
            };
          }
        }
      }

      console.log('All streams compatible');
      return { compatible: true };

    } catch (error) {
      console.warn('Probe error:', error);
      return { compatible: false, reason: `Probe error: ${error}` };
    }
  }

  /**
   * Check if a media URL can be played directly without transcoding
   * @param mediaURL - The URL of the media to check
   * @returns Promise<boolean> - true if can play directly, false if transcoding needed
   */
  async canPlayDirectly(mediaURL: string): Promise<boolean> {
    const result = await this.checkCompatibility(mediaURL);
    return result.compatible;
  }

  /**
   * Probe media and get detailed information
   * Only works with remote servers
   * @param mediaURL - The URL of the media to probe
   * @returns Promise with probe result or null if probe fails
   */
  async probeMedia(mediaURL: string): Promise<ProbeResult | null> {
    try {
      const probeURL = `${this.baseURL}/hlsv2/probe?${new URLSearchParams({
        mediaURL: mediaURL,
      })}`;

      const response = await fetch(probeURL);

      if (!response.ok) {
        console.warn('Probe request failed');
        return null;
      }

      const probe: ProbeResult = await response.json();
      return probe;
    } catch (error) {
      console.error('Probe error:', error);
      return null;
    }
  }

  private isFormatSupported(formatName: string): boolean {
    const lowerFormatName = formatName.toLowerCase();
    return this.capabilities.formats.some(fmt => lowerFormatName.includes(fmt));
  }

  private isCodecSupported(codec: string, supportedCodecs: string[]): boolean {
    const normalizedCodec = codec.toLowerCase();
    const normalizedSupported = supportedCodecs.map(c => c.toLowerCase());

    if (normalizedSupported.includes(normalizedCodec)) {
      return true;
    }

    for (const [baseCodec, aliases] of Object.entries(CODEC_ALIASES)) {
      if (normalizedCodec === baseCodec || aliases.includes(normalizedCodec)) {
        if (normalizedSupported.includes(baseCodec)) {
          return true;
        }
        for (const alias of aliases) {
          if (normalizedSupported.includes(alias)) {
            return true;
          }
        }
        return false;
      }
    }

    return false;
  }

  private generateHLSURL(mediaURL: string): string {
    const id = this.generateRandomId();
    const params = new URLSearchParams({ mediaURL });

    SERVER_TRANSCODE_CAPABILITIES.videoCodecs.forEach(codec => {
      params.append('videoCodecs', codec);
    });

    SERVER_TRANSCODE_CAPABILITIES.audioCodecs.forEach(codec => {
      params.append('audioCodecs', codec);
    });

    params.set('maxAudioChannels', SERVER_TRANSCODE_CAPABILITIES.maxAudioChannels.toString());

    console.log('Using server transcode capabilities:', {
      videoCodecs: SERVER_TRANSCODE_CAPABILITIES.videoCodecs,
      audioCodecs: SERVER_TRANSCODE_CAPABILITIES.audioCodecs,
      maxAudioChannels: SERVER_TRANSCODE_CAPABILITIES.maxAudioChannels,
    });

    return `${this.baseURL}/hlsv2/${id}/master.m3u8?${params.toString()}`;
  }

  private generateRandomId(): string {
    return Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
  }

  /**
   * Generate HLS URL for transcoding (public method)
   * @param mediaURL - The URL of the media to transcode
   * @returns The HLS master playlist URL
   */
  public generateTranscodedURL(mediaURL: string): string {
    return this.generateHLSURL(mediaURL);
  }

  /**
   * Check if server is responding
   * @returns true if server is up
   */
  async checkServerHealth(): Promise<boolean> {
    try {
      const response = await fetch(this.baseURL, { 
        method: 'HEAD',
        timeout: 5000 
      } as any);
      return response.ok;
    } catch (error) {
      console.error('Server health check failed:', error);
      return false;
    }
  }

  /**
   * Get the base URL of the server
   */
  getBaseURL(): string {
    return this.baseURL;
  }

  /**
   * Check if this is a local server
   */
  getIsLocal(): boolean {
    return this.isLocal();
  }

  /**
   * Get platform name
   */
  getPlatform(): string {
    return this.platform;
  }

  /**
   * Get current capabilities
   */
  getCapabilities(): MediaCapabilities {
    return { ...this.capabilities };
  }

  /**
   * Get server transcode capabilities (for remote servers)
   */
  getServerTranscodeCapabilities(): MediaCapabilities {
    return { ...SERVER_TRANSCODE_CAPABILITIES };
  }

  /**
   * Update capabilities
   */
  setCapabilities(capabilities: MediaCapabilities): void {
    this.capabilities = capabilities;
    console.log('Capabilities updated:', capabilities);
  }
}

export { 
  IOS_CAPABILITIES, 
  ANDROID_CAPABILITIES, 
  WEB_CAPABILITIES,
  SERVER_TRANSCODE_CAPABILITIES 
};