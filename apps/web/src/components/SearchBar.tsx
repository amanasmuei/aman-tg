import { Search, CloseIcon } from "../lib/icons";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}

/**
 * Single-line search input with a Lucide icon and a clear button.
 * Controlled component — parent owns the string.
 */
export function SearchBar({ value, onChange, placeholder }: Props) {
  return (
    <div className="px-4 mb-3">
      <div
        className="flex items-center gap-2 rounded-2xl px-3 py-2.5 transition-colors"
        style={{ background: "var(--tg-theme-secondary-bg-color)" }}
      >
        <Search
          size={18}
          style={{ color: "var(--tg-theme-hint-color)" }}
          className="flex-shrink-0"
        />
        <input
          type="text"
          inputMode="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm placeholder:opacity-60"
          style={{ color: "var(--tg-theme-text-color)" }}
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-opacity active:opacity-60"
            style={{ background: "rgba(255,255,255,0.08)" }}
            aria-label="Clear"
          >
            <CloseIcon
              size={12}
              style={{ color: "var(--tg-theme-hint-color)" }}
            />
          </button>
        )}
      </div>
    </div>
  );
}
