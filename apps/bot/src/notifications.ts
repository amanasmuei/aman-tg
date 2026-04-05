import type { Bot } from "grammy";

const GREETINGS = [
  "Assalamualaikum! 🌅 How can I help you today?",
  "Good morning! 🌞 Your AI companion is ready. What shall we work on?",
  "Hey there! 👋 Got anything on your mind today?",
  "Salam! 🤖 Ready to assist you. Just open the app!",
  "Hi! ✨ Your agents are standing by. What do you need help with?",
];

const TIPS = [
  "💡 Tip: Try the Quran Companion for daily tadarus guidance!",
  "💡 Tip: Use Code Buddy to debug faster — just paste your error!",
  "💡 Tip: Daily Planner can help you organize your week. Try it!",
  "💡 Tip: Invite a friend and both get 3 days Pro free! 🎁",
  "💡 Tip: You can attach images — the AI can analyze screenshots!",
  "💡 Tip: Chef Aman knows authentic Malaysian & Indonesian recipes! 👨‍🍳",
  "💡 Tip: Try Study Mate for exam prep — it uses the Socratic method! 📚",
];

function randomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Send daily engagement notifications to active users.
 * Call this from a setInterval in the bot.
 */
export async function sendDailyNotifications(
  bot: Bot,
  apiUrl: string,
): Promise<void> {
  try {
    // Get all users from API
    const res = await fetch(`${apiUrl}/api/admin/users`);
    if (!res.ok) return;

    const data = await res.json() as {
      users: Array<{ telegramId: number; name: string; totalMessages: number }>;
    };

    const hour = new Date().getHours();
    const isEvening = hour >= 18 && hour <= 21;

    for (const user of data.users) {
      // Only notify users who have actually used the app (>2 messages)
      if (!user.totalMessages || user.totalMessages < 3) continue;

      try {
        const greeting = randomItem(GREETINGS);
        const tip = randomItem(TIPS);

        // Send a friendly, non-spammy message
        if (isEvening) {
          await bot.api.sendMessage(
            user.telegramId,
            `${greeting}\n\n${tip}`,
          );
        }
      } catch {
        // User may have blocked the bot — ignore
      }

      // Small delay to avoid rate limits
      await new Promise((r) => setTimeout(r, 200));
    }
  } catch {
    // Silent failure — notifications are non-critical
  }
}
