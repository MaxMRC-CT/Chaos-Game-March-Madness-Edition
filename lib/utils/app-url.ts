/**
 * Returns the app's base URL for server-side fetches (e.g. internal API calls).
 * Never returns localhost in production — Vercel sets VERCEL_URL for preview/prod.
 */
export function getAppBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }
  return "http://127.0.0.1:3000";
}
