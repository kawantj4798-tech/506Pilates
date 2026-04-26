/** Default studio IANA zone (New York); override with `STUDIO_TIME_ZONE`. */
export const DEFAULT_STUDIO_TIME_ZONE = "America/New_York";

export function getStudioTimeZone(): string {
  return process.env.STUDIO_TIME_ZONE ?? DEFAULT_STUDIO_TIME_ZONE;
}
