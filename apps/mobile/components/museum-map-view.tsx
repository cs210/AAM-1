import React, { useMemo, useEffect, useState } from 'react';
import { View, Platform } from 'react-native';
import { AppleMaps, GoogleMaps } from 'expo-maps';
import * as Location from 'expo-location';
import { Text } from '@/components/ui/text';
import { BrandActivityIndicator } from '@/components/ui/activity-indicator';
import type { MuseumCardData } from './museum-card';

interface MuseumMapViewProps {
  museums: MuseumCardData[];
  isLoading?: boolean;
}

interface UserLocation {
  latitude: number;
  longitude: number;
}

export function MuseumMapView({ museums, isLoading }: MuseumMapViewProps) {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationLoading, setLocationLoading] = useState(true);

  // Request location permissions and get user's current location
  useEffect(() => {
    async function getUserLocation() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          setLocationLoading(false);
          return;
        }

        const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        setUserLocation({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
        });
      } catch (error) {
        console.error('Error getting location:', error);
      } finally {
        setLocationLoading(false);
      }
    }

    getUserLocation();
  }, []);

  // Calculate center and bounds for all museums
  const { center, bounds } = useMemo(() => {
    let minLat = Infinity,
      maxLat = -Infinity,
      minLng = Infinity,
      maxLng = -Infinity;
    let sumLat = 0,
      sumLng = 0;
    const validCount = museums.length;

    museums.forEach((museum) => {
      const lat = museum.latitude;
      const lng = museum.longitude;
      minLat = Math.min(minLat, lat);
      maxLat = Math.max(maxLat, lat);
      minLng = Math.min(minLng, lng);
      maxLng = Math.max(maxLng, lng);
      sumLat += lat;
      sumLng += lng;
    });

    const centerLat = validCount > 0 ? sumLat / validCount : userLocation?.latitude ?? 0;
    const centerLng = validCount > 0 ? sumLng / validCount : userLocation?.longitude ?? 0;

    return {
      center: { latitude: centerLat, longitude: centerLng },
      bounds: { minLat, maxLat, minLng, maxLng },
    };
  }, [museums, userLocation]);

  // Default camera position to user location
  const initialCamera = useMemo(() => {
    return {
      coordinates: userLocation || { latitude: 0, longitude: 0 },
      zoom: 15,
    };
  }, [userLocation]);

  // Use museums directly - coordinates already resolved by backend via resolvePointForDistance
  const markersData = museums;

  // Create markers array for iOS
  const iosMarkers = useMemo<AppleMaps.Marker[]>(
    () =>
      markersData.map((museum) => ({
        id: museum._id,
        coordinates: {
          latitude: museum.latitude!,
          longitude: museum.longitude!,
        },
        title: museum.name,
      })),
    [markersData]
  );

  // Create markers array for Android
  const androidMarkers = useMemo<GoogleMaps.Marker[]>(
    () =>
      markersData.map((museum) => ({
        id: museum._id,
        coordinates: {
          latitude: museum.latitude!,
          longitude: museum.longitude!,
        },
        title: museum.name,
        snippet: museum.location?.city || undefined,
      })),
    [markersData]
  );

  const MapComponent = Platform.OS === 'ios' ? AppleMaps.View : GoogleMaps.View;
  const mapMarkers = Platform.OS === 'ios' ? iosMarkers : androidMarkers;

  // Early returns should happen after all hooks are declared
  if (isLoading || locationLoading) {
    return (
      <View className="flex-1 items-center justify-center">
        <BrandActivityIndicator size="large" />
        <Text className="text-muted-foreground mt-3">Loading map...</Text>
      </View>
    );
  }

  if (!userLocation) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-muted-foreground text-center text-base">
          Unable to determine your location
        </Text>
      </View>
    );
  }

  if (museums.length === 0) {
    return (
      <View className="flex-1 items-center justify-center">
        <Text className="text-muted-foreground text-center text-base">
          No museums to display on map
        </Text>
      </View>
    );
  }

  return (
    <View className="flex-1">
      <MapComponent
        style={{ flex: 1 }}
        markers={mapMarkers}
        cameraPosition={initialCamera}
      />
    </View>
  );
}
