export interface SearchableMerchant {
  id: string;
  name: string;
  description: string;
  subcategory: string;
  popular_items: { id: string; name: string; price: number }[];
}

/**
 * Case-insensitive substring match against the merchant's name, description,
 * subcategory, and popular item names. Empty queries return [] so callers
 * can treat "no query" as "don't render shop results" without a separate check.
 */
export function filterMerchantsByQuery<T extends SearchableMerchant>(
  items: T[],
  query: string,
): T[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return items.filter((m) => {
    const hay = [
      m.name,
      m.description,
      m.subcategory,
      ...m.popular_items.map((i) => i.name),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  });
}
