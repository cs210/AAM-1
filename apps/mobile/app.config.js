const appJson = require("./app.json");

/** @type {{ expo: import('@expo/config').ExpoConfig }} */
module.exports = {
  expo: {
    ...appJson.expo,
    plugins: [
      ...(appJson.expo.plugins ?? []),
      [
        "@sentry/react-native/expo",
        {
          url: "https://sentry.io/",
          organization: process.env.SENTRY_ORG ?? "museum-51",
          project: process.env.SENTRY_PROJECT ?? "museumand-mobile",
        },
      ],
    ],
  },
};
