interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    user?: {
      id: number;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      is_premium?: boolean;
    };
    [key: string]: unknown;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
}

interface Window {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
}
