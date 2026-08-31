/**
 * Supabase's email OTP length is a per-project setting, configurable from 6 to
 * 10 digits, and the default differs depending on when the project was created.
 * Hardcoding a length here would break against any project configured
 * differently — including a friend running their own copy.
 */
export const OTP_MIN_LENGTH = 6;
export const OTP_MAX_LENGTH = 10;

/** Strips spaces so a pasted or dictated code still validates. */
export function normalizeOtp(raw: string): string {
  return raw.replace(/\s+/g, "");
}

export function isValidOtp(raw: string): boolean {
  const code = normalizeOtp(raw);
  return new RegExp(`^\\d{${OTP_MIN_LENGTH},${OTP_MAX_LENGTH}}$`).test(code);
}
