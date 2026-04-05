import "dotenv/config";
import { Bot, InlineKeyboard, Keyboard } from "grammy";
import { AGENTS } from "@aman-tg/shared";

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error("BOT_TOKEN is required. Get one from @BotFather");
  process.exit(1);
}

const miniAppUrl = process.env.MINI_APP_URL || "https://aman.kooleklabs.com";
const apiUrl = process.env.API_URL || "http://localhost:3000";

// Track selected agent per user (in-memory, resets on restart — DB is source of truth)
const userAgents = new Map<number, string>();

async function chatWithAgent(
  agentId: string,
  message: string,
  telegramId: number,
  firstName: string,
  lastName?: string,
  username?: string,
): Promise<string> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout
    const res = await fetch(`${apiUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, message, telegramId, firstName, lastName, username }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (res.status === 429) {
      const data = await res.json() as { limit: number };
      return `You've reached the daily limit of ${data.limit} messages.\n\nUpgrade to Pro for unlimited access! Use /pro to upgrade.`;
    }

    if (res.status === 403) {
      return `This is a Premium agent. Upgrade to Pro to unlock it!\n\nUse /pro to upgrade.`;
    }

    if (!res.ok) {
      return "Sorry, something went wrong. Please try again.";
    }

    const text = await res.text();
    return text || "I couldn't generate a response. Please try again.";
  } catch {
    return "Sorry, I'm having trouble connecting. Please try again later.";
  }
}

async function getUserPlan(telegramId: number): Promise<string> {
  try {
    const res = await fetch(`${apiUrl}/api/users/me?telegramId=${telegramId}`);
    if (res.ok) {
      const data = await res.json() as { plan: string };
      return data.plan || "free";
    }
  } catch {}
  return "free";
}

const bot = new Bot(token);

// ── Persistent reply keyboard (always visible at bottom) ──
const mainKeyboard = new Keyboard()
  .text("🤖 Switch Agent").text("⭐ Go Pro")
  .row()
  .webApp("📱 Open Mini App", miniAppUrl)
  .resized()    // fit to content
  .persistent(); // always visible

// ── Set bot commands menu on startup ──
bot.api.setMyCommands([
  { command: "start", description: "Start aman" },
  { command: "agent", description: "Switch AI agent" },
  { command: "pro", description: "Upgrade to Pro" },
  { command: "agents", description: "Browse all agents" },
  { command: "help", description: "Get help" },
]).catch(() => {});

// ── Set bot description + short_description ──
bot.api.setMyDescription(
  "Your AI companion with 13 specialized agents.\n\n" +
  "💻 Code Buddy  📋 Daily Planner  📚 Study Mate\n" +
  "✨ Creative Spark  💼 Biz Helper  🇲🇾 Cikgu Bahasa\n" +
  "👨‍🍳 Chef Aman  🕌 Quran Companion\n" +
  "🔍 Debug Pro ⭐  💪 Health Coach ⭐\n" +
  "💰 Finance Advisor ⭐  ✈️ Travel Buddy ⭐\n" +
  "📝 Resume Pro ⭐\n\n" +
  "Tap Start to begin! 🚀",
).catch(() => {});

bot.api.setMyShortDescription(
  "AI agent platform — coding, productivity, business, education. By Koolek Labs.",
).catch(() => {});

// /start
bot.command("start", async (ctx) => {
  const user = ctx.from;
  const name = user?.first_name || "there";

  // Check for deep link: /start agent_coding
  const payload = ctx.match;
  if (payload && payload.startsWith("agent_")) {
    const agentId = payload.replace("agent_", "");
    const agent = AGENTS.find((a) => a.id === agentId);
    if (agent && user) {
      userAgents.set(user.id, agentId);
      await ctx.reply(
        `${agent.icon} *${agent.name}* activated!\n\n_${agent.description}_\n\nSend me a message to start chatting.`,
        { parse_mode: "Markdown", reply_markup: mainKeyboard },
      );
      return;
    }
  }

  await ctx.reply(
    `Assalamualaikum ${name}! 👋\n\n` +
    `Welcome to *aman* — your AI companion with *13 agents*.\n\n` +
    `Tap *📱 Open Mini App* below to start chatting!\n\n` +
    `🤖 *Switch Agent* to pick your agent\n` +
    `⭐ *Go Pro* for unlimited messages + premium agents`,
    { parse_mode: "Markdown", reply_markup: mainKeyboard },
  );
});

