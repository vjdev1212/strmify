import React from 'react';
import { MenuView, type MenuAction } from '@expo/ui/community/menu';

interface AddonActionMenuProps {
  title: string;
  actions: MenuAction[];
  onPressAction: (id: string) => void;
  children: React.ReactElement;
}

export default function AddonActionMenu({
  title,
  actions,
  onPressAction,
  children,
}: AddonActionMenuProps) {
  return (
    <MenuView
      title={title}
      actions={actions}
      onPressAction={({ nativeEvent }) => onPressAction(nativeEvent.event)}
      colorScheme="dark"
      shouldOpenOnLongPress={false}
    >
      {children}
    </MenuView>
  );
}
