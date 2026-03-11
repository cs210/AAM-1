import noHardcodedStrings from "eslint-plugin-no-hardcoded-strings";
import nextConfig from "@packages/eslint-config/next";

/** Warn when user-facing strings are not passed through next-intl t() */
const noHardcodedStringsConfig = {
  plugins: {
    "no-hardcoded-strings": noHardcodedStrings,
  },
  rules: {
    "no-hardcoded-strings/no-hardcoded-strings": [
      "warn",
      {
        allowedFunctionNames: ["t", "tCommon"],
        ignoreStrings: ["quote", "attribution", "title", "openQuote", " "],
        ignorePatterns: [
          /^[0-9\s\-:.,]+$/, // numbers, dates, times
          /^[A-Z_][A-Z0-9_]*$/, // constants / enum-like
          /^[a-z]+:[a-z]+$/, // protocol-style (e.g. yami://)
          /^\s+$/, // whitespace only
          /^[()·/×\s]$/, // single punctuation / typography / separators / single space
        ],
      },
    ],
  },
};

const config = [...nextConfig, noHardcodedStringsConfig];

export default config;
