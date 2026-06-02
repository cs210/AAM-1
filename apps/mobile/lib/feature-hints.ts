import AsyncStorage from '@react-native-async-storage/async-storage';

function hintStorageKey(userId: string, hintId: string) {
  return `feature_hint_dismissed_v2_${hintId}_${userId}`;
}

export async function shouldShowFeatureHint(userId: string, hintId: string) {
  const key = hintStorageKey(userId, hintId);
  const dismissed = await AsyncStorage.getItem(key);
  return dismissed !== 'true';
}

export async function dismissFeatureHint(userId: string, hintId: string) {
  const key = hintStorageKey(userId, hintId);
  await AsyncStorage.setItem(key, 'true');
}

