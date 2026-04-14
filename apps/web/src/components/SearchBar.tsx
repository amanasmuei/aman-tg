import { useState } from "react";
import { Search, CloseIcon } from "../lib/icons";

interface Props {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}

/**
 * Single-line search input with a Lucide icon and a clear button.
 * Gets a warm terra focus halo when the input is focused.
 */
export function SearchBar({ value, onChange, placeholder }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <div className="px-4 mb-3">
      <div
        className="flex items-center gap-2 rounded-full px-4 py-2.5 transition-all duration-200"
        style={{
          background: "var(--ink-2)",
          border: `1px solid ${focused ? "var(--terra)" : "var(--rule)"}`,
          boxShadow: focused
            ? "0 0 0 4px color-mix(in srgb, var(--terra) 15%, transparent)"
            : "none",
        }}
      >
        <Search
          size={16}
          strokeWidth={2}
          style={{ color: focused ? "var(--terra)" : "var(--paper-3)" }}
          className="flex-shrink-0 transition-colors"
        />
        <input
          type="text"
          inputMode="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          className="flex-1 bg-transparent outline-none text-sm"
          style={{
            color: "var(--paper)",
            caretColor: "var(--terra)",
          }}
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center transition-transform active:scale-90"
            style={{ background: "var(--ink-3)" }}
            aria-label="Clear"
          >
            <CloseIcon size={12} style={{ color: "var(--paper-2)" }} />
          </button>
        )}
      </div>
    </div>
  );
}
