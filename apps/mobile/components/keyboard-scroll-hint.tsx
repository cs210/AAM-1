import { BlurView } from 'expo-blur';
import { View } from 'react-native';
import { useUniwind } from 'uniwind';

type Props = {
  keyboardHeight: number;
  visible: boolean;
};

/** Visual affordance above keyboard without text hints. */
export function KeyboardScrollHint({ keyboardHeight, visible }: Props) {
  const { theme } = useUniwind();
  if (!visible || keyboardHeight <= 0) return null;

  const tint = theme === 'dark' ? 'dark' : 'light';

  return (
    <View
      pointerEvents="none"
      className="absolute right-0 left-0"
      style={{ bottom: keyboardHeight }}>
      <BlurView
        tint={tint}
        intensity={55}
        style={{ position: 'absolute', right: 0, bottom: 0, left: 0, height: 36 }}
      />
    </View>
  );
}
