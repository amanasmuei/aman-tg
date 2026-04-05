import "dotenv/config";
import { Bot, InlineKeyboard, webhookCallback } from "grammy";
import { AGENTS } from "@aman-tg/shared";

const token = process.env.BOT_TOKEN;
if (!token) {
  console.error("BOT_TOKEN is required. Get one from @BotFather");
  process.exit(1);
}

const miniAppUrl = process.env.MINI_APP_URL || "https://aman-tg.vercel.app";
const apiUrl = process.env.API_URL || "http://localhost:3000";

async function chatWithAgent(
  agentId: string,
  message: string,
  telegramId: number,
  firstName: string,
  lastName?: string,
  username?: string,
): Promise<string> {
  try {
    const res = await fetch(`${apiUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agentId, message, telegramId, firstName, lastName, username }),
    });

    if (res.status === 429) {
      const data = await res.json() as { limit: number };
      return `You've reached the daily limit of ${data.limit} messages. Upgrade to Pro for unlimited access!`;
    }

    if (!res.ok) {
      return "Sorry, something went wrong. Please try again.";
    }

    // Read streaming response as full text
    const text = await res.text();
    return text || "I couldn't generate a response. Please try again.";
  } catch {
    return "Sorry, I'm having trouble connecting. Please try again later.";
  }
}

const bot = new Bot(token);

// /start — welcome message with Mini App button
bot.command("start", async (ctx) => {
  const user = ctx.from;
  const name = user?.first_name || "there";

  const keyboard = new InlineKeyboard()
    .webApp("Open aman", miniAppUrl)
    .row()
    .text("Browse Agents", "browse_agents");

  await ctx.reply(
    `Assalamualaikum ${name}! \u{1F44B}\n\n` +
    `Welcome to *aman* \u2014 your AI companion that remembers you.\n\n` +
    `\u{1F916} *8 AI agents* ready to help:\n` +
    `\u{1F4BB} Code Buddy \u2014 coding assistant\n` +
    `\u{1F4CB} Daily Planner \u2014 organize your day\n` +
    `\u{1F4DA} Study Mate \u2014 learning companion\n` +
    `\u2728 Creative Spark \u2014 brainstorm partner\n` +
    `\u{1F4BC} Biz Helper \u2014 business assistant\n` +
    `...and more!\n\n` +
    `Tap *Open aman* to get started, or type a message to chat with the default agent.`,
    {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    }
  );
});

// Browse agents callback
bot.callbackQuery("browse_agents", async (ctx) => {
  await ctx.answerCallbackQuery();

  const agentList = AGENTS
    .filter((a) => !a.premium)
    .map((a) => `${a.icon} *${a.name}* \u2014 ${a.description}`)
    .join("\n");

  const premiumList = AGENTS
    .filter((a) => a.premium)
    .map((a) => `${a.icon} *${a.name}* \u2B50 \u2014 ${a.description}`)
    .join("\n");

  const keyboard = new InlineKeyboard().webApp("Open Full Catalog", miniAppUrl);

  await ctx.reply(
    `\u{1F916} *Available Agents*\n\n` +
    `*Free*\n${agentList}\n\n` +
    `*Premium* \u2B50\n${premiumList}\n\n` +
    `Open the mini app for the full experience:`,
    {
      parse_mode: "Markdown",
      reply_markup: keyboard,
    }
  );
});

// Agent selection callbacks
for (const agent of AGENTS) {
  bot.callbackQuery(`select_${agent.id}`, async (ctx) => {
    await ctx.answerCallbackQuery();
    await ctx.reply(
      `${agent.icon} Switched to *${agent.name}*\n\n` +
      `_${agent.description}_\n\n` +
      `Send me a message to start chatting! Your conversations are saved.`,
      { parse_mode: "Markdown" }
    );
  });
}

// Handle text messages — chat with selected agent via API
bot.on("message:text", async (ctx) => {
  const userMessage = ctx.message.text;
  const user = ctx.from;
  if (!user) return;

  // Default agent — could look up user's preference from API later
  const agentId = "coding";

  await ctx.replyWithChatAction("typing");

  const response = await chatWithAgent(
    agentId,
    userMessage,
    user.id,
    user.first_name,
    user.last_name,
    user.username,
  );

  // Split long messages (Telegram limit: 4096 chars)
  if (response.length > 4000) {
    const chunks = response.match(/[\s\S]{1,4000}/g) || [response];
    for (const chunk of chunks) {
      await ctx.reply(chunk);
    }
  } else {
    await ctx.reply(response);
  }
});

// Stars payment handling
bot.on("pre_checkout_query", async (ctx) => {
  await ctx.answerPreCheckoutQuery(true);
});

bot.on("message:successful_payment", async (ctx) => {
  const payment = ctx.message.successful_payment;
  await ctx.reply(
    `\u{1F389} Payment successful! Thank you for upgrading to Pro.\n\n` +
    `You now have unlimited access to all agents and memory features.`
  );
});

// /help command
bot.command("help", async (ctx) => {
  await ctx.reply(
    `*aman \u2014 AI Companion*\n\n` +
    `Commands:\n` +
    `/start \u2014 Welcome & launch mini app\n` +
    `/agents \u2014 Browse available agents\n` +
    `/help \u2014 Show this help\n\n` +
    `Or just type a message to chat with your selected agent!`,
    { parse_mode: "Markdown" }
  );
});

// /agents command
bot.command("agents", async (ctx) => {
  const keyboard = new InlineKeyboard();
  for (const agent of AGENTS) {
    keyboard.text(`${agent.icon} ${agent.name}`, `select_${agent.id}`).row();
  }
  await ctx.reply("Choose an agent:", { reply_markup: keyboard });
});

// Error handling
bot.catch((err) => {
  console.error("Bot error:", err);
});

// Start
console.log("Starting aman bot...");
bot.start({
  onStart: (info) => {
    console.log(`Bot @${info.username} is running!`);
  },
});
