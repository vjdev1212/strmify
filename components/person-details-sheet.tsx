import React from 'react';
import { BottomSheet, Host } from '@expo/ui';

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
    <Host>
      <BottomSheet
        isPresented={visible}
        onDismiss={onClose}
        snapPoints={['full']}
        contentPadding={0}
        containerColor={backgroundColor}
      >
        {children}
      </BottomSheet>
    </Host>
  );
}
