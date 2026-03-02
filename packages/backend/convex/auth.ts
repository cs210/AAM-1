import { components } from "./_generated/api";
import { query, mutation } from "./_generated/server";
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

function requireSiteUrl() {
  const siteUrl = process.env.SITE_URL?.trim();
  if (!siteUrl) {
    throw new Error("Missing SITE_URL environment variable");
  }
  return siteUrl;
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
  const siteUrl = process.env.SITE_URL?.trim() ?? "";
  return {
    baseURL: siteUrl,
    trustedOrigins: [siteUrl, "http://localhost:8081", "yami://", "exp://"].filter(Boolean),
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
      sendResetPassword: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Reset your password",
          html: `Click the link to reset your password: <a href="${url}">${url}</a>`,
          text: `Click the link to reset your password: ${url}`,
        });
      },
    },
    emailVerification: {
      sendVerificationEmail: async ({ user, url }) => {
        await sendEmail({
          to: user.email,
          subject: "Verify your email address",
          html: `Click the link to verify your email: <a href="${url}">${url}</a>`,
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
          console.log("[auth] sendInvitationEmail called", { email: data.email, organizationId: data.organization?.id });
          const siteUrl = requireSiteUrl();
          const inviteLink = `${siteUrl}/accept-invitation?invitationId=${data.id}`;
          const inviterName = data.inviter?.user?.name ?? data.inviter?.user?.email ?? "A team member";
          const orgName = data.organization?.name ?? "the organization";
          await sendEmail({
            to: data.email,
            subject: `You're invited to join ${orgName}`,
            html: `
              <p>${inviterName} has invited you to join <strong>${orgName}</strong>.</p>
              <p><a href="${inviteLink}">Accept invitation</a></p>
              <p>Or copy this link: ${inviteLink}</p>
            `,
            text: `${inviterName} has invited you to join ${orgName}. Accept here: ${inviteLink}`,
          });
        },
      }),
      admin({
        adminUserIds: process.env.ADMIN_USER_IDS?.split(",").map((id) => id.trim()).filter(Boolean) ?? [],
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

// Mutation that ensures a row exists in `userProfiles` for the given user
export const saveUserProfile = mutation({
  args: {
    userId: v.string(),
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
  },
  handler: async (ctx, { userId, name, email, imageUrl }) => {
    const now = Date.now();
    // try to find existing profile
    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", q => q.eq("userId", userId))
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        name,
        email,
        imageUrl,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("userProfiles", {
        userId,
        name,
        email,
        imageUrl,
        updatedAt: now,
      });
    }
  },
});
