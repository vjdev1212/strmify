import React from 'react';
import { StyleSheet } from 'react-native';
import { Text, View } from './Themed';

const MediaContentDescription = ({ description }: { description: string }) => (
  <View style={styles.container}>
    <Text style={styles.description} numberOfLines={10}>{description}</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: 120,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
    paddingHorizontal: 20,
    marginVertical: 10,
  },
});

export default MediaContentDescription;
