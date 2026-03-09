import { mutation } from "./_generated/server";

// Populate fake museums into Convex database
export const populateFakeMuseums = mutation({
  args: {},
  handler: async (ctx) => {
    const museums = [
      {
        name: "The Metropolitan Museum of Art",
        description: "One of the world's largest and finest art museums, featuring over 5,000 years of art from around the world.",
        category: "art",
        location: { address: "1000 Fifth Avenue", city: "New York", state: "NY" },
        website: "https://www.metmuseum.org",
      },
      {
        name: "Los Angeles County Museum of Art",
        description: "The largest art museum in the western United States, with a collection spanning 6,000 years of history.",
        category: "art",
        location: { address: "5905 Wilshire Blvd", city: "Los Angeles", state: "CA" },
        website: "https://www.lacma.org",
      },
      {
        name: "Field Museum of Natural History",
        description: "A natural history museum featuring anthropology, botany, geology, paleontology, and zoology.",
        category: "science",
        location: { address: "1400 S DuSable Lake Shore Dr", city: "Chicago", state: "IL" },
        website: "https://www.fieldmuseum.org",
      },
      {
        name: "Houston Museum of Fine Arts",
        description: "One of the largest art museums in the United States with an encyclopedic collection.",
        category: "art",
        location: { address: "1001 Bissonnet St", city: "Houston", state: "TX" },
        website: "https://www.mfah.org",
      },
      {
        name: "Phoenix Art Museum",
        description: "The largest art museum in the southwestern United States featuring American, Asian, European, and Latin American art.",
        category: "art",
        location: { address: "1625 N Central Ave", city: "Phoenix", state: "AZ" },
        website: "https://phxart.org",
      },
      {
        name: "Philadelphia Museum of Art",
        description: "A world-renowned art museum with collections spanning 2,000 years and featuring 240,000+ objects.",
        category: "art",
        location: { address: "2600 Benjamin Franklin Pkwy", city: "Philadelphia", state: "PA" },
        website: "https://philamuseum.org",
      },
      {
        name: "San Antonio Museum of Art",
        description: "A comprehensive art museum with notable collections of Latin American, Asian, and ancient art.",
        category: "art",
        location: { address: "200 W Jones Ave", city: "San Antonio", state: "TX" },
        website: "https://www.samuseum.org",
      },
      {
        name: "San Diego Museum of Art",
        description: "The region's oldest and largest art museum with a world-class collection of Spanish and Italian Old Masters.",
        category: "art",
        location: { address: "1450 El Prado", city: "San Diego", state: "CA" },
        website: "https://www.sdmart.org",
      },
    ];

    const insertedIds = [];
    for (const museum of museums) {
      // Check if museum already exists by name
      const existing = await ctx.db
        .query("museums")
        .filter((q) => q.eq(q.field("name"), museum.name))
        .first();

      if (!existing) {
        const id = await ctx.db.insert("museums", museum);
        insertedIds.push(id);
      }
    }

    return { inserted: insertedIds.length, total: museums.length };
  },
});

// Populate fake events for museums
export const populateFakeEvents = mutation({
  args: {},
  handler: async (ctx) => {
    const museums = await ctx.db.query("museums").collect();
    if (museums.length === 0) {
      return { error: "No museums found. Run populateFakeMuseums first." };
    }

    const eventTemplates = [
      { title: "New Exhibition Opening", category: "exhibition", daysFromNow: 7 },
      { title: "Guided Tour: Highlights", category: "tour", daysFromNow: 3 },
    ];

    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;
    let insertedCount = 0;

    for (const museum of museums.slice(0, eventTemplates.length)) {
      // Add events to museums (one per template)
      for (const template of eventTemplates) {
        const startDate = now + template.daysFromNow * DAY_MS;
        // Check for existing event with same museum, title, and startDate
        const existing = await ctx.db
          .query("events")
          .withIndex("by_museum", (q) => q.eq("museumId", museum._id))
          .filter((q) =>
            q.and(
              q.eq(q.field("title"), `${template.title} at ${museum.name}`),
              q.eq(q.field("startDate"), startDate)
            )
          )
          .first();
        if (!existing) {
          await ctx.db.insert("events", {
            title: `${template.title} at ${museum.name}`,
            description: `Join us for this special ${template.category} event.`,
            category: template.category,
            museumId: museum._id,
            startDate,
            endDate: now + (template.daysFromNow + 1) * DAY_MS,
          });
          insertedCount++;
        }
      }
    }

    return { inserted: insertedCount };
  },
});

// Populate fake ratings for museums
export const populateFakeRatings = mutation({
  args: {},
  handler: async (ctx) => {
    const museums = await ctx.db.query("museums").collect();
    if (museums.length === 0) {
      return { error: "No museums found. Run populateFakeMuseums first." };
    }

    // Use fake user IDs to simulate different users rating museums
    const fakeUserIds = [
      "fake_user_1",
      "fake_user_2", 
      "fake_user_3",
      "fake_user_4",
      "fake_user_5",
    ];

    const now = Date.now();
    let insertedCount = 0;

    for (const museum of museums) {
      // Each museum gets 2-5 random ratings
      const numRatings = 2 + Math.floor(Math.random() * 4);
      const usersToRate = fakeUserIds.slice(0, numRatings);

      for (const userId of usersToRate) {
        // Check if rating already exists
        const existing = await ctx.db
          .query("checkIns")
          .withIndex("by_user_and_content", (q) =>
            q.eq("userId", userId).eq("contentType", "museum").eq("contentId", museum._id)
          )
          .first();

        if (!existing) {
          // Random rating between 3.0 and 5.0 (museums tend to be rated well)
          const rating = 3 + Math.floor(Math.random() * 3);
          
          await ctx.db.insert("checkIns", {
            userId,
            contentType: "museum",
            contentId: museum._id,
            rating,
            imageUrls: [],
            friendUserIds: [],
            createdAt: now,
          });
          insertedCount++;
        }
      }
    }

    return { inserted: insertedCount };
  },
});
