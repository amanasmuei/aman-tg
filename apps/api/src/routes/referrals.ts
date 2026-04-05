import { Hono } from "hono";
import { processReferral, getReferralStats, getUser } from "../db.js";

const app = new Hono();

// POST /referrals — process a referral
app.post("/", async (c) => {
  const body = await c.req.json();
  const { referrerId, referredId } = body as {
    referrerId: number;
    referredId: number;
  };

  if (!referrerId || !referredId) {
    return c.json({ error: "referrerId and referredId required" }, 400);
  }

  const result = processReferral(referrerId, referredId);
  if (!result) {
    return c.json({ error: "Referral not applicable", reason: "Already referred or invalid" }, 400);
  }

  return c.json({
    ok: true,
    rewardDays: result.rewardDays,
    referrer: result.referrer.first_name,
    referred: result.referred.first_name,
  });
});

// GET /referrals/stats — get user's referral stats
app.get("/stats", (c) => {
  const telegramId = Number(c.req.query("telegramId"));
  if (!telegramId || isNaN(telegramId)) {
    return c.json({ error: "telegramId required" }, 400);
  }

  const stats = getReferralStats(telegramId);
  return c.json({
    referrals: stats.count,
    totalRewardDays: stats.totalRewardDays,
    link: `https://t.me/aman_agent_platform_bot?start=ref_${telegramId}`,
  });
});

export default app;
