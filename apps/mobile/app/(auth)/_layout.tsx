import { RN_STYLE } from '@/constants/rn-api-colors';
import { Stack } from 'expo-router';
import { useUniwind } from 'uniwind';

export default function AuthLayout() {
  const { theme } = useUniwind();
  const t = theme === 'dark' ? RN_STYLE.dark : RN_STYLE.light;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: t.background },
        animation: 'default',
      }}
    />
  );
}
