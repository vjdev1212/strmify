import React from 'react';
import { StyleSheet } from 'react-native';
import { Text, View } from './Themed';

const MediaContentDescription = ({ description }: { description: string }) => (
  <Text style={styles.description}>{description}</Text>
);

const styles = StyleSheet.create({
  description: {
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: 20,
    marginVertical: 10,
  },
});

export default MediaContentDescription;
