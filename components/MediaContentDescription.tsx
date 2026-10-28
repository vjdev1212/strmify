import React, { useState } from 'react';
import { StyleSheet, LayoutAnimation } from 'react-native';
import { Text, View } from './Themed';
import { useTheme } from '@/context/ThemeContext';
import { NativeButton } from '@/components/native-ui-controls';
import { spacing, typography } from '@/constants/theme';

interface MediaContentDescriptionProps { description: string; }

const animationConfig = {
  duration: 220,
  update: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  create: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
  delete: { type: LayoutAnimation.Types.easeInEaseOut, property: LayoutAnimation.Properties.opacity },
};

const MediaContentDescription: React.FC<MediaContentDescriptionProps> = ({ description }) => {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  if (!description?.trim()) return null;

  const toggleExpand = () => {
    LayoutAnimation.configureNext(animationConfig);
    setExpanded(prev => !prev);
  };

  return (
    <View style={styles.container}>
      <NativeButton variant="text" onPress={toggleExpand} seedColor={colors.primary}>
        <Text style={styles.description} numberOfLines={expanded ? undefined : 3}>{description}</Text>
        {description.split(' ').length > 20 && (
          <Text style={[styles.moreText, { color: colors.textMuted }]}>{expanded ? 'LESS' : 'MORE'}</Text>
        )}
      </NativeButton>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { justifyContent: 'center', minHeight: 10, paddingBottom: spacing.sm },
  description: { ...typography.subhead, paddingHorizontal: spacing.mdLg, marginTop: spacing.sm },
  moreText: { ...typography.caption, marginTop: spacing.xs, paddingHorizontal: spacing.mdLg, textTransform: 'uppercase' },
});

export default MediaContentDescription;