

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
  // Plain string concat — no new URL() or URLSearchParams, those are not available in React Native
  const url =
    INTRODB_BASE_URL +
    "/segments?imdb_id=" +
    imdbId +
    "&season=" +
    season +
    "&episode=" +
    episode;

  const res = await fetch(url);
  console.log("[IntroDB] Fetching:", url);
  console.log("[IntroDB] Response status:", res.status, res.statusText);
  if (!res.ok) {
    throw new Error("IntroDB API error: " + res.status + " " + res.statusText);
  }

  const data = await res.json();
  console.log("[IntroDB] Response data:", JSON.stringify(data));
  return data as EpisodeSegments;
}

// ---- Helpers ----

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

// ---- Cache ----

export interface IntroDBClientOptions {
  minConfidence?: number;
}

const _cache: Record<string, EpisodeSegments> = {};

function _cacheKey(imdbId: string, season: number, episode: number): string {
  return imdbId + "-s" + season + "e" + episode;
}

function _filter(seg: Segment | null, min: number): Segment | null {
  return seg !== null && seg.confidence >= min ? seg : null;
}

export async function loadEpisodeSegments(
  imdbId: string,
  season: number,
  episode: number,
  options: IntroDBClientOptions = {}
): Promise<EpisodeSegments> {
  const minConfidence = options.minConfidence !== undefined ? options.minConfidence : 0.5;
  const key = _cacheKey(imdbId, season, episode);

  if (_cache[key]) return _cache[key];

  const data = await fetchSegments(imdbId, season, episode);

  const filtered: EpisodeSegments = {
    ...data,
    intro: _filter(data.intro, minConfidence),
    recap: _filter(data.recap, minConfidence),
    outro: _filter(data.outro, minConfidence),
  };

  _cache[key] = filtered;
  return filtered;
}

export function clearSegmentCache(): void {
  Object.keys(_cache).forEach((k) => delete _cache[k]);
}