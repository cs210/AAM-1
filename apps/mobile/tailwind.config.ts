import type { Config } from 'tailwindcss';
import uniwindPreset from 'uniwind/tailwind';

export default {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [uniwindPreset],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Georgia', 'serif'],
        serif: ['Georgia', 'serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
