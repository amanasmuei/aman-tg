/**
 * Central icon mapping for the aman-tg mini app.
 *
 * One place to change the look of every icon in the app. All components
 * import from here instead of hardcoding emoji or importing Lucide
 * components scattered across files.
 *
 * Why Lucide instead of emoji: emojis render differently per platform
 * (Android vs iOS vs Telegram Desktop), can't be recoloured, and carry
 * a playful visual weight that reads as "toy" rather than "marketplace".
 */

import {
  // Navigation / chrome
  Search,
  MoreHorizontal,
  X as CloseIcon,
  ChevronRight,
  Clock,
  Star,
  Lock,
  MessageCircle,
  Gift,
  RotateCcw,
  // Top-level sections
  Store,
  Briefcase,
  // Merchant types
  House,
  UtensilsCrossed,
  Cookie,
  Soup,
  // Agent categories
  Code2,
  CalendarDays,
  GraduationCap,
  Sparkles,
  HeartPulse,
  Wallet,
  Languages,
  ChefHat,
  Plane,
  FileText,
  ListChecks,
  BookMarked,
  Users,
  type LucideIcon,
} from "lucide-react";

export type { LucideIcon } from "lucide-react";

// Re-export commonly-used chrome icons so components only need one import path
export {
  Search,
  MoreHorizontal,
  CloseIcon,
  ChevronRight,
  Clock,
  Star,
  Lock,
  MessageCircle,
  Gift,
  RotateCcw,
  Store,
  Briefcase,
  Users,
};

/**
 * Merchant icon resolver. Falls back to Store when nothing matches.
 * Keep this in sync with the subcategories used by apps/api seed data.
 */
export function getMerchantIcon(type: string, subcategory: string): LucideIcon {
  if (subcategory === "nasi_lemak" || subcategory === "nasi_campur") return Soup;
  if (subcategory === "kuih") return Cookie;
  if (type === "home_food") return House;
  if (type === "kedai_makan") return UtensilsCrossed;
  return Store;
}

/**
 * Agent icon resolver, keyed by agent.id.
 * Adding a new agent → add an entry here. Missing id → generic briefcase.
 */
export function getAgentIcon(agentId: string): LucideIcon {
  const map: Record<string, LucideIcon> = {
    coding: Code2,
    debug: Code2,
    daily: CalendarDays,
    todo: ListChecks,
    study: GraduationCap,
    bahasa: Languages,
    quran: BookMarked,
    creative: Sparkles,
    bizhelper: Briefcase,
    resume: FileText,
    fitness: HeartPulse,
    finance: Wallet,
    recipe: ChefHat,
    travel: Plane,
    jiran: Users,
  };
  return map[agentId] ?? Briefcase;
}

/**
 * Category icon resolver for the filter-chip row on the Pakar tab.
 */
export function getCategoryIcon(categoryId: string): LucideIcon | null {
  const map: Record<string, LucideIcon> = {
    coding: Code2,
    productivity: CalendarDays,
    business: Briefcase,
    education: GraduationCap,
    personal: HeartPulse,
    lifestyle: ChefHat,
    services: Users,
  };
  return map[categoryId] ?? null;
}

/**
 * Category accent colours — used for the coloured tile behind icons.
 * Deliberately muted; these are background tints not brand colours.
 */
export const CATEGORY_ACCENTS: Record<string, { bg: string; fg: string }> = {
  coding: { bg: "rgba(88,166,255,0.12)", fg: "#58a6ff" },
  productivity: { bg: "rgba(63,185,80,0.12)", fg: "#3fb950" },
  business: { bg: "rgba(210,168,255,0.12)", fg: "#d2a8ff" },
  education: { bg: "rgba(245,158,11,0.14)", fg: "#f59e0b" },
  personal: { bg: "rgba(248,81,73,0.12)", fg: "#f85149" },
  lifestyle: { bg: "rgba(255,123,114,0.12)", fg: "#ff7b72" },
  services: { bg: "rgba(45,212,191,0.14)", fg: "#2dd4bf" },
  // Merchant types get their own accents
  home_food: { bg: "rgba(245,158,11,0.14)", fg: "#f59e0b" },
  kedai_makan: { bg: "rgba(45,212,191,0.14)", fg: "#2dd4bf" },
};

export function getAccent(key: string): { bg: string; fg: string } {
  return CATEGORY_ACCENTS[key] ?? { bg: "var(--tg-theme-bg-color)", fg: "var(--tg-theme-text-color)" };
}
