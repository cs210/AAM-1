import { Platform, UIManager } from 'react-native';

export function isIosNativeDateTimePickerAvailable(): boolean {
  if (Platform.OS !== 'ios') return false;

  if (typeof UIManager.hasViewManagerConfig === 'function') {
    return UIManager.hasViewManagerConfig('RNDateTimePicker');
  }

  if (typeof UIManager.getViewManagerConfig === 'function') {
    try {
      return UIManager.getViewManagerConfig('RNDateTimePicker') != null;
    } catch {
      return false;
    }
  }

  return false;
}
