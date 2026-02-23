import { components } from "./_generated/api";
import { query } from "./_generated/server";
import { createClient, GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { organization } from "better-auth/plugins";

import { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";
import authSchema from "./betterAuth/schema";
import { expo } from "@better-auth/expo";

export const authComponent = createClient<DataModel, typeof authSchema>(
  components.betterAuth,
  {
    local: {
      schema: authSchema,
    },
  },
);

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  const siteUrl = process.env.SITE_URL ?? "";
  return {
    baseURL: siteUrl,
    trustedOrigins: [siteUrl, "http://localhost:8081", "yami://", "exp://"].filter(Boolean),
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false,
    },
    plugins: [
      convex({
        authConfig,
      }),
      organization(),
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
