const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");

const config = getDefaultConfig(__dirname);
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, "../..");
const reactPath = path.resolve(monorepoRoot, "node_modules/react");
const reactDomPath = path.resolve(monorepoRoot, "node_modules/react-dom");

// Apply Uniwind first
let finalConfig = withUniwindConfig(config, {
  cssEntryFile: "./global.css",
  dtsFile: "./uniwind-types.d.ts",
});

// Force a single React instance after Uniwind so web doesn't hit "Cannot read properties of null (reading 'useRef')"
const baseResolveRequest = finalConfig.resolver.resolveRequest;
finalConfig = {
  ...finalConfig,
  resolver: {
    ...finalConfig.resolver,
    extraNodeModules: {
      ...finalConfig.resolver.extraNodeModules,
      react: reactPath,
      "react-dom": reactDomPath,
    },
    resolveRequest(context, moduleName, platform) {
      if (moduleName === "react" || moduleName.startsWith("react/")) {
        try {
          const filePath = require.resolve(moduleName, { paths: [monorepoRoot] });
          return { type: "sourceFile", filePath };
        } catch (_) { }
      }
      if (moduleName === "react-dom" || moduleName.startsWith("react-dom/")) {
        try {
          const filePath = require.resolve(moduleName, { paths: [monorepoRoot] });
          return { type: "sourceFile", filePath };
        } catch (_) { }
      }
      return baseResolveRequest(context, moduleName, platform);
    },
  },
};

module.exports = finalConfig;
