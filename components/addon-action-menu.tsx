import React from 'react';
import { MenuView, type MenuAction } from '@expo/ui/community/menu';
import { useTheme } from '@/context/ThemeContext';

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
  const { colorScheme } = useTheme();

  return (
    <MenuView
      title={title}
      actions={actions}
      onPressAction={({ nativeEvent }) => onPressAction(nativeEvent.event)}
      colorScheme={colorScheme}
      shouldOpenOnLongPress={false}
    >
      {children}
    </MenuView>
  );
}
