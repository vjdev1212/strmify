import React from 'react';
import { StyleSheet } from 'react-native';
import { View } from './Themed';

const BottomSpacing = ({ space = 50 }: { space: number }) => (
  <View style={{ paddingBottom: space }}></View>
);

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#535aff',
    paddingVertical: 12,
    paddingHorizontal: 30,
    borderRadius: 30,
    alignItems: 'center',
    marginVertical: 20,
    alignSelf: 'center',
  },
  text: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
});

export default BottomSpacing;
