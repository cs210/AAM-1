import React from 'react';
import { View, Text, FlatList, StyleSheet, Dimensions } from 'react-native';

const { width } = Dimensions.get('window');

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

const Pane = ({ item }: { item: typeof stats[0] }) => (
  <View style={styles.pane}>
    <Text style={styles.icon}>{item.icon}</Text>
    <Text style={styles.title}>{item.title}</Text>
    <Text style={styles.value}>{item.value}</Text>
  </View>
);

export default function WrappedScreen() {
  return (
    <View style={styles.container}>
      <FlatList
        data={stats}
        renderItem={({ item }) => <Pane item={item} />}
        keyExtractor={(_, idx) => idx.toString()}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pane: {
    width,
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    marginVertical: 16,
    borderRadius: 24,
    backgroundColor: '#f5f5f5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  icon: {
    fontSize: 48,
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  value: {
    fontSize: 20,
    color: '#666',
  },
});