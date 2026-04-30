import { ConvexError } from "convex/values";
import type { ActionCtx, MutationCtx, QueryCtx } from "./_generated/server";
import { api } from "./_generated/api";
import { authComponent } from "./auth";

export type AuthenticatedUser = {
  _id: string;
  role?: string | null;
};

export async function requireAuthenticatedUser(ctx: QueryCtx | MutationCtx) {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) throw new Error("Not authenticated");
  return user as AuthenticatedUser;
}

export async function requireAdmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireAuthenticatedUser(ctx);
  if (user.role !== "admin") throw new Error("Admin access required");
  return user;
}

export async function requireAuthenticatedAction(ctx: ActionCtx) {
  const user = await ctx.runQuery(api.auth.getCurrentUser, {});
  if (!user) {
    throw new ConvexError({
      code: "NOT_AUTHENTICATED",
      message: "Not authenticated",
    });
  }
  return user as AuthenticatedUser;
}

export async function requireAdminAction(ctx: ActionCtx) {
  const user = await requireAuthenticatedAction(ctx);
  if (user.role !== "admin") {
    throw new ConvexError({
      code: "ADMIN_REQUIRED",
      message: "Admin access required",
    });
  }
  return user;
}
