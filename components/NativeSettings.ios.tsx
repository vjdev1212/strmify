import type { ReactElement, ReactNode } from 'react';
import { Children, isValidElement } from 'react';
import { View } from 'react-native';
import { FieldGroup, Host, ListItem, RNHostView, Text as NativeText } from '@expo/ui';
import NativeFieldSelect from '@/components/native-field-select';
import { refreshable, scrollIndicators } from '@expo/ui/swift-ui/modifiers';

interface SettingsPageProps {
  children: ReactNode;
  refreshControl?: ReactElement;
  onRefresh?: () => Promise<void>;
  hideScrollIndicator?: boolean;
}

export function SettingsPage({ children, onRefresh, hideScrollIndicator = false }: SettingsPageProps) {
  return (
    <Host style={{ flex: 1 }} colorScheme="dark">
      <FieldGroup modifiers={[
        ...(onRefresh ? [refreshable(onRefresh)] : []),
        ...(hideScrollIndicator ? [scrollIndicators('hidden')] : []),
      ]}>
        {children}
      </FieldGroup>
    </Host>
  );
}

interface SettingsSectionProps {
  title?: string;
  footer?: string;
  children: ReactNode;
}

export function SettingsSection({ title, footer, children }: SettingsSectionProps) {
  const sectionChildren = Children.map(children, (child, index) => {
    if (!isValidElement(child)) return null;
    if (child.type === SettingsRow || child.type === NativeFieldSelect) return child;

    return (
      <RNHostView key={`native-setting-content-${index}`} matchContents={{ vertical: true }}>
        {child}
      </RNHostView>
    );
  });

  return (
    <FieldGroup.Section
      title={title}
    >
      {sectionChildren}
      {footer ? <FieldGroup.SectionFooter><NativeText>{footer}</NativeText></FieldGroup.SectionFooter> : null}
    </FieldGroup.Section>
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
  detailSameFont?: boolean;
  detailColor?: string;
}

export function SettingsRow({
  title,
  detail,
  leading,
  trailing,
  onPress,
  destructive = false,
  disabled = false,
  detailSameFont = false,
  detailColor,
}: SettingsRowProps) {
  const detailTextStyle = {
    ...(detailSameFont ? { fontSize: 16 as const, fontWeight: '400' as const } : {}),
    ...(detailColor ? { color: detailColor } : {}),
  };

  return (
    <ListItem
      onPress={disabled ? undefined : onPress}
      leading={leading ? (
        <RNHostView matchContents>
          <View>{leading}</View>
        </RNHostView>
      ) : undefined}
      trailing={trailing ? (
        <RNHostView matchContents>
          <View>{trailing}</View>
        </RNHostView>
      ) : undefined}
      supportingText={detail ? (
        detailSameFont || detailColor
          ? <NativeText textStyle={detailTextStyle}>{detail}</NativeText>
          : detail
      ) : undefined}
    >
      <NativeText
        textStyle={{
          color: destructive ? '#ff453a' : disabled ? '#8e8e93' : undefined,
        }}
      >
        {title}
      </NativeText>
    </ListItem>
  );
}

export function SettingsTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <FieldGroup.Section title={title}>
      {subtitle ? <NativeText>{subtitle}</NativeText> : null}
    </FieldGroup.Section>
  );
}
