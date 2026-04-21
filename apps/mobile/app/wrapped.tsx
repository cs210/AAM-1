import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Dimensions,
  TouchableOpacity,
  Animated,
  StatusBar,
  Share,
  Image,
  Pressable,
} from 'react-native';
import { router } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { X, Share2, Download } from 'lucide-react-native';
import { useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';
import { AuthGuard } from '@/components/AuthGuard';
import { Text } from '@/components/ui/text';
import { cn } from '@/lib/utils';
import { RN_API_MUTED_FOREGROUND_LIGHT } from '@/constants/rn-api-colors';

const { width } = Dimensions.get('window');
/** Slide containers use flex:1 inside SafeAreaView so content does not draw under status bar / home indicator. */
const SLIDE_FLEX = { width: '100%' as const, flex: 1 as const };

// ─── Static display defaults for non-check-in slides ───────────────────────
const DATA = {
  year: new Date().getFullYear(),
  artworksSaved: 23,
  artistsDiscovered: 14,
};

// ─── Slide 1: Intro ────────────────────────────────────────────────────────
const IntroSlide = ({ onNext, tasteProfileName }: { onNext: () => void; tasteProfileName: string | null | undefined }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 800, delay: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 700, delay: 200, useNativeDriver: true }),
    ]).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.1, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  return (
    <Pressable className="items-center justify-center bg-transparent" style={SLIDE_FLEX} onPress={onNext}>
      <Animated.View
        className="items-center justify-center px-8"
        style={{ opacity: fadeAnim, transform: [{ translateY: slideAnim }] }}>
        <Text className="mb-4 text-center text-xs font-normal tracking-[2.5px] text-muted-foreground">
          YOUR {DATA.year} IN REVIEW
        </Text>
        <View className="mb-5 items-center">
          <Text className="text-center text-5xl font-semibold leading-[50px] tracking-tight text-foreground">
            Museum
          </Text>
          <Text className="text-center text-5xl font-semibold leading-[52px] tracking-tight text-primary">
            Wrapped
          </Text>
        </View>
        <View className="mt-3 flex-row items-center gap-1.5 rounded-full bg-primary/15 px-3.5 py-2">
          <Text className="text-base font-semibold text-primary">{tasteProfileName ?? 'Explorer'}</Text>
        </View>
        <Text className="mt-2 text-center text-sm leading-6 text-muted-foreground">
          Let&apos;s explore your artistic{'\n'}journey this year
        </Text>
      </Animated.View>
      <View
        pointerEvents="box-none"
        className="absolute bottom-0 left-0 right-0 items-center pb-4">
        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <Text className="text-xs font-semibold tracking-[2.5px] text-primary">TAP TO CONTINUE</Text>
        </Animated.View>
      </View>
    </Pressable>
  );
};

