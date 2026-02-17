# YAMI

Welcome to the main repository for the Youth Art Museum Initiative! For more information, visit our [wiki](https://github.com/cs210/AAM-1/wiki).

## Basics

Our main application is built with Next.js, Expo, and Convex. We use Turbo to manage the monorepo and pnpm to manage the dependencies.

```
pnpm install
pnpm dev
```

## Envrionment Variables

Please set the following environment variables in your environment. You can do this by creating a `.env.local` file in each of the apps and packages.

### Web

```bash
CONVEX_DEPLOYMENT=dev:wooden-hummingbird-900 # team: yami, project: yami

NEXT_PUBLIC_CONVEX_URL=https://wooden-hummingbird-900.convex.cloud

NEXT_PUBLIC_CONVEX_SITE_URL=https://wooden-hummingbird-900.convex.site
```

### Mobile

```bash
CONVEX_DEPLOYMENT=dev:wooden-hummingbird-900 # team: yami, project: yami

EXPO_PUBLIC_CONVEX_URL=https://wooden-hummingbird-900.convex.cloud
```

### Backend

```bash
CONVEX_DEPLOYMENT=dev:wooden-hummingbird-900 # team: yami, project: yami

CONVEX_URL=https://wooden-hummingbird-900.convex.cloud
CONVEX_SITE_URL=https://wooden-hummingbird-900.convex.site
```

Add the secret key and site URL to the backend environment variables.

```bash
npx convex env set BETTER_AUTH_SECRET=$(openssl rand -base64 32)
npx convex env set SITE_URL http://localhost:3000
```

This secret does not live on your machine, it is managed by Convex.
