import { GeospatialIndex } from "@convex-dev/geospatial";
import { v } from "convex/values";
import { action, mutation, query } from "./_generated/server";
import type { QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { api, components, internal } from "./_generated/api";
import { updateRequestStatusHelper } from "./organizationRequests";
import {
  requireAdmin,
  requireAdminAction,
  requireAuthenticatedAction,
  requireAuthenticatedUser,
} from "./permissions";

const geospatial = new GeospatialIndex(components.geospatial);

// Component calls from queries (sparingly; components require runQuery).
// Cast: getOrganization may be provided by component extension; package types omit it.
async function fetchComponentOrganizationsForUser(ctx: QueryCtx, userId: string) {
  return await ctx.runQuery((components.betterAuth as any).getOrganization.listOrganizationsForUser, {
    userId,
  });
}

type OrgRequestRow = Doc<"organizationRequests">;
type UserDisplay = { id: string; name: string; email: string };
type OrganizationRow = {
  _id?: string;
  id?: string;
  name?: string;
  slug?: string;
  memberRole?: string | null;
};
type OrganizationMuseumLinkRow = Doc<"organizationMuseumLinks">;
type OrganizationAdminRow = OrganizationRow & {
  _id: string;
  linkedMuseumId: string | null;
  linkedMuseumName: string | null;
  hasInvalidMuseumContext: boolean;
};
type BetterAuthMemberRow = {
  _id: string;
  organizationId: string;
  userId: string;
  role: string;
  createdAt: number;
};
type BetterAuthUserRow = {
  id: string;
  name: string;
  email: string;
};
type UserOrganizationSummary = {
  id: string;
  name: string;
};

function getOrganizationId(organization: OrganizationRow) {
  return organization._id ?? organization.id ?? "";
}

async function getLinkedMuseumForOrg(ctx: QueryCtx, betterAuthOrgId: string) {
  const links = await ctx.db
    .query("organizationMuseumLinks")
    .withIndex("by_org", (q) => q.eq("betterAuthOrgId", betterAuthOrgId))
    .collect();
  if (links.length === 0) {
    return {
      linkedMuseumId: null as string | null,
      linkedMuseumName: null as string | null,
      hasInvalidMuseumContext: false,
    };
  }

  const primaryLink = links[0]!;
  const museum = await ctx.db.get(primaryLink.museumId);
  return {
    linkedMuseumId: primaryLink.museumId as string,
    linkedMuseumName: museum?.name ?? null,
    hasInvalidMuseumContext: museum === null,
  };
}

/** Action: list org requests with resolved user display (avoids query-calling-query warning). */
export const listOrgRequestsForAdmin = action({
  args: {},
  handler: async (ctx): Promise<(OrgRequestRow & { userDisplay: string; orgDisplay: string })[]> => {
    await requireAdminAction(ctx);
    const requests = await ctx.runQuery(internal.organizationRequests.listAllRequests, {}) as OrgRequestRow[];
    const userIds: string[] = [...new Set(requests.map((r: OrgRequestRow) => r.userId))];
    const users = await ctx.runQuery((components.betterAuth as any).getUser.getUsers, { ids: userIds }) as UserDisplay[];
    const userMap = new Map(users.map((u: UserDisplay) => [u.id, u]));
    return requests.map((req: OrgRequestRow) => {
      const u = userMap.get(req.userId);
      const userDisplay = u ? `${u.name || u.email || "Unknown"} (${req.userId})` : req.userId;
      const orgDisplay = req.museumName;
      return { ...req, userDisplay, orgDisplay };
    });
  },
});

export const setOrgRequestStatusForAdmin = mutation({
  args: {
    requestId: v.id("organizationRequests"),
    status: v.union(v.literal("approved"), v.literal("rejected")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await updateRequestStatusHelper(ctx, args.requestId, args.status);
  },
});

/** Action: list all organizations (avoids query-calling-component warning). */
export const listOrganizationsForAdmin = action({
  args: {},
  handler: async (ctx): Promise<OrganizationAdminRow[]> => {
    await requireAdminAction(ctx);
    const organizations = (await ctx.runQuery(
      (components.betterAuth as any).getOrganization.listOrganizations,
      {}
    )) as OrganizationRow[];
    const links = (await ctx.runQuery(
      (api as any).admin.listOrganizationMuseumLinksForAdmin,
      {}
    )) as OrganizationMuseumLinkRow[];
    const museums = await ctx.runQuery(api.museums.listMuseums, {});

    const museumNameById = new Map<string, string>(
      museums.map((museum: { _id: string; name: string }) => [museum._id, museum.name])
    );
    const linkByOrgId = new Map(
      links.map((link) => [link.betterAuthOrgId, link])
    );

    return organizations
      .map((organization) => {
        const orgId = getOrganizationId(organization);
        const linkedMuseum = orgId ? linkByOrgId.get(orgId) : undefined;
        const linkedMuseumId = linkedMuseum ? (linkedMuseum.museumId as string) : null;
        const linkedMuseumName = linkedMuseumId ? museumNameById.get(linkedMuseumId) ?? null : null;
        return {
          ...organization,
          _id: orgId,
          linkedMuseumId,
          linkedMuseumName,
          hasInvalidMuseumContext: Boolean(linkedMuseumId && !linkedMuseumName),
        };
      })
      .sort((a, b) => (a.name ?? "").localeCompare(b.name ?? ""));
  },
});

/** List organizations the current user is a member of (affiliations). No admin required. */
export const listMyOrganizations = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) return [];
    const organizations = (await fetchComponentOrganizationsForUser(ctx, identity.subject)) as OrganizationRow[];
    const rows = await Promise.all(
      organizations.map(async (organization) => {
        const orgId = getOrganizationId(organization);
        if (!orgId) return null;
        const linkedMuseum = await getLinkedMuseumForOrg(ctx, orgId);
        return {
          ...organization,
          _id: orgId,
          ...linkedMuseum,
        };
      })
    );
    return rows.filter((row): row is NonNullable<typeof row> => row !== null);
  },
});

