import React, { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text as RNText, View as RNView } from 'react-native';
import { spacing, radius, typography } from '@/constants/theme';
import type { AppColors } from '@/constants/theme';

const COLLAPSED_LINE_LIMIT = 10;

interface PersonBiographyProps {
  biography: string;
  width: number;
  colors: AppColors;
}

export default function PersonBiography({ biography, width, colors }: PersonBiographyProps) {
  const [expanded, setExpanded] = useState(false);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    setExpanded(false);
    setHasMore(false);
  }, [biography]);

  const updateLineCount = (lineCount: number) => {
    setHasMore(lineCount > COLLAPSED_LINE_LIMIT);
  };

  return (
    <RNView style={[styles.card, { width, backgroundColor: colors.backgroundCard }]}>
      <RNText style={[styles.title, { color: colors.text }]}>Biography</RNText>
      <RNText
        numberOfLines={expanded ? undefined : COLLAPSED_LINE_LIMIT}
        style={[styles.biography, { color: colors.textMuted }]}
      >
        {biography}
      </RNText>
      <RNText
        accessible={false}
        onTextLayout={(event) => updateLineCount(event.nativeEvent.lines.length)}
        pointerEvents="none"
        style={[
          styles.biography,
          styles.measurementText,
          { width: width - spacing.md * 2, color: colors.textMuted },
        ]}
      >
        {biography}
      </RNText>
      {hasMore ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={expanded ? 'Show less biography' : 'Show more biography'}
          onPress={() => setExpanded((isExpanded) => !isExpanded)}
          hitSlop={8}
          style={styles.toggle}
        >
          <RNText style={[styles.toggleLabel, { color: colors.primary }]}>
            {expanded ? 'LESS' : 'MORE'}
          </RNText>
        </Pressable>
      ) : null}
    </RNView>
  );
}

const styles = StyleSheet.create({
  card: {
    position: 'relative',
    padding: spacing.md,
    gap: spacing.sm,
    borderRadius: radius.md,
  },
  title: {
    ...typography.headline,
  },
  biography: {
    ...typography.caption,
  },
  measurementText: {
    position: 'absolute',
    top: spacing.md + typography.headline.lineHeight + spacing.sm,
    left: spacing.md,
    opacity: 0,
  },
  toggle: {
    alignSelf: 'flex-start',
    paddingVertical: spacing.xs,
  },
  toggleLabel: {
    ...typography.caption,
    fontWeight: '600',
  },
});
