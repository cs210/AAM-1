import React from 'react';
import { Pressable, View } from 'react-native';
import { ArrowLeftIcon } from 'lucide-react-native';
import { useUniwind } from 'uniwind';
import { RN_STYLE } from '@/constants/rn-api-colors';
import { Text } from '@/components/ui/text';

type ScreenTitleBarProps = {
  title: string;
  onBackPress: () => void;
  rightSlot?: React.ReactNode;
};

export function ScreenTitleBar({ title, onBackPress, rightSlot }: ScreenTitleBarProps) {
  const { theme } = useUniwind();
  const palette = theme === 'dark' ? RN_STYLE.dark : RN_STYLE.light;

  return (
    <View
      className="flex-row items-center justify-between border-b px-4 py-3"
      style={{ backgroundColor: palette.background, borderBottomColor: palette.border }}
    >
      <Pressable className="size-10 items-center justify-center" onPress={onBackPress}>
        <ArrowLeftIcon size={24} color={palette.foreground} />
      </Pressable>

      <Text className="flex-1 text-center text-base font-semibold text-foreground" numberOfLines={1}>
        {title}
      </Text>

      {rightSlot ?? <View className="w-10" />}
    </View>
  );
}
