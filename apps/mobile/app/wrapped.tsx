import React, { useRef, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
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

const { width, height } = Dimensions.get('window');
const SLIDE_HEIGHT = height;

// ─── Dummy data (realistic) ────────────────────────────────────────────────
const DATA = {
  year: 2026,
  totalHours: 47,
  totalDays: 2.0,
  museumsVisited: 8,
  citiesExplored: 4,
  topMuseum: {
    name: 'Art Institute of Chicago',
    location: 'Chicago, IL',
    visits: 6,
    hours: 18,
  },
  artStyles: [
    { name: 'Impressionism', pct: 32, color: '#D4915A' },
    { name: 'Modern Art', pct: 24, color: '#A89BC4' },
    { name: 'Renaissance', pct: 20, color: '#B4B4B4' },
    { name: 'Contemporary', pct: 15, color: '#B4B4B4' },
    { name: 'Ancient', pct: 9, color: '#B4B4B4' },
  ],
  artworksSaved: 23,
  artistsDiscovered: 14,
  eventsAttended: 5,
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
    <Pressable style={styles.slide} onPress={onNext}>
      <Animated.View style={[styles.slideContent, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
        <Text style={styles.eyebrow}>YOUR {DATA.year} IN REVIEW</Text>
        <View style={styles.titleBlock}>
          <Text style={styles.displayTitle}>Museum</Text>
          <Text style={styles.displayAccent}>Wrapped</Text>
        </View>
        <View style={styles.tasteProfilePill}>
          <Text style={styles.tasteProfilePillText}>{tasteProfileName ?? 'Explorer'}</Text>
        </View>
        <Text style={styles.bodyText}>Let's explore your artistic{'\n'}journey this year</Text>
      </Animated.View>
      <Animated.View style={[styles.tapHint, { transform: [{ scale: pulseAnim }] }]}>
        <Text style={styles.tapLabel}>TAP TO CONTINUE</Text>
      </Animated.View>
    </Pressable>
  );
};

// ─── Slide 2: Hours ────────────────────────────────────────────────────────
const HoursSlide = ({ onNext }: { onNext: () => void }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const countAnim = useRef(new Animated.Value(0)).current;
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 100, useNativeDriver: true }).start();
    Animated.timing(countAnim, { toValue: DATA.totalHours, duration: 1200, delay: 300, useNativeDriver: false }).start();
    countAnim.addListener(({ value }) => setDisplayed(Math.round(value)));
    return () => countAnim.removeAllListeners();
  }, []);

  return (
    <Pressable style={styles.slide} onPress={onNext}>
      <Animated.View style={[styles.slideContent, { opacity: fadeAnim }]}>
        <Text style={styles.eyebrow}>YOU SPENT</Text>
        <View style={styles.bigStatBlock}>
          <Text style={styles.bigNumber}>{displayed}</Text>
          <Text style={styles.displayAccent}>hours</Text>
        </View>
        <Text style={styles.bodyText}>lost in art and wonder</Text>
        <View style={styles.subStatRow}>
          <Text style={styles.subStatLabel}>THAT'S LIKE</Text>
          <Text style={styles.subStatValue}>{DATA.totalDays} days</Text>
          <Text style={styles.subStatCaption}>of pure culture</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

// ─── Slide 3: Museums ──────────────────────────────────────────────────────
const MuseumsSlide = ({ onNext }: { onNext: () => void }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, { toValue: 1, duration: 600, delay: 100, useNativeDriver: true }).start();
  }, []);

  return (
    <Pressable style={styles.slide} onPress={onNext}>
      <Animated.View style={[styles.slideContent, { opacity: fadeAnim }]}>
        <Text style={styles.eyebrow}>YOU EXPLORED</Text>
        <View style={styles.bigStatBlock}>
          <Text style={styles.bigNumber}>{DATA.museumsVisited}</Text>
          <Text style={styles.displayAccent}>museums</Text>
        </View>
        <Text style={styles.bodyText}>across {DATA.citiesExplored} cities</Text>
        <View style={styles.subStatRow}>
          <Text style={styles.subStatLabel}>INCLUDING</Text>
          <Text style={styles.subStatValue}>{DATA.eventsAttended} events</Text>
          <Text style={styles.subStatCaption}>attended in person</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
};

