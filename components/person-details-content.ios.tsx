import React from 'react';
import { RNHostView } from '@expo/ui/swift-ui';
import { ScrollView } from '@expo/ui';
import { ZStack } from '@expo/ui/swift-ui';
import { View } from 'react-native';
import PersonDetailsCloseButton from '@/components/person-details-close-button';
import PersonDetailsContentShared from '@/components/person-details-content.shared';
import type { PersonDetailsContentProps } from '@/components/person-details-types';
import { spacing } from '@/constants/theme';

export default function PersonDetailsContentIOS(props: PersonDetailsContentProps) {
  return (
    <ZStack alignment="topTrailing">
      <ScrollView direction="vertical" showsIndicators={false}>
        <RNHostView matchContents={{ vertical: true }}>
          <PersonDetailsContentShared
            {...props}
            scrollingHandledByParent
            externalCloseButton
          />
        </RNHostView>
      </ScrollView>
      <RNHostView matchContents>
        <View style={{ padding: spacing.md }}>
          <PersonDetailsCloseButton onPress={props.onClose} color={props.colors.text} />
        </View>
      </RNHostView>
    </ZStack>
  );
}
