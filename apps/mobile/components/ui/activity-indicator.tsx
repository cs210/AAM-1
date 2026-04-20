import { RN_API_PRIMARY_DARK, RN_API_PRIMARY_LIGHT } from '@/constants/rn-api-colors';
import { useUniwind } from 'uniwind';
import { ActivityIndicator, type ActivityIndicatorProps } from 'react-native';

/**
 * ActivityIndicator needs a `color` string; Uniwind tokens apply to `className`, not this API.
 * Uses the same primary hex as web --color-primary / .dark --primary (see constants/rn-api-colors.ts).
 */
export function BrandActivityIndicator({ color, ...props }: ActivityIndicatorProps) {
  const { theme } = useUniwind();
  const fallback = theme === 'dark' ? RN_API_PRIMARY_DARK : RN_API_PRIMARY_LIGHT;
  return <ActivityIndicator color={color ?? fallback} {...props} />;
}
