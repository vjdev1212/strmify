import { Children, type ReactElement, type ReactNode } from 'react';
import { useState } from 'react';
import { Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';
import { useTheme } from '@/context/ThemeContext';
import { radius, spacing, systemDarkBackground, typography } from '@/constants/theme';

interface SettingsPageProps {
  children: ReactNode;
  refreshControl?: ReactElement;
  onRefresh?: () => Promise<void>;
  hideScrollIndicator?: boolean;
}

export function SettingsPage({ children, refreshControl, onRefresh, hideScrollIndicator = false }: SettingsPageProps) {
  const { colors } = useTheme();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={!hideScrollIndicator}
      refreshControl={refreshControl ?? (onRefresh ? (
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary}
          colors={[colors.primary]}
          progressBackgroundColor={colors.background}
        />
      ) : undefined)}
      style={[styles.page, {
        backgroundColor: systemDarkBackground,
      }]}
      contentContainerStyle={styles.pageContent}
    >
      {children}
    </ScrollView>
  );
}

interface SettingsSectionProps {
  title?: string;
  footer?: string;
  children: ReactNode;
}

export function SettingsSection({ title, footer, children }: SettingsSectionProps) {
  const sectionChildren = Children.toArray(children);

  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      {sectionChildren.length > 0 ? (
        <View style={styles.group}>{sectionChildren}</View>
      ) : null}
      {footer ? (
        <Text style={styles.footer}>{footer}</Text>
      ) : null}
    </View>
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
  isLast = false,
  accessibilityLabel,
  selected,
  disabled = false,
  titleColor,
  detailSameFont = false,
  detailColor,
}: SettingsRowProps) {
  const { colors } = useTheme();
  const content = (
    <>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: destructive ? '#ff453a' : titleColor ?? colors.text }]}>{title}</Text>
        {typeof detail === 'string' && detail ? (
          <Text style={[
            detailSameFont ? styles.rowTitle : styles.rowDetail,
            { color: detailColor ?? colors.textMuted },
          ]}>
            {detail}
          </Text>
        ) : null}
      </View>
      {trailing ? <View style={styles.trailing}>{trailing}</View> : null}
    </>
  );
  const rowStyle = [
    styles.row,
    !isLast && styles.rowWithSeparator,
    disabled && styles.disabledRow,
  ];

  if (!onPress) {
    return <View style={rowStyle}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? title}
      accessibilityRole={selected === undefined ? 'button' : 'radio'}
      accessibilityState={selected === undefined ? undefined : { checked: selected }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        rowStyle,
        pressed && styles.pressedRow,
      ]}
    >
      {content}
    </Pressable>
  );
}

export function SettingsTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  const { colors } = useTheme();

  return (
    <View style={styles.titleBlock}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      {subtitle ? <Text style={[styles.subtitle, { color: colors.textMuted }]}>{subtitle}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
  },
  pageContent: {
    width: '100%',
    maxWidth: 780,
    alignSelf: 'center',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    ...typography.subhead,
    fontWeight: '600',
    paddingHorizontal: spacing.md,
    color: '#8e8e93',
  },
  group: {
    backgroundColor: '#1C1C1E',
    borderRadius: radius.lg,
    borderCurve: 'continuous',
    overflow: 'hidden',
  },
  footer: {
    ...typography.caption,
    paddingHorizontal: spacing.md,
    color: '#8e8e93',
  },
  row: {
    width: '100%',
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  rowWithSeparator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#38383a',
    marginLeft: spacing.md,
    paddingLeft: 0,
  },
  disabledRow: {
    opacity: 0.5,
  },
  pressedRow: {
    backgroundColor: '#2C2C2E',
  },
  leading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: spacing.xs,
  },
  rowTitle: {
    ...typography.body,
  },
  rowDetail: {
    ...typography.caption,
  },
  trailing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingBottom: 4,
  },
  title: {
    ...typography.largeTitle,
  },
  subtitle: {
    ...typography.subhead,
  },
});
