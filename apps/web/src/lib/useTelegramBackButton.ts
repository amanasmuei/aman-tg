import { useEffect } from "react";

/**
 * Shows Telegram's native BackButton while this hook is mounted and wires
 * taps to `onBack`. No-op outside the Telegram Mini App runtime.
 *
 * Intentionally doesn't hide the in-app back arrow — some users navigate
 * by the on-screen chrome, others use Telegram's. Both should work.
 */
export function useTelegramBackButton(onBack: () => void): void {
  useEffect(() => {
    const bb = window.Telegram?.WebApp?.BackButton;
    if (!bb) return;

    const handler = () => onBack();
    try {
      bb.onClick(handler);
      bb.show();
    } catch {
      // Older Telegram clients: BackButton may exist but throw. Fail silent.
      return;
    }

    return () => {
      try {
        bb.offClick(handler);
        bb.hide();
      } catch {
        /* ignore */
      }
    };
  }, [onBack]);
}