// ─── Slide 4: Top Museum ───────────────────────────────────────────────────
const TopSpotSlide = ({ onNext }: { onNext: () => void }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.94)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 700, delay: 100, useNativeDriver: true }),
      Animated.spring(scaleAnim, { toValue: 1, friction: 8, tension: 40, delay: 150, useNativeDriver: true }),
    ]).start();
  }, []);

  return (
    <Pressable style={styles.slide} onPress={onNext}>
      <Animated.View style={[styles.slideContent, { opacity: fadeAnim }]}>
        <Text style={styles.eyebrow}>YOUR #1 SPOT</Text>
        <Animated.View style={[styles.museumCard, { transform: [{ scale: scaleAnim }] }]}>
          <View style={styles.museumCardPlaceholder}>
            <Text style={styles.museumCardEmoji}>🏛️</Text>
          </View>
        </Animated.View>
        <Text style={styles.museumName}>{DATA.topMuseum.name}</Text>
        <Text style={styles.museumLocation}>{DATA.topMuseum.location}</Text>
        <View style={styles.museumStats}>
          <View style={styles.museumStat}>
            <Text style={[styles.museumStatValue, { color: '#D4915A' }]}>{DATA.topMuseum.visits}</Text>
            <Text style={styles.museumStatLabel}>visits</Text>
          </View>
          <View style={styles.museumStatDivider} />
          <View style={styles.museumStat}>
            <Text style={[styles.museumStatValue, { color: '#D4915A' }]}>{DATA.topMuseum.hours}</Text>
            <Text style={styles.museumStatLabel}>hours</Text>
          </View>
        </View>
      </Animated.View>
    </Pressable>
  );
};

// ─── Slide 5: Art Styles ───────────────────────────────────────────────────
const StylesSlide = ({ onNext }: { onNext: () => void }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const imageScale = useRef(new Animated.Value(1.2)).current;
  const imageOpacity = useRef(new Animated.Value(0)).current;
  const barAnims = useRef(DATA.artStyles.map(() => new Animated.Value(0))).current;

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
  }, []);

  return (
    <Pressable style={styles.slide} onPress={onNext}>
      <Animated.View style={[styles.slideContent, { opacity: fadeAnim }]}>
        <Text style={styles.eyebrow}>YOU GRAVITATED TOWARDS</Text>
        <Text style={[styles.displayAccent, { fontSize: 32, marginBottom: 12 }]}>
          {DATA.artStyles[0].name}
        </Text>
        
        <Animated.View style={[styles.impressionistImageContainer, { opacity: imageOpacity, transform: [{ scale: imageScale }] }]}>
          <Image 
            source={require('@/assets/images/dexmac-panorama-9573161_1920.jpg')} 
            style={styles.impressionistImage}
            resizeMode="cover"
          />
        </Animated.View>

        <View style={styles.barChart}>
          {DATA.artStyles.map((style, i) => (
            <View key={style.name} style={styles.barRow}>
              <Text style={styles.barLabel}>{style.name}</Text>
              <View style={styles.barTrack}>
                <Animated.View
                  style={[
                    styles.barFill,
                    {
                      width: barAnims[i].interpolate({
                        inputRange: [0, 1],
                        outputRange: ['0%', `${style.pct * 2.5}%`],
                      }),
                      backgroundColor: style.color,
                    },
                  ]}
                />
              </View>
              <Text style={styles.barPct}>{style.pct}%</Text>
            </View>
          ))}
        </View>
        <Text style={styles.footnoteText}>Those dreamy brushstrokes really speak to you</Text>
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
    <Pressable style={styles.slide} onPress={onNext}>
      <Animated.View style={[styles.slideContent, { opacity: fadeAnim }]}>
        <Text style={styles.eyebrow}>YOUR TASTE PROFILE</Text>
        <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
          <Text style={[styles.displayAccent, { fontSize: 48, marginBottom: 12 }]}>
            {profileName ?? 'Explorer'}
          </Text>
        </Animated.View>
        <Text style={styles.bodyText}>
          {category
            ? `Based on your love of ${category} museums`
            : 'Follow museums to discover your taste profile'}
        </Text>
      </Animated.View>
    </Pressable>
  );
};

