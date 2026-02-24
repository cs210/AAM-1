import React from 'react';
import { View, Text, ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PlaceholderCard = () => (
  <View style={styles.placeholder} />
);

export default function HomeScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Home</Text>
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {[...Array(6)].map((_, i) => (
          <PlaceholderCard key={i} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: '900',
    color: '#222',
    fontFamily: 'PublicSans',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  placeholder: {
    backgroundColor: '#E5E5EA',
    borderRadius: 12,
    height: 120,
    marginBottom: 12,
  },
});
