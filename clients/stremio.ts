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
}

export interface CompatibilityResult {
  compatible: boolean;
  reason?: string;
}

const IOS_CAPABILITIES: MediaCapabilities = {
  videoCodecs: ['h264', 'avc', 'avc1'],
  audioCodecs: ['aac', 'mp4a', 'mp3', 'ac3', 'eac3'],
  maxAudioChannels: 8,
  formats: ['mp4', 'mov', 'm4v'],
};

const ANDROID_CAPABILITIES: MediaCapabilities = {
  videoCodecs: ['h264', 'avc', 'avc1', 'h265', 'hevc', 'hev1', 'vp8', 'vp9'],
  audioCodecs: ['aac', 'mp4a', 'mp3', 'opus', 'vorbis', 'ac3', 'eac3'],
  maxAudioChannels: 8,
  formats: ['mp4', 'mkv', 'webm'],
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

    console.log('Initialized:', {
      baseURL: this.baseURL,
      platform: this.platform,
      capabilities: this.capabilities,
    });
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

  async getStreamingURL(infoHash: string, fileIdx: number = -1): Promise<string> {
    console.log('Getting streaming URL:', { infoHash, fileIdx });

    const directURL = `${this.baseURL}/${encodeURIComponent(infoHash)}/${encodeURIComponent(fileIdx)}`;
    console.log('Direct URL:', directURL);

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

  async getStream(infoHash: string, fileIdx: number = 0): Promise<StreamResult> {
    const directURL = `${this.baseURL}/${encodeURIComponent(infoHash)}/${encodeURIComponent(fileIdx)}`;
    const result = await this.checkCompatibility(directURL);

    if (result.compatible) {
      return {
        url: directURL,
        needsTranscoding: false,
      };
    }

    return {
      url: this.generateHLSURL(directURL),
      needsTranscoding: true,
      reason: result.reason,
    };
  }

  /**
   * Public method to check if a media URL is compatible with current platform capabilities
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
        const reason = `Container format '${probe.format.name}' not supported on ${this.platform} (supports: ${this.capabilities.formats.join(', ')})`;
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
            availableCodecs: this.capabilities.videoCodecs,
          });

          if (!isSupported) {
            const reason = `Video codec '${stream.codec}' not supported on ${this.platform} (supports: ${this.capabilities.videoCodecs.join(', ')})`;
            console.log('Video codec check:', reason);
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
            availableCodecs: this.capabilities.audioCodecs,
          });

          if (!isSupported) {
            const reason = `Audio codec '${stream.codec}' not supported on ${this.platform} (supports: ${this.capabilities.audioCodecs.join(', ')})`;
            console.log('Audio codec check:', reason);
            return {
              compatible: false,
              reason
            };
          }

          if (channels > this.capabilities.maxAudioChannels) {
            const reason = `${channels} audio channels exceeds max ${this.capabilities.maxAudioChannels} on ${this.platform}`;
            console.log('Audio channels check:', reason);
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
   * Public method to check if a media URL can be played directly without transcoding
   * @param mediaURL - The URL of the media to check
   * @returns Promise<boolean> - true if can play directly, false if transcoding needed
   */
  async canPlayDirectly(mediaURL: string): Promise<boolean> {
    const result = await this.checkCompatibility(mediaURL);
    return result.compatible;
  }

  /**
   * Public method to probe media and get detailed information
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

    // Direct check
    if (this.capabilities.formats.some(fmt => lowerFormatName.includes(fmt))) {
      return true;
    }

    return false;
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

    // Use SERVER_TRANSCODE_CAPABILITIES - all codecs the server can transcode to
    // Not the client's playback capabilities
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

  setCapabilities(capabilities: MediaCapabilities): void {
    this.capabilities = capabilities;
    console.log('Capabilities updated:', capabilities);
  }

  getPlatform(): string {
    return this.platform;
  }

  getCapabilities(): MediaCapabilities {
    return { ...this.capabilities };
  }

  getServerTranscodeCapabilities(): MediaCapabilities {
    return { ...SERVER_TRANSCODE_CAPABILITIES };
  }
}

export { IOS_CAPABILITIES, ANDROID_CAPABILITIES, WEB_CAPABILITIES, SERVER_TRANSCODE_CAPABILITIES };