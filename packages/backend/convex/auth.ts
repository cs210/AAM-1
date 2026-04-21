
import { components } from "./_generated/api";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { createClient, GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { admin, organization } from "better-auth/plugins";

import { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import authSchema from "./betterAuth/schema";
import { expo } from "@better-auth/expo";
import { sendEmail } from "./email";

// List all users (for search/following) from userProfiles
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");
    // Return all userProfiles (public info only)
    const profiles = await ctx.db.query("userProfiles").collect();
    return profiles.map((profile) => ({
      userId: profile.userId,
      name: profile.name ?? null,
      imageUrl: profile.imageUrl ?? null,
      bannerUrl: profile.bannerUrl ?? null,
    }));
  },
});

function normalizeUrl(value: string) {
  return value.startsWith("http") ? value : `https://${value}`;
}

function readSiteUrl() {
  const value = process.env.SITE_URL?.trim();
  if (!value || value.includes("$")) return null;
  return normalizeUrl(value);
}

function getAliasUrls() {
  return (process.env.ALIAS_URL ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value) => Boolean(value) && !value.includes("$"))
    .map((value) => normalizeUrl(value));
}

function resolveSiteUrl() {
  return readSiteUrl();
}

function requireSiteUrl() {
  const value = resolveSiteUrl();
  if (!value) {
    throw new Error("Missing SITE_URL environment variable");
  }
  return value;
}

export const authComponent = createClient<DataModel, typeof authSchema>(
  components.betterAuth,
  {
    local: {
      schema: authSchema,
    },
  },
);

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  const siteUrl = resolveSiteUrl() ?? "";
  const aliasUrls = getAliasUrls();
  const isProduction = process.env.NODE_ENV === "production";
  const trustedOrigins = [siteUrl, ...aliasUrls, "http://localhost:8081", "yami://", "exp://"]
    .filter((origin): origin is string => Boolean(origin));

  return {
    baseURL: siteUrl,
    trustedOrigins,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: isProduction,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Reset your password",
          html:
            `Click the link to reset your password: <a href="${url}">${url}</a>`,
          text: `Click the link to reset your password: ${url}`,
        });
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Verify your email address",
          html:
            `Click the link to verify your email: <a href="${url}">${url}</a>`,
          text: `Click the link to verify your email: ${url}`,
        });
      },
    },
    plugins: [
      convex({
        authConfig,
      }),
      organization({
        async sendInvitationEmail(data) {
          console.log("[auth] sendInvitationEmail called", {
            email: data.email,
            organizationId: data.organization?.id,
          });
          const siteUrl = requireSiteUrl();
          const inviteLink =
            `${siteUrl}/accept-invitation?invitationId=${data.id}`;
          const inviterName = data.inviter?.user?.name ??
            data.inviter?.user?.email ?? "A team member";
          const orgName = data.organization?.name ?? "the organization";
          await sendEmail({
            to: data.email,
            subject: `You're invited to join ${orgName}`,
            html: `
              <p>${inviterName} has invited you to join <strong>${orgName}</strong>.</p>
              <p><a href="${inviteLink}">Accept invitation</a></p>
              <p>Or copy this link: ${inviteLink}</p>
            `,
            text:
              `${inviterName} has invited you to join ${orgName}. Accept here: ${inviteLink}`,
          });
        },
      }),
      admin({
        adminUserIds: process.env.ADMIN_USER_IDS?.split(",").map((id) =>
          id.trim()
        ).filter(Boolean) ?? [],
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

// Mutation that ensures a row exists in `userProfiles` for the authenticated user
export const saveUserProfile = mutation({
  args: {
    name: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, { name, imageUrl }) => {
    const user = await authComponent.safeGetAuthUser(ctx);
    if (!user) throw new Error("Not authenticated");
    if (imageUrl && !imageUrl.startsWith("https://")) {
      throw new Error("imageUrl must use https");
    }

    const userId = user._id;
    const now = Date.now();
    // try to find existing profile
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name,
        imageUrl,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("userProfiles", {
        userId,
        name,
        imageUrl,
        updatedAt: now,
      });
    }
  },
});
