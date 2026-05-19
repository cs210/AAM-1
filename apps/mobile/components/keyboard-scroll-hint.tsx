import { LinearGradient } from 'expo-linear-gradient';
import { ChevronUp } from 'lucide-react-native';
import { View } from 'react-native';
import { Text } from '@/components/ui/text';
import {
  RN_API_BACKGROUND_DARK,
  RN_API_BACKGROUND_LIGHT,
  RN_API_MUTED_FOREGROUND_DARK,
  RN_API_MUTED_FOREGROUND_LIGHT,
} from '@/constants/rn-api-colors';
import { useUniwind } from 'uniwind';

type Props = {
  keyboardHeight: number;
  visible: boolean;
};

/** Fade and label sitting just above the keyboard so obscured list rows are obvious. */
export function KeyboardScrollHint({ keyboardHeight, visible }: Props) {
  const { theme } = useUniwind();
  if (!visible || keyboardHeight <= 0) return null;

  const background = theme === 'dark' ? RN_API_BACKGROUND_DARK : RN_API_BACKGROUND_LIGHT;
  const muted = theme === 'dark' ? RN_API_MUTED_FOREGROUND_DARK : RN_API_MUTED_FOREGROUND_LIGHT;

  return (
    <View
      pointerEvents="none"
      className="absolute right-0 left-0 items-center"
      style={{ bottom: keyboardHeight }}>
      <LinearGradient
        colors={['transparent', background]}
        style={{ position: 'absolute', right: 0, bottom: 0, left: 0, height: 40 }}
      />
      <View className="flex-row items-center gap-1 pb-2">
        <ChevronUp size={14} color={muted} />
        <Text className="text-muted-foreground text-xs font-medium">Scroll for more</Text>
      </View>
    </View>
  );
}
