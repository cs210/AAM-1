import { DarkTheme, DefaultTheme, type Theme } from '@react-navigation/native';

/**
 * Styling uses Tailwind/Uniwind via global.css tokens.
 *
 * React Navigation’s ThemeProvider, ActivityIndicator.color, and Lucide’s `color`
 * prop require platform color strings — they cannot read CSS variables. These
 * literals mirror apps/web/app/globals.css (see web @theme inline --color-primary
 * and :root / .dark oklch). Update both when web palette changes.
 */
export const RN_API_PRIMARY_LIGHT = '#FF9186';
/** Dark mode --primary oklch(0.75 0.14 30) */
export const RN_API_PRIMARY_DARK = '#FF9F96';

export const RN_API_FOREGROUND_LIGHT = '#252525';
export const RN_API_FOREGROUND_DARK = '#f7f7f4';

export const RN_API_BACKGROUND_LIGHT = '#ffffff';
export const RN_API_BACKGROUND_DARK = '#252525';

export const RN_API_BORDER_LIGHT = '#ebe8e6';
export const RN_API_BORDER_DARK = 'rgba(255,255,255,0.1)';

export const RN_API_MUTED_FOREGROUND_LIGHT = '#73706c';
export const RN_API_MUTED_FOREGROUND_DARK = '#a8a49a';

export const RN_API_CARD_LIGHT = '#ffffff';
export const RN_API_CARD_DARK = '#2c2c28';

export const RN_API_DESTRUCTIVE_LIGHT = '#e5484d';
export const RN_API_DESTRUCTIVE_DARK = '#f87168';

/** Primary button / on-primary text — web --color-primary-foreground #1a0f0e */
export const RN_API_PRIMARY_FOREGROUND_ON_BRAND = '#1a0f0e';

/** Convenience bundle for legacy StyleSheet blocks (prefer Tailwind elsewhere). */
export const RN_STYLE = {
  light: {
    background: RN_API_BACKGROUND_LIGHT,
    foreground: RN_API_FOREGROUND_LIGHT,
    primary: RN_API_PRIMARY_LIGHT,
    card: RN_API_CARD_LIGHT,
    border: RN_API_BORDER_LIGHT,
    mutedForeground: RN_API_MUTED_FOREGROUND_LIGHT,
  },
  dark: {
    background: RN_API_BACKGROUND_DARK,
    foreground: RN_API_FOREGROUND_DARK,
    primary: RN_API_PRIMARY_DARK,
    card: RN_API_CARD_DARK,
    border: RN_API_BORDER_DARK,
    mutedForeground: RN_API_MUTED_FOREGROUND_DARK,
  },
} as const;

/**
 * @react-navigation/native theme — not styled with className; must use literals.
 */
export const NAV_THEME: Record<'light' | 'dark', Theme> = {
  light: {
    ...DefaultTheme,
    colors: {
      ...DefaultTheme.colors,
      background: RN_API_BACKGROUND_LIGHT,
      border: RN_API_BORDER_LIGHT,
      card: RN_API_CARD_LIGHT,
      notification: RN_API_DESTRUCTIVE_LIGHT,
      primary: RN_API_PRIMARY_LIGHT,
      text: RN_API_FOREGROUND_LIGHT,
    },
  },
  dark: {
    ...DarkTheme,
    colors: {
      ...DarkTheme.colors,
      background: RN_API_BACKGROUND_DARK,
      border: RN_API_BORDER_DARK,
      card: RN_API_CARD_DARK,
      notification: RN_API_DESTRUCTIVE_DARK,
      primary: RN_API_PRIMARY_DARK,
      text: RN_API_FOREGROUND_DARK,
    },
  },
};
