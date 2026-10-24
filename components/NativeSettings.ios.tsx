import type { ReactElement, ReactNode } from 'react';
import { Children, isValidElement } from 'react';
import { View } from 'react-native';
import { FieldGroup, Host, ListItem, RNHostView, Text as NativeText } from '@expo/ui';
import { List as NativeList } from '@expo/ui/swift-ui';
import NativeFieldSelect from '@/components/native-field-select';
import { listStyle, refreshable, scrollIndicators } from '@expo/ui/swift-ui/modifiers';

interface SettingsPageProps {
  children: ReactNode;
  refreshControl?: ReactElement;
  onRefresh?: () => Promise<void>;
  hideScrollIndicator?: boolean;
}

export function SettingsPage({ children, onRefresh, hideScrollIndicator = false }: SettingsPageProps) {
  const modifiers = [
    ...(onRefresh ? [refreshable(onRefresh)] : []),
    ...(hideScrollIndicator ? [listStyle('insetGrouped'), scrollIndicators('never', 'vertical')] : []),
  ];

  return (
    <Host style={{ flex: 1 }} colorScheme="dark">
      {hideScrollIndicator ? (
        <NativeList modifiers={modifiers}>
          {children}
        </NativeList>
      ) : (
        <FieldGroup modifiers={modifiers}>
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
  const titleContent = (
    <NativeText
      textStyle={{
        color: destructive ? '#ff453a' : disabled ? '#8e8e93' : titleColor,
      }}
    >
      {title}
    </NativeText>
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
