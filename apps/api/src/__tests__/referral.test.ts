import { describe, it, expect } from "vitest";
import { computeReferralReward, REFERRAL_REWARD_DAYS } from "../db.js";

const REWARD_MS = REFERRAL_REWARD_DAYS * 24 * 60 * 60 * 1000;
const NOW = 1_800_000_000_000; // fixed clock — 2027-01-15ish

describe("computeReferralReward", () => {
  describe("free users", () => {
    it("upgrades a free user to pro for REFERRAL_REWARD_DAYS days from now", () => {
      const reward = computeReferralReward({ plan: "free", plan_expires_at: null }, NOW);
      expect(reward).toEqual({ plan: "pro", plan_expires_at: NOW + REWARD_MS });
    });

    it("ignores plan_expires_at on free users (it should always be null anyway)", () => {
      // Even if somehow a free user has a stale expiry, treat them as free
      const reward = computeReferralReward(
        { plan: "free", plan_expires_at: NOW - 1000 },
        NOW,
      );
      expect(reward).toEqual({ plan: "pro", plan_expires_at: NOW + REWARD_MS });
    });
  });

  describe("expiring pro users", () => {
    it("stacks the reward on top of a future expiry", () => {
      const future = NOW + 10 * 24 * 60 * 60 * 1000; // 10 days from now
      const reward = computeReferralReward(
        { plan: "pro", plan_expires_at: future },
        NOW,
      );
      expect(reward).toEqual({ plan: "pro", plan_expires_at: future + REWARD_MS });
    });

    it("starts from now if the expiry has already lapsed (not from the past)", () => {
      // This shouldn't happen in practice — lazy downgrade runs on usage
      // check — but guard against crediting into the past anyway.
      const past = NOW - 5 * 24 * 60 * 60 * 1000;
      const reward = computeReferralReward(
        { plan: "pro", plan_expires_at: past },
        NOW,
      );
      expect(reward).toEqual({ plan: "pro", plan_expires_at: NOW + REWARD_MS });
    });

    it("treats an expiry exactly at now as expired (baselines to now)", () => {
      const reward = computeReferralReward(
        { plan: "pro", plan_expires_at: NOW },
        NOW,
      );
      // max(NOW, NOW) + REWARD_MS = NOW + REWARD_MS — same result either way
      expect(reward).toEqual({ plan: "pro", plan_expires_at: NOW + REWARD_MS });
    });

    it("preserves the plan as 'pro' (does not downgrade)", () => {
      const future = NOW + 1000;
      const reward = computeReferralReward(
        { plan: "pro", plan_expires_at: future },
        NOW,
      );
      expect(reward?.plan).toBe("pro");
    });
  });

  describe("permanent pro users (null expiry)", () => {
    it("returns null — they already have pro forever, nothing to extend", () => {
      const reward = computeReferralReward(
        { plan: "pro", plan_expires_at: null },
        NOW,
      );
      expect(reward).toBeNull();
    });
  });

  describe("team users", () => {
    it("returns null regardless of expiry (separate business logic)", () => {
      expect(
        computeReferralReward({ plan: "team", plan_expires_at: null }, NOW),
      ).toBeNull();
      expect(
        computeReferralReward(
          { plan: "team", plan_expires_at: NOW + 10000 },
          NOW,
        ),
      ).toBeNull();
    });
  });

  describe("unknown plans", () => {
    it("returns null for unrecognised plan strings", () => {
      const reward = computeReferralReward(
        { plan: "enterprise", plan_expires_at: null },
        NOW,
      );
      expect(reward).toBeNull();
    });
  });

  describe("clock injection", () => {
    it("respects the 'now' argument for deterministic testing", () => {
      const fixedNow = 1_234_567_890_000;
      const reward = computeReferralReward(
        { plan: "free", plan_expires_at: null },
        fixedNow,
      );
      expect(reward?.plan_expires_at).toBe(fixedNow + REWARD_MS);
    });

    it("defaults to Date.now() when no clock is provided", () => {
      const before = Date.now();
      const reward = computeReferralReward({ plan: "free", plan_expires_at: null });
      const after = Date.now();
      expect(reward).not.toBeNull();
      expect(reward!.plan_expires_at).toBeGreaterThanOrEqual(before + REWARD_MS);
      expect(reward!.plan_expires_at).toBeLessThanOrEqual(after + REWARD_MS);
    });
  });
});
