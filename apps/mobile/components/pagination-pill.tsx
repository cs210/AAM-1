import React from 'react';
import { Pressable } from 'react-native';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';

type Props = {
  label: string;
  onPress: () => void;
  disabled: boolean;
};

export function PaginationPill({ label, onPress, disabled }: Props) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      className={cn(
        'rounded-full px-3.5 py-2 active:opacity-85',
        disabled ? 'bg-muted' : 'bg-primary'
      )}>
      <Text
        className={cn(
          'text-[13px] font-semibold',
          disabled ? 'text-muted-foreground' : 'text-primary-foreground'
        )}>
        {label}
      </Text>
    </Pressable>
  );
}
