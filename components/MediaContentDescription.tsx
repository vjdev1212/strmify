import React from 'react';
import { StyleSheet } from 'react-native';
import { Text, View } from './Themed';

interface MediaContentDescriptionProps {
  description: string;
}

const MediaContentDescription: React.FC<MediaContentDescriptionProps> = ({ description }) => {
  // Early return if no description
  if (!description?.trim()) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.description} numberOfLines={10}>
        {description}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 10,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    paddingHorizontal: 20,
    marginVertical: 10,
  },
});

export default MediaContentDescription;