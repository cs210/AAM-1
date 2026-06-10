import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useQuery } from 'convex/react';
import { api } from '@packages/backend/convex/_generated/api';

const SOFTWARE_FAIR_FEATURE_KEY = 'software_fair_2026';

type SoftwareFairConfig = {
  key: string;
  enabled: boolean;
  announcementEnabled: boolean;
  announcementTitle: string | null;
  announcementBody: string | null;
  announcementCtaLabel: string | null;
  updatedAt: number | null;
};

type LocalModeState = 'joined' | 'exited' | null;

type SoftwareFairModeContextValue = {
  config: SoftwareFairConfig | undefined;
  enabled: boolean;
  announcementEnabled: boolean;
  announcementTitle: string;
  announcementBody: string;
  announcementCtaLabel: string;
  isJoined: boolean;
  hasExited: boolean;
  isHydrated: boolean;
  announcementCollapsed: boolean;
  shouldShowHomeSection: boolean;
  join: () => Promise<void>;
  exit: () => Promise<void>;
  collapseAnnouncement: () => Promise<void>;
  expandAnnouncement: () => Promise<void>;
};

const DEFAULT_ANNOUNCEMENT_TITLE = 'Stanford Software Fair 2026';
const DEFAULT_ANNOUNCEMENT_BODY = 'Explore booth recommendations and the CoDa B80 fair map in Museum&.';
const DEFAULT_ANNOUNCEMENT_CTA = 'Join';

const SoftwareFairModeContext = React.createContext<SoftwareFairModeContextValue | null>(null);

function modeStateStorageKey(userId: string) {
  return `${SOFTWARE_FAIR_FEATURE_KEY}:mode_state:${userId}`;
}

function collapsedStorageKey(userId: string) {
  return `${SOFTWARE_FAIR_FEATURE_KEY}:announcement_collapsed:${userId}`;
}

function normalizeModeState(value: string | null): LocalModeState {
  return value === 'joined' || value === 'exited' ? value : null;
}

export function SoftwareFairModeProvider({ children }: { children: React.ReactNode }) {
  const config = useQuery(api.softwareFair.getConfig) as SoftwareFairConfig | undefined;
  const currentUser = useQuery(api.auth.getCurrentUser);
  const currentUserLoaded = currentUser !== undefined;
  const userId = currentUser?._id ?? null;
  const [modeState, setModeState] = React.useState<LocalModeState>(null);
  const [announcementCollapsed, setAnnouncementCollapsed] = React.useState(false);
  const [isHydrated, setIsHydrated] = React.useState(false);

  React.useEffect(() => {
    let isActive = true;

    async function loadState() {
      setIsHydrated(false);
      setModeState(null);
      setAnnouncementCollapsed(false);

      if (!currentUserLoaded) {
        return;
      }

      if (!userId) {
        if (isActive) setIsHydrated(true);
        return;
      }

      try {
        const [storedModeState, storedCollapsed] = await Promise.all([
          AsyncStorage.getItem(modeStateStorageKey(userId)),
          AsyncStorage.getItem(collapsedStorageKey(userId)),
        ]);
        if (!isActive) return;
        setModeState(normalizeModeState(storedModeState));
        setAnnouncementCollapsed(storedCollapsed === 'true');
      } catch {
        if (!isActive) return;
        setModeState(null);
        setAnnouncementCollapsed(false);
      } finally {
        if (isActive) setIsHydrated(true);
      }
    }

    void loadState();

    return () => {
      isActive = false;
    };
  }, [currentUserLoaded, userId]);

  const enabled = Boolean(config?.enabled);
  const announcementEnabled = Boolean(config?.announcementEnabled);
  const isJoined = enabled && modeState === 'joined';
  const hasExited = modeState === 'exited';
  const shouldShowHomeSection = enabled && isHydrated && (announcementEnabled || isJoined);

  const join = React.useCallback(async () => {
    if (!userId) return;
    setModeState('joined');
    setAnnouncementCollapsed(false);
    await Promise.all([
      AsyncStorage.setItem(modeStateStorageKey(userId), 'joined'),
      AsyncStorage.setItem(collapsedStorageKey(userId), 'false'),
    ]);
  }, [userId]);

  const exit = React.useCallback(async () => {
    if (!userId) return;
    setModeState('exited');
    setAnnouncementCollapsed(false);
    await Promise.all([
      AsyncStorage.setItem(modeStateStorageKey(userId), 'exited'),
      AsyncStorage.setItem(collapsedStorageKey(userId), 'false'),
    ]);
  }, [userId]);

  const collapseAnnouncement = React.useCallback(async () => {
    if (!userId) return;
    setAnnouncementCollapsed(true);
    await AsyncStorage.setItem(collapsedStorageKey(userId), 'true');
  }, [userId]);

  const expandAnnouncement = React.useCallback(async () => {
    if (!userId) return;
    setAnnouncementCollapsed(false);
    await AsyncStorage.setItem(collapsedStorageKey(userId), 'false');
  }, [userId]);

  const value = React.useMemo<SoftwareFairModeContextValue>(
    () => ({
      config,
      enabled,
      announcementEnabled,
      announcementTitle: config?.announcementTitle ?? DEFAULT_ANNOUNCEMENT_TITLE,
      announcementBody: config?.announcementBody ?? DEFAULT_ANNOUNCEMENT_BODY,
      announcementCtaLabel: config?.announcementCtaLabel ?? DEFAULT_ANNOUNCEMENT_CTA,
      isJoined,
      hasExited,
      isHydrated,
      announcementCollapsed,
      shouldShowHomeSection,
      join,
      exit,
      collapseAnnouncement,
      expandAnnouncement,
    }),
    [
      announcementEnabled,
      announcementCollapsed,
      collapseAnnouncement,
      config,
      enabled,
      exit,
      expandAnnouncement,
      hasExited,
      isHydrated,
      isJoined,
      join,
      shouldShowHomeSection,
    ]
  );

  return (
    <SoftwareFairModeContext.Provider value={value}>
      {children}
    </SoftwareFairModeContext.Provider>
  );
}

export function useSoftwareFairMode() {
  const value = React.useContext(SoftwareFairModeContext);
  if (!value) {
    throw new Error('useSoftwareFairMode must be used within SoftwareFairModeProvider');
  }
  return value;
}
