import * as React from 'react';
import { View, Pressable, ScrollView } from 'react-native';
import { useQuery, useConvex } from 'convex/react';
import { XIcon } from 'lucide-react-native';
import { api } from '@packages/backend/convex/_generated/api';
import { Text } from '@/components/ui/text';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getUsernameFormatError, normalizeUsernameInput } from '@/lib/username';
import { RN_API_MUTED_FOREGROUND_LIGHT } from '@/constants/rn-api-colors';

export type TaggedUserInfo = {
  userId: string;
  name: string | null;
  username: string | null;
};

type Props = {
  selectedUserIds: string[];
  onSelectedUserIdsChange: (ids: string[]) => void;
  currentUserId: string;
  labelClassName?: string;
};

function displayNameForUser(name: string | null | undefined, username: string | null | undefined): string {
  const trimmed = typeof name === 'string' ? name.replace(/\s+\d+$/, '').trim() : '';
  if (trimmed) return trimmed;
  if (username) return `@${username}`;
  return 'Unknown';
}

export function CheckInTagFriends({
  selectedUserIds,
  onSelectedUserIdsChange,
  currentUserId,
  labelClassName,
}: Props) {
  const convex = useConvex();
  const [usernameInput, setUsernameInput] = React.useState('');
  const [addError, setAddError] = React.useState<string | null>(null);
  const [isAdding, setIsAdding] = React.useState(false);
  const [taggedUsers, setTaggedUsers] = React.useState<Record<string, TaggedUserInfo>>({});

  const followingUserIds = useQuery(api.follows.getFollowing, { userId: currentUserId });

  const profileUserIds = React.useMemo(() => {
    const ids = new Set<string>(selectedUserIds);
    followingUserIds?.forEach((id) => ids.add(id));
    return [...ids];
  }, [selectedUserIds, followingUserIds]);

  const profiles = useQuery(
    api.userProfiles.getProfilesByUserIds,
    profileUserIds.length > 0 ? { userIds: profileUserIds } : 'skip'
  );

  const followingProfiles = React.useMemo(() => {
    if (!profiles || !followingUserIds) return [];
    const followingSet = new Set(followingUserIds);
    return profiles.filter((user) => followingSet.has(user.userId));
  }, [profiles, followingUserIds]);

  React.useEffect(() => {
    if (!profiles) return;
    setTaggedUsers((prev) => {
      const next = { ...prev };
      for (const userId of selectedUserIds) {
        if (next[userId]) continue;
        const profile = profiles.find((u) => u.userId === userId);
        if (profile) {
          next[userId] = {
            userId: profile.userId,
            name: profile.name,
            username: profile.username,
          };
        }
      }
      return next;
    });
  }, [profiles, selectedUserIds]);

  const toggleFriend = (userId: string, info?: TaggedUserInfo) => {
    if (selectedUserIds.includes(userId)) {
      onSelectedUserIdsChange(selectedUserIds.filter((id) => id !== userId));
      return;
    }
    if (info) {
      setTaggedUsers((prev) => ({ ...prev, [userId]: info }));
    }
    onSelectedUserIdsChange([...selectedUserIds, userId]);
  };

  const handleAddByUsername = async () => {
    setAddError(null);
    const normalized = normalizeUsernameInput(usernameInput.replace(/^@+/, ''));
    if (!normalized) {
      setAddError('Enter a username');
      return;
    }
    const formatError = getUsernameFormatError(normalized);
    if (formatError) {
      setAddError(formatError);
      return;
    }
    const existingByUsername = Object.values(taggedUsers).find((u) => u.username === normalized);
    if (existingByUsername && selectedUserIds.includes(existingByUsername.userId)) {
      setAddError('Already added');
      return;
    }

    setIsAdding(true);
    try {
      const profile = await convex.query(api.userProfiles.getUserProfileByUsername, {
        username: normalized,
      });
      if (!profile) {
        setAddError('No user found with that username');
        return;
      }
      if (profile.userId === currentUserId) {
        setAddError('You cannot tag yourself');
        return;
      }
      if (selectedUserIds.includes(profile.userId)) {
        setAddError('Already added');
        return;
      }
      const info: TaggedUserInfo = {
        userId: profile.userId,
        name: profile.name ?? null,
        username: profile.username ?? null,
      };
      setTaggedUsers((prev) => ({ ...prev, [profile.userId]: info }));
      onSelectedUserIdsChange([...selectedUserIds, profile.userId]);
      setUsernameInput('');
    } catch {
      setAddError('Could not look up username');
    } finally {
      setIsAdding(false);
    }
  };

  const labelClass = labelClassName ?? 'mb-3 text-base font-semibold text-foreground';

  return (
    <View className="mb-6">
      <Label className={labelClass}>Who visited with you?</Label>

      <View className="mb-3 flex-row items-end gap-2">
        <View className="flex-1">
          <Input
            value={usernameInput}
            onChangeText={(text) => {
              setUsernameInput(text);
              setAddError(null);
            }}
            placeholder="Add by @username"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="done"
            onSubmitEditing={() => void handleAddByUsername()}
          />
        </View>
        <Button
          variant="secondary"
          size="default"
          className="h-12 min-h-12 px-5"
          disabled={isAdding}
          onPress={() => void handleAddByUsername()}>
          <Text>{isAdding ? 'Adding…' : 'Add'}</Text>
        </Button>
      </View>
      {addError ? <Text className="text-destructive mb-3 text-sm">{addError}</Text> : null}

      {selectedUserIds.length > 0 ? (
        <View className="mb-3 flex-row flex-wrap gap-2">
          {selectedUserIds.map((userId) => {
            const info = taggedUsers[userId];
            const label = displayNameForUser(info?.name, info?.username);
            const sublabel = info?.username ? `@${info.username}` : null;
            return (
              <Pressable
                key={userId}
                className="border-primary bg-primary/10 flex-row items-center gap-1 rounded-full border px-3 py-2 active:opacity-90"
                onPress={() => toggleFriend(userId)}>
                <View>
                  <Text className="text-primary text-sm font-medium">{label}</Text>
                  {sublabel && label !== sublabel ? (
                    <Text className="text-primary/80 text-xs">{sublabel}</Text>
                  ) : null}
                </View>
                <XIcon size={16} color={RN_API_MUTED_FOREGROUND_LIGHT} />
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {followingProfiles.length > 0 ? (
        <>
          <Text className="text-muted-foreground mb-2 text-sm">People you follow</Text>
          <ScrollView
            horizontal
            keyboardShouldPersistTaps="handled"
            showsHorizontalScrollIndicator={false}
            className="-mx-1">
            {followingProfiles.map((user) => {
              const selected = selectedUserIds.includes(user.userId);
              const info: TaggedUserInfo = {
                userId: user.userId,
                name: user.name,
                username: user.username,
              };
              return (
                <Pressable
                  key={user.userId}
                  className={cn(
                    'mx-1 rounded-full border px-4 py-2 active:opacity-90',
                    selected ? 'border-primary bg-primary/10' : 'border-border bg-card'
                  )}
                  onPress={() =>
                    toggleFriend(user.userId, info)
                  }>
                  <Text
                    className={cn(
                      'text-sm font-medium',
                      selected ? 'text-primary' : 'text-foreground'
                    )}>
                    {displayNameForUser(user.name, user.username)}
                  </Text>
                  {user.username ? (
                    <Text
                      className={cn(
                        'text-xs',
                        selected ? 'text-primary/80' : 'text-muted-foreground'
                      )}>
                      @{user.username}
                    </Text>
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </>
      ) : (
        <Text className="text-muted-foreground text-sm">
          Type a @username above, or follow people for quick picks.
        </Text>
      )}
    </View>
  );
}
