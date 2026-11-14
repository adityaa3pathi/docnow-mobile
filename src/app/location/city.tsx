import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { CityLandmarkIcon, landmarkTitle } from '@/components/location/city-landmark-icon';
import { Colors, Fonts, Radius, Space, Type } from '@/constants/theme';
import { filterCities, showsTopCities, TOP_CITIES } from '@/lib/location/cities';
import { useLocationCity } from '@/lib/location/context';

export default function CityScreen() {
  const { selectedCity, updateCity } = useLocationCity();
  const [search, setSearch] = useState('');

  const rest = useMemo(() => filterCities(search), [search]);
  const showTop = showsTopCities(search);

  const choose = (city: string) => {
    updateCity(city);
    router.back();
  };

  return (
    <View style={styles.screen}>
      <View style={styles.searchWrap}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search for your city"
          placeholderTextColor={Colors.inkSubtle}
          style={styles.search}
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
          accessibilityLabel="Search for your city"
        />
      </View>

      <FlatList
        data={rest}
        keyExtractor={(city) => city}
        numColumns={2}
        columnWrapperStyle={styles.restRow}
        contentContainerStyle={styles.list}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View style={styles.headerBlock}>
            {showTop && (
              <>
                <Text style={styles.heading} accessibilityRole="header">
                  Select your city
                </Text>
                <View style={styles.grid}>
                  {TOP_CITIES.map((city) => (
                    <TopCityTile key={city} city={city} selected={selectedCity === city} onPress={() => choose(city)} />
                  ))}
                </View>
              </>
            )}
            <Text style={styles.heading} accessibilityRole="header">
              {showTop ? 'Other cities' : 'Search results'}
            </Text>
          </View>
        }
        ListEmptyComponent={
          <Text style={styles.empty} accessibilityLiveRegion="polite">
            No city matches that search. Try a shorter word.
          </Text>
        }
        renderItem={({ item }) => (
          <Pressable
            onPress={() => choose(item)}
            style={({ pressed }) => [styles.restTile, selectedCity === item && styles.restTileOn, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={item}
            accessibilityState={{ selected: selectedCity === item }}>
            <Text style={styles.restText} numberOfLines={1}>
              {item}
            </Text>
          </Pressable>
        )}
      />
    </View>
  );
}

function TopCityTile({ city, selected, onPress }: { city: string; selected: boolean; onPress: () => void }) {
  const landmark = landmarkTitle(city);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.tile, selected && styles.tileOn, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={landmark ? `${city}, ${landmark}` : city}
      accessibilityState={{ selected }}>
      <CityLandmarkIcon city={city} size={32} />
      <Text style={styles.tileText} numberOfLines={1}>
        {city}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: Colors.surfaceSubtle },
  searchWrap: { padding: Space[4], backgroundColor: Colors.surface, borderBottomWidth: 1, borderBottomColor: Colors.border },
  search: { ...Type.body, minHeight: 44, paddingHorizontal: Space[3], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, color: Colors.ink, backgroundColor: Colors.surface },
  list: { padding: Space[4], gap: Space[3], paddingBottom: Space[8] },
  headerBlock: { gap: Space[3] },
  heading: { ...Type.titleSm, color: Colors.ink },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Space[3] },
  // Five across on the website; two across fits a phone and keeps the tile above 44px.
  tile: { width: '47%', minHeight: 88, alignItems: 'center', justifyContent: 'center', gap: Space[2], paddingVertical: Space[3], borderRadius: Radius.xl, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  tileOn: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  tileText: { ...Type.small, fontFamily: Fonts.semibold, color: Colors.ink },
  restRow: { gap: Space[3] },
  restTile: { flex: 1, minHeight: 44, justifyContent: 'center', paddingHorizontal: Space[3], borderRadius: Radius.md, borderWidth: 1, borderColor: Colors.border, backgroundColor: Colors.surface },
  restTileOn: { borderColor: Colors.primary, backgroundColor: Colors.primarySoft },
  restText: { ...Type.small, fontFamily: Fonts.medium, color: Colors.ink },
  pressed: { backgroundColor: Colors.surfaceMuted },
  empty: { ...Type.small, color: Colors.inkMuted, paddingVertical: Space[4] },
});
