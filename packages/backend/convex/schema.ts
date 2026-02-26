import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  museums: defineTable({
    name: v.string(),
    description: v.optional(v.string()),

    // Location (NOT geospatial)
    location: v.object({
      address: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
    }),

    // Category for recommendation
    category: v.string(), // e.g., "art", "history", "science", "contemporary"

    // Optional metadata
    imageUrl: v.optional(v.string()),
    website: v.optional(v.string()),
    phone: v.optional(v.string()),
  })
    .index("by_category", ["category"]),

  // Special Events
  events: defineTable({
    title: v.string(),
    description: v.optional(v.string()),

    // Location (use museum location or independent location)
    museumId: v.optional(v.id("museums")), // If at a museum
    location: v.optional(v.object({
      address: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
    })),

    // Category for recommendation
    category: v.string(), // e.g., "workshop", "exhibition", "performance", "family"

    // Event timing
    startDate: v.number(), // Timestamp
    endDate: v.number(), // Timestamp

    // Optional metadata
    imageUrl: v.optional(v.string()),
    registrationUrl: v.optional(v.string()),
  })
    .index("by_museum", ["museumId"])
    .index("by_category", ["category"])
    .index("by_dates", ["startDate", "endDate"]),

  // User Ratings (user-specific)
  userRatings: defineTable({
    userId: v.string(), // Better Auth user ID
    contentType: v.union(v.literal("museum"), v.literal("event")),
    contentId: v.string(), // Museum or event ID
    rating: v.number(), // 1-5 stars
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_content", ["contentType", "contentId"])
    .index("by_user_and_content", ["userId", "contentType", "contentId"]),

  // Organization access requests (museum workspace requests).
  // betterAuthOrgId = reference to Better Auth component organization (resolve via organizationRequests.resolveOrganization).
  organizationRequests: defineTable({
    userId: v.string(),
    museumName: v.string(),
    city: v.string(),
    state: v.string(),
    website: v.optional(v.string()),
    staffRole: v.optional(v.string()),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("rejected"),
    ),
    betterAuthOrgId: v.optional(v.string()), // BetterAuthOrgId — resolve via organizationRequests.resolveOrganization
    createdAt: v.number(),
    reviewedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_status", ["status"])
    .index("by_betterAuthOrgId", ["betterAuthOrgId"]),

  // User Following (tracks which museums a user follows)
  userFollows: defineTable({
    userId: v.string(), // Better Auth user ID
    museumId: v.id("museums"),
    followedAt: v.number(), // Timestamp
  })
    .index("by_user", ["userId"])
    .index("by_museum", ["museumId"])
    .index("by_user_and_museum", ["userId", "museumId"]),
  // Better Auth tables (user, session, account, etc.) are managed
  // by the @convex-dev/better-auth component automatically.
});