// ─── Slide 7: Share ────────────────────────────────────────────────────────
const ShareSlide = () => {
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
      message: `I explored ${DATA.museumsVisited} museums and spent ${DATA.totalHours} hours lost in art in ${DATA.year}. My top spot was ${DATA.topMuseum.name}. #MuseumWrapped`,
    });
  };

  return (
    <View style={styles.slide}>
      <Animated.View style={[styles.slideContent, { opacity: fadeAnim }]}>
        <Text style={styles.eyebrow}>THAT'S A WRAP!</Text>
        <View style={styles.titleBlock}>
          <Text style={styles.displayTitle}>Share your</Text>
          <Text style={styles.displayAccent}>museum year</Text>
        </View>
        <Text style={styles.bodyText}>Let the world know about{'\n'}your cultural adventures</Text>
        <Animated.View style={[styles.shareButtons, { transform: [{ scale: buttonScale }] }]}>
          <TouchableOpacity style={styles.shareIconButton} onPress={handleShare} activeOpacity={0.85}>
            <Share2 size={24} color="#FFF" strokeWidth={1.5} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.shareIconButton} activeOpacity={0.85}>
            <Download size={24} color="#FFF" strokeWidth={1.5} />
          </TouchableOpacity>
        </Animated.View>
        <Text style={styles.footerCredit}>Museum Wrapped {DATA.year}</Text>
      </Animated.View>
    </View>
  );
};

