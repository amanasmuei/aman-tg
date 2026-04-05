export interface TelegramUser {
  id: number;
  firstName: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
  isPremium?: boolean;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  agentId: string;
}

export interface UserPreferences {
  telegramId: number;
  selectedAgentId: string;
  plan: "free" | "pro" | "team";
  messagesUsed: number;
  messagesLimit: number;
  createdAt: number;
}

export interface Conversation {
  id: string;
  telegramId: number;
  agentId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export interface ConversationWithMessages extends Conversation {
  messages: ChatMessage[];
}

export interface UsageLimits {
  messagesUsed: number;
  messagesLimit: number;
  plan: "free" | "pro" | "team";
  resetsAt: number;
}
