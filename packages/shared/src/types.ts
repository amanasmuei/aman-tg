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

export interface AgentSession {
  id: string;
  telegramId: number;
  agentId: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}
