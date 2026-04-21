import '@/global.css';

import { SentryUserSync } from '@/components/sentry-user-sync';
import { navigationIntegration } from '@/lib/sentry';
import { NAV_THEME } from '@/constants/rn-api-colors';
import ConvexClientProvider from '@/providers/ConvexClientProvider';
import { ThemeProvider } from '@react-navigation/native';
import { PortalHost } from '@rn-primitives/portal';
import { Stack, useNavigationContainerRef } from 'expo-router';
import * as Sentry from '@sentry/react-native';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { useUniwind } from 'uniwind';
import { PostHogProvider } from 'posthog-react-native'

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

console.log(process.env.EXPO_PUBLIC_POSTHOG_PROJECT_KEY)

function RootLayout() {
  const { theme } = useUniwind();
  const navigationRef = useNavigationContainerRef();
  const colorScheme = theme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    if (navigationRef) {
      navigationIntegration.registerNavigationContainer(navigationRef);
    }
  }, [navigationRef]);

  const posthogProjectKey = process.env.EXPO_PUBLIC_POSTHOG_PROJECT_KEY

  if (!posthogProjectKey) {
    throw new Error("Missing EXPO_PUBLIC_POSTHOG_PROJECT_KEY");
  }

  return (
    <SafeAreaProvider initialMetrics={initialWindowMetrics}>
      <ConvexClientProvider>
        <PostHogProvider
            apiKey={posthogProjectKey}
            options={{
                host: "https://us.i.posthog.com",
            }}
        >
        <SentryUserSync />
        <ThemeProvider value={NAV_THEME[colorScheme]}>
          <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
          <Stack screenOptions={{ headerShown: false }} />
          <PortalHost />
        </ThemeProvider>
        </PostHogProvider>
      </ConvexClientProvider>
    </SafeAreaProvider>
  );
}

export default Sentry.wrap(RootLayout);