/** List organizations per user (admin). */
export const listUserOrganizationsForAdmin = action({
  args: {
    userIds: v.array(v.string()),
  },
  handler: async (ctx, args): Promise<Record<string, UserOrganizationSummary[]>> => {
    await requireAdminAction(ctx);
    const uniqueUserIds = [...new Set(args.userIds.filter(Boolean))];
    const rows = await Promise.all(
      uniqueUserIds.map(async (userId) => {
        const organizations = (await ctx.runQuery(
          (components.betterAuth as any).getOrganization.listOrganizationsForUser,
          { userId }
        )) as OrganizationRow[];
        const summaries = organizations
          .map((organization) => {
            const id = getOrganizationId(organization);
            if (!id) return null;
            return {
              id,
              name: organization.name ?? id,
            };
          })
          .filter((organization): organization is UserOrganizationSummary => organization !== null)
          .sort((a, b) => a.name.localeCompare(b.name));
        return [userId, summaries] as const;
      })
    );
    return Object.fromEntries(rows);
  },
});

/** List org↔museum links (admin). */
export const listOrganizationMuseumLinksForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
    return await ctx.db.query("organizationMuseumLinks").collect();
  },
});

/** Assign or clear an org↔museum link (admin). Enforces one org per museum and one museum per org. */
export const setOrganizationMuseumLinkForAdmin = mutation({
  args: {
    betterAuthOrgId: v.string(),
    museumId: v.optional(v.id("museums")),
  },
  handler: async (ctx, args) => {
    const user = await requireAdmin(ctx);
    const now = Date.now();

    const organization = await ctx.runQuery((components.betterAuth as any).getOrganization.getOrganization, {
      id: args.betterAuthOrgId,
    });
    if (!organization) throw new Error("Organization not found");

    const existingOrgLinks = await ctx.db
      .query("organizationMuseumLinks")
      .withIndex("by_org", (q) => q.eq("betterAuthOrgId", args.betterAuthOrgId))
      .collect();
    const existingOrgLink = existingOrgLinks[0] ?? null;
    for (const duplicate of existingOrgLinks.slice(1)) {
      await ctx.db.delete(duplicate._id);
    }

    if (!args.museumId) {
      if (existingOrgLink) {
        await ctx.db.delete(existingOrgLink._id);
      }
      return { linkedMuseumId: null };
    }
    const museumId = args.museumId;

    const museum = await ctx.db.get(museumId);
    if (!museum) throw new Error("Museum not found");

    const existingMuseumLinks = await ctx.db
      .query("organizationMuseumLinks")
      .withIndex("by_museum", (q) => q.eq("museumId", museumId))
      .collect();
    const conflictingLink = existingMuseumLinks.find(
      (link) => link.betterAuthOrgId !== args.betterAuthOrgId
    );
    if (conflictingLink) {
      throw new Error("Museum is already assigned to another organization");
    }
    for (const duplicate of existingMuseumLinks.slice(1)) {
      await ctx.db.delete(duplicate._id);
    }

    if (existingOrgLink) {
      await ctx.db.patch(existingOrgLink._id, {
        museumId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("organizationMuseumLinks", {
        betterAuthOrgId: args.betterAuthOrgId,
        museumId,
        assignedAt: now,
        assignedBy: user._id,
        updatedAt: now,
      });
    }

    return { linkedMuseumId: museumId as string };
  },
});

/** List organization members with user profile info (admin). */
export const listOrganizationMembersForAdmin = action({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    await requireAdminAction(ctx);
    const organization = await ctx.runQuery((components.betterAuth as any).getOrganization.getOrganization, {
      id: args.organizationId,
    });
    if (!organization) throw new Error("Organization not found");

    const members = (await ctx.runQuery(
      (components.betterAuth as any).getOrganization.listMembersByOrganization,
      { organizationId: args.organizationId }
    )) as BetterAuthMemberRow[];
    const uniqueUserIds = [...new Set(members.map((member) => member.userId))];
    const users = (await ctx.runQuery((components.betterAuth as any).getUser.getUsers, {
      ids: uniqueUserIds,
    })) as BetterAuthUserRow[];
    const userMap = new Map(users.map((user) => [user.id, user]));

    return members
      .map((member) => ({
        ...member,
        userName: userMap.get(member.userId)?.name ?? "",
        userEmail: userMap.get(member.userId)?.email ?? "",
      }))
      .sort((a, b) => a.userEmail.localeCompare(b.userEmail));
  },
});

/** Search users by email to add to an organization (admin). */
export const searchUsersByEmailForAdmin = action({
  args: {
    emailQuery: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireAdminAction(ctx);
    return (await ctx.runQuery((components.betterAuth as any).getUser.searchUsersByEmail, {
      emailQuery: args.emailQuery,
      limit: args.limit,
    })) as BetterAuthUserRow[];
  },
});

/** Add an existing user to an organization by email (admin). */
export const addUserToOrganizationByEmailForAdmin = mutation({
  args: {
    organizationId: v.string(),
    email: v.string(),
    role: v.optional(v.union(v.literal("member"), v.literal("owner"))),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const organization = await ctx.runQuery((components.betterAuth as any).getOrganization.getOrganization, {
      id: args.organizationId,
    });
    if (!organization) throw new Error("Organization not found");

    const user = (await ctx.runQuery((components.betterAuth as any).getUser.getUserByEmail, {
      email: args.email,
    })) as BetterAuthUserRow | null;
    if (!user) throw new Error("No user found for that email");

    await ctx.runMutation((components.betterAuth as any).getOrganization.addMemberToOrganization, {
      organizationId: args.organizationId,
      userId: user.id,
      role: args.role ?? "member",
    });
    return user;
  },
});

/** Assign an organization member's role (admin). Promoting an owner demotes the previous owner. */
export const setOrganizationMemberRoleForAdmin = mutation({
  args: {
    organizationId: v.string(),
    userId: v.string(),
    role: v.union(v.literal("member"), v.literal("owner")),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const organization = await ctx.runQuery((components.betterAuth as any).getOrganization.getOrganization, {
      id: args.organizationId,
    });
    if (!organization) throw new Error("Organization not found");

    await ctx.runMutation((components.betterAuth as any).getOrganization.setMemberRole, {
      organizationId: args.organizationId,
      userId: args.userId,
      role: args.role,
    });
  },
});

/** Remove a user from an organization (admin). */
export const removeUserFromOrganizationForAdmin = mutation({
  args: {
    organizationId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.runMutation((components.betterAuth as any).getOrganization.removeMemberFromOrganization, {
      organizationId: args.organizationId,
      userId: args.userId,
    });
  },
});

/** Delete an organization and app-side records that reference it (admin). */
export const deleteOrganizationForAdmin = mutation({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    await ctx.runMutation((components.betterAuth as any).getOrganization.deleteOrganization, {
      organizationId: args.organizationId,
    });

    const links = await ctx.db
      .query("organizationMuseumLinks")
      .withIndex("by_org", (q) => q.eq("betterAuthOrgId", args.organizationId))
      .collect();
    for (const link of links) {
      await ctx.db.delete(link._id);
    }

    const requests = await ctx.db
      .query("organizationRequests")
      .withIndex("by_betterAuthOrgId", (q) => q.eq("betterAuthOrgId", args.organizationId))
      .collect();
    for (const request of requests) {
      await ctx.db.delete(request._id);
    }
  },
});

