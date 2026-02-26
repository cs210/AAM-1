import { components } from "./_generated/api";
import { query } from "./_generated/server";
import { createClient, GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import { expo } from "@better-auth/expo";

// List all users (for search/following) from userProfiles
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    // Return all userProfiles (public info only)
    const profiles = await ctx.db.query("userProfiles").collect();
    return profiles.map((profile) => ({
      userId: profile.userId,
      name: profile.name ?? null,
      email: profile.email ?? null,
      imageUrl: profile.imageUrl ?? null,
    }));
  },
});

const siteUrl = process.env.SITE_URL;

if (!siteUrl) {
  throw new Error("Missing SITE_URL environment variable");
}

export const authComponent = createClient(components.betterAuth);

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  return {
    baseURL: siteUrl,
    trustedOrigins: [siteUrl, "http://localhost:8081", "yami://", "exp://"],
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [
      convex({
        authConfig,
      }),
      expo(),
    ],
  } satisfies BetterAuthOptions;
};

export const createAuth = (ctx: GenericCtx<DataModel>) =>
  betterAuth(createAuthOptions(ctx));

// Helper to get the current authenticated user
export const { getAuthUser } = authComponent.clientApi();

// Get the current user as a query
export const getCurrentUser = query({
  args: {},
  handler: async (ctx) => {
    return authComponent.safeGetAuthUser(ctx);
  },
});

