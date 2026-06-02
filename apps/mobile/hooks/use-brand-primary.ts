import {
  RN_API_MUTED_FOREGROUND_DARK,
  RN_API_MUTED_FOREGROUND_LIGHT,
  RN_API_PRIMARY_DARK,
  RN_API_PRIMARY_LIGHT,
} from '@/constants/rn-api-colors';
import { useUniwind } from 'uniwind';

/** Lucide `color` and similar APIs need a string; use bg-primary / text-primary in Tailwind when you can. */
export function useBrandPrimaryHex() {
  const { theme } = useUniwind();
  return theme === 'dark' ? RN_API_PRIMARY_DARK : RN_API_PRIMARY_LIGHT;
}

/** Lucide `color` for muted icons — prefer `text-muted-foreground` in Tailwind when you can. */
export function useMutedForegroundHex() {
  const { theme } = useUniwind();
  return theme === 'dark' ? RN_API_MUTED_FOREGROUND_DARK : RN_API_MUTED_FOREGROUND_LIGHT;
}