/** List organization members with user profile info for the current org owner. */
export const listOrganizationMembersForOwner = action({
  args: { organizationId: v.string() },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedAction(ctx);
    const membership = (await ctx.runQuery(
      (components.betterAuth as any).getOrganization.getMember,
      { organizationId: args.organizationId, userId: user._id }
    )) as BetterAuthMemberRow | null;
    if (!membership || membership.role !== "owner") {
      throw new Error("Only the organization owner can view members");
    }

    const organization = await ctx.runQuery((components.betterAuth as any).getOrganization.getOrganization, {
      id: args.organizationId,
    });
    if (!organization) throw new Error("Organization not found");

    const members = (await ctx.runQuery(
      (components.betterAuth as any).getOrganization.listMembersByOrganization,
      { organizationId: args.organizationId }
    )) as BetterAuthMemberRow[];
    const uniqueUserIds = [...new Set(members.map((member) => member.userId))];
    const users = (await ctx.runQuery((components.betterAuth as any).getUser.getUsers, {
      ids: uniqueUserIds,
    })) as BetterAuthUserRow[];
    const userMap = new Map(users.map((componentUser) => [componentUser.id, componentUser]));

    return members
      .map((member) => ({
        ...member,
        userName: userMap.get(member.userId)?.name ?? "",
        userEmail: userMap.get(member.userId)?.email ?? "",
      }))
      .sort((a, b) => a.userEmail.localeCompare(b.userEmail));
  },
});

