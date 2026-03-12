/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as auth from "../auth.js";
import type * as checkIns from "../checkIns.js";
import type * as email from "../email.js";
import type * as events from "../events.js";
import type * as exhibitions from "../exhibitions.js";
import type * as exhibitionsAutoFill from "../exhibitionsAutoFill.js";
import type * as fakeData from "../fakeData.js";
import type * as follows from "../follows.js";
import type * as http from "../http.js";
import type * as museums from "../museums.js";
import type * as museumsAutoFill from "../museumsAutoFill.js";
import type * as organizationRequests from "../organizationRequests.js";
import type * as recsys from "../recsys.js";
import type * as userInterests from "../userInterests.js";
import type * as userProfiles from "../userProfiles.js";
import type * as wrapped from "../wrapped.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  auth: typeof auth;
  checkIns: typeof checkIns;
  email: typeof email;
  events: typeof events;
  exhibitions: typeof exhibitions;
  exhibitionsAutoFill: typeof exhibitionsAutoFill;
  fakeData: typeof fakeData;
  follows: typeof follows;
  http: typeof http;
  museums: typeof museums;
  museumsAutoFill: typeof museumsAutoFill;
  organizationRequests: typeof organizationRequests;
  recsys: typeof recsys;
  userInterests: typeof userInterests;
  userProfiles: typeof userProfiles;
  wrapped: typeof wrapped;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  betterAuth: import("../betterAuth/_generated/component.js").ComponentApi<"betterAuth">;
  geospatial: import("@convex-dev/geospatial/_generated/component.js").ComponentApi<"geospatial">;
};
