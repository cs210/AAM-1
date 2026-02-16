import { components } from "./_generated/api";
import { query } from "./_generated/server";
import { createClient, GenericCtx } from "@convex-dev/better-auth";
import { convex, crossDomain } from "@convex-dev/better-auth/plugins";
import { expo } from "@better-auth/expo";
import { betterAuth, type BetterAuthOptions } from "better-auth/minimal";
import { DataModel } from "./_generated/dataModel";
import authConfig from "./auth.config";

const siteUrl = process.env.SITE_URL;

export const authComponent = createClient(components.betterAuth);

export const createAuthOptions = (ctx: GenericCtx<DataModel>) => {
  const trustedOrigins = ["yami://", "http://localhost:8081"];
  if (siteUrl) trustedOrigins.push(siteUrl);

  return {
    baseURL: siteUrl,
    trustedOrigins,
    database: authComponent.adapter(ctx),
    emailAndPassword: {
      enabled: true,
    },
    plugins: [
      expo(),
      convex({
        authConfig,
      }),
      ...(siteUrl ? [crossDomain({ siteUrl })] : []),
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
