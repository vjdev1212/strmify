import type { ReactElement, ReactNode } from 'react';
import { Children, isValidElement } from 'react';
import { View } from 'react-native';
import { FieldGroup, Host, ListItem, RNHostView, Text as NativeText } from '@expo/ui';
import { HStack, Spacer, VStack } from '@expo/ui/swift-ui';
import NativeFieldSelect from '@/components/native-field-select';
import { contentShape, frame, onTapGesture, refreshable, scrollIndicators, shapes } from '@expo/ui/swift-ui/modifiers';

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
        ...(hideScrollIndicator ? [scrollIndicators('never', 'vertical')] : []),
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
        color: destructive ? '#ff453a' : disabled ? '#8e8e93' : undefined,
      }}
    >
      {title}
    </NativeText>
  );
  const detailContent = detail ? (
    <NativeText textStyle={{
      fontSize: detailSameFont ? 16 : 13,
      ...(detailSameFont ? { fontWeight: '400' as const } : {}),
      color: detailColor ?? '#8e8e93',
    }}>
      {detail}
    </NativeText>
  ) : null;

  if (!onPress || disabled) {
    return (
      <ListItem
        leading={leadingContent}
        trailing={trailingContent}
        supportingText={detailContent}
      >
        {titleContent}
      </ListItem>
    );
  }

  return (
    <HStack
      spacing={12}
      alignment="center"
      modifiers={[
        frame({ maxWidth: Infinity }),
        contentShape(shapes.rectangle()),
        onTapGesture(onPress),
      ]}
    >
      {leadingContent}
      <VStack alignment="leading" spacing={2}>
        {titleContent}
        {detailContent}
      </VStack>
      <Spacer />
      {trailingContent}
    </HStack>
  );
}

export function SettingsTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <FieldGroup.Section title={title}>
      {subtitle ? <NativeText>{subtitle}</NativeText> : null}
    </FieldGroup.Section>
  );
}
