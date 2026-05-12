import React, { useState } from 'react';
import { View, Pressable } from 'react-native';
import { ChevronDownIcon } from 'lucide-react-native';
import { useUniwind } from 'uniwind';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { CHECK_IN_DURATION_OPTIONS } from '@/lib/check-in-shared';
import {
  RN_API_MUTED_FOREGROUND_DARK,
  RN_API_MUTED_FOREGROUND_LIGHT,
} from '@/constants/rn-api-colors';

type Props = {
  value: number;
  onChange: (hours: number) => void;
};

export function CheckInDurationSelect({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const { theme } = useUniwind();
  const muted = theme === 'dark' ? RN_API_MUTED_FOREGROUND_DARK : RN_API_MUTED_FOREGROUND_LIGHT;

  const label = CHECK_IN_DURATION_OPTIONS.find((o) => o.value === value)?.label ?? '1 hour';

  return (
    <View className="relative">
      <Pressable
        className="flex-row items-center justify-between rounded-xl border border-border bg-card px-4 py-3 active:opacity-90"
        onPress={() => setOpen((o) => !o)}>
        <Text className="text-base text-foreground">{label}</Text>
        <ChevronDownIcon
          size={20}
          color={muted}
          style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}
        />
      </Pressable>
      {open ? (
        <View className="mt-2 overflow-hidden rounded-xl border border-border bg-card">
          {CHECK_IN_DURATION_OPTIONS.map((option, index) => {
            const isSelected = value === option.value;
            const isLast = index === CHECK_IN_DURATION_OPTIONS.length - 1;
            return (
              <Pressable
                key={option.value}
                className={cn('px-4 py-3 active:bg-muted', !isLast && 'border-b border-border')}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}>
                <Text className={cn('text-base', isSelected ? 'font-semibold text-primary' : 'text-foreground')}>
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}