// /pro — show upgrade options
bot.command("pro", async (ctx) => {
  const user = ctx.from;
  if (!user) return;

  const plan = await getUserPlan(user.id);
  if (plan === "pro") {
    await ctx.reply("✅ You're already on the *Pro* plan! Unlimited messages and all agents unlocked.", { parse_mode: "Markdown" });
    return;
  }

  const keyboard = new InlineKeyboard()
    .text("⭐ 100 Stars — 1 Month Pro", "buy_pro_100")
    .row()
    .text("⭐ 250 Stars — 3 Months Pro", "buy_pro_250");

  await ctx.reply(
    `⭐ *aman Pro*\n\n` +
    `Upgrade to unlock:\n` +
    `• Unlimited messages (no daily limit)\n` +
    `• Premium agents (Debug Pro, Health Coach, Finance Advisor)\n` +
    `• Priority response speed\n` +
    `• Conversation memory across sessions\n\n` +
    `Choose a plan:`,
    { parse_mode: "Markdown", reply_markup: keyboard },
  );
});

// Buy Pro callbacks
bot.callbackQuery("show_pro", async (ctx) => {
  await ctx.answerCallbackQuery();
  const user = ctx.from;

  const plan = await getUserPlan(user.id);
  if (plan === "pro") {
    await ctx.reply("✅ You're already on the *Pro* plan!", { parse_mode: "Markdown" });
    return;
  }

  const keyboard = new InlineKeyboard()
    .text("⭐ 100 Stars — 1 Month Pro", "buy_pro_100")
    .row()
    .text("⭐ 250 Stars — 3 Months Pro", "buy_pro_250");

  await ctx.reply(
    `⭐ *aman Pro*\n\n` +
    `• Unlimited messages\n` +
    `• Premium agents unlocked\n` +
    `• Priority speed\n\n` +
    `Choose a plan:`,
    { parse_mode: "Markdown", reply_markup: keyboard },
  );
});

bot.callbackQuery("buy_pro_100", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.replyWithInvoice(
    "aman Pro — 1 Month",
    "Unlimited messages, premium agents, priority speed for 30 days.",
    "pro_1month",
    "XTR",
    [{ label: "aman Pro (1 Month)", amount: 100 }],
  );
});

bot.callbackQuery("buy_pro_250", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.replyWithInvoice(
    "aman Pro — 3 Months",
    "Unlimited messages, premium agents, priority speed for 90 days.",
    "pro_3months",
    "XTR",
    [{ label: "aman Pro (3 Months)", amount: 250 }],
  );
});

// Payment handling
bot.on("pre_checkout_query", async (ctx) => {
  const payload = ctx.preCheckoutQuery.invoice_payload;
  const validPayloads = ["pro_1month", "pro_3months"];
  if (!validPayloads.includes(payload)) {
    await ctx.answerPreCheckoutQuery(false, { error_message: "Invalid purchase" });
    return;
  }
  await ctx.answerPreCheckoutQuery(true);
});

bot.on("message:successful_payment", async (ctx) => {
  const payment = ctx.message.successful_payment;
  const user = ctx.from;
  if (!user) return;

  try {
    await fetch(`${apiUrl}/api/users/me/agent`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ telegramId: user.id, plan: "pro" }),
    });
  } catch (err) {
    console.error("[PAYMENT] Failed to update user agent:", err);
  }

  try {
    const upgradeRes = await fetch(`${apiUrl}/api/users/upgrade`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegramId: user.id,
        plan: "pro",
        payload: payment.invoice_payload,
        chargeId: payment.telegram_payment_charge_id,
        totalAmount: payment.total_amount,
      }),
    });
    if (!upgradeRes.ok) {
      console.error("[PAYMENT] Upgrade API returned:", upgradeRes.status);
    }
  } catch (err) {
    console.error("[PAYMENT] Failed to call upgrade API:", err);
  }

  console.log(`[PAYMENT] Success: user=${user.id} charge=${payment.telegram_payment_charge_id} amount=${payment.total_amount}`);

  await ctx.reply(
    `🎉 *Welcome to aman Pro!*\n\n` +
    `✅ Unlimited messages — no daily limit\n` +
    `✅ Premium agents unlocked\n` +
    `✅ Priority response speed\n\n` +
    `Enjoy your Pro experience!`,
    { parse_mode: "Markdown" },
  );
});

