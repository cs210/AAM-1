import { router } from 'expo-router';

export function routeAfterUsernameSetup(userInterests: unknown) {
  if (userInterests === null) {
    router.replace('/intake?redirect=/home');
  } else {
    router.replace('/home');
  }
}
