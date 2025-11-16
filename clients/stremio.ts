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

const IOS_CAPABILITIES: MediaCapabilities = {
  videoCodecs: ['h264', 'avc', 'avc1'],
  audioCodecs: ['aac', 'mp4a', 'mp3', 'ac3', 'eac3', 'ec-3'],
  maxAudioChannels: 8,
  formats: ['mp4', 'mov', 'm4v'],
};

const ANDROID_CAPABILITIES: MediaCapabilities = {
  videoCodecs: ['h264', 'avc', 'avc1', 'h265', 'hevc', 'hev1', 'vp8', 'vp9'],
  audioCodecs: ['aac', 'mp4a', 'mp3', 'opus', 'vorbis', 'ac3', 'eac3', 'ec-3'],
  maxAudioChannels: 8,
  formats: ['mp4', 'mkv', 'webm'],
};

const WEB_CAPABILITIES: MediaCapabilities = {
  videoCodecs: ['h264', 'avc', 'avc1', 'vp8', 'vp9'],
  audioCodecs: ['aac', 'mp4a', 'mp3', 'opus', 'vorbis'],
  maxAudioChannels: 2,
  formats: ['mp4', 'webm'],
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

  async getStreamingURL(infoHash: string, fileIdx: number = 0): Promise<string> {
    console.log('Getting streaming URL:', { infoHash, fileIdx });

    const directURL = `${this.baseURL}/${encodeURIComponent(infoHash)}/${encodeURIComponent(fileIdx)}`;
    console.log('Direct URL:', directURL);

    const result = await this.checkCompatibility(directURL);

    if (result.compatible) {
      console.log('✓ Can play directly');
      return directURL;
    }

    console.log('✗ Needs transcoding:', result.reason);
    console.log('Generating HLS URL');
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

  private async checkCompatibility(mediaURL: string): Promise<{ compatible: boolean; reason?: string }> {
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

      // Check format compatibility with improved detection
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

  private async canPlayDirectly(mediaURL: string): Promise<boolean> {
    const result = await this.checkCompatibility(mediaURL);
    return result.compatible;
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

    this.capabilities.videoCodecs.forEach(codec => {
      params.append('videoCodecs', codec);
    });

    this.capabilities.audioCodecs.forEach(codec => {
      params.append('audioCodecs', codec);
    });

    params.set('maxAudioChannels', this.capabilities.maxAudioChannels.toString());

    return `${this.baseURL}/hlsv2/${id}/master.m3u8?${params.toString()}`;
  }

  private generateRandomId(): string {
    return Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
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
}

export { IOS_CAPABILITIES, ANDROID_CAPABILITIES, WEB_CAPABILITIES };