/** Search users by email for the current org owner member-management UX. */
export const searchUsersByEmailForOwner = action({
  args: {
    organizationId: v.string(),
    emailQuery: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedAction(ctx);
    const membership = (await ctx.runQuery(
      (components.betterAuth as any).getOrganization.getMember,
      { organizationId: args.organizationId, userId: user._id }
    )) as BetterAuthMemberRow | null;
    if (!membership || membership.role !== "owner") {
      throw new Error("Only the organization owner can search users");
    }

    const organization = await ctx.runQuery((components.betterAuth as any).getOrganization.getOrganization, {
      id: args.organizationId,
    });
    if (!organization) throw new Error("Organization not found");

    return (await ctx.runQuery((components.betterAuth as any).getUser.searchUsersByEmail, {
      emailQuery: args.emailQuery,
      limit: args.limit,
    })) as BetterAuthUserRow[];
  },
});

/** Add an existing user as a member of the current owner's organization. */
export const addUserToOrganizationByEmailForOwner = mutation({
  args: {
    organizationId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireAuthenticatedUser(ctx);
    const membership = (await ctx.runQuery(
      (components.betterAuth as any).getOrganization.getMember,
      { organizationId: args.organizationId, userId: currentUser._id }
    )) as BetterAuthMemberRow | null;
    if (!membership || membership.role !== "owner") {
      throw new Error("Only the organization owner can add members");
    }

    const organization = await ctx.runQuery((components.betterAuth as any).getOrganization.getOrganization, {
      id: args.organizationId,
    });
    if (!organization) throw new Error("Organization not found");

    const componentUser = (await ctx.runQuery((components.betterAuth as any).getUser.getUserByEmail, {
      email: args.email,
    })) as BetterAuthUserRow | null;
    if (!componentUser) throw new Error("No user found for that email");

    await ctx.runMutation((components.betterAuth as any).getOrganization.addMemberToOrganization, {
      organizationId: args.organizationId,
      userId: componentUser.id,
      role: "member",
    });
    return componentUser;
  },
});

