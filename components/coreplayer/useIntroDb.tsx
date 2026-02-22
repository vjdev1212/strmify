
const INTRODB_BASE_URL = "https://api.introdb.app";

// ---- Types ----

export interface Segment {
  start_sec: number;
  end_sec: number;
  start_ms: number;
  end_ms: number;
  confidence: number;
  submission_count: number;
  updated_at: string;
}

export interface EpisodeSegments {
  imdb_id: string;
  season: number;
  episode: number;
  intro: Segment | null;
  recap: Segment | null;
  outro: Segment | null;
}

export type SegmentType = "intro" | "recap" | "outro";

export interface SkipResult {
  type: SegmentType;
  segment: Segment;
  skipToSec: number;
  skipToMs: number;
}

// ---- API ----

export async function fetchSegments(
  imdbId: string,
  season: number,
  episode: number
): Promise<EpisodeSegments> {
  const url = `${INTRODB_BASE_URL}/segments?imdb_id=${encodeURIComponent(imdbId)}&season=${season}&episode=${episode}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`IntroDB API error: ${res.status} ${res.statusText}`);
  }

  return res.json() as Promise<EpisodeSegments>;
}

// ---- Helpers ----

/**
 * Returns the active segment at the given playback position, or null.
 */
export function getActiveSegment(
  segments: EpisodeSegments,
  currentSec: number
): SkipResult | null {
  const types: SegmentType[] = ["recap", "intro", "outro"];

  for (const type of types) {
    const seg = segments[type];
    if (seg && currentSec >= seg.start_sec && currentSec < seg.end_sec) {
      return { type, segment: seg, skipToSec: seg.end_sec, skipToMs: seg.end_ms };
    }
  }

  return null;
}

// ---- Client with cache ----

export interface IntroDBClientOptions {
  /** Minimum confidence threshold (0–1). Default: 0.5 */
  minConfidence?: number;
}

const _cache = new Map<string, EpisodeSegments>();

function _cacheKey(imdbId: string, season: number, episode: number): string {
  return `${imdbId}-s${season}e${episode}`;
}

function _filter(seg: Segment | null, min: number): Segment | null {
  return seg && seg.confidence >= min ? seg : null;
}

/**
 * Fetch (and cache) segments for a TV show episode.
 * Segments below the confidence threshold are set to null.
 */
export async function loadEpisodeSegments(
  imdbId: string,
  season: number,
  episode: number,
  options: IntroDBClientOptions = {}
): Promise<EpisodeSegments> {
  const minConfidence = options.minConfidence ?? 0.5;
  const key = _cacheKey(imdbId, season, episode);

  if (_cache.has(key)) return _cache.get(key)!;

  const data = await fetchSegments(imdbId, season, episode);

  const filtered: EpisodeSegments = {
    ...data,
    intro: _filter(data.intro, minConfidence),
    recap: _filter(data.recap, minConfidence),
    outro: _filter(data.outro, minConfidence),
  };

  _cache.set(key, filtered);
  return filtered;
}

export function clearSegmentCache(): void {
  _cache.clear();
}