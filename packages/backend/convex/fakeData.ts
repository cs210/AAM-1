import { mutation } from "./_generated/server";
import { authComponent } from "./auth";
import type { MutationCtx } from "./_generated/server";

async function requireAdmin(ctx: MutationCtx) {
  const user = await authComponent.safeGetAuthUser(ctx);
  if (!user) throw new Error("Not authenticated");
  if ((user as { role?: string | null }).role !== "admin") {
    throw new Error("Admin access required");
  }
}

// Populate fake museums into Convex database
export const populateFakeMuseums = mutation({
  args: {},
  handler: async (ctx) => {
    await requireAdmin(ctx);
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
      // Science
      {
        name: "Exploratorium",
        description: "A hands-on science museum exploring the world through science, art, and human perception.",
        category: "science",
        location: { address: "Pier 15", city: "San Francisco", state: "CA" },
        website: "https://www.exploratorium.edu",
      },
      {
        name: "Museum of Science and Industry",
        description: "One of the largest science museums in the world, with exhibits on technology, industry, and natural phenomena.",
        category: "science",
        location: { address: "5700 S DuSable Lake Shore Dr", city: "Chicago", state: "IL" },
        website: "https://www.msichicago.org",
      },
      {
        name: "California Science Center",
        description: "Hands-on science museum featuring the Space Shuttle Endeavour and interactive exhibits.",
        category: "science",
        location: { address: "700 Exposition Park Dr", city: "Los Angeles", state: "CA" },
        website: "https://californiasciencecenter.org",
      },
      // History
      {
        name: "National Museum of American History",
        description: "Smithsonian museum dedicated to the social, political, and cultural history of the United States.",
        category: "history",
        location: { address: "1400 Constitution Ave NW", city: "Washington", state: "DC" },
        website: "https://americanhistory.si.edu",
      },
      {
        name: "The National WWII Museum",
        description: "Comprehensive museum telling the story of the American experience in World War II.",
        category: "history",
        location: { address: "945 Magazine St", city: "New Orleans", state: "LA" },
        website: "https://www.nationalww2museum.org",
      },
      {
        name: "Museum of the American Revolution",
        description: "Explores the story of the American Revolution and its ongoing relevance.",
        category: "history",
        location: { address: "101 S 3rd St", city: "Philadelphia", state: "PA" },
        website: "https://www.amrevmuseum.org",
      },
      {
        name: "National Constitution Center",
        description: "Museum dedicated to the U.S. Constitution and the story of we the people.",
        category: "history",
        location: { address: "525 Arch St", city: "Philadelphia", state: "PA" },
        website: "https://constitutioncenter.org",
      },
      // Contemporary
      {
        name: "The Museum of Modern Art",
        description: "Leading museum of modern and contemporary art, from the late 19th century to the present.",
        category: "contemporary",
        location: { address: "11 W 53rd St", city: "New York", state: "NY" },
        website: "https://www.moma.org",
      },
      {
        name: "Institute of Contemporary Art",
        description: "Museum presenting contemporary art and culture through exhibitions and programs.",
        category: "contemporary",
        location: { address: "25 Harbor Shore Dr", city: "Boston", state: "MA" },
        website: "https://www.icaboston.org",
      },
      {
        name: "Contemporary Arts Museum Houston",
        description: "Museum dedicated to presenting the art of our time to the public.",
        category: "contemporary",
        location: { address: "5216 Montrose Blvd", city: "Houston", state: "TX" },
        website: "https://camh.org",
      },
      {
        name: "Walker Art Center",
        description: "Multidisciplinary contemporary art center with visual arts, performance, and film.",
        category: "contemporary",
        location: { address: "725 Vineland Pl", city: "Minneapolis", state: "MN" },
        website: "https://walkerart.org",
      },
      // Culture
      {
        name: "National Museum of the American Indian",
        description: "Smithsonian museum dedicated to the culture and history of Native peoples of the Americas.",
        category: "culture",
        location: { address: "4th St & Independence Ave SW", city: "Washington", state: "DC" },
        website: "https://americanindian.si.edu",
      },
      {
        name: "Japanese American National Museum",
        description: "Museum dedicated to preserving and sharing the history and culture of Japanese Americans.",
        category: "culture",
        location: { address: "100 N Central Ave", city: "Los Angeles", state: "CA" },
        website: "https://www.janm.org",
      },
      {
        name: "National Museum of African American History and Culture",
        description: "Smithsonian museum documenting African American life, history, and culture.",
        category: "culture",
        location: { address: "1400 Constitution Ave NW", city: "Washington", state: "DC" },
        website: "https://nmaahc.si.edu",
      },
      {
        name: "Museum of Latin American Art",
        description: "Museum dedicated to modern and contemporary Latin American and Latino art.",
        category: "culture",
        location: { address: "628 Alamitos Ave", city: "Long Beach", state: "CA" },
        website: "https://molaa.org",
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
    await requireAdmin(ctx);
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
    await requireAdmin(ctx);
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
            imageIds: [],
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
