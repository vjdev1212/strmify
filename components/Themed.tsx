import {
  ActivityIndicator as DefaultActivityIndicator,
  TextInput as DefaultTextInput,
  Text as DefaultText,
  View as DefaultView,
  Platform
} from 'react-native';
import { StatusBar as DefaultStatusBar } from 'expo-status-bar';
import { Colors } from '@/constants/theme';

export type TextProps = DefaultText['props'];
export type TextInputProps = DefaultTextInput['props'];
export type ViewProps = DefaultView['props'];
export type StatusBarProps = React.ComponentProps<typeof DefaultStatusBar>;
export type ActivityIndicatorProps = DefaultActivityIndicator['props'];

export function Text(props: TextProps) {
  const { style, ...otherProps } = props;
  const webFontStyle = Platform.OS === 'web' ? { fontFamily: 'SF Pro Display, -apple-system, BlinkMacSystemFont, sans-serif' } : {};
  return <DefaultText style={[webFontStyle, { color: Colors.text }, style]} {...otherProps} />;
}

export function TextInput(props: TextInputProps) {
  const { style, ...otherProps } = props;
  return <DefaultTextInput style={[{ color: Colors.text }, style]} {...otherProps} />;
}

export function ActivityIndicator(props: ActivityIndicatorProps) {
  const { style, color = Colors.primary, ...otherProps } = props;
  return <DefaultActivityIndicator style={style} color={color} {...otherProps} />;
}

export function View(props: ViewProps) {
  const { style, ...otherProps } = props;
  return <DefaultView style={[style]} {...otherProps} />;
}

export function StatusBar(props: StatusBarProps) {
  return <DefaultStatusBar {...props} style="light" translucent backgroundColor="transparent" />;
}

export function Card(props: ViewProps) {
  const { style, ...otherProps } = props;
  return (
    <DefaultView
      style={[{ overflow: 'hidden' }, style]}
      {...otherProps}
    />
  );
}