// /agent — switch agent
bot.command("agent", async (ctx) => {
  const user = ctx.from;
  if (!user) return;

  const agentName = ctx.match?.trim().toLowerCase();

  if (!agentName) {
    // Show agent picker
    const current = userAgents.get(user.id) || "coding";
    const currentAgent = AGENTS.find((a) => a.id === current);

    const keyboard = new InlineKeyboard();
    for (const agent of AGENTS) {
      const label = agent.id === current
        ? `${agent.icon} ${agent.name} ✓`
        : `${agent.icon} ${agent.name}${agent.premium ? " ⭐" : ""}`;
      keyboard.text(label, `switch_${agent.id}`).row();
    }

    await ctx.reply(
      `Current agent: ${currentAgent?.icon} *${currentAgent?.name}*\n\nChoose a new agent:`,
      { parse_mode: "Markdown", reply_markup: keyboard },
    );
    return;
  }

  // Try to match by name or id
  const agent = AGENTS.find(
    (a) => a.id === agentName || a.name.toLowerCase().includes(agentName),
  );

  if (!agent) {
    await ctx.reply(`Agent "${agentName}" not found. Use /agent to see available agents.`);
    return;
  }

  userAgents.set(user.id, agent.id);
  await ctx.reply(
    `${agent.icon} Switched to *${agent.name}*!\n\n_${agent.description}_`,
    { parse_mode: "Markdown" },
  );
});

// Agent switch callbacks
for (const agent of AGENTS) {
  bot.callbackQuery(`switch_${agent.id}`, async (ctx) => {
    await ctx.answerCallbackQuery(`Switched to ${agent.name}`);
    const user = ctx.from;
    if (!user) return;
    userAgents.set(user.id, agent.id);
    await ctx.reply(
      `${agent.icon} Switched to *${agent.name}*!\n\n_${agent.description}_\n\nSend me a message to start chatting.`,
      { parse_mode: "Markdown" },
    );
  });

  // Keep old select_ callbacks working too
  bot.callbackQuery(`select_${agent.id}`, async (ctx) => {
    await ctx.answerCallbackQuery(`Switched to ${agent.name}`);
    const user = ctx.from;
    if (!user) return;
    userAgents.set(user.id, agent.id);
    await ctx.reply(
      `${agent.icon} Switched to *${agent.name}*!\n\nSend me a message to start chatting.`,
      { parse_mode: "Markdown" },
    );
  });
}

// Browse agents callback
bot.callbackQuery("browse_agents", async (ctx) => {
  await ctx.answerCallbackQuery();

  const agentList = AGENTS
    .filter((a) => !a.premium)
    .map((a) => `${a.icon} *${a.name}* — ${a.description}`)
    .join("\n");

  const premiumList = AGENTS
    .filter((a) => a.premium)
    .map((a) => `${a.icon} *${a.name}* ⭐ — ${a.description}`)
    .join("\n");

  const keyboard = new InlineKeyboard()
    .webApp("Open Full Catalog", miniAppUrl)
    .row()
    .text("Switch Agent", "switch_menu");

  await ctx.reply(
    `🤖 *Available Agents*\n\n` +
    `*Free*\n${agentList}\n\n` +
    `*Premium* ⭐ (requires Pro)\n${premiumList}\n\n` +
    `Use /agent <name> to switch, or open the mini app:`,
    { parse_mode: "Markdown", reply_markup: keyboard },
  );
});

