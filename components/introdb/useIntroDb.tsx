import { useEffect, useRef, useState, useCallback } from "react";

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

export interface TVShowMetadata {
    imdbId: string;
    season: number;
    episode: number;
}

const INTRODB_BASE_URL = "https://api.introdb.app";
const _cache: Record<string, EpisodeSegments> = {};

function _cacheKey(imdbId: string, season: number, episode: number): string {
    return imdbId + "-s" + season + "e" + episode;
}

function _filterSegment(seg: Segment | null, min: number): Segment | null {
    return seg !== null && seg.confidence >= min ? seg : null;
}

async function loadEpisodeSegments(
    imdbId: string,
    season: number,
    episode: number,
    minConfidence: number
): Promise<EpisodeSegments> {
    const key = _cacheKey(imdbId, season, episode);
    if (_cache[key]) {
        console.log("[IntroDB] Cache hit for", key);
        return _cache[key];
    }

    const url = INTRODB_BASE_URL + "/segments?imdb_id=" + imdbId + "&season=" + season + "&episode=" + episode;
    console.log("[IntroDB] Fetching:", url);

    const res = await fetch(url);
    if (!res.ok) throw new Error("IntroDB API error: " + res.status);

    const data = await res.json();
    console.log("[IntroDB] Loaded segments — intro:", 
        data.intro ? data.intro.start_sec + "s–" + data.intro.end_sec + "s" : "null",
        "recap:", data.recap ? "yes" : "null",
        "outro:", data.outro ? "yes" : "null"
    );

    const filtered: EpisodeSegments = {
        ...data,
        intro: _filterSegment(data.intro, minConfidence),
        recap: _filterSegment(data.recap, minConfidence),
        outro: _filterSegment(data.outro, minConfidence),
    };

    _cache[key] = filtered;
    return filtered;
}

function getActiveSegment(segments: EpisodeSegments, currentSec: number): SkipResult | null {
    const types: SegmentType[] = ["recap", "intro", "outro"];
    for (const type of types) {
        const seg = segments[type];
        if (seg && currentSec >= seg.start_sec && currentSec < seg.end_sec) {
            return { type, segment: seg, skipToSec: seg.end_sec, skipToMs: seg.end_ms };
        }
    }
    return null;
}

export function clearSegmentCache(): void {
    Object.keys(_cache).forEach(function(k) { delete _cache[k]; });
}

interface UseIntroDBOptions {
    imdbId: string | null | undefined;
    season: number | null | undefined;
    episode: number | null | undefined;
    currentTime: number;
    onSkip: (seekToSec: number) => void;
    autoSkip?: boolean;
    minConfidence?: number;
}

interface UseIntroDBResult {
    activeSegment: SkipResult | null;
    skip: () => void;
    loading: boolean;
    error: Error | null;
}

export function useIntroDB({
    imdbId,
    season,
    episode,
    currentTime,
    onSkip,
    autoSkip,
    minConfidence,
}: UseIntroDBOptions): UseIntroDBResult {
    const [segments, setSegments] = useState<EpisodeSegments | null>(null);
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<Error | null>(null);
    const [activeSegment, setActiveSegment] = useState<SkipResult | null>(null);

    const skippedRef = useRef<{ intro: boolean; recap: boolean; outro: boolean }>({
        intro: false,
        recap: false,
        outro: false,
    });
    const lastSkipTimeRef = useRef<number>(0);

    // Fetch segments when episode changes
    useEffect(function() {
        console.log("[IntroDB] useEffect triggered — imdbId:", imdbId, "season:", season, "episode:", episode);

        if (!imdbId || season == null || episode == null) {
            console.log("[IntroDB] Skipping fetch — missing tvShow props");
            return;
        }

        let cancelled = false;
        skippedRef.current = { intro: false, recap: false, outro: false };
        setSegments(null);
        setActiveSegment(null);
        setLoading(true);
        setError(null);

        const confidence = minConfidence !== undefined ? minConfidence : 0.5;

        loadEpisodeSegments(imdbId, season, episode, confidence)
            .then(function(data) {
                if (!cancelled) {
                    console.log("[IntroDB] Segments set in state");
                    setSegments(data);
                }
            })
            .catch(function(err) {
                console.log("[IntroDB] Fetch error:", err);
                if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
            })
            .finally(function() {
                if (!cancelled) setLoading(false);
            });

        return function() { cancelled = true; };
    }, [imdbId, season, episode, minConfidence]);

    // Evaluate active segment on every time update
    useEffect(function() {
        if (!segments) return;

        const active = getActiveSegment(segments, currentTime);

        // Only log when state changes to avoid spam
        if ((active === null) !== (activeSegment === null) || (active && activeSegment && active.type !== activeSegment.type)) {
            console.log("[IntroDB] Active segment changed:", active ? active.type + " (" + active.segment.start_sec + "–" + active.segment.end_sec + "s)" : "none", "| currentTime:", currentTime);
        }

        setActiveSegment(active);

        if (active && autoSkip === true && !skippedRef.current[active.type]) {
            const now = Date.now();
            if (now - lastSkipTimeRef.current >= 3000) {
                lastSkipTimeRef.current = now;
                skippedRef.current[active.type] = true;
                onSkip(active.skipToSec);
            }
        }
    }, [segments, currentTime]);

    const skip = useCallback(function() {
        if (!activeSegment) return;
        const now = Date.now();
        if (now - lastSkipTimeRef.current < 3000) return;
        lastSkipTimeRef.current = now;
        skippedRef.current[activeSegment.type] = true;
        onSkip(activeSegment.skipToSec);
    }, [activeSegment, onSkip]);

    return { activeSegment, skip, loading, error };
}