import { Stack } from 'expo-router';
import { useUniwind } from 'uniwind';
import { RN_STYLE } from '@/constants/rn-api-colors';

export default function HomeFeedLayout() {
  const { theme } = useUniwind();
  const t = theme === 'dark' ? RN_STYLE.dark : RN_STYLE.light;

  return (
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: t.background },
        headerTintColor: t.foreground,
        headerShadowVisible: false,
        contentStyle: { backgroundColor: t.background },
      }}
    />
  );
}