/** Remove a non-owner member from the current owner's organization. */
export const removeUserFromOrganizationForOwner = mutation({
  args: {
    organizationId: v.string(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const currentUser = await requireAuthenticatedUser(ctx);
    const membership = (await ctx.runQuery(
      (components.betterAuth as any).getOrganization.getMember,
      { organizationId: args.organizationId, userId: currentUser._id }
    )) as BetterAuthMemberRow | null;
    if (!membership || membership.role !== "owner") {
      throw new Error("Only the organization owner can remove members");
    }
    if (args.userId === currentUser._id) {
      throw new Error("Transfer ownership before removing yourself");
    }

    const targetMembership = (await ctx.runQuery(
      (components.betterAuth as any).getOrganization.getMember,
      { organizationId: args.organizationId, userId: args.userId }
    )) as BetterAuthMemberRow | null;
    if (!targetMembership) throw new Error("Member not found");
    if (targetMembership.role === "owner") {
      throw new Error("Transfer ownership before removing the owner");
    }

    await ctx.runMutation((components.betterAuth as any).getOrganization.removeMemberFromOrganization, {
      organizationId: args.organizationId,
      userId: args.userId,
    });
  },
});

/** Transfer organization ownership from the current owner to another member. */
export const transferOrganizationOwnership = mutation({
  args: {
    organizationId: v.string(),
    toUserId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await requireAuthenticatedUser(ctx);
    const membership = (await ctx.runQuery(
      (components.betterAuth as any).getOrganization.getMember,
      { organizationId: args.organizationId, userId: user._id }
    )) as BetterAuthMemberRow | null;
    if (!membership || membership.role !== "owner") {
      throw new Error("Only the organization owner can transfer ownership");
    }

    await ctx.runMutation((components.betterAuth as any).getOrganization.transferOwnership, {
      organizationId: args.organizationId,
      fromUserId: user._id,
      toUserId: args.toUserId,
    });
  },
});

type PendingInvitation = {
  _id: string;
  organizationId: string;
  email: string;
  role?: string | null;
  status: string;
  expiresAt: number;
  createdAt: number;
  inviterId: string;
  organizationName?: string;
};

type MuseumAdminRow = Doc<"museums"> & {
  point: { latitude: number; longitude: number } | null;
};

const museumPointValidator = v.object({
  latitude: v.number(),
  longitude: v.number(),
});

const museumLocationValidator = v.object({
  address: v.optional(v.string()),
  city: v.optional(v.string()),
  state: v.optional(v.string()),
  country: v.optional(v.string()),
  postalCode: v.optional(v.string()),
});

const operatingHourValidator = v.object({
  day: v.string(),
  isOpen: v.boolean(),
  openTime: v.string(),
  closeTime: v.string(),
});

const csvImportMuseumCategoryOptions = [
  "art",
  "contemporary",
  "history",
  "science",
  "natural-history",
  "children",
  "design",
  "photography",
  "culture",
  "specialty",
] as const;

type CsvImportPrefillResult = {
  sourceUrl: string;
  imageUrls: string[];
  needsWebsiteForFallback: boolean;
  prefill: {
    name: string;
    tagline: string;
    description: string;
    category: string;
    publicEmail: string;
    website: string;
    phone: string;
    timezone: string;
    address: string;
    city: string;
    state: string;
    country: string;
    postalCode: string;
    latitude: string;
    longitude: string;
    imageUrl: string;
    accessibilityNotes: string;
  };
  operatingHours?: {
    day: string;
    isOpen: boolean;
    openTime: string;
    closeTime: string;
  }[];
  accessibilityFeatures?: string[];
};

type CsvImportExhibitionResult = {
  sourceUrl: string;
  createdCount: number;
  skippedCount: number;
  parsedCount: number;
};

type CsvImportActionReturn = {
  museumId: Id<"museums">;
  museumName: string;
  wasCreated: boolean;
  museum: {
    status: "updated" | "skipped" | "failed";
    message?: string;
    imagesImportedCount: number;
    sourceUrl?: string;
    needsWebsiteForFallback?: boolean;
  };
  exhibitions: {
    status: "imported" | "skipped" | "failed";
    message?: string;
    createdCount: number;
    skippedCount: number;
    parsedCount: number;
    sourceUrl?: string;
  };
};

type CsvImportMuseumLookupRow = Doc<"museums">;

function optionalTrimmed(value: string | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.length > 0 ? trimmed : undefined;
}

function normalizeMuseumLookupText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/^the\s+/, "")
    .replace(/\s+/g, " ");
}

function getMuseumLookupKeys(value: string) {
  const keys = new Set<string>();
  const parentheticalMatches = [...value.matchAll(/\(([^)]+)\)/g)];
  const withoutParentheticals = value.replace(/\([^)]*\)/g, " ");

  for (const candidate of [value, withoutParentheticals, ...parentheticalMatches.map((match) => match[1] ?? "")]) {
    const normalized = normalizeMuseumLookupText(candidate);
    if (normalized) keys.add(normalized);
  }

  return keys;
}

function museumNamesMatch(left: string, right: string) {
  const leftKeys = getMuseumLookupKeys(left);
  const rightKeys = getMuseumLookupKeys(right);
  for (const key of leftKeys) {
    if (rightKeys.has(key)) return true;
  }
  return false;
}

function parseCsvImportCoordinate(value: string | undefined) {
  const parsed = Number(value?.trim());
  return Number.isFinite(parsed) ? parsed : undefined;
}

function normalizeCsvImportCategory(value: string | undefined) {
  const normalized = value?.trim().toLowerCase() ?? "";
  if (!normalized) return "uncategorized";

  const selected = csvImportMuseumCategoryOptions.filter((category) => {
    const comparable = category.replaceAll("-", " ");
    return normalized === category || normalized.includes(comparable);
  });
  if (selected.length > 0) return selected.join(", ");

  if (normalized.includes("modern") || normalized.includes("contemporary")) return "contemporary";
  if (normalized.includes("natural")) return "natural-history";
  if (normalized.includes("child")) return "children";
  if (normalized.includes("photo")) return "photography";
  if (normalized.includes("cultur")) return "culture";
  if (normalized.includes("design")) return "design";
  if (normalized.includes("histor")) return "history";
  if (normalized.includes("science")) return "science";
  if (normalized.includes("art")) return "art";
  return "specialty";
}

function toErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message;
  return "Unknown error";
}

/** Action: list pending invitations with org names (admin). */
export const listPendingInvitationsForAdmin = action({
  args: {},
  handler: async (ctx): Promise<PendingInvitation[]> => {
    await requireAdminAction(ctx);
    const invitations = (await ctx.runQuery((components.betterAuth as any).invitations.listInvitations, {
      status: "pending",
    })) as PendingInvitation[];
    const withOrgNames = await Promise.all(
      invitations.map(async (inv) => {
        const org = await ctx.runQuery((components.betterAuth as any).getOrganization.getOrganization, {
          id: inv.organizationId,
        });
        return { ...inv, organizationName: org?.name };
      })
    );
    return withOrgNames;
  },
});

/** Action: cancel a pending invitation (admin). */
export const cancelInvitationForAdmin = action({
  args: { invitationId: v.string() },
  handler: async (ctx, args) => {
    await requireAdminAction(ctx);
    await ctx.runMutation((components.betterAuth as any).invitations.deleteInvitation, {
      id: args.invitationId,
    });
  },
});

/** Action: list all museums with geospatial coordinates (admin). */
export const listMuseumsForAdmin = action({
  args: {},
  handler: async (ctx): Promise<MuseumAdminRow[]> => {
    await requireAdminAction(ctx);
    const museums = (await ctx.runQuery(api.museums.listMuseums, {})) as Doc<"museums">[];
    const rowsWithPoints = await Promise.all(
      museums.map(async (museum: Doc<"museums">) => {
        const geospatialDoc = await ctx.runQuery(components.geospatial.document.get, {
          key: museum._id,
        });
        const fromIndex = geospatialDoc?.coordinates ?? null;
        const fromDoc =
          typeof museum.latitude === "number" && typeof museum.longitude === "number"
            ? { latitude: museum.latitude, longitude: museum.longitude }
            : null;
        return {
          ...museum,
          point: fromIndex ?? fromDoc,
        };
      })
    );
    return rowsWithPoints.sort((a: MuseumAdminRow, b: MuseumAdminRow) => a.name.localeCompare(b.name));
  },
});

/** Mutation: create a museum (admin). */
export const createMuseumForAdmin = mutation({
  args: {
    name: v.string(),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const name = args.name.trim();
    if (!name) throw new Error("Museum name is required");

    const museumId = await ctx.db.insert("museums", {
      name,
      category: "uncategorized",
      location: {},
    });
    return museumId;
  },
});

/** Action: import one museum CSV row, create if missing, and run existing detail/exhibition auto-fill flows. */
export const importMuseumCsvRowForAdmin = action({
  args: {
    museumName: v.string(),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    country: v.optional(v.string()),
    exhibitionPageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<CsvImportActionReturn> => {
    await requireAdminAction(ctx);

    const museumName = args.museumName.trim();
    if (!museumName) throw new Error("Museum name is required");

    const city = optionalTrimmed(args.city);
    const state = optionalTrimmed(args.state);
    const country = optionalTrimmed(args.country);
    const exhibitionPageUrl = optionalTrimmed(args.exhibitionPageUrl);

    const museums = (await ctx.runQuery(api.museums.listMuseums, {})) as CsvImportMuseumLookupRow[];
    const nameMatches = museums.filter((museum: CsvImportMuseumLookupRow) => museumNamesMatch(museum.name, museumName));
    const existingMuseum =
      nameMatches.find(
        (museum: CsvImportMuseumLookupRow) =>
          (!city || normalizeMuseumLookupText(museum.location.city ?? "") === normalizeMuseumLookupText(city)) &&
          (!state || normalizeMuseumLookupText(museum.location.state ?? "") === normalizeMuseumLookupText(state))
      ) ??
      nameMatches[0] ??
      null;

    if (existingMuseum) {
      return {
        museumId: existingMuseum._id,
        museumName,
        wasCreated: false,
        museum: {
          status: "skipped",
          message: "Existing museum found in database; skipped row.",
          imagesImportedCount: 0,
        },
        exhibitions: {
          status: "skipped",
          message: "Skipped because museum already exists.",
          createdCount: 0,
          skippedCount: 0,
          parsedCount: 0,
        },
      };
    }

    const museumId: Id<"museums"> =
      ((await ctx.runMutation((api as any).admin.createMuseumForAdmin, {
        name: museumName,
      })) as Id<"museums">);

    const museumResult: {
      status: "updated" | "skipped" | "failed";
      message?: string;
      imagesImportedCount: number;
      sourceUrl?: string;
      needsWebsiteForFallback?: boolean;
    } = {
      status: "skipped",
      imagesImportedCount: 0,
    };

    try {
      const details = (await ctx.runQuery(api.museums.getMuseumDetailsForDashboard, {
        id: museumId,
      })) as (Doc<"museums"> & {
        point: { latitude: number; longitude: number } | null;
        accessibilityFeatures?: string[];
      }) | null;
      if (!details) throw new Error("Museum not found after create/find");

      const prefillResult = (await ctx.runAction(api.museumsAutoFill.prefillMuseumDetailsWithFirecrawl, {
        museumId,
        museumName,
        ...(city ? { city } : {}),
        ...(state ? { state } : {}),
        ...(country ? { country } : {}),
      })) as CsvImportPrefillResult;

      const latitude = parseCsvImportCoordinate(prefillResult.prefill.latitude) ?? details.point?.latitude;
      const longitude = parseCsvImportCoordinate(prefillResult.prefill.longitude) ?? details.point?.longitude;
      if (latitude === undefined || longitude === undefined) {
        throw new Error("Museum details scrape did not return coordinates.");
      }

      await ctx.runMutation((api as any).admin.updateMuseumForAdmin, {
        museumId,
        point: { latitude, longitude },
        name: optionalTrimmed(prefillResult.prefill.name) ?? details.name,
        description: optionalTrimmed(prefillResult.prefill.description),
        tagline: optionalTrimmed(prefillResult.prefill.tagline),
        publicEmail: optionalTrimmed(prefillResult.prefill.publicEmail),
        timezone: optionalTrimmed(prefillResult.prefill.timezone),
        primaryLanguage: details.primaryLanguage,
        category: normalizeCsvImportCategory(prefillResult.prefill.category || details.category),
        location: {
          address: optionalTrimmed(prefillResult.prefill.address) ?? details.location.address,
          city: optionalTrimmed(prefillResult.prefill.city) ?? city ?? details.location.city,
          state: optionalTrimmed(prefillResult.prefill.state) ?? state ?? details.location.state,
          country: optionalTrimmed(prefillResult.prefill.country) ?? country ?? details.location.country,
          postalCode: optionalTrimmed(prefillResult.prefill.postalCode) ?? details.location.postalCode,
        },
        imageUrl: optionalTrimmed(prefillResult.prefill.imageUrl) ?? details.imageUrl,
        website: optionalTrimmed(prefillResult.prefill.website) ?? details.website,
        phone: optionalTrimmed(prefillResult.prefill.phone) ?? details.phone,
        operatingHours: prefillResult.operatingHours ?? details.operatingHours,
        accessibilityFeatures: prefillResult.accessibilityFeatures ?? details.accessibilityFeatures,
        accessibilityNotes: optionalTrimmed(prefillResult.prefill.accessibilityNotes) ?? details.accessibilityNotes,
      });

      const existingImages = (await ctx.runQuery(api.museums.listMuseumImagesForDashboard, {
        museumId,
      })) as Array<{ imageUrl: string }>;
      const existingImageUrls = new Set(existingImages.map((image) => image.imageUrl));
      for (const imageUrl of prefillResult.imageUrls.slice(0, 5)) {
        if (existingImageUrls.has(imageUrl)) continue;
        await ctx.runMutation(api.museums.addMuseumImageForDashboard, {
          museumId,
          imageUrl,
        });
        existingImageUrls.add(imageUrl);
        museumResult.imagesImportedCount += 1;
      }

      museumResult.status = "updated";
      museumResult.sourceUrl = prefillResult.sourceUrl;
      museumResult.needsWebsiteForFallback = prefillResult.needsWebsiteForFallback;
    } catch (error) {
      museumResult.status = "failed";
      museumResult.message = toErrorMessage(error);
    }

    const exhibitionResult: {
      status: "imported" | "skipped" | "failed";
      message?: string;
      createdCount: number;
      skippedCount: number;
      parsedCount: number;
      sourceUrl?: string;
    } = {
      status: exhibitionPageUrl ? "skipped" : "skipped",
      createdCount: 0,
      skippedCount: 0,
      parsedCount: 0,
    };

    if (exhibitionPageUrl) {
      try {
        const result = (await ctx.runAction(api.exhibitionsAutoFill.prefillExhibitionsWithFirecrawl, {
          museumId,
          exhibitionsPageUrl: exhibitionPageUrl,
        })) as CsvImportExhibitionResult;
        exhibitionResult.status = result.createdCount > 0 ? "imported" : "skipped";
        exhibitionResult.createdCount = result.createdCount;
        exhibitionResult.skippedCount = result.skippedCount;
        exhibitionResult.parsedCount = result.parsedCount;
        exhibitionResult.sourceUrl = result.sourceUrl;
        if (result.createdCount <= 0) {
          exhibitionResult.message = result.parsedCount > 0 ? "No new exhibitions to import." : "No exhibitions found.";
        }
      } catch (error) {
        exhibitionResult.status = "failed";
        exhibitionResult.message = toErrorMessage(error);
      }
    } else {
      exhibitionResult.message = "No exhibition page URL provided.";
    }

    return {
      museumId,
      museumName,
      wasCreated: !existingMuseum,
      museum: museumResult,
      exhibitions: exhibitionResult,
    };
  },
});

/** Mutation: update a museum and refresh geospatial coordinates (admin). */
export const updateMuseumForAdmin = mutation({
  args: {
    museumId: v.id("museums"),
    point: museumPointValidator,
    name: v.string(),
    description: v.optional(v.string()),
    tagline: v.optional(v.string()),
    publicEmail: v.optional(v.string()),
    timezone: v.optional(v.string()),
    primaryLanguage: v.optional(v.string()),
    category: v.string(),
    location: museumLocationValidator,
    imageUrl: v.optional(v.string()),
    website: v.optional(v.string()),
    phone: v.optional(v.string()),
    operatingHours: v.optional(v.array(operatingHourValidator)),
    accessibilityFeatures: v.optional(v.array(v.string())),
    accessibilityNotes: v.optional(v.string()),
  },
  handler: async (ctx, { museumId, point, ...museum }) => {
    await requireAdmin(ctx);
    const existingMuseum = await ctx.db.get(museumId);
    if (!existingMuseum) throw new Error("Museum not found");

    await ctx.db.patch(museumId, {
      ...museum,
      latitude: point.latitude,
      longitude: point.longitude,
    });
    await geospatial.insert(ctx, museumId, point, { category: museum.category });
    return museumId;
  },
});

/** Mutation: delete a museum and related geospatial/dependent records (admin). */
export const deleteMuseumForAdmin = mutation({
  args: { museumId: v.id("museums") },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const existingMuseum = await ctx.db.get(args.museumId);
    if (!existingMuseum) throw new Error("Museum not found");

    const museumIdString = args.museumId as Id<"museums">;

    const museumCheckIns = await ctx.db
      .query("checkIns")
      .withIndex("by_content", (q) =>
        q.eq("contentType", "museum").eq("contentId", museumIdString)
      )
      .collect();
    for (const checkIn of museumCheckIns) {
      await ctx.db.delete(checkIn._id);
    }

    const follows = await ctx.db
      .query("userFollows")
      .withIndex("by_museum", (q) => q.eq("museumId", args.museumId))
      .collect();
    for (const follow of follows) {
      await ctx.db.delete(follow._id);
    }

    const organizationLinks = await ctx.db
      .query("organizationMuseumLinks")
      .withIndex("by_museum", (q) => q.eq("museumId", args.museumId))
      .collect();
    for (const link of organizationLinks) {
      await ctx.db.delete(link._id);
    }

    const museumImages = await ctx.db
      .query("museumImages")
      .withIndex("by_museum", (q) => q.eq("museumId", args.museumId))
      .collect();
    for (const image of museumImages) {
      if (image.storageId) {
        try {
          await ctx.storage.delete(image.storageId);
        } catch {
          // Continue cleanup if underlying storage object was already removed.
        }
      }
      await ctx.db.delete(image._id);
    }

    const googleReviews = await ctx.db
      .query("museumGoogleReviews")
      .withIndex("by_museum", (q) => q.eq("museumId", args.museumId))
      .collect();
    for (const review of googleReviews) {
      await ctx.db.delete(review._id);
    }

    const events = await ctx.db
      .query("events")
      .withIndex("by_museum", (q) => q.eq("museumId", args.museumId))
      .collect();
    for (const event of events) {
      const eventIdString = event._id as Id<"events">;

      const eventCheckIns = await ctx.db
        .query("checkIns")
        .withIndex("by_content", (q) =>
          q.eq("contentType", "event").eq("contentId", eventIdString)
        )
        .collect();
      for (const checkIn of eventCheckIns) {
        await ctx.db.delete(checkIn._id);
      }

      await geospatial.remove(ctx, event._id);
      await ctx.db.delete(event._id);
    }

    await geospatial.remove(ctx, args.museumId);
    await ctx.db.delete(args.museumId);
  },
});
