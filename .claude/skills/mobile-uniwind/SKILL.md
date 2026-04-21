---
name: mobile-uniwind
description: >-
  Styling conventions for the Expo app in apps/mobile—Uniwind (Tailwind) className,
  shared UI components, rn-api-colors for icon APIs, and avoiding StyleSheet for
  new UI. Use when building or refactoring mobile screens, components, or layout.
license: MIT
metadata:
  author: AAM-1
  version: '1.0.0'
---

# Mobile: Uniwind and UI primitives

## Scope

Applies to **`apps/mobile`** (Expo Router, React Native).

## Rules

1. **No new `StyleSheet.create` for product UI**  
   Prefer **`className`** (Uniwind) on native components. Use **`cn()`** from `@/lib/utils` for conditional classes. Remove dead `const styles = StyleSheet.create(...)` after migrating call sites.

2. **Reuse `@/components/ui`**  
   Use `Text`, `Button`, `BrandActivityIndicator`, and other primitives from `components/ui` instead of duplicating RN defaults.

3. **Colors for non-styled APIs**  
   Icons (e.g. Lucide) and some native props need hex strings. Use **`@/constants/rn-api-colors`** so palette stays aligned with Tailwind semantic tokens.

4. **Scroll lists**  
   Use **`contentContainerStyle`** when you need predictable padding or `flexGrow` on scroll content; do not assume `contentContainerClassName` behaves the same everywhere.

5. **When `style` is still OK**  
   `Animated` values, `Dimensions`, libraries that only accept `style`, or one-off layout that is clearer as an object—keep those as inline `style`, not `StyleSheet`.

## Anti-patterns

- Adding a new screen with `StyleSheet.create` and RN `Text`/`ActivityIndicator` instead of Uniwind + `components/ui`.
- Hard-coded hex in many places when `rn-api-colors` already exposes the token.
