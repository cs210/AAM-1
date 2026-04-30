import { v } from "convex/values";
import { makeFunctionReference } from "convex/server";
import { components } from "./_generated/api";
import type { Doc, Id, TableNames } from "./_generated/dataModel";
import type { ActionCtx, MutationCtx } from "./_generated/server";
import { action, mutation, query } from "./_generated/server";
import { createAuth } from "./auth";

const PASSWORD = "12345678";
const DAY_MS = 24 * 60 * 60 * 1000;

const populateProfilesRef = makeFunctionReference<
  "mutation",
  {
    accounts: Array<{
      key: string;
      name: string;
      email: string;
      password: string;
      userId: string;
      description: string;
    }>;
  },
  {
    seededProfiles: Array<{
      key: string;
      name: string;
      email: string;
      password: string;
      userId: string;
      description: string;
      museumFollows: number;
      userFollows: number;
      checkIns: number;
    }>;
  }
>("focusGroup:populateProfiles");

const PROFILES = [
  {
    key: "firstTime",
    name: "Maya Thompson",
    email: "maya@gmail.com",
    description: "First time user",
    museumFollows: 0,
    userFollows: 0,
    checkIns: 0,
  },
  {
    key: "socialHeavy",
    name: "Daniel Lee",
    email: "daniel@gmail.com",
    description: "Follows many users, few museums",
    museumFollows: 2,
    userFollows: 5,
    checkIns: 1,
  },
  {
    key: "museumHeavy",
    name: "Sofia Martinez",
    email: "sofia@gmail.com",
    description: "Follows many museums, few users",
    museumFollows: 12,
    userFollows: 1,
    checkIns: 3,
  },
  {
    key: "checkInHeavy",
    name: "Ethan Brooks",
    email: "ethan@gmail.com",
    description: "Many museum follows, check-ins, and stats",
    museumFollows: 16,
    userFollows: 2,
    checkIns: 14,
  },
] as const;

type FocusProfile = (typeof PROFILES)[number];

type AuthUser = {
  id?: string;
  _id?: string;
  email: string;
  name: string;
};

function getAuthUserId(user: AuthUser) {
  return user.id ?? user._id;
}

function omitSystemFields<T extends Record<string, any>>(doc: T) {
  const { _id, _creationTime, ...rest } = doc;
  return rest;
}

type Insertable<TableName extends TableNames> = Omit<Doc<TableName>, "_id" | "_creationTime">;

async function findAuthUserByEmail(ctx: ActionCtx, email: string) {
  return (await ctx.runQuery(components.betterAuth.adapter.findOne, {
    model: "user",
    where: [{ field: "email", value: email.toLowerCase() }],
  })) as AuthUser | null;
}

function profileByEmail(email: string) {
  const profile = PROFILES.find((candidate) => candidate.email === email);
  if (!profile) throw new Error(`Unknown focus-group account ${email}`);
  return profile;
}

function sampleMuseums(museums: Doc<"museums">[], count: number, offset: number) {
  if (museums.length === 0 || count <= 0) return [];

  const selected: Doc<"museums">[] = [];
  const seen = new Set<Id<"museums">>();
  for (let index = 0; selected.length < Math.min(count, museums.length); index += 1) {
    const museum = museums[(offset + index) % museums.length];
    if (!seen.has(museum._id)) {
      selected.push(museum);
      seen.add(museum._id);
    }
  }
  return selected;
}

function getRating(index: number) {
  return [5, 4, 5, 3][index % 4];
}

function getDuration(index: number) {
  return [1, 1.5, 2, 3][index % 4];
}

function getReview(profile: FocusProfile, museum: Doc<"museums">, index: number) {
  const category = museum.category.toLowerCase();
  const templates = [
    `Enjoyed the ${category} exhibits at ${museum.name}.`,
    `${museum.name} had a calm layout and a few memorable galleries.`,
    `A good visit overall, especially for someone comparing museum experiences.`,
    `Loved having time to wander through ${museum.name}.`,
  ];
  if (profile.key === "checkInHeavy") {
    return `${templates[index % templates.length]} I would come back with friends.`;
  }
  return templates[index % templates.length];
}

