import type { ReactElement, ReactNode } from 'react';
import { Children, isValidElement } from 'react';
import { View } from 'react-native';
import { Host } from '@expo/ui';
import {
  Button,
  HStack,
  List,
  RNHostView,
  Section,
  Spacer,
  Text as NativeText,
  VStack,
} from '@expo/ui/swift-ui';
import {
  background,
  buttonStyle,
  disabled as disabledModifier,
  foregroundColor,
  listStyle,
  refreshable,
  scrollContentBackground,
} from '@expo/ui/swift-ui/modifiers';

interface SettingsPageProps {
  children: ReactNode;
  refreshControl?: ReactElement;
  onRefresh?: () => Promise<void>;
}

export function SettingsPage({ children, onRefresh }: SettingsPageProps) {
  return (
    <Host style={{ flex: 1 }} colorScheme="dark">
      <List
        modifiers={[
          listStyle('insetGrouped'),
          scrollContentBackground('hidden'),
          background('#000000'),
          ...(onRefresh ? [refreshable(onRefresh)] : []),
        ]}
      >
        {children}
      </List>
    </Host>
  );
}

interface SettingsSectionProps {
  title: string;
  footer?: string;
  children: ReactNode;
}

export function SettingsSection({ title, footer, children }: SettingsSectionProps) {
  const sectionChildren = Children.map(children, (child, index) => {
    if (!isValidElement(child)) return null;
    if (child.type === SettingsRow) return child;

    return (
      <RNHostView key={`native-setting-content-${index}`} matchContents={{ vertical: true }}>
        {child}
      </RNHostView>
    );
  });

  return (
    <Section
      title={title}
      footer={footer ? <NativeText>{footer}</NativeText> : undefined}
    >
      {sectionChildren}
    </Section>
  );
}

interface SettingsRowProps {
  title: string;
  detail?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  isLast?: boolean;
  accessibilityLabel?: string;
  selected?: boolean;
  disabled?: boolean;
}

export function SettingsRow({
  title,
  detail,
  leading,
  trailing,
  onPress,
  destructive = false,
  accessibilityLabel,
  disabled = false,
}: SettingsRowProps) {
  const label = (
    <HStack spacing={12} alignment="center">
      {leading ? (
        <RNHostView matchContents>
          <View>{leading}</View>
        </RNHostView>
      ) : null}
      <VStack alignment="leading" spacing={3}>
        <NativeText modifiers={destructive ? [foregroundColor('#ff453a')] : undefined}>
          {title}
        </NativeText>
        {detail ? (
          <NativeText modifiers={[foregroundColor('#8e8e93')]}>{detail}</NativeText>
        ) : null}
      </VStack>
      <Spacer />
      {trailing ? (
        <RNHostView matchContents>
          <View>{trailing}</View>
        </RNHostView>
      ) : null}
    </HStack>
  );

  if (!onPress) return label;

  return (
    <Button
      onPress={onPress}
      modifiers={[
        buttonStyle('plain'),
        ...(disabled ? [disabledModifier(true)] : []),
      ]}
    >
      {label}
    </Button>
  );
}

export function SettingsTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <Section title={title}>
      {subtitle ? <NativeText>{subtitle}</NativeText> : null}
    </Section>
  );
}
