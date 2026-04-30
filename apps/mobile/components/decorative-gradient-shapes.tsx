import * as React from 'react';
import { View } from 'react-native';

/**
 * Two soft circular gradient blobs positioned in the top-right and bottom-left
 * corners of a screen. The parent must be `relative` and apply a higher `z-index`
 * (e.g. `z-10`) to content that should render above the shapes.
 *
 * Light-mode uses a more saturated purple so the shapes read on a white background;
 * dark-mode uses a softer lavender that looks right against the dark surface.
 */
export function DecorativeGradientShapes() {
  return (
    <>
      <View
        pointerEvents="none"
        className="absolute -right-38 -top-50 z-0 h-100 w-137.5 overflow-hidden rounded-full bg-linear-to-b from-pink-500/35 via-pink-500/10 to-transparent dark:from-purple-200/40 dark:via-purple-200/10"
      />
      <View
        pointerEvents="none"
        className="absolute -bottom-50 -left-38 z-0 h-100 w-137.5 overflow-hidden rounded-full bg-linear-to-t from-pink-500/35 via-pink-500/10 to-transparent dark:from-purple-200/40 dark:via-purple-200/10"
      />
    </>
  );
}
