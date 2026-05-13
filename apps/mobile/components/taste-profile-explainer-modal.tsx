import React, { useEffect, useState } from 'react';
import { Modal, Pressable, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import {
  Palette,
  FlaskConical,
  BookOpen,
  Zap,
  Compass,
  Info,
} from 'lucide-react-native';
import { Text } from '@/components/ui/text';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Icon } from '@/components/ui/icon';
import { Separator } from '@/components/ui/separator';

const TASTE_PROFILE_INFO: Record<string, { icon: LucideIcon; description: string }> = {
  Artisan: {
    icon: Palette,
    description:
      'A connoisseur of classical beauty and timeless artistic mastery. Your refined eye gravitates toward the masterworks of history.',
  },
  Innovator: {
    icon: FlaskConical,
    description:
      'Driven by curiosity and wonder, you explore the frontiers of discovery where science meets the extraordinary.',
  },
  Historian: {
    icon: BookOpen,
    description:
      'A keeper of stories and guardian of the past. You find meaning in the rich tapestry of human heritage and memory.',
  },
  Revolutionary: {
    icon: Zap,
    description:
      'Bold and avant-garde, you embrace the cutting edge of contemporary expression. You challenge conventions and celebrate the new.',
  },
  Explorer: {
    icon: Compass,
    description:
      'A wanderer through diverse cultures and traditions. You seek authentic connections across the mosaic of human identity.',
  },
};

const TASTE_PROFILE_HOW_IT_WORKS = [
  'We primarily look at the museums you follow and group them by broad type.',
  'As you engage with other users, exhibits, and museums, your taste profile will evolve!',
] as const;

type TasteProfileExplainerModalProps = {
  visible: boolean;
  profileName: string;
  onClose: () => void;
};

export function TasteProfileExplainerModal({
  visible,
  profileName,
  onClose,
}: TasteProfileExplainerModalProps) {
  const [howItWorksVisible, setHowItWorksVisible] = useState(false);
  const info = TASTE_PROFILE_INFO[profileName];

  useEffect(() => {
    if (visible) setHowItWorksVisible(false);
  }, [visible]);

  if (!visible || !info) return null;

  const IconComponent = info.icon;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable className="flex-1 items-center justify-center bg-black/60" onPress={onClose}>
        <Pressable onPress={(e) => e.stopPropagation()}>
          <Card className="w-4/5 max-w-sm gap-0 rounded-2xl border-border py-0 shadow-xl shadow-black/15">
            <CardContent className="items-center gap-4 px-6 py-6">
              <View className="size-16 items-center justify-center rounded-full bg-primary/15">
                <Icon as={IconComponent} className="text-primary" size={32} />
              </View>

              <View className="flex-row items-center justify-center gap-1">
                <Text className="text-center text-2xl font-bold text-foreground">{profileName}</Text>
                <Button
                  variant="ghost"
                  size="icon"
                  onPress={() => setHowItWorksVisible((v) => !v)}
                  accessibilityLabel="How your taste profile is calculated"
                  className="size-9 shrink-0 rounded-full">
                  <Icon as={Info} className="text-muted-foreground" size={20} />
                </Button>
              </View>

              <Text className="text-center text-base leading-relaxed text-muted-foreground">
                {info.description}
              </Text>

              {howItWorksVisible ? (
                <View className="w-full gap-3">
                  <Separator />
                  {TASTE_PROFILE_HOW_IT_WORKS.map((line, i) => (
                    <Text
                      key={i}
                      className="text-center text-xs italic leading-relaxed text-muted-foreground">
                      {line}
                    </Text>
                  ))}
                </View>
              ) : null}

              <Button variant="default" className="mt-1 min-h-11 rounded-xl px-8" onPress={onClose}>
                <Text className="text-base font-semibold text-primary-foreground">Got it</Text>
              </Button>
            </CardContent>
          </Card>
        </Pressable>
      </Pressable>
    </Modal>
  );
}
