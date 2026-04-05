export function Header() {
  return (
    <div className="px-4 pt-6 pb-4">
      <div className="flex items-center gap-3 mb-1">
        <div className="text-2xl font-bold tracking-tight">aman</div>
        <div className="px-2 py-0.5 rounded-full text-xs font-medium"
             style={{ background: "var(--tg-theme-button-color)", color: "var(--tg-theme-button-text-color)" }}>
          beta
        </div>
      </div>
      <p className="text-sm" style={{ color: "var(--tg-theme-hint-color)" }}>
        Your AI companion that remembers you
      </p>
    </div>
  );
}
