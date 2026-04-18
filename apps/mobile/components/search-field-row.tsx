import React from 'react';
import { View } from 'react-native';
import { SearchIcon } from 'lucide-react-native';
import { Input } from '@/components/ui/input';

/** Muted icon — matches `text-muted-foreground` (Lucide needs a color string). */
const MUTED_ICON = '#73706c';

type Props = {
  value: string;
  onChangeText: (v: string) => void;
  placeholder: string;
};

export function SearchFieldRow({ value, onChangeText, placeholder }: Props) {
  return (
    <View className="mx-5 mb-4 mt-4 flex-row items-center rounded-xl bg-muted px-4 py-3">
      <View className="mr-3">
        <SearchIcon size={20} color={MUTED_ICON} />
      </View>
      <Input
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        className="h-auto min-h-0 flex-1 border-0 bg-transparent px-0 py-0 text-base text-foreground shadow-none"
      />
    </View>
  );
}
