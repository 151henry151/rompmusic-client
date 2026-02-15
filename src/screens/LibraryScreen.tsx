/**
 * Copyright (C) 2024 RompMusic Contributors
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useState } from 'react';
import { ScrollView, StyleSheet, View, TouchableOpacity, useWindowDimensions } from 'react-native';
import { SegmentedButtons, List, Text } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import ArtworkImage from '../components/ArtworkImage';

type RootStackParamList = {
  ArtistDetail: { artistId: number; artistName: string };
  AlbumDetail: { albumId: number; highlightTrackId?: number };
};

const CARD_GAP = 12;
const HORIZONTAL_PADDING = 16;
const CARD_RADIUS = 10;

export default function LibraryScreen() {
  const [tab, setTab] = useState<'artists' | 'albums'>('artists');
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList, 'ArtistDetail'>>();
  const { width } = useWindowDimensions();
  const cardsPerRow = 2;
  const cardWidth = (width - HORIZONTAL_PADDING * 2 - CARD_GAP * (cardsPerRow - 1)) / cardsPerRow;

  const { data: artists } = useQuery({
    queryKey: ['artists'],
    queryFn: () => api.getArtists({ limit: 100 }),
  });
  const { data: albums } = useQuery({
    queryKey: ['albums'],
    queryFn: () => api.getAlbums({ limit: 100 }),
  });

  const handleAlbumPress = (albumId: number) => {
    navigation.navigate('AlbumDetail', { albumId });
  };

  return (
    <ScrollView style={styles.container}>
      <SegmentedButtons
        value={tab}
        onValueChange={(v) => setTab(v as 'artists' | 'albums')}
        buttons={[
          { value: 'artists', label: 'Artists' },
          { value: 'albums', label: 'Albums' },
        ]}
        style={styles.segmented}
      />
      {tab === 'artists' &&
        (artists || []).map((a: { id: number; name: string }) => (
          <List.Item
            key={a.id}
            title={a.name}
            left={() => <ArtworkImage type="artist" id={a.id} size={48} style={styles.artwork} />}
            onPress={() => navigation.navigate('ArtistDetail', { artistId: a.id, artistName: a.name })}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            style={styles.item}
            accessibilityRole="button"
            accessibilityLabel={`View ${a.name}`}
          />
        ))}
      {tab === 'albums' && (
        <View style={styles.albumGrid}>
          {(albums || []).map((a: { id: number; title: string; artist_name?: string }, index: number) => (
            <TouchableOpacity
              key={a.id}
              style={[styles.albumCard, { width: cardWidth, marginLeft: index % cardsPerRow === 0 ? 0 : CARD_GAP }]}
              onPress={() => handleAlbumPress(a.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`View album ${a.title}`}
            >
              <ArtworkImage
                type="album"
                id={a.id}
                size={cardWidth}
                borderRadius={CARD_RADIUS}
                style={styles.albumArtwork}
              />
              <Text variant="bodyMedium" numberOfLines={2} style={styles.albumTitle}>
                {a.title}
              </Text>
              <Text variant="bodySmall" numberOfLines={1} style={styles.albumArtist}>
                {a.artist_name || 'Unknown'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0a0a0a',
  },
  segmented: {
    margin: 16,
  },
  item: {
    backgroundColor: '#1a1a1a',
  },
  artwork: {
    marginRight: 8,
    alignSelf: 'center',
  },
  albumGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: HORIZONTAL_PADDING,
    paddingTop: 8,
  },
  albumCard: {
    marginBottom: CARD_GAP,
  },
  albumArtwork: {
    overflow: 'hidden',
    marginBottom: 8,
  },
  albumTitle: {
    color: '#fff',
    fontWeight: '600',
  },
  albumArtist: {
    color: '#888',
    marginTop: 2,
  },
});
