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
      state: v.optional(v.string())
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
      state: v.optional(v.string())
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

  // Better Auth tables (user, session, account, etc.) are managed
  // by the @convex-dev/better-auth component automatically.
});
