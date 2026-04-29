import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
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
