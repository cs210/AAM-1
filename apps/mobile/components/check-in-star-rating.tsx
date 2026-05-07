import React from 'react';
import { View, Pressable } from 'react-native';
import { StarIcon } from 'lucide-react-native';
import { useUniwind } from 'uniwind';
import { cn } from '@/lib/utils';
import {
  RN_API_BORDER_DARK,
  RN_API_BORDER_LIGHT,
  RN_API_PRIMARY_DARK,
  RN_API_PRIMARY_LIGHT,
} from '@/constants/rn-api-colors';

type Props = {
  value: number | null;
  onChange: (next: number | null) => void;
  /** Lucide icon size (points). */
  starSize?: number;
  className?: string;
};

export function CheckInStarRating({ value, onChange, starSize = 32, className }: Props) {
  const { theme } = useUniwind();
  const filled = theme === 'dark' ? RN_API_PRIMARY_DARK : RN_API_PRIMARY_LIGHT;
  const empty = theme === 'dark' ? RN_API_BORDER_DARK : RN_API_BORDER_LIGHT;

  return (
    <View className={cn('flex-row gap-2', className)}>
      {[1, 2, 3, 4, 5].map((star) => {
        const active = star <= (value ?? 0);
        return (
          <Pressable
            key={star}
            accessibilityLabel={`${star} stars`}
            className="rounded-lg p-1 active:opacity-80"
            onPress={() => onChange(value === star ? null : star)}>
            <StarIcon size={starSize} color={active ? filled : empty} fill={active ? filled : 'none'} />
          </Pressable>
        );
      })}
    </View>
  );
}
