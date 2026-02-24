import React, { useState } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { SearchIcon } from 'lucide-react-native';

const { width } = Dimensions.get('window');
const CARD_HEIGHT = 150;

const MUSEUMS = [
  { id: '1', name: 'Museum 1', location: 'New York' },
  { id: '2', name: 'Museum 2', location: 'Los Angeles' },
  { id: '3', name: 'Museum 3', location: 'Chicago' },
  { id: '4', name: 'Museum 4', location: 'Houston' },
  { id: '5', name: 'Museum 5', location: 'Phoenix' },
  { id: '6', name: 'Museum 6', location: 'Philadelphia' },
  { id: '7', name: 'Museum 7', location: 'San Antonio' },
  { id: '8', name: 'Museum 8', location: 'San Diego' },
];

const MuseumCard = ({ item }: { item: (typeof MUSEUMS)[0] }) => (
  <View style={styles.card}>
    <Text style={styles.museumName}>{item.name}</Text>
    <Text style={styles.museumLocation}>{item.location}</Text>
    <View style={styles.detailsContainer}>
      <Text style={styles.detailText}>★ 4.5 Rating</Text>
      <Text style={styles.detailText}>📸 245 Photos</Text>
    </View>
  </View>
);

export default function SearchScreen() {
  const [searchText, setSearchText] = useState('');
  const [filteredMuseums, setFilteredMuseums] = useState(MUSEUMS);

  const handleSearch = (text: string) => {
    setSearchText(text);
    const filtered = MUSEUMS.filter((museum) =>
      museum.name.toLowerCase().includes(text.toLowerCase()) ||
      museum.location.toLowerCase().includes(text.toLowerCase())
    );
    setFilteredMuseums(filtered);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Search Museums</Text>
      </View>

      <View style={styles.searchContainer}>
        <SearchIcon size={20} color="#8E8E93" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search museums..."
          value={searchText}
          onChangeText={handleSearch}
          placeholderTextColor="#C7C7CC"
        />
      </View>

      <FlatList
        data={filteredMuseums}
        renderItem={({ item }) => <MuseumCard item={item} />}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        scrollEnabled={true}
      />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#222',
    fontFamily: 'PublicSans',
  },
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E5EA',
  },
  museumName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#222',
    fontFamily: 'PublicSans',
    marginBottom: 4,
  },
  museumLocation: {
    fontSize: 14,
    color: '#8E8E93',
    fontFamily: 'PublicSans',
    marginBottom: 12,
  },
  detailsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailText: {
    fontSize: 12,
    color: '#555',
    fontFamily: 'PublicSans',
  },
});