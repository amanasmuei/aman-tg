interface TelegramBackButton {
  isVisible: boolean;
  show: () => void;
  hide: () => void;
  onClick: (cb: () => void) => void;
  offClick: (cb: () => void) => void;
}

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
    /** Set when the app is launched via `t.me/bot/app?startapp=<param>`. */
    start_param?: string;
    [key: string]: unknown;
  };
  ready: () => void;
  expand: () => void;
  close: () => void;
  BackButton?: TelegramBackButton;
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy") => void;
    notificationOccurred: (type: "error" | "success" | "warning") => void;
    selectionChanged: () => void;
  };
  /** Bot API 6.9+ — sets the Mini App header chrome colour. */
  setHeaderColor?: (color: "bg_color" | "secondary_bg_color" | `#${string}`) => void;
  /** Bot API 6.1+ — sets the Mini App background. */
  setBackgroundColor?: (color: "bg_color" | "secondary_bg_color" | `#${string}`) => void;
}

interface Window {
  Telegram?: {
    WebApp?: TelegramWebApp;
  };
}
