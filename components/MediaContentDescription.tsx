import React, { useState } from 'react';
import {
  StyleSheet,
  Pressable,
  LayoutAnimation,
  Platform,
  UIManager,
} from 'react-native';
import { Text, View } from './Themed';

interface MediaContentDescriptionProps {
  description: string;
}

const animationConfig = {
  duration: 5000, // 0.5 seconds
  update: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  create: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
  delete: {
    type: LayoutAnimation.Types.easeInEaseOut,
    property: LayoutAnimation.Properties.opacity,
  },
};

const MediaContentDescription: React.FC<MediaContentDescriptionProps> = ({
  description,
}) => {
  if (!description?.trim()) return null;

  const [expanded, setExpanded] = useState(false);

  const toggleExpand = () => {
    LayoutAnimation.configureNext(animationConfig);
    setExpanded((prev) => !prev);
  };

  return (
    <View style={styles.container}>
      <Pressable onPress={toggleExpand}>
        <Text
          style={styles.description}
          numberOfLines={expanded ? undefined : 3}
        >
          {description}
        </Text>
        {description.split(' ').length > 20 && (
          <Text style={styles.moreText}>
            {expanded ? 'LESS' : 'MORE'}
          </Text>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    minHeight: 10,
    paddingBottom: 10
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    paddingHorizontal: 20,
    marginTop: 10,
  },
  moreText: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    marginTop: 5,
    paddingHorizontal: 20,
  },
});

export default MediaContentDescription;
