import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
    // User-to-User Following
    userUserFollows: defineTable({
      followerId: v.string(), // Auth user ID of the follower
      followingId: v.string(), // Auth user ID of the user being followed
      followedAt: v.number(), // Timestamp
    })
      .index("by_follower", ["followerId"])
      .index("by_following", ["followingId"])
      .index("by_follower_and_following", ["followerId", "followingId"]),
  museums: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    tagline: v.optional(v.string()),
    publicEmail: v.optional(v.string()),
    timezone: v.optional(v.string()),
    primaryLanguage: v.optional(v.string()),

    // Location (NOT geospatial)
    location: v.object({
      address: v.optional(v.string()),
      city: v.optional(v.string()),
      state: v.optional(v.string()),
      country: v.optional(v.string()),
      postalCode: v.optional(v.string()),
    }),

    // Category for recommendation
    category: v.string(), // e.g., "art", "history", "science", "contemporary"

    // Optional metadata
    imageUrl: v.optional(v.string()),
    website: v.optional(v.string()),
    phone: v.optional(v.string()),
    operatingHours: v.optional(v.array(v.object({
      day: v.string(),
      isOpen: v.boolean(),
      openTime: v.string(),
      closeTime: v.string(),
    }))),
    accessibilityFeatures: v.optional(v.array(v.string())),
    accessibilityNotes: v.optional(v.string()),
  })
    .index("by_category", ["category"]),

  // Additional museum gallery images. Keep museums.imageUrl as denormalized
  // primary card image URL for fast list reads.
  museumImages: defineTable({
    museumId: v.id("museums"),
    imageUrl: v.string(),
    storageId: v.optional(v.id("_storage")),
    alt: v.optional(v.string()),
    sortOrder: v.number(),
    isPrimary: v.boolean(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_museum", ["museumId"])
    .index("by_museum_sortOrder", ["museumId", "sortOrder"])
    .index("by_museum_primary", ["museumId", "isPrimary"]),

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

  // One-to-one assignment between Better Auth organizations and museums.
  organizationMuseumLinks: defineTable({
    betterAuthOrgId: v.string(),
    museumId: v.id("museums"),
    assignedAt: v.number(),
    assignedBy: v.string(),
    updatedAt: v.number(),
  })
    .index("by_org", ["betterAuthOrgId"])
    .index("by_museum", ["museumId"]),

  visualSearchConfig: defineTable({
    endpointUrl: v.string(),
    updatedAt: v.number(),
    updatedBy: v.optional(v.string()),
  }),

  visualSearchMuseumAssignments: defineTable({
    museumId: v.id("museums"),
    museumSlug: v.string(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
    createdBy: v.optional(v.string()),
    updatedBy: v.optional(v.string()),
  })
    .index("by_museum", ["museumId"])
    .index("by_slug", ["museumSlug"])
    .index("by_active", ["isActive"]),

  // User Following (tracks which museums a user follows)
  userFollows: defineTable({
    userId: v.string(), // Better Auth user ID
    museumId: v.id("museums"),
    followedAt: v.number(), // Timestamp
  })
    .index("by_user", ["userId"])
    .index("by_museum", ["museumId"])
    .index("by_user_and_museum", ["userId", "museumId"]),

  // Public user profiles for search/following
  userProfiles: defineTable({
    userId: v.string(), // Better Auth user ID
    name: v.optional(v.string()),
    email: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    bannerUrl: v.optional(v.string()),
    museumData: v.optional(v.object({
      totalCheckIns: v.number(),
      totalMuseums: v.number(),
      checkIns: v.record(
        v.string(), // museumId as key
        v.array(v.id("checkIns")) // array of check-in IDs
      ),
    })),
    updatedAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_name", ["name"]),

  // Exhibitions and halls (dashboard-managed, per museum)
  exhibitions: defineTable({
    museumId: v.id("museums"),
    name: v.string(),
    description: v.optional(v.string()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    imageUrl: v.optional(v.string()),
    sortOrder: v.number(),
  })
    .index("by_museum", ["museumId"])
    .index("by_museum_sortOrder", ["museumId", "sortOrder"]),

  halls: defineTable({
    exhibitionId: v.id("exhibitions"),
    name: v.string(),
    description: v.optional(v.string()),
    sortOrder: v.number(),
  })
    .index("by_exhibition", ["exhibitionId"])
    .index("by_exhibition_sortOrder", ["exhibitionId", "sortOrder"]),

  exhibitInteractions: defineTable({
    hallId: v.id("halls"),
    type: v.union(
      v.literal("quiz"),
      v.literal("scavenger_step"),
      v.literal("badge"),
      v.literal("info_audio")
    ),
    title: v.string(),
    config: v.any(), // type-specific: quiz → { question, options, correctIndex }, etc.
    sortOrder: v.number(),
  })
    .index("by_hall", ["hallId"])
    .index("by_hall_sortOrder", ["hallId", "sortOrder"]),

  // Check-ins (museum or event)
  checkIns: defineTable({
    userId: v.string(), // Better Auth user ID
    contentType: v.union(v.literal("museum"), v.literal("event")), // Type of check-in
    contentId: v.union(v.id("museums"), v.id("events")), // Id of museum or event
    rating: v.optional(v.number()), // 1-5 stars
    review: v.optional(v.string()),
    imageIds: v.optional(v.array(v.id("_storage"))), // optional for legacy check-ins created before imageIds existed
    friendUserIds: v.array(v.string()),
    durationHours: v.optional(v.number()), // broad visit-length bucket in hours
    visitDate: v.optional(v.number()), // timestamp of visit (optional for events)
    createdAt: v.number(), // timestamp of check-in creation
    editedAt: v.optional(v.number()), // set when user edits rating/review
  })
    .index("by_user", ["userId"])
    .index("by_content", ["contentType", "contentId"])
    .index("by_user_and_content", ["userId", "contentType", "contentId"])
    .index("by_user_and_date", ["userId", "visitDate"]),

  // Per-user museum interest survey responses
  userInterests: defineTable({
    accountId: v.string(), // Better Auth account/user ID
    userInfo: v.record(
      v.string(), // question id
      v.union(v.string(), v.number()), // answer (choice/text or scale)
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_accountId", ["accountId"]),

  // Better Auth tables (user, session, account, etc.) are managed
  // by the @convex-dev/better-auth component automatically.
});
