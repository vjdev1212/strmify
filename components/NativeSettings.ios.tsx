import type { ReactElement, ReactNode } from 'react';
import { Children, isValidElement } from 'react';
import { Text as RNText, View } from 'react-native';
import { FieldGroup, Host, List as NativeList, ListItem, RNHostView, Text as NativeText } from '@expo/ui';
import NativeFieldSelect from '@/components/native-field-select';

interface SettingsPageProps {
  children: ReactNode;
  refreshControl?: ReactElement;
  onRefresh?: () => Promise<void>;
  hideScrollIndicator?: boolean;
}

export function SettingsPage({ children, onRefresh, hideScrollIndicator = false }: SettingsPageProps) {
  return (
    <Host style={{ flex: 1 }} colorScheme="dark">
      {hideScrollIndicator ? (
        <NativeList onRefresh={onRefresh}>
          {children}
        </NativeList>
      ) : (
        <FieldGroup>
          {children}
        </FieldGroup>
      )}
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
  const leadingContent = leading ? (
    <RNHostView matchContents>
      <View>{leading}</View>
    </RNHostView>
  ) : null;
  const trailingContent = trailing ? (
    <RNHostView matchContents>
      <View>{trailing}</View>
    </RNHostView>
  ) : null;
  const titleStyle = {
    color: destructive ? '#ff453a' : disabled ? '#8e8e93' : titleColor ?? '#f2f2f7',
    fontSize: 17,
  };
  const titleContent = titleAccessory ? (
    <RNHostView matchContents>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
        <RNText numberOfLines={1} style={titleStyle}>{title}</RNText>
        {titleAccessory}
      </View>
    </RNHostView>
  ) : (
    <NativeText textStyle={{ color: titleStyle.color }}>{title}</NativeText>
  );
  const detailContent = detail && (detailSameFont || detailColor)
    ? (
      <NativeText textStyle={{
        fontSize: detailSameFont ? 16 : 13,
        ...(detailSameFont ? { fontWeight: '400' as const } : {}),
        color: detailColor ?? '#8e8e93',
      }}>
        {detail}
      </NativeText>
    )
    : detail;

  return (
    <ListItem
      onPress={disabled ? undefined : onPress}
      leading={leadingContent}
      trailing={trailingContent}
      supportingText={detailContent}
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
