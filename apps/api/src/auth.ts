import { createHmac } from "node:crypto";

/**
 * Validate Telegram Mini App initData.
 * See: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateInitData(initData: string, botToken: string): { valid: boolean; user?: TelegramUser } {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return { valid: false };

  params.delete("hash");
  const entries = Array.from(params.entries());
  entries.sort(([a], [b]) => a.localeCompare(b));
  const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

  if (computedHash !== hash) return { valid: false };

  // Parse user
  const userStr = params.get("user");
  if (!userStr) return { valid: true };

  try {
    const userData = JSON.parse(userStr);
    return {
      valid: true,
      user: {
        id: userData.id,
        firstName: userData.first_name,
        lastName: userData.last_name,
        username: userData.username,
        languageCode: userData.language_code,
        isPremium: userData.is_premium,
      },
    };
  } catch {
    return { valid: true };
  }
}

interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium?: boolean;
}
