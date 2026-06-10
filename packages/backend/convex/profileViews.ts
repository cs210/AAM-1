import type { Doc } from "./_generated/dataModel";

export type ProfileView = {
  userId: string;
  name: string | null;
  username: string | null;
  imageUrl: string | null;
  bannerUrl: string | null;
  email?: string | null;
};

type ProfileDoc = Doc<"userProfiles">;

export function toProfileView(
  profile: ProfileDoc,
  viewerUserId?: string | null
): ProfileView {
  const view: ProfileView = {
    userId: profile.userId,
    name: profile.name ?? null,
    username: profile.username ?? null,
    imageUrl: profile.imageUrl ?? null,
    bannerUrl: profile.bannerUrl ?? null,
  };
  if (viewerUserId && profile.userId === viewerUserId) {
    view.email = profile.email ?? null;
  }
  return view;
}
