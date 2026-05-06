import type { usePostHog } from 'posthog-react-native';

type PostHogClient = NonNullable<ReturnType<typeof usePostHog>>;
type CaptureProps = NonNullable<Parameters<PostHogClient['capture']>[1]>;

/**
 * Thin wrapper around PostHog capture for consistent no-op when the client is unavailable.
 */
export function captureMobile(
  client: PostHogClient | null | undefined,
  event: string,
  properties?: CaptureProps
): void {
  if (!client) return;
  const cleaned =
    properties &&
    (Object.fromEntries(
      Object.entries(properties).filter(([, value]) => value !== undefined)
    ) as CaptureProps);
  if (cleaned && Object.keys(cleaned).length > 0) {
    client.capture(event, cleaned);
  } else {
    client.capture(event);
  }
}
