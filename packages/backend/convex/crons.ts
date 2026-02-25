import { cronJobs } from "convex/server";

const crons = cronJobs();

crons.interval("sync museum sources", { hours: 6 }, "sync.syncAllSources", {});

export default crons;
