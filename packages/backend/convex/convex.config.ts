import { defineApp } from "convex/server";
import betterAuth from "./betterAuth/convex.config.js";
// @ts-ignore - Convex component config; package may not ship type declarations for this path
import geospatial from "@convex-dev/geospatial/convex.config.js";

const app = defineApp();
app.use(betterAuth);
app.use(geospatial);

export default app;
