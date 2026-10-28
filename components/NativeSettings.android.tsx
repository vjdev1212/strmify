import type { ReactElement, ReactNode } from 'react';
import { Children, isValidElement } from 'react';
import { Text as RNText, View } from 'react-native';
import { FieldGroup, Host, ListItem, RNHostView, Text as NativeText } from '@expo/ui';
import { fillMaxWidth } from '@expo/ui/jetpack-compose/modifiers';

interface SettingsPageProps {
  children: ReactNode;
  refreshControl?: ReactElement;
  onRefresh?: () => Promise<void>;
  hideScrollIndicator?: boolean;
}

export function SettingsPage({ children, onRefresh }: SettingsPageProps) {
  return (
    <Host style={{ flex: 1 }} colorScheme="dark">
      <FieldGroup>
        {onRefresh ? (
          <FieldGroup.Section title="Refresh">
            <ListItem onPress={onRefresh}>
              <NativeText>Refresh</NativeText>
            </ListItem>
          </FieldGroup.Section>
        ) : null}
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
    if (child.type === SettingsRow) return child;

    return (
      <RNHostView key={`native-setting-content-${index}`} matchContents={{ vertical: true }}>
        {child}
      </RNHostView>
    );
  });

  return (
    <FieldGroup.Section title={title}>
      {sectionChildren}
      {footer ? <FieldGroup.SectionFooter><NativeText>{footer}</NativeText></FieldGroup.SectionFooter> : null}
    </FieldGroup.Section>
  );
}

interface SettingsRowProps {
  title: string;
  titleAccessory?: ReactNode;
  detail?: string;
  leading?: ReactNode;
  trailing?: ReactNode;
  onPress?: () => void;
  destructive?: boolean;
  isLast?: boolean;
  accessibilityLabel?: string;
  selected?: boolean;
  disabled?: boolean;
  titleColor?: string;
  detailSameFont?: boolean;
  detailColor?: string;
}

export function SettingsRow({
  title,
  titleAccessory,
  detail,
  leading,
  trailing,
  onPress,
  destructive = false,
  disabled = false,
  titleColor,
  detailSameFont = false,
  detailColor,
}: SettingsRowProps) {
  const detailTextStyle = {
    ...(detailSameFont ? { fontSize: 16 as const, fontWeight: '400' as const } : {}),
    ...(detailColor ? { color: detailColor } : {}),
  };

  const titleContent = titleAccessory ? (
    <RNHostView matchContents>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <RNText
          numberOfLines={1}
          style={{
            color: destructive ? '#ff453a' : disabled ? '#8e8e93' : titleColor ?? '#f2f2f7',
            fontSize: 16,
          }}
        >
          {title}
        </RNText>
        {titleAccessory}
      </View>
    </RNHostView>
  ) : (
    <NativeText
      textStyle={{
        color: destructive ? '#ff453a' : disabled ? '#8e8e93' : titleColor,
      }}
    >
      {title}
    </NativeText>
  );

  return (
    <ListItem
      modifiers={[fillMaxWidth()]}
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
      {titleContent}
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
