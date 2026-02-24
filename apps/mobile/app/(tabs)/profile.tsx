import React from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions, Animated } from 'react-native';

const { width, height } = Dimensions.get('window');
const CARD_HEIGHT = height;

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

const Pane = ({ item, index }: { item: typeof stats[0]; index: number }) => {
  const fadeAnim = React.useRef(new Animated.Value(0)).current;
  React.useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      delay: index * 100,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim]);
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
      <FlatList
        data={stats}
        renderItem={({ item, index }) => <Pane item={item} index={index} />}
        keyExtractor={(_, idx) => idx.toString()}
        showsVerticalScrollIndicator={false}
        pagingEnabled
        snapToInterval={CARD_HEIGHT}
        decelerationRate="fast"
        disableIntervalMomentum={true}
        contentContainerStyle={{}}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
    marginBottom: 8,
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