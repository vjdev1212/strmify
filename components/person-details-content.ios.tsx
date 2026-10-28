import React from 'react';
import { RNHostView } from '@expo/ui/swift-ui';
import PersonDetailsContentShared from '@/components/person-details-content.shared';
import type { PersonDetailsContentProps } from '@/components/person-details-types';

export default function PersonDetailsContentIOS(props: PersonDetailsContentProps) {
  return (
    <RNHostView>
      <PersonDetailsContentShared {...props} />
    </RNHostView>
  );
}
