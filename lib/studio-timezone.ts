/** Default studio IANA zone (Atlantic); override with `STUDIO_TIME_ZONE`. */
export const DEFAULT_STUDIO_TIME_ZONE = "America/Halifax";

export function getStudioTimeZone(): string {
  return process.env.STUDIO_TIME_ZONE ?? DEFAULT_STUDIO_TIME_ZONE;
}