async function clearProfileState(ctx: MutationCtx, userId: string) {
  const museumFollows = await ctx.db
    .query("userFollows")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const follow of museumFollows) {
    await ctx.db.delete(follow._id);
  }

  const userFollows = await ctx.db
    .query("userUserFollows")
    .withIndex("by_follower", (q) => q.eq("followerId", userId))
    .collect();
  for (const follow of userFollows) {
    await ctx.db.delete(follow._id);
  }

  const checkIns = await ctx.db
    .query("checkIns")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  for (const checkIn of checkIns) {
    await ctx.db.delete(checkIn._id);
  }

  const notifications = await ctx.db
    .query("socialNotifications")
    .withIndex("by_recipient_created", (q) => q.eq("recipientUserId", userId))
    .collect();
  for (const notification of notifications) {
    await ctx.db.delete(notification._id);
  }

  const socialPrefs = await ctx.db
    .query("socialNotificationPrefs")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .collect();
  for (const pref of socialPrefs) {
    await ctx.db.delete(pref._id);
  }

  const interests = await ctx.db
    .query("userInterests")
    .withIndex("by_accountId", (q) => q.eq("accountId", userId))
    .collect();
  for (const interest of interests) {
    await ctx.db.delete(interest._id);
  }
}

async function clearIncomingUserFollows(ctx: MutationCtx, userId: string) {
  const followers = await ctx.db
    .query("userUserFollows")
    .withIndex("by_following", (q) => q.eq("followingId", userId))
    .collect();
  for (const follow of followers) {
    await ctx.db.delete(follow._id);
  }
}

async function upsertUserProfile(
  ctx: MutationCtx,
  userId: string,
  profile: FocusProfile,
) {
  const existing = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .first();
  const data = {
    name: profile.name,
    email: profile.email,
    museumData: {
      totalCheckIns: 0,
      totalMuseums: 0,
      checkIns: {},
    },
    updatedAt: Date.now(),
  };

  if (existing) {
    await ctx.db.patch(existing._id, data);
    return existing._id;
  }

  return await ctx.db.insert("userProfiles", {
    userId,
    ...data,
  });
}

export const ensureAccounts = action({
  args: {},
  handler: async (ctx): Promise<{
    accounts: Array<{
      key: string;
      name: string;
      email: string;
      password: string;
      userId: string;
      description: string;
    }>;
  }> => {
    const auth = createAuth(ctx);
    const accounts = [];

    for (const profile of PROFILES) {
      let user: AuthUser;
      try {
        user = (await auth.api.createUser({
          body: {
            email: profile.email,
            password: PASSWORD,
            name: profile.name,
            role: "user",
          },
        })).user as AuthUser;
      } catch (error) {
        const existingUser = await findAuthUserByEmail(ctx, profile.email);
        if (!existingUser) throw error;
        user = existingUser;
      }

      const userId = getAuthUserId(user);
      if (!userId) throw new Error(`Unable to create ${profile.email}`);

      accounts.push({
        key: profile.key,
        name: profile.name,
        email: profile.email,
        password: PASSWORD,
        userId,
        description: profile.description,
      });
    }

    return { accounts };
  },
});