// ─── Slide 2: Hours ────────────────────────────────────────────────────────
const HoursSlide = ({
  onNext,
  totalHours,
  totalDays,
}: {
  onNext: () => void;
  totalHours: number;
  totalDays: number;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const countAnim = useRef(new Animated.Value(0)).current;
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 100, useNativeDriver: true }).start();
    Animated.timing(countAnim, { toValue: totalHours, duration: 1200, delay: 300, useNativeDriver: false }).start();
    countAnim.addListener(({ value }) => setDisplayed(Math.round(value)));
    return () => countAnim.removeAllListeners();
  }, [countAnim, fadeAnim, totalHours]);

  return (
    <Pressable className="items-center justify-center bg-transparent" style={SLIDE_FLEX} onPress={onNext}>
      <Animated.View className="items-center justify-center px-8" style={{ opacity: fadeAnim }}>
        <Text className="mb-4 text-center text-xs font-normal tracking-[2.5px] text-muted-foreground">
          YOU SPENT
        </Text>
        <View className="my-1 items-center">
          <Text className="text-8xl font-bold leading-none tracking-tighter text-foreground">{displayed}</Text>
          <Text className="text-center text-5xl font-semibold leading-[52px] tracking-tight text-primary">
            hours
          </Text>
        </View>
        <Text className="mt-2 text-center text-sm leading-6 text-muted-foreground">lost in art and wonder</Text>
        <View className="mt-7 items-center gap-0.5">
          <Text className="text-xs font-normal tracking-[2.5px] text-muted-foreground">THAT&apos;S LIKE</Text>
          <Text className="mt-1 text-2xl font-bold text-foreground">{totalDays} days</Text>
          <Text className="mt-0.5 text-xs text-muted-foreground">of pure culture</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

// ─── Slide 3: Museums ──────────────────────────────────────────────────────
const MuseumsSlide = ({
  onNext,
  museumsVisited,
  citiesExplored,
  eventsAttended,
}: {
  onNext: () => void;
  museumsVisited: number;
  citiesExplored: number;
  eventsAttended: number;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 100, useNativeDriver: true }).start();
  }, []);

  return (
    <Pressable className="items-center justify-center bg-transparent" style={SLIDE_FLEX} onPress={onNext}>
      <Animated.View className="items-center justify-center px-8" style={{ opacity: fadeAnim }}>
        <Text className="mb-4 text-center text-xs font-normal tracking-[2.5px] text-muted-foreground">
          YOU EXPLORED
        </Text>
        <View className="my-1 items-center">
          <Text className="text-8xl font-bold leading-none tracking-tighter text-foreground">
            {museumsVisited}
          </Text>
          <Text className="text-center text-5xl font-semibold leading-[52px] tracking-tight text-primary">
            museums
          </Text>
        </View>
        <Text className="mt-2 text-center text-sm leading-6 text-muted-foreground">
          across {citiesExplored} cities
        </Text>
        <View className="mt-7 items-center gap-0.5">
          <Text className="text-xs font-normal tracking-[2.5px] text-muted-foreground">INCLUDING</Text>
          <Text className="mt-1 text-2xl font-bold text-foreground">{eventsAttended} events</Text>
          <Text className="mt-0.5 text-xs text-muted-foreground">attended in person</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

// ─── Slide 4: Top Museum ───────────────────────────────────────────────────
const TopSpotSlide = ({
  onNext,
  topMuseum,
}: {
  onNext: () => void;
  topMuseum: { name: string; visits: number; hours: number } | null;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, delay: 100, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, delay: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  const museumCardSize = { width: width * 0.72, height: width * 0.5 };
  return (
    <Pressable className="items-center justify-center bg-transparent" style={SLIDE_FLEX} onPress={onNext}>
      <Animated.View className="items-center justify-center px-8" style={{ opacity: fadeAnim }}>
        <Text className="mb-4 text-center text-xs font-normal tracking-[2.5px] text-muted-foreground">
          YOUR #1 SPOT
        </Text>
        <Animated.View
          className="my-5 overflow-hidden rounded-2xl shadow-md shadow-black/10"
          style={[museumCardSize, { transform: [{ scale: scaleAnim }] }]}>
          <View className="size-full items-center justify-center bg-muted">
            <Text className="text-6xl">🏛️</Text>
          </View>
        </Animated.View>
        <Text className="mt-1 text-center text-2xl font-bold text-foreground">
          {topMuseum?.name ?? 'No top museum yet'}
        </Text>
        <View className="mt-5 flex-row items-center gap-6">
          <View className="items-center">
            <Text className="text-3xl font-bold text-primary">{topMuseum?.visits ?? 0}</Text>
            <Text className="mt-0.5 text-xs font-normal tracking-widest text-muted-foreground">visits</Text>
          </View>
          <View className="h-9 w-px bg-border" />
          <View className="items-center">
            <Text className="text-3xl font-bold text-primary">{topMuseum?.hours ?? 0}</Text>
            <Text className="mt-0.5 text-xs font-normal tracking-widest text-muted-foreground">hours</Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

// ─── Slide 5: Art Styles ───────────────────────────────────────────────────
const StylesSlide = ({
  onNext,
  artStyles,
  hasEnoughData,
}: {
  onNext: () => void;
  artStyles: Array<{ name: string; pct: number; color: string }>;
  hasEnoughData: boolean;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(1.2)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;
  const barAnims = useRef(artStyles.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 100, useNativeDriver: true }),
      Animated.timing(imageOpacity, { toValue: 1, duration: 800, delay: 200, useNativeDriver: true }),
      Animated.timing(imageScale, { toValue: 1, duration: 1000, delay: 200, useNativeDriver: true }),
    ]).start();
    
    barAnims.forEach((anim, i) => {
      Animated.timing(anim, {
        toValue: 1,
        duration: 700,
        delay: 500 + i * 100,
        useNativeDriver: false,
      }).start();
    });
  }, [barAnims]);

  const impressionBox = { width: width * 0.7, height: width * 0.38 };

  if (!hasEnoughData || artStyles.length === 0) {
    return (
      <Pressable className="items-center justify-center bg-transparent" style={SLIDE_FLEX} onPress={onNext}>
        <Animated.View className="items-center justify-center px-8" style={{ opacity: fadeAnim }}>
          <Text className="mb-4 text-center text-xs font-normal tracking-[2.5px] text-muted-foreground">
            YOUR TASTE MAP
          </Text>
          <Text className="text-center text-2xl font-semibold text-foreground">
            Keep exploring to discover{'\n'}your style preferences
          </Text>
          <Text className="mt-4 text-center text-sm text-muted-foreground">
            Check in to at least 3 museums to unlock your personalized taste profile
          </Text>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable className="items-center justify-center bg-transparent" style={SLIDE_FLEX} onPress={onNext}>
      <Animated.View className="w-full items-center justify-center px-8" style={{ opacity: fadeAnim }}>
        <Text className="mb-4 text-center text-xs font-normal tracking-[2.5px] text-muted-foreground">
          YOU GRAVITATED TOWARDS
        </Text>
        <Text className="mb-3 text-center text-3xl font-semibold text-primary">{artStyles[0].name}</Text>

        <Animated.View
          className="mb-5 overflow-hidden rounded-xl shadow-md shadow-black/15"
          style={[impressionBox, { opacity: imageOpacity, transform: [{ scale: imageScale }] }]}>
          <Image
            source={require('@/assets/images/dexmac-panorama-9573161_1920.jpg')}
            className="size-full"
            resizeMode="cover"
          />
        </Animated.View>

        <View className="w-full gap-2.5">
          {artStyles.map((style, i) => (
            <View key={style.name} className="flex-row items-center gap-2.5">
              <Text className="w-[110px] text-right text-xs text-muted-foreground">{style.name}</Text>
              <View className="h-1 flex-1 overflow-hidden rounded-sm bg-muted">
                <Animated.View
                  style={[
                    {
                      height: '100%',
                      borderRadius: 2,
                      width: barAnims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', `${style.pct * 2.5}%`],
                      }),
                      backgroundColor: style.color,
                    },
                  ]}
                />
              </View>
              <Text className="w-8 text-right text-xs text-muted-foreground">{style.pct}%</Text>
            </View>
          ))}
        </View>
        <Text className="mt-4 text-center text-sm text-muted-foreground">
          Based on your check-ins, ratings, and follows
        </Text>
      </Animated.View>
    </Pressable>
  );
};

