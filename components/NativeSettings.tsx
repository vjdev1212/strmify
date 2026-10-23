import type { ReactElement, ReactNode } from 'react';
import { useState } from 'react';
import { Platform, Pressable, RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/Themed';
import { useTheme } from '@/context/ThemeContext';

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
        backgroundColor: Platform.select({ ios: '#000000', default: colors.background }),
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
  return (
    <View style={styles.section}>
      {title ? <Text style={styles.sectionTitle}>{title}</Text> : null}
      <View style={styles.group}>{children}</View>
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
  detailSameFont = false,
  detailColor,
}: SettingsRowProps) {
  const { colors } = useTheme();
  const content = (
    <>
      {leading ? <View style={styles.leading}>{leading}</View> : null}
      <View style={styles.rowText}>
        <Text style={[styles.rowTitle, { color: destructive ? '#ff453a' : colors.text }]}>{title}</Text>
        {detail ? (
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
      style={rowStyle}
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
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
    gap: 28,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    letterSpacing: -0.2,
    paddingHorizontal: 16,
    color: '#8e8e93',
  },
  group: {
    backgroundColor: '#1c1c1e',
    borderRadius: 27,
    overflow: 'hidden',
  },
  footer: {
    fontSize: 13,
    lineHeight: 18,
    paddingHorizontal: 16,
    color: '#8e8e93',
  },
  row: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    gap: 12,
  },
  rowWithSeparator: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#38383a',
    marginLeft: 20,
    paddingLeft: 0,
  },
  disabledRow: {
    opacity: 0.5,
  },
  leading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: {
    flex: 1,
    gap: 3,
  },
  rowTitle: {
    fontSize: 17,
    fontWeight: '400',
  },
  rowDetail: {
    fontSize: 13,
    lineHeight: 18,
  },
  trailing: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleBlock: {
    gap: 6,
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
  title: {
    fontSize: 34,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  subtitle: {
    fontSize: 15,
    lineHeight: 20,
  },
});
