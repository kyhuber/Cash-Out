import { describe, expect, it } from "vitest";
import {
  OTP_MAX_LENGTH,
  OTP_MIN_LENGTH,
  isValidOtp,
  normalizeOtp,
} from "./auth";

describe("isValidOtp", () => {
  it("accepts every length Supabase can be configured to send", () => {
    for (let n = OTP_MIN_LENGTH; n <= OTP_MAX_LENGTH; n++) {
      expect(isValidOtp("1".repeat(n)), `${n} digits`).toBe(true);
    }
  });

  it("accepts the 8-digit default some projects get", () => {
    expect(isValidOtp("12345678")).toBe(true);
  });

  it("rejects codes outside the supported range", () => {
    expect(isValidOtp("12345")).toBe(false);
    expect(isValidOtp("12345678901")).toBe(false);
    expect(isValidOtp("")).toBe(false);
  });

  it("rejects anything that isn't digits", () => {
    expect(isValidOtp("12345a")).toBe(false);
    expect(isValidOtp("abcdef")).toBe(false);
    expect(isValidOtp("123-456")).toBe(false);
  });

  it("tolerates spaces, since codes get pasted and dictated", () => {
    expect(isValidOtp("123 456")).toBe(true);
    expect(isValidOtp(" 1234 5678 ")).toBe(true);
    expect(normalizeOtp(" 1234 5678 ")).toBe("12345678");
  });
});
