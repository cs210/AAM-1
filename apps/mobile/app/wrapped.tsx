import React from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions, TouchableOpacity, Animated } from 'react-native';
import { router } from 'expo-router';
import { ArrowLeftIcon } from 'lucide-react-native';

const { width, height } = Dimensions.get('window');
const PROFILE_HEADER_APPROX = 220;
const CARD_HEIGHT = Math.max(height - PROFILE_HEADER_APPROX, 400);

const stats = [
  { title: 'You visited', value: '12 museums this year', icon: '🏛️' },
  { title: 'Cities explored', value: '5 cities through art', icon: '🌆' },
  { title: 'Artworks favorited', value: '34 artworks', icon: '❤️' },
  { title: 'Hours browsing', value: '18 hours', icon: '⏰' },
  { title: 'Most visited museum', value: 'Modern Art Gallery', icon: '🎨' },
  { title: 'Events attended', value: '3 events', icon: '🎟️' },
  { title: 'Artworks shared', value: '7 artworks', icon: '🔗' },
  { title: 'New artists discovered', value: '9 artists', icon: '🧑‍🎨' },
  { title: 'Reviews written', value: '4 reviews', icon: '✍️' },
  { title: 'Badges earned', value: '2 badges', icon: '🏅' },
];

const Pane = ({ item, index }: { item: (typeof stats)[0]; index: number }) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, index]);
  return (
    <Animated.View style={[styles.pane, { opacity: fadeAnim }]}>
      <View style={styles.iconContainer}>
        <Text style={styles.icon}>{item.icon}</Text>
      </View>
      <Text style={styles.title}>{item.title}</Text>
      <Text style={styles.value}>{item.value}</Text>
    </Animated.View>
  );
};

export default function WrappedScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton} hitSlop={12}>
          <ArrowLeftIcon size={24} color="#222" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Your Wrapped</Text>
        <View style={styles.headerSpacer} />
      </View>
      <FlatList
        data={stats}
        renderItem={({ item, index }) => <Pane item={item} index={index} />}
        keyExtractor={(_, idx) => idx.toString()}
        showsVerticalScrollIndicator={false}
        pagingEnabled
        snapToInterval={CARD_HEIGHT}
        decelerationRate="fast"
        disableIntervalMomentum
        contentContainerStyle={styles.listContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
    paddingTop: 8,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#222',
  },
  headerSpacer: {
    width: 40,
  },
  listContent: {
    paddingBottom: 24,
  },
  pane: {
    width,
    height: CARD_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  iconContainer: {
    backgroundColor: '#e0e7ef',
    borderRadius: 16,
    padding: 12,
    marginBottom: 12,
  },
  icon: {
    fontSize: 48,
    fontFamily: 'PublicSans',
    fontWeight: '600',
    color: '#222',
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    fontFamily: 'PublicSans',
    marginBottom: 8,
    color: '#222',
    letterSpacing: 1.2,
  },
  value: {
    fontSize: 20,
    fontWeight: '400',
    fontFamily: 'PublicSans',
    color: '#555',
    letterSpacing: 0.3,
  },
});