// ─── Slide 6: Taste profile (based on majority of followed museum types) ────
const TasteProfileSlide = ({
  profileName,
  category,
  onNext,
}: {
  profileName: string | null;
  category: string | null;
  onNext: () => void;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 100, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, delay: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Pressable className="items-center justify-center bg-transparent" style={SLIDE_FLEX} onPress={onNext}>
      <Animated.View className="items-center justify-center px-8" style={{ opacity: fadeAnim }}>
        <Text className="mb-4 text-center text-xs font-normal tracking-[2.5px] text-muted-foreground">
          YOUR TASTE PROFILE
        </Text>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Text className="mb-3 text-center text-5xl font-semibold text-primary">{profileName ?? 'Explorer'}</Text>
        </Animated.View>
        <Text className="mt-2 text-center text-sm leading-6 text-muted-foreground">
          {category
            ? `Based on your love of ${category} museums`
            : 'Follow museums to discover your taste profile'}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

// ─── Slide 7: Share ────────────────────────────────────────────────────────
const ShareSlide = ({
  museumsVisited,
  totalHours,
  topMuseumName,
}: {
  museumsVisited: number;
  totalHours: number;
  topMuseumName: string | null;
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const buttonScale = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, delay: 150, useNativeDriver: true }),
      Animated.spring(buttonScale, { toValue: 1, friction: 6, tension: 40, delay: 400, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleShare = async () => {
    await Share.share({
      message: `I explored ${museumsVisited} museums and spent ${totalHours} hours lost in art in ${DATA.year}. My top spot was ${topMuseumName ?? 'museum hopping'}. #MuseumWrapped`,
    });
  };

  return (
    <View className="items-center justify-center bg-transparent" style={SLIDE_FLEX}>
      <Animated.View className="items-center justify-center px-8" style={{ opacity: fadeAnim }}>
        <Text className="mb-4 text-center text-xs font-normal tracking-[2.5px] text-muted-foreground">
          THAT&apos;S A WRAP!
        </Text>
        <View className="mb-5 items-center">
          <Text className="text-center text-5xl font-semibold leading-[50px] tracking-tight text-foreground">
            Share your
          </Text>
          <Text className="text-center text-5xl font-semibold leading-[52px] tracking-tight text-primary">
            museum year
          </Text>
        </View>
        <Text className="mt-2 text-center text-sm leading-6 text-muted-foreground">
          Let the world know about{'\n'}your cultural adventures
        </Text>
        <Animated.View
          className="mt-8 flex-row justify-center gap-4"
          style={{ transform: [{ scale: buttonScale }] }}>
          <TouchableOpacity
            className="size-14 items-center justify-center rounded-full bg-foreground shadow-sm shadow-black/10"
            onPress={handleShare}
            activeOpacity={0.85}>
            <Share2 size={24} color="#FFF" strokeWidth={1.5} />
          </TouchableOpacity>
          <TouchableOpacity
            className="size-14 items-center justify-center rounded-full bg-foreground shadow-sm shadow-black/10"
            activeOpacity={0.85}>
            <Download size={24} color="#FFF" strokeWidth={1.5} />
          </TouchableOpacity>
        </Animated.View>
        <Text className="mt-8 text-center text-xs tracking-wide text-muted-foreground">
          Museum Wrapped {DATA.year}
        </Text>
      </Animated.View>
    </View>
  );
};

// ─── Progress dots ─────────────────────────────────────────────────────────
const ProgressDots = ({
  total,
  current,
  topInset,
}: {
  total: number;
  current: number;
  /** Safe-area top inset so dots sit below the status bar / Dynamic Island. */
  topInset: number;
}) => (
  <View
    className="pointer-events-none absolute left-0 right-0 z-10 flex-row justify-center gap-1.5"
    style={{ top: topInset + 12 }}>
    {Array.from({ length: total }).map((_, i) => (
      <View
        key={i}
        className={cn('h-1 rounded-sm', i === current ? 'w-5 bg-primary' : 'w-1 bg-muted-foreground/30')}
      />
    ))}
  </View>
);

// ─── Main screen ───────────────────────────────────────────────────────────
const SLIDES = ['intro', 'tasteprofile', 'hours', 'museums', 'topspot', 'styles', 'share'] as const;

export default function WrappedScreen() {
  const insets = useSafeAreaInsets();
  const [currentSlide, setCurrentSlide] = useState(0);
  const slideAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const tasteProfile = useQuery(api.wrapped.getTasteProfile);
  const wrappedStats = useQuery(api.wrapped.getWrappedStats);
  const totalHours = wrappedStats?.totalHours ?? 0;
  const totalDays = wrappedStats?.totalDays ?? 0;
  const museumsVisited = wrappedStats?.museumsVisited ?? 0;
  const citiesExplored = wrappedStats?.citiesExplored ?? 0;
  const eventsAttended = wrappedStats?.eventsAttended ?? 0;
  const artStyles = wrappedStats?.artStyles ?? [];
  const hasEnoughData = wrappedStats?.hasEnoughData ?? false;
  const topMuseum = wrappedStats?.topMuseum
    ? {
        name: wrappedStats.topMuseum.name,
        visits: wrappedStats.topMuseum.visits,
        hours: wrappedStats.topMuseum.hours,
      }
    : null;

  const goToNext = () => {
    if (currentSlide < SLIDES.length - 1) {
      // Fade out and slide
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: -50, duration: 200, useNativeDriver: true }),
      ]).start(() => {
        setCurrentSlide(currentSlide + 1);
        slideAnim.setValue(50);
        // Fade in and slide to center
        Animated.parallel([
          Animated.timing(fadeAnim, { toValue: 1, duration: 300, useNativeDriver: true }),
          Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
        ]).start();
      });
    }
  };

  const renderCurrentSlide = () => {
    const animatedStyle = {
      opacity: fadeAnim,
      transform: [{ translateX: slideAnim }],
    };

    switch (SLIDES[currentSlide]) {
      case 'intro':
        return (
          <Animated.View className="flex-1 overflow-hidden" style={[SLIDE_FLEX, animatedStyle]}>
            <IntroSlide onNext={goToNext} tasteProfileName={tasteProfile?.profileName ?? null} />
          </Animated.View>
        );
      case 'hours':
        return (
          <Animated.View className="flex-1 overflow-hidden" style={[SLIDE_FLEX, animatedStyle]}>
            <HoursSlide onNext={goToNext} totalHours={totalHours} totalDays={totalDays} />
          </Animated.View>
        );
      case 'museums':
        return (
          <Animated.View className="flex-1 overflow-hidden" style={[SLIDE_FLEX, animatedStyle]}>
            <MuseumsSlide
              onNext={goToNext}
              museumsVisited={museumsVisited}
              citiesExplored={citiesExplored}
              eventsAttended={eventsAttended}
            />
          </Animated.View>
        );
      case 'topspot':
        return (
          <Animated.View className="flex-1 overflow-hidden" style={[SLIDE_FLEX, animatedStyle]}>
            <TopSpotSlide onNext={goToNext} topMuseum={topMuseum} />
          </Animated.View>
        );
      case 'styles':
        return (
          <Animated.View className="flex-1 overflow-hidden" style={[SLIDE_FLEX, animatedStyle]}>
            <StylesSlide onNext={goToNext} artStyles={artStyles} hasEnoughData={hasEnoughData} />
          </Animated.View>
        );
      case 'tasteprofile':
        return (
          <Animated.View className="flex-1 overflow-hidden" style={[SLIDE_FLEX, animatedStyle]}>
            <TasteProfileSlide
              profileName={tasteProfile?.profileName ?? null}
              category={tasteProfile?.category ?? null}
              onNext={goToNext}
            />
          </Animated.View>
        );
      case 'share':
        return (
          <Animated.View className="flex-1 overflow-hidden" style={[SLIDE_FLEX, animatedStyle]}>
            <ShareSlide
              museumsVisited={museumsVisited}
              totalHours={totalHours}
              topMuseumName={topMuseum?.name ?? null}
            />
          </Animated.View>
        );
      default:
        return null;
    }
  };

  return (
    <AuthGuard>
      <SafeAreaView className="flex-1 bg-background" style={{ flex: 1 }} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" />
        <View
          className="pointer-events-none absolute -right-[120px] -top-[150px] z-0 h-[600px] w-[600px] overflow-hidden rounded-full"
          pointerEvents="none">
          <LinearGradient
            colors={['rgba(230, 210, 255, 0.4)', 'rgba(230, 210, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
            className="size-full"
            style={{ width: '100%', height: '100%' }}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
        </View>
        {renderCurrentSlide()}
        <TouchableOpacity
          className="absolute right-5 z-20 size-9 items-center justify-center rounded-full border border-border bg-card/90 shadow-sm shadow-black/10"
          style={{ top: insets.top + 8 }}
          onPress={() => router.back()}
          hitSlop={12}
          activeOpacity={0.7}>
          <X size={20} color={RN_API_MUTED_FOREGROUND_LIGHT} strokeWidth={1.5} />
        </TouchableOpacity>
        <ProgressDots total={SLIDES.length} current={currentSlide} topInset={insets.top} />
      </SafeAreaView>
    </AuthGuard>
  );
}