bot.callbackQuery("switch_menu", async (ctx) => {
  await ctx.answerCallbackQuery();
  const keyboard = new InlineKeyboard();
  for (const agent of AGENTS) {
    keyboard.text(`${agent.icon} ${agent.name}${agent.premium ? " ⭐" : ""}`, `switch_${agent.id}`).row();
  }
  await ctx.reply("Choose an agent:", { reply_markup: keyboard });
});

// ── Handle persistent keyboard button taps ──
bot.hears("🤖 Switch Agent", async (ctx) => {
  const user = ctx.from;
  if (!user) return;
  const current = userAgents.get(user.id) || "coding";
  const currentAgent = AGENTS.find((a) => a.id === current);

  const keyboard = new InlineKeyboard();
  for (const agent of AGENTS) {
    const label = agent.id === current
      ? `${agent.icon} ${agent.name} ✓`
      : `${agent.icon} ${agent.name}${agent.premium ? " ⭐" : ""}`;
    keyboard.text(label, `switch_${agent.id}`).row();
  }

  await ctx.reply(
    `Current: ${currentAgent?.icon} *${currentAgent?.name}*\n\nChoose a new agent:`,
    { parse_mode: "Markdown", reply_markup: keyboard },
  );
});

bot.hears("⭐ Go Pro", async (ctx) => {
  const user = ctx.from;
  if (!user) return;

  const plan = await getUserPlan(user.id);
  if (plan === "pro") {
    await ctx.reply("✅ You're already on *Pro*! Unlimited messages and all agents unlocked.", { parse_mode: "Markdown" });
    return;
  }

  const keyboard = new InlineKeyboard()
    .text("⭐ 100 Stars — 1 Month", "buy_pro_100")
    .row()
    .text("⭐ 250 Stars — 3 Months", "buy_pro_250");

  await ctx.reply(
    `⭐ *aman Pro*\n\n` +
    `• Unlimited messages (no daily limit)\n` +
    `• Premium agents unlocked\n` +
    `• Priority response speed\n\n` +
    `Choose a plan:`,
    { parse_mode: "Markdown", reply_markup: keyboard },
  );
});

// Handle all messages (text, photos, files, voice, etc.) — redirect to Mini App
bot.on("message", async (ctx) => {
  // Only respond in private chats
  if (ctx.chat.type !== "private") return;

  const current = userAgents.get(ctx.from?.id ?? 0) || "coding";
  const agent = AGENTS.find((a) => a.id === current);

  const keyboard = new InlineKeyboard()
    .webApp(`${agent?.icon || "💬"} Chat with ${agent?.name || "aman"}`, miniAppUrl);

  await ctx.reply(
    `Open the Mini App to chat with *${agent?.name || "your agent"}*! 👇\n\n` +
    `The full experience — streaming responses, conversation history, and more — is in the app.`,
    { parse_mode: "Markdown", reply_markup: keyboard },
  );
});

// /help
bot.command("help", async (ctx) => {
  await ctx.reply(
    `*aman — AI Companion*\n\n` +
    `*Commands:*\n` +
    `/start — Welcome & launch mini app\n` +
    `/agent — Switch active agent\n` +
    `/agent <name> — Quick switch (e.g. /agent daily)\n` +
    `/pro — Upgrade to Pro (unlimited + premium agents)\n` +
    `/agents — Browse all agents\n` +
    `/help — Show this help\n\n` +
    `Or just type a message to chat with your active agent!`,
    { parse_mode: "Markdown" },
  );
});

// /agents
bot.command("agents", async (ctx) => {
  const keyboard = new InlineKeyboard();
  for (const agent of AGENTS) {
    keyboard.text(`${agent.icon} ${agent.name}${agent.premium ? " ⭐" : ""}`, `switch_${agent.id}`).row();
  }
  await ctx.reply("Choose an agent:", { reply_markup: keyboard });
});

// Error handling
bot.catch((err) => {
  console.error("Bot error:", err);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("SIGTERM received, shutting down...");
  bot.stop();
});
process.on("SIGINT", () => {
  console.log("SIGINT received, shutting down...");
  bot.stop();
});

// Start
console.log("Starting aman bot...");
bot.start({
  onStart: (info) => {
    console.log(`Bot @${info.username} is running!`);
  },
});
