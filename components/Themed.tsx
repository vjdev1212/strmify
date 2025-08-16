/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 */

import {
  ActivityIndicator as DefaultActivityIndicator,
  TextInput as DefaultTextInput,
  Text as DefaultText,
  View as DefaultView,
  StyleSheet,
  Platform
} from 'react-native';
import { StatusBar as DefaultStatusBar } from 'expo-status-bar';
import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultText['props'];
export type TextInputProps = ThemeProps & DefaultTextInput['props'];
export type ViewProps = ThemeProps & DefaultView['props'];
export type StatusBarProps = ThemeProps & React.ComponentProps<typeof DefaultStatusBar>;
export type ActivityIndicatorProps = ThemeProps & DefaultActivityIndicator['props'];

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = 'dark';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const color = '#ffffff';
  const webFontStyle = Platform.OS === 'web' ? { fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif' } : {};
  return <DefaultText style={[webFontStyle, { color }, style]} {...otherProps} />;
}

export function TextInput(props: TextInputProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const color = '#ffffff';

  return <DefaultTextInput style={[{ color }, style]} {...otherProps} />;
}

export function ActivityIndicator(props: ActivityIndicatorProps) {
  const { style, color, ...otherProps } = props;
  return (
    <DefaultActivityIndicator style={style} color={color}  {...otherProps} />
  );
}

export function View(props: ViewProps) {
  const { style, ...otherProps } = props;
  return <DefaultView style={[style]} {...otherProps} />;
}

export function StatusBar(props: StatusBarProps) {
  const { ...otherProps } = props;

  return <DefaultStatusBar style='light' translucent backgroundColor="transparent" {...otherProps} />;
}

export function Card(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;

  return (
    <DefaultView
      style={[
        {
          overflow: 'hidden',
        },
        style,
      ]}
      {...otherProps}
    />
  );
}
