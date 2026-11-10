import { Appearance } from 'react-native';
import { StorageKeys, storageService } from '@/utils/StorageService';

export type UserInterfaceStyle = 'automatic' | 'light' | 'dark';

export function getUserInterfaceStyle(): UserInterfaceStyle {
  const storedStyle = storageService.getItem(StorageKeys.USER_INTERFACE_STYLE_KEY);
  if (storedStyle === 'light' || storedStyle === 'dark' || storedStyle === 'automatic') {
    return storedStyle;
  }
  return 'automatic';
}

export function applyUserInterfaceStyle(style: UserInterfaceStyle): void {
  Appearance.setColorScheme(style === 'automatic' ? 'auto' : style);
}

export function setUserInterfaceStyle(style: UserInterfaceStyle): void {
  storageService.setItem(StorageKeys.USER_INTERFACE_STYLE_KEY, style);
  applyUserInterfaceStyle(style);
}
