import { SkipResult, EpisodeSegments, loadEpisodeSegments, getActiveSegment } from "@/clients/introDb";
import { useEffect, useRef, useState, useCallback } from "react";

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

  // Plain object instead of Set — avoids RN "Function not implemented" for Set
  const skippedRef = useRef<any>({
    intro: false,
    recap: false,
    outro: false,
  });

  // Fetch when episode changes
  useEffect(() => {
    if (!imdbId || season == null || episode == null) return;

    let cancelled = false;
    skippedRef.current = { intro: false, recap: false, outro: false };
    setSegments(null);
    setActiveSegment(null);
    setLoading(true);
    setError(null);

    const confidence = minConfidence !== undefined ? minConfidence : 0.5;

    loadEpisodeSegments(imdbId, season, episode, { minConfidence: confidence })
      .then(function(data: any) {
        if (!cancelled) setSegments(data);
      })
      .catch(function(err: any) {
        if (!cancelled) setError(err instanceof Error ? err : new Error(String(err)));
      })
      .finally(function() {
        if (!cancelled) setLoading(false);
      });

    return function() { cancelled = true; };
  }, [imdbId, season, episode, minConfidence]);

  // Evaluate active segment on every time update
  useEffect(() => {
    if (!segments) {
      setActiveSegment(null);
      return;
    }

    const active = getActiveSegment(segments, currentTime);
    setActiveSegment(active);

    const shouldAutoSkip = autoSkip === true;
    if (active && shouldAutoSkip && !skippedRef.current[active.type]) {
      skippedRef.current[active.type] = true;
      onSkip(active.skipToSec);
    }
  }, [segments, currentTime, autoSkip, onSkip]);

  const skip = useCallback(function() {
    if (!activeSegment) return;
    skippedRef.current[activeSegment.type] = true;
    onSkip(activeSegment.skipToSec);
  }, [activeSegment, onSkip]);

  return { activeSegment, skip, loading, error };
}