import * as React from 'react';
import { View } from 'react-native';

/**
 * Colorful decorative backdrop for the auth screens — four soft gradient blobs
 * arranged at the corners using `chart-*` tokens so the palette stays in sync
 * with the web theme. Pure Tailwind classes via Uniwind (`experimental_backgroundImage`).
 *
 * Render as the first child of a `relative` container; content above should be
 * z-indexed higher (or simply rendered after, since z is 0 here).
 */
export function AuthBackdrop() {
  return (
    <View pointerEvents="none" className="absolute inset-0 z-0 overflow-hidden">
      <View className="absolute -right-40 -top-48 h-96 w-96 rounded-full bg-linear-to-br from-chart-1/40 via-chart-1/15 to-transparent dark:from-chart-1/35 dark:via-chart-1/10" />
      <View className="absolute -left-32 top-24 h-80 w-80 rounded-full bg-linear-to-tr from-purple-500/30 via-purple-500/10 to-transparent dark:from-purple-300/30 dark:via-purple-300/10" />
      <View className="absolute -bottom-48 -right-24 h-96 w-96 rounded-full bg-linear-to-tl from-chart-2/35 via-chart-2/12 to-transparent dark:from-chart-2/30 dark:via-chart-2/10" />
      <View className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-linear-to-tr from-purple-500/30 via-purple-500/10 to-transparent dark:from-purple-300/30 dark:via-purple-300/10" />
    </View>
  );
}
