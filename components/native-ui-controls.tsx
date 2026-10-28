import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { Pressable } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import {
  Button,
  Host,
  Picker,
  Switch,
  TextInput,
  useNativeState,
} from '@expo/ui';
import type {
  ButtonVariant,
  TextInputProps as ExpoTextInputProps,
  UniversalStyle,
  UniversalTextStyle,
} from '@expo/ui';

interface NativeButtonProps {
  label?: string;
  children?: ReactNode;
  onPress: () => void;
  disabled?: boolean;
  variant?: ButtonVariant;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
  seedColor?: string;
}

export function NativeButton({
  label,
  children,
  onPress,
  disabled = false,
  variant = 'filled',
  style,
  accessibilityLabel,
  seedColor = '#007aff',
}: NativeButtonProps) {
  if (children) {
    return (
      <Pressable
        style={({ pressed }) => [
          style,
          pressed && { opacity: 0.72, transform: [{ scale: 0.98 }] },
        ]}
        onPress={onPress}
        disabled={disabled}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
      >
        {children}
      </Pressable>
    );
  }

  return (
    <Host
      matchContents
      colorScheme="dark"
      seedColor={seedColor}
      style={style}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <Button
        label={children ? undefined : label}
        variant={variant}
        onPress={onPress}
        disabled={disabled}
      >
      </Button>
    </Host>
  );
}

interface NativeSwitchProps {
  value: boolean;
  onValueChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  seedColor?: string;
}

interface NativeSelectOption<T extends string | number> {
  label: string;
  value: T;
}

interface NativeSelectProps<T extends string | number> {
  selectedValue: T;
  onValueChange: (value: T) => void;
  options: NativeSelectOption<T>[];
  style?: StyleProp<ViewStyle>;
  enabled?: boolean;
}

export function NativeSelect<T extends string | number>({
  selectedValue,
  onValueChange,
  options,
  style,
  enabled = true,
}: NativeSelectProps<T>) {
  return (
    <Host matchContents colorScheme="dark" seedColor="#007aff" style={style}>
      <Picker
        selectedValue={selectedValue}
        onValueChange={onValueChange}
        appearance="menu"
        enabled={enabled}
      >
        {options.map((option) => (
          <Picker.Item
            key={option.value}
            label={option.label}
            value={option.value}
          />
        ))}
      </Picker>
    </Host>
  );
}

export function NativeSwitch({
  value,
  onValueChange,
  label,
  disabled,
  style,
  seedColor = '#007aff',
}: NativeSwitchProps) {
  return (
    <Host matchContents colorScheme="dark" seedColor={seedColor} style={style}>
      <Switch
        value={value}
        onValueChange={onValueChange}
        label={label}
        disabled={disabled}
      />
    </Host>
  );
}

type NativeTextInputProps = Omit<ExpoTextInputProps, 'value' | 'style'> & {
  value: string;
  style?: StyleProp<ViewStyle>;
  inputStyle?: UniversalStyle;
  textStyle?: UniversalTextStyle;
  accessibilityLabel?: string;
  seedColor?: string;
};

export function NativeTextInput({
  value,
  onChangeText,
  style,
  inputStyle,
  textStyle,
  accessibilityLabel,
  seedColor = '#007aff',
  ...props
}: NativeTextInputProps) {
  const nativeValue = useNativeState(value);

  useEffect(() => {
    nativeValue.set(value);
  }, [nativeValue, value]);

  return (
    <Host
      matchContents
      colorScheme="dark"
      seedColor={seedColor}
      style={style}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="none"
    >
      <TextInput
        {...props}
        value={nativeValue}
        onChangeText={(nextValue) => {
          nativeValue.set(nextValue);
          onChangeText?.(nextValue);
        }}
        style={inputStyle}
        textStyle={textStyle}
      />
    </Host>
  );
}
