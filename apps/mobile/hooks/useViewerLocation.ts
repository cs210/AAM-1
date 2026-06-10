import { useCallback, useEffect, useRef, useState } from 'react';
import * as Location from 'expo-location';

export type ViewerCoordinates = { latitude: number; longitude: number };

export type ViewerLocationState =
  | { status: 'pending' }
  | { status: 'ok'; viewer: ViewerCoordinates }
  | { status: 'unavailable'; message: string };

async function fetchViewerCoordinates(): Promise<ViewerCoordinates> {
  const lastKnown = await Location.getLastKnownPositionAsync({
    maxAge: 1000 * 60 * 60 * 24,
    requiredAccuracy: 100_000,
  });
  if (lastKnown?.coords) {
    return { latitude: lastKnown.coords.latitude, longitude: lastKnown.coords.longitude };
  }

  try {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Low });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  } catch {
    const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
    return { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number, message = 'LOCATION_TIMEOUT'): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(message)), ms);
    promise.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      }
    );
  });
}

function formatLocationFailure(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();
  if (raw === 'LOCATION_TIMEOUT' || lower.includes('location_timeout')) {
    return 'Location is taking too long. Try again in a moment.';
  }
  if (lower.includes('denied') || lower.includes('permission')) {
    return 'Turn on location to see what is near you.';
  }
  return 'Could not read your location. Try again or enable location in Settings.';
}

export function useViewerLocation({ enabled = true }: { enabled?: boolean } = {}) {
  const [locState, setLocState] = useState<ViewerLocationState>({ status: 'pending' });
  const [retryKey, setRetryKey] = useState(0);
  const requestIdRef = useRef(0);

  const resolveLocation = useCallback(async (requestId: number) => {
    const isCurrentRequest = () => requestIdRef.current === requestId;
    setLocState({ status: 'pending' });
    try {
      const servicesEnabled = await Location.hasServicesEnabledAsync();
      if (!isCurrentRequest()) return;
      if (!servicesEnabled) {
        setLocState({
          status: 'unavailable',
          message: 'Location Services are off. Turn them on to see nearby museums and events.',
        });
        return;
      }

      let perm = await Location.getForegroundPermissionsAsync();
      if (!isCurrentRequest()) return;
      if (perm.status !== 'granted') {
        perm = await Location.requestForegroundPermissionsAsync();
      }
      if (!isCurrentRequest()) return;
      if (perm.status !== 'granted') {
        setLocState({
          status: 'unavailable',
          message: 'Turn on location to see what is near you.',
        });
        return;
      }

      const viewer = await withTimeout(fetchViewerCoordinates(), 25_000);
      if (!isCurrentRequest()) return;
      setLocState({ status: 'ok', viewer });
    } catch (err) {
      if (!isCurrentRequest()) return;
      setLocState({
        status: 'unavailable',
        message: formatLocationFailure(err),
      });
    }
  }, []);

  useEffect(() => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    if (!enabled) {
      setLocState({
        status: 'unavailable',
        message: 'Location is not used in this view.',
      });
      return;
    }

    void resolveLocation(requestId);
  }, [enabled, retryKey, resolveLocation]);

  const retry = useCallback(() => {
    if (!enabled) return;
    setRetryKey((k) => k + 1);
  }, [enabled]);

  return { locState, retry };
}