export const populateProfiles = mutation({
  args: {
    accounts: v.array(v.object({
      key: v.string(),
      name: v.string(),
      email: v.string(),
      password: v.string(),
      userId: v.string(),
      description: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    const museums = await ctx.db.query("museums").collect();
    if (museums.length === 0) {
      throw new Error("No museums found. Run `pnpm --filter @packages/backend seed:museums` first.");
    }

    const seededProfiles = [];
    const focusUserIds = args.accounts.map((account) => account.userId);
    const now = Date.now();

    for (const account of args.accounts) {
      const profile = profileByEmail(account.email);
      await clearProfileState(ctx, account.userId);
      const userProfileId = await upsertUserProfile(ctx, account.userId, profile);

      for (const museum of sampleMuseums(museums, profile.museumFollows, 0)) {
        await ctx.db.insert("userFollows", {
          userId: account.userId,
          museumId: museum._id,
          followedAt: now,
        });
      }

      const otherUsers = focusUserIds.filter((userId) => userId !== account.userId);
      for (const followingId of otherUsers.slice(0, profile.userFollows)) {
        await ctx.db.insert("userUserFollows", {
          followerId: account.userId,
          followingId,
          followedAt: now,
        });
      }

      const checkInIdsByMuseum: Record<string, Id<"checkIns">[]> = {};
      const checkInMuseums = sampleMuseums(museums, profile.checkIns, 2);
      for (let index = 0; index < profile.checkIns; index += 1) {
        const museum = checkInMuseums[index % checkInMuseums.length];
        const checkInId = await ctx.db.insert("checkIns", {
          userId: account.userId,
          contentType: "museum",
          contentId: museum._id,
          rating: getRating(index),
          review: getReview(profile, museum, index),
          imageIds: [],
          friendUserIds: otherUsers.slice(0, index % 2),
          durationHours: getDuration(index),
          visitDate: now - (index + 1) * DAY_MS,
          createdAt: now - index * DAY_MS,
        });

        const key = museum._id;
        checkInIdsByMuseum[key] = [...(checkInIdsByMuseum[key] ?? []), checkInId];
      }

      const totalMuseums = Object.keys(checkInIdsByMuseum).length;
      const totalCheckIns = Object.values(checkInIdsByMuseum).reduce(
        (total, ids) => total + ids.length,
        0,
      );
      await ctx.db.patch(userProfileId, {
        museumData: {
          totalCheckIns,
          totalMuseums,
          checkIns: checkInIdsByMuseum,
        },
        updatedAt: now,
      });

      seededProfiles.push({
        ...account,
        museumFollows: profile.museumFollows,
        userFollows: Math.min(profile.userFollows, otherUsers.length),
        checkIns: profile.checkIns,
      });
    }

    return { seededProfiles };
  },
});

export const seedProfiles = action({
  args: {},
  handler: async (ctx) => {
    const auth = createAuth(ctx);
    const accounts = [];

    for (const profile of PROFILES) {
      let user: AuthUser;
      try {
        user = (await auth.api.createUser({
          body: {
            email: profile.email,
            password: PASSWORD,
            name: profile.name,
            role: "user",
          },
        })).user as AuthUser;
      } catch (error) {
        const existingUser = await findAuthUserByEmail(ctx, profile.email);
        if (!existingUser) throw error;
        user = existingUser;
      }

      const userId = getAuthUserId(user);
      if (!userId) throw new Error(`Unable to create ${profile.email}`);

      accounts.push({
        key: profile.key,
        name: profile.name,
        email: profile.email,
        password: PASSWORD,
        userId,
        description: profile.description,
      });
    }

    const seeded = await ctx.runMutation(populateProfilesRef, { accounts });

    return {
      accounts,
      seededProfiles: seeded.seededProfiles,
      nextSteps: [
        "Use these emails with the returned password in the mobile sign-in screen.",
        "After a focus group, run focusGroup:saveSessionSnapshot before reseeding.",
      ],
    };
  },
});

export const listProfiles = query({
  args: {},
  handler: async (ctx) => {
    const profiles = [];
    for (const profile of PROFILES) {
      const userProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_name", (q) => q.eq("name", profile.name))
        .first();
      profiles.push({
        key: profile.key,
        name: profile.name,
        email: profile.email,
        password: PASSWORD,
        description: profile.description,
        userId: userProfile?.userId ?? null,
      });
    }
    return profiles;
  },
});

export const saveSessionSnapshot = mutation({
  args: {
    label: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const createdAt = Date.now();
    const snapshots = [];

    for (const profile of PROFILES) {
      const userProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_name", (q) => q.eq("name", profile.name))
        .first();
      if (!userProfile) continue;

      const userId = userProfile.userId;
      const museumFollows = await ctx.db
        .query("userFollows")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      const userFollows = await ctx.db
        .query("userUserFollows")
        .withIndex("by_follower", (q) => q.eq("followerId", userId))
        .collect();
      const followers = await ctx.db
        .query("userUserFollows")
        .withIndex("by_following", (q) => q.eq("followingId", userId))
        .collect();
      const checkIns = await ctx.db
        .query("checkIns")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();
      const socialNotifications = await ctx.db
        .query("socialNotifications")
        .withIndex("by_recipient_created", (q) => q.eq("recipientUserId", userId))
        .collect();
      const socialNotificationPrefs = await ctx.db
        .query("socialNotificationPrefs")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .first();
      const userInterests = await ctx.db
        .query("userInterests")
        .withIndex("by_accountId", (q) => q.eq("accountId", userId))
        .first();

      snapshots.push({
        profileKey: profile.key,
        userId,
        name: profile.name,
        email: profile.email,
        profile: userProfile,
        museumFollows,
        userFollows,
        followers,
        checkIns,
        socialNotifications,
        socialNotificationPrefs: socialNotificationPrefs ?? undefined,
        userInterests: userInterests ?? undefined,
      });
    }

    const snapshotId = await ctx.db.insert("focusGroupSnapshots", {
      label: args.label ?? `Focus group ${new Date(createdAt).toISOString()}`,
      createdAt,
      profiles: snapshots,
    });

    return {
      snapshotId,
      createdAt,
      profilesSaved: snapshots.length,
      totalCheckIns: snapshots.reduce((total, snapshot) => total + snapshot.checkIns.length, 0),
    };
  },
});

export const listSnapshots = query({
  args: {},
  handler: async (ctx) => {
    const snapshots = await ctx.db
      .query("focusGroupSnapshots")
      .withIndex("by_createdAt")
      .order("desc")
      .take(20);

    return snapshots.map((snapshot) => ({
      _id: snapshot._id,
      label: snapshot.label,
      createdAt: snapshot.createdAt,
      profilesSaved: snapshot.profiles.length,
      totalCheckIns: snapshot.profiles.reduce(
        (total, profile) => total + profile.checkIns.length,
        0,
      ),
    }));
  },
});

export const debugProfileState = query({
  args: {},
  handler: async (ctx) => {
    const results = [];
    for (const profile of PROFILES) {
      const userProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_name", (q) => q.eq("name", profile.name))
        .first();
      if (!userProfile) {
        results.push({
          email: profile.email,
          userId: null,
          checkInCount: 0,
          museumDataCheckIns: 0,
          museumDataTotalMuseums: 0,
        });
        continue;
      }
      const checkIns = await ctx.db
        .query("checkIns")
        .withIndex("by_user", (q) => q.eq("userId", userProfile.userId))
        .collect();
      const museumData = userProfile.museumData;
      results.push({
        email: profile.email,
        userId: userProfile.userId,
        checkInCount: checkIns.length,
        museumDataCheckIns: museumData?.totalCheckIns ?? 0,
        museumDataTotalMuseums: museumData?.totalMuseums ?? 0,
        sampleCheckInIds: checkIns.slice(0, 3).map((ci) => ci._id),
      });
    }
    return results;
  },
});

export const restoreSnapshot = mutation({
  args: {
    snapshotId: v.id("focusGroupSnapshots"),
  },
  handler: async (ctx, args) => {
    const snapshot = await ctx.db.get(args.snapshotId);
    if (!snapshot) {
      throw new Error("Snapshot not found");
    }

    for (const profile of snapshot.profiles) {
      await clearProfileState(ctx, profile.userId);
      await clearIncomingUserFollows(ctx, profile.userId);
    }

    const restoredUserFollowEdges = new Set<string>();
    let restoredCheckIns = 0;
    let restoredMuseumFollows = 0;
    let restoredUserFollows = 0;
    const restoredCheckInIds = new Map<string, Id<"checkIns">>();

    for (const profile of snapshot.profiles) {
      const existingProfile = await ctx.db
        .query("userProfiles")
        .withIndex("by_userId", (q) => q.eq("userId", profile.userId))
        .first();
      let restoredProfileId = existingProfile?._id;

      if (profile.profile) {
        const profileData = {
          ...omitSystemFields(profile.profile),
          userId: profile.userId,
          museumData: {
            totalCheckIns: 0,
            totalMuseums: 0,
            checkIns: {},
          },
          updatedAt: Date.now(),
        } as Insertable<"userProfiles">;
        if (existingProfile) {
          await ctx.db.patch(existingProfile._id, profileData);
        } else {
          restoredProfileId = await ctx.db.insert("userProfiles", profileData);
        }
      }

      for (const museumFollow of profile.museumFollows) {
        await ctx.db.insert(
          "userFollows",
          omitSystemFields(museumFollow) as Insertable<"userFollows">,
        );
        restoredMuseumFollows += 1;
      }

      for (const userFollow of [...profile.userFollows, ...profile.followers]) {
        const clean = omitSystemFields(userFollow);
        const key = `${clean.followerId}->${clean.followingId}`;
        if (restoredUserFollowEdges.has(key)) continue;
        restoredUserFollowEdges.add(key);
        await ctx.db.insert("userUserFollows", clean as Insertable<"userUserFollows">);
        restoredUserFollows += 1;
      }

      const checkInsByMuseum: Record<string, Id<"checkIns">[]> = {};
      for (const checkIn of profile.checkIns) {
        const clean = omitSystemFields(checkIn) as Insertable<"checkIns">;
        const restoredCheckInId = await ctx.db.insert("checkIns", clean);
        if (checkIn._id) {
          restoredCheckInIds.set(checkIn._id, restoredCheckInId);
        }
        if (clean.contentType === "museum") {
          const museumId = clean.contentId as Id<"museums">;
          checkInsByMuseum[museumId] = [...(checkInsByMuseum[museumId] ?? []), restoredCheckInId];
        }
        restoredCheckIns += 1;
      }

      if (restoredProfileId) {
        await ctx.db.patch(restoredProfileId, {
          museumData: {
            totalCheckIns: Object.values(checkInsByMuseum).reduce(
              (total, ids) => total + ids.length,
              0,
            ),
            totalMuseums: Object.keys(checkInsByMuseum).length,
            checkIns: checkInsByMuseum,
          },
          updatedAt: Date.now(),
        });
      }

      for (const notification of profile.socialNotifications) {
        const clean = omitSystemFields(notification) as Insertable<"socialNotifications">;
        const restoredCheckInId = restoredCheckInIds.get(notification.checkInId);
        await ctx.db.insert(
          "socialNotifications",
          {
            ...clean,
            checkInId: restoredCheckInId ?? clean.checkInId,
          },
        );
      }

      if (profile.socialNotificationPrefs) {
        await ctx.db.insert(
          "socialNotificationPrefs",
          omitSystemFields(profile.socialNotificationPrefs) as Insertable<"socialNotificationPrefs">,
        );
      }

      if (profile.userInterests) {
        await ctx.db.insert(
          "userInterests",
          omitSystemFields(profile.userInterests) as Insertable<"userInterests">,
        );
      }
    }

    return {
      snapshotId: args.snapshotId,
      restoredProfiles: snapshot.profiles.length,
      restoredMuseumFollows,
      restoredUserFollows,
      restoredCheckIns,
      restoredAt: Date.now(),
    };
  },
});
