import expoConfig from "eslint-config-expo/flat.js";
import { base } from "./base.js";

/**
 * ESLint configuration for Expo/React Native applications.
 * Extends the base config with Expo specific rules.
 */
export const expo = [
  ...base,
  ...expoConfig,
  {
    ignores: ["dist/**", ".expo/**", "ios/**", "android/**"],
  },
];

export default expo;
