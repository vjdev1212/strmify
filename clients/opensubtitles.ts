// Type definitions
export interface SubtitleSearchParams {
  imdb_id?: string;
  tmdb_id?: string;
  type?: 'movie' | 'episode';
  season_number?: number;
  episode_number?: number;
  languages?: string;
  format?: string;
  moviehash?: string;
  moviebytesize?: number;
  query?: string;
  ai_translated?: 'exclude' | 'include';
  machine_translated?: 'exclude' | 'include';
  trusted_sources?: 'only' | 'include';
  hearing_impaired?: 'exclude' | 'include';
  foreign_parts_only?: 'exclude' | 'include';
  [key: string]: string | number | undefined;
}

export interface SubtitleResult {
  name: string;
  url: string;
  file_id: string | null;
  language: string;
  download_count: number;
}

export interface SearchResponse {
  success: true;
  data: SubtitleResult[];
  total: number;
}

export interface ErrorResponse {
  success: false;
  error: string;
}

export type ApiResponse<T = SubtitleResult[]> =
  | (T extends SubtitleResult[] ? SearchResponse : { success: true; data: T })
  | ErrorResponse;

export interface DownloadResponse {
  success: true;
  link: string;
  file_name: string;
  requests: number;
}

export interface Language {
  language_code: string;
  language_name: string;
}

export interface Format {
  format_name: string;
  format_code: string;
}

export interface SearchOptions {
  format?: string;
  ai_translated?: 'exclude' | 'include';
  machine_translated?: 'exclude' | 'include';
  trusted_sources?: 'only' | 'include';
  hearing_impaired?: 'exclude' | 'include';
  foreign_parts_only?: 'exclude' | 'include';
}

class OpenSubtitlesClient {
  private baseURL = 'https://api.opensubtitles.com/api/v1';
  private userAgent: string = process.env.EXPO_PUBLIC_OPENSUBTITLES_USER_AGENT || 'Strmify v1.0.0';
  private apiKey: string = process.env.EXPO_PUBLIC_OPENSUBTITLES_API_KEY || '';

  constructor(customApiKey: string | undefined) {
    this.apiKey = customApiKey || this.apiKey;
  }

  // Get headers for API requests
  private getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'User-Agent': this.userAgent,
      'X-User-Agent': this.userAgent,
      'Content-Type': 'application/json',
    };

    console.log('Headers', headers);

    if (this.apiKey) {
      headers['Api-Key'] = this.apiKey;
    }

    return headers;
  }

  // Search subtitles
  async searchSubtitles(params: SubtitleSearchParams): Promise<ApiResponse> {
    try {
      const queryParams = new URLSearchParams();

      // Set default format to SRT if not specified
      if (!params.format) {
        params.format = 'srt';
      }

      // Add search parameters
      Object.keys(params).forEach(key => {
        const value = params[key];
        if (value !== null && value !== undefined) {
          queryParams.append(key, String(value));
        }
      });

      const response = await fetch(`${this.baseURL}/subtitles?${queryParams}`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();

      if (response.ok) {
        const simplifiedData: SubtitleResult[] = data.data.map((subtitle: any) => {
          return {
            name: subtitle.attributes.release ||
              subtitle.attributes.feature_details?.movie_name ||
              'Unknown',
            url: subtitle.attributes.url,
            file_id: subtitle.attributes.files[0]?.file_id || null,
            language: subtitle.attributes.language,
            download_count: subtitle.attributes.download_count,
          };
        });

        return {
          success: true,
          data: simplifiedData,
          total: data.total_count
        };
      } else {
        return {
          success: false,
          error: data.message || 'Search failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Search subtitles by file name or query
  async searchByFileName(
    fileName: string,
    languages: string[] = ['en'],
    options: SearchOptions = {}
  ): Promise<ApiResponse> {
    const params: SubtitleSearchParams = {
      query: fileName,
      languages: languages.join(','),
      format: options.format || 'srt',
      ...options
    };

    return this.searchSubtitles(params);
  }

  // Download subtitle file
  async downloadSubtitle(fileId: string): Promise<DownloadResponse | ErrorResponse> {
    try {
      const response = await fetch(`${this.baseURL}/download`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          file_id: fileId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        return {
          success: true,
          link: data.link,
          file_name: data.file_name,
          requests: data.requests
        };
      } else {
        return {
          success: false,
          error: data.message || 'Download failed'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get supported languages from API
  async getLanguages(): Promise<ApiResponse<Language[]>> {
    try {
      const response = await fetch(`${this.baseURL}/infos/languages`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, data };
      } else {
        return {
          success: false,
          error: data.message || 'Failed to get languages'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Get subtitle formats
  async getFormats(): Promise<ApiResponse<Format[]>> {
    try {
      const response = await fetch(`${this.baseURL}/infos/formats`, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      const data = await response.json();

      if (response.ok) {
        return { success: true, data };
      } else {
        return {
          success: false,
          error: data.message || 'Failed to get formats'
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export default OpenSubtitlesClient;