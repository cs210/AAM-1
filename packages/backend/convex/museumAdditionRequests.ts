import { ConvexError, v } from "convex/values";
import { action, internalMutation, internalQuery, mutation, query } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { internal } from "./_generated/api";
import { requireAdmin, requireAuthenticatedAction } from "./permissions";
import { sendEmail } from "./email";

const requestStatusValidator = v.union(
  v.literal("pending"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("duplicate"),
);

type MuseumAdditionRequestStatus = Doc<"museumAdditionRequests">["status"];

function normalizeMuseumName(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

function trimOptional(value?: string) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function adminRequestEmails() {
  return (process.env.ADMIN_MUSEUM_REQUEST_EMAILS ?? process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean);
}

function formatOptionalLine(label: string, value?: string) {
  if (!value) return "";
  return `<p><strong>${label}:</strong> ${escapeHtml(value)}</p>`;
}

async function notifyAdmins({
  request,
  requester,
}: {
  request: Doc<"museumAdditionRequests">;
  requester: { _id: string; name?: string | null; email?: string | null };
}) {
  const recipients = adminRequestEmails();
  if (recipients.length === 0) {
    console.warn(
      "[museumAdditionRequests] ADMIN_MUSEUM_REQUEST_EMAILS is not set; skipping admin email.",
    );
    return;
  }

  const requesterLabel =
    requester.email || requester.name
      ? `${requester.name ?? "Unknown"}${requester.email ? ` <${requester.email}>` : ""}`
      : requester._id;

  await sendEmail({
    to: recipients,
    subject: `Museum request: ${request.museumName}`,
    html: `
      <h2>New museum addition request</h2>
      <p><strong>Museum:</strong> ${escapeHtml(request.museumName)}</p>
      ${formatOptionalLine("City", request.city)}
      ${formatOptionalLine("State", request.state)}
      ${formatOptionalLine("Website", request.website)}
      ${formatOptionalLine("Note", request.note)}
      <p><strong>Requester:</strong> ${escapeHtml(requesterLabel)}</p>
      <p><strong>Request ID:</strong> ${request._id}</p>
    `,
    text: [
      "New museum addition request",
      `Museum: ${request.museumName}`,
      request.city ? `City: ${request.city}` : null,
      request.state ? `State: ${request.state}` : null,
      request.website ? `Website: ${request.website}` : null,
      request.note ? `Note: ${request.note}` : null,
      `Requester: ${requesterLabel}`,
      `Request ID: ${request._id}`,
    ]
      .filter((line): line is string => Boolean(line))
      .join("\n"),
    replyTo: requester.email ?? undefined,
  });
}

export const submitMuseumAdditionRequest = action({
  args: {
    museumName: v.string(),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    website: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = (await requireAuthenticatedAction(ctx)) as {
      _id: string;
      name?: string | null;
      email?: string | null;
    };
    const museumName = args.museumName.trim();
    if (museumName.length < 2) {
      throw new ConvexError({
        code: "INVALID_MUSEUM_NAME",
        message: "Museum name must be at least 2 characters.",
      });
    }

    const result = (await ctx.runMutation(
      (internal as any).museumAdditionRequests.insertMuseumAdditionRequest,
      {
        requesterUserId: user._id,
        museumName,
        normalizedMuseumName: normalizeMuseumName(museumName),
        city: trimOptional(args.city),
        state: trimOptional(args.state),
        website: trimOptional(args.website),
        note: trimOptional(args.note),
      },
    )) as { requestId: Id<"museumAdditionRequests">; created: boolean };

    const request = (await ctx.runQuery(
      (internal as any).museumAdditionRequests.getMuseumAdditionRequestById,
      { requestId: result.requestId },
    )) as Doc<"museumAdditionRequests"> | null;

    if (result.created && request) {
      await notifyAdmins({ request, requester: user });
    }

    return {
      requestId: result.requestId,
      status: result.created ? ("submitted" as const) : ("already_pending" as const),
    };
  },
});

export const getMyRequestForMuseum = query({
  args: {
    museumName: v.string(),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity?.subject) return null;

    const normalizedMuseumName = normalizeMuseumName(args.museumName);
    if (normalizedMuseumName.length < 2) return null;

    const requests = await ctx.db
      .query("museumAdditionRequests")
      .withIndex("by_requester_and_normalizedName", (q) =>
        q.eq("requesterUserId", identity.subject).eq("normalizedMuseumName", normalizedMuseumName),
      )
      .collect();

    const activeRequests = requests.filter((request) => request.status !== "rejected");
    if (activeRequests.length === 0) return null;
    return activeRequests.sort((a, b) => b.createdAt - a.createdAt)[0] ?? null;
  },
});

export const listMuseumAdditionRequestsForAdmin = query({
  args: {
    status: v.optional(requestStatusValidator),
  },
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const requests = args.status
      ? await ctx.db
          .query("museumAdditionRequests")
          .withIndex("by_status_createdAt", (q) => q.eq("status", args.status!))
          .collect()
      : await ctx.db.query("museumAdditionRequests").collect();
    return requests.sort((a, b) => b.createdAt - a.createdAt);
  },
});

export const updateMuseumAdditionRequestStatusForAdmin = mutation({
  args: {
    requestId: v.id("museumAdditionRequests"),
    status: requestStatusValidator,
    duplicateMuseumId: v.optional(v.id("museums")),
  },
  handler: async (ctx, args) => {
    const admin = await requireAdmin(ctx);
    const existing = await ctx.db.get(args.requestId);
    if (!existing) throw new Error("Museum addition request not found");
    if (args.status === "duplicate" && !args.duplicateMuseumId) {
      throw new Error("duplicateMuseumId is required for duplicate requests");
    }

    const patch: {
      status: MuseumAdditionRequestStatus;
      reviewedAt: number;
      reviewedBy: string;
      duplicateMuseumId?: Id<"museums">;
    } = {
      status: args.status,
      reviewedAt: Date.now(),
      reviewedBy: admin._id,
    };
    if (args.status === "duplicate") {
      patch.duplicateMuseumId = args.duplicateMuseumId;
    }

    await ctx.db.patch(args.requestId, patch);
  },
});

export const insertMuseumAdditionRequest = internalMutation({
  args: {
    requesterUserId: v.string(),
    museumName: v.string(),
    normalizedMuseumName: v.string(),
    city: v.optional(v.string()),
    state: v.optional(v.string()),
    website: v.optional(v.string()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingRequests = await ctx.db
      .query("museumAdditionRequests")
      .withIndex("by_requester_and_normalizedName", (q) =>
        q.eq("requesterUserId", args.requesterUserId).eq("normalizedMuseumName", args.normalizedMuseumName),
      )
      .collect();
    const existingPending = existingRequests.find((request) => request.status === "pending");
    if (existingPending) {
      return { requestId: existingPending._id, created: false };
    }

    const requestId = await ctx.db.insert("museumAdditionRequests", {
      ...args,
      status: "pending",
      createdAt: Date.now(),
    });
    return { requestId, created: true };
  },
});

export const getMuseumAdditionRequestById = internalQuery({
  args: {
    requestId: v.id("museumAdditionRequests"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.requestId);
  },
});
