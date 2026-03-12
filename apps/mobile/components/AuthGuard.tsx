import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { router } from 'expo-router';
import { useConvexAuth } from 'convex/react';

interface AuthGuardProps {
  children: React.ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useConvexAuth();

  React.useEffect(() => {
    if (isLoading) return;
    
    if (!isAuthenticated) {
      router.replace('/sign-in');
    }
  }, [isAuthenticated, isLoading]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#D4915A" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
