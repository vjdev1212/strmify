/**
 * Learn more about Light and Dark modes:
 * https://docs.expo.io/guides/color-schemes/
 */

import { ActivityIndicator as DefaultActivityIndicator, TextInput as DefaultTextInput, Text as DefaultText, View as DefaultView } from 'react-native';

import Colors from '@/constants/Colors';
import { useColorScheme } from './useColorScheme';

type ThemeProps = {
  lightColor?: string;
  darkColor?: string;
};

export type TextProps = ThemeProps & DefaultText['props'];
export type TextInputProps = ThemeProps & DefaultTextInput['props'];
export type ViewProps = ThemeProps & DefaultView['props'];
export type ActivityIndicatorProps = ThemeProps & DefaultActivityIndicator['props'];

export function useThemeColor(
  props: { light?: string; dark?: string },
  colorName: keyof typeof Colors.light & keyof typeof Colors.dark
) {
  const theme = useColorScheme() ?? 'dark';
  const colorFromProps = props[theme];

  if (colorFromProps) {
    return colorFromProps;
  } else {
    return Colors[theme][colorName];
  }
}

export function Text(props: TextProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return <DefaultText style={[{ color }, style]} {...otherProps} />;
}

export function TextInput(props: TextInputProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const color = useThemeColor({ light: lightColor, dark: darkColor }, 'text');

  return <DefaultTextInput style={[{ color }, style]} {...otherProps} />;
}

export function ActivityIndicator(props: ActivityIndicatorProps) {
  const { style, color, ...otherProps } = props;
  return (
    <DefaultActivityIndicator style={style} color={color}  {...otherProps} />
  );
}

export function View(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;
  const backgroundColor = useThemeColor({ light: lightColor, dark: darkColor }, 'background');

  return <DefaultView style={[{ backgroundColor }, style]} {...otherProps} />;
}

export function Card(props: ViewProps) {
  const { style, lightColor, darkColor, ...otherProps } = props;

  // Use color scheme to decide background color based on light or dark mode
  const colorScheme = useColorScheme();

  // Dynamically adjust border and shadow based on the color scheme
  const backgroundColor = colorScheme === 'dark' ? '#101010' : '#FAFAFA';
  const borderColor = colorScheme === 'dark' ? '#101010' : '#DDDDDD';
  const shadowColor = colorScheme === 'dark' ? '#101010' : '#EFEFEF';

  return (
    <DefaultView
      style={[
        {
          backgroundColor,
          borderColor,
          borderWidth: 1,          
          overflow: 'hidden', 
        },
        style,
      ]}
      {...otherProps}
    />
  );
}