// ─── Progress dots ─────────────────────────────────────────────────────────
const ProgressDots = ({ total, current }: { total: number; current: number }) => (
  <View style={styles.dotsContainer}>
    {Array.from({ length: total }).map((_, i) => (
      <View
        key={i}
        style={[
          styles.dot,
          i === current ? styles.dotActive : styles.dotInactive,
        ]}
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
      case 'intro': return <Animated.View style={[styles.slideWrapper, animatedStyle]}><IntroSlide onNext={goToNext} tasteProfileName={tasteProfile?.profileName ?? null} /></Animated.View>;
      case 'hours': return <Animated.View style={[styles.slideWrapper, animatedStyle]}><HoursSlide onNext={goToNext} /></Animated.View>;
      case 'museums': return <Animated.View style={[styles.slideWrapper, animatedStyle]}><MuseumsSlide onNext={goToNext} /></Animated.View>;
      case 'topspot': return <Animated.View style={[styles.slideWrapper, animatedStyle]}><TopSpotSlide onNext={goToNext} /></Animated.View>;
      case 'styles': return <Animated.View style={[styles.slideWrapper, animatedStyle]}><StylesSlide onNext={goToNext} /></Animated.View>;
      case 'tasteprofile': return <Animated.View style={[styles.slideWrapper, animatedStyle]}><TasteProfileSlide profileName={tasteProfile?.profileName ?? null} category={tasteProfile?.category ?? null} onNext={goToNext} /></Animated.View>;
      case 'share': return <Animated.View style={[styles.slideWrapper, animatedStyle]}><ShareSlide /></Animated.View>;
      default: return null;
    }
  };

  return (
    <AuthGuard>
      <SafeAreaView style={styles.root} edges={['top']}>
        <StatusBar barStyle="dark-content" />
        <View style={styles.topRightBubble} pointerEvents="none">
          <LinearGradient
            colors={['rgba(230, 210, 255, 0.4)', 'rgba(230, 210, 255, 0.1)', 'rgba(255, 255, 255, 0)']}
            style={styles.bubbleGradient}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
        </View>
        {renderCurrentSlide()}
        {/* Close button */}
        <TouchableOpacity
          style={[styles.closeButton, { top: Math.max(insets.top + 8, 16) }]}
          onPress={() => router.back()}
          hitSlop={12}
          activeOpacity={0.7}
        >
          <X size={20} color="#666" strokeWidth={1.5} />
        </TouchableOpacity>
        {/* Progress dots */}
        <ProgressDots total={SLIDES.length} current={currentSlide} />
      </SafeAreaView>
    </AuthGuard>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  topRightBubble: {
    position: 'absolute',
    top: -150,
    right: -120,
    width: 600,
    height: 600,
    borderRadius: 300,
    overflow: 'hidden',
    zIndex: 0,
  },
  bubbleGradient: {
    width: '100%',
    height: '100%',
  },
  slideWrapper: {
    width,
    height: SLIDE_HEIGHT,
  },
  slide: {
    width,
    height: SLIDE_HEIGHT,
    backgroundColor: 'transparent',
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideContent: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },

  // Typography
  eyebrow: {
    fontSize: 11,
    letterSpacing: 2.5,
    color: '#8E8E93',
    marginBottom: 16,
    textAlign: 'center',
    fontWeight: '400',
  },
  titleBlock: {
    alignItems: 'center',
    marginBottom: 20,
  },
  displayTitle: {
    fontSize: 42,
    fontWeight: '600',
    color: '#1A1A1A',
    lineHeight: 50,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  displayAccent: {
    fontSize: 42,
    fontWeight: '600',
    color: '#D4915A',
    lineHeight: 52,
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  bodyText: {
    fontSize: 15,
    fontWeight: '400',
    color: '#666',
    textAlign: 'center',
    lineHeight: 24,
    marginTop: 8,
  },
  tasteProfilePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: 'rgba(212, 145, 90, 0.15)',
    borderRadius: 20,
  },
  tasteProfilePillText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#D4915A',
  },
  footnoteText: {
    fontSize: 13,
    fontWeight: '400',
    color: '#8E8E93',
    textAlign: 'center',
    marginTop: 16,
  },
  footerCredit: {
    fontSize: 12,
    letterSpacing: 1,
    color: '#8E8E93',
    fontWeight: '400',
    marginTop: 32,
  },

  // Big stat block
  bigStatBlock: {
    alignItems: 'center',
    marginVertical: 4,
  },
  bigNumber: {
    fontSize: 96,
    fontWeight: '700',
    color: '#1A1A1A',
    lineHeight: 104,
    letterSpacing: -2,
  },

  // Sub-stat callout
  subStatRow: {
    alignItems: 'center',
    marginTop: 28,
    gap: 2,
  },
  subStatLabel: {
    fontSize: 10,
    letterSpacing: 2.5,
    color: '#8E8E93',
    fontWeight: '400',
  },
  subStatValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    marginTop: 4,
  },
  subStatCaption: {
    fontSize: 12,
    fontWeight: '400',
    color: '#8E8E93',
    marginTop: 2,
  },

  // Museum card
  museumCard: {
    width: width * 0.72,
    height: width * 0.5,
    borderRadius: 16,
    overflow: 'hidden',
    marginVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  museumCardPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  museumCardEmoji: {
    fontSize: 64,
  },
  museumName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1A1A',
    textAlign: 'center',
    marginTop: 4,
  },
  museumLocation: {
    fontSize: 13,
    fontWeight: '400',
    color: '#666',
    marginTop: 4,
    letterSpacing: 0.3,
  },
  museumStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 20,
    gap: 24,
  },
  museumStat: {
    alignItems: 'center',
  },
  museumStatValue: {
    fontSize: 32,
    fontWeight: '700',
  },
  museumStatLabel: {
    fontSize: 11,
    fontWeight: '400',
    color: '#8E8E93',
    letterSpacing: 1.5,
    marginTop: 2,
  },
  museumStatDivider: {
    width: 1,
    height: 36,
    backgroundColor: '#E5E5E5',
  },

  // Bar chart
  barChart: {
    width: '100%',
    gap: 10,
  },
  barRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barLabel: {
    width: 110,
    fontSize: 12,
    fontWeight: '400',
    color: '#666',
    textAlign: 'right',
  },
  barTrack: {
    flex: 1,
    height: 4,
    backgroundColor: '#F0F0F0',
    borderRadius: 2,
    overflow: 'hidden',
  },
  barFill: {
    height: '100%',
    borderRadius: 2,
  },
  barPct: {
    width: 32,
    fontSize: 11,
    fontWeight: '400',
    color: '#8E8E93',
    textAlign: 'right',
  },

  // Share buttons
  shareButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 32,
    justifyContent: 'center',
  },
  shareIconButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1A1A1A',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  // Close button
  closeButton: {
    position: 'absolute',
    top: 16,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },

  // Progress dots
  dotsContainer: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
    pointerEvents: 'none',
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  dotActive: {
    width: 20,
    backgroundColor: '#D4915A',
  },
  dotInactive: {
    width: 4,
    backgroundColor: 'rgba(142, 142, 147, 0.3)',
  },

  // Tap hint
  tapHint: {
    position: 'absolute',
    bottom: 60,
    alignItems: 'center',
  },
  tapLabel: {
    fontSize: 11,
    letterSpacing: 2.5,
    color: '#D4915A',
    fontWeight: '600',
  },

  // Impressionist image
  impressionistImageContainer: {
    width: width * 0.7,
    height: width * 0.38,
    borderRadius: 14,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  impressionistImage: {
    width: '100%',
    height: '100%',
  },
});
