type ImpactStyle = "light" | "medium" | "heavy" | "rigid" | "soft";

interface HapticFeedback {
  impactOccurred(style: ImpactStyle): void;
  selectionChanged(): void;
}

function getHaptics(): HapticFeedback | undefined {
  return (window.Telegram?.WebApp as unknown as { HapticFeedback?: HapticFeedback })
    ?.HapticFeedback;
}

export function tap(style: ImpactStyle = "light"): void {
  const hf = getHaptics();
  if (!hf) return;
  try {
    hf.impactOccurred(style);
  } catch {
    // Haptics unavailable on desktop / web fallback
  }
}

export function selectionChange(): void {
  const hf = getHaptics();
  if (!hf) return;
  try {
    hf.selectionChanged();
  } catch {
    // Haptics unavailable on desktop / web fallback
  }
}
