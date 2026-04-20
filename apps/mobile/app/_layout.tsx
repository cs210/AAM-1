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
import { useUniwind } from 'uniwind';

export {
  // Catch any errors thrown by the Layout component.
  ErrorBoundary,
} from 'expo-router';

function RootLayout() {
  const { theme } = useUniwind();
  const navigationRef = useNavigationContainerRef();
  const colorScheme = theme === 'dark' ? 'dark' : 'light';

  useEffect(() => {
    if (navigationRef) {
      navigationIntegration.registerNavigationContainer(navigationRef);
    }
  }, [navigationRef]);

  return (
    <ConvexClientProvider>
      <SentryUserSync />
      <ThemeProvider value={NAV_THEME[colorScheme]}>
        <StatusBar style={colorScheme === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false }} />
        <PortalHost />
      </ThemeProvider>
    </ConvexClientProvider>
  );
}

export default Sentry.wrap(RootLayout);
