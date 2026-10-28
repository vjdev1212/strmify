import React from 'react';
import { Host } from '@expo/ui';
import {
  BottomSheet,
  Group,
} from '@expo/ui/swift-ui';
import {
  background,
  presentationDetents,
  presentationDragIndicator,
} from '@expo/ui/swift-ui/modifiers';

interface PersonDetailsSheetProps {
  visible: boolean;
  onClose: () => void;
  backgroundColor: string;
  children: React.ReactElement;
}

export default function PersonDetailsSheet({
  visible,
  onClose,
  backgroundColor,
  children,
}: PersonDetailsSheetProps) {
  return (
    <Host style={{ flex: 1 }}>
      <BottomSheet
        isPresented={visible}
        onIsPresentedChange={(isPresented) => {
          if (!isPresented) onClose();
        }}
      >
        <Group
          modifiers={[
            presentationDetents(['large']),
            presentationDragIndicator('visible'),
            background(backgroundColor),
          ]}
        >
          {children}
        </Group>
      </BottomSheet>
    </Host>
  );
}
