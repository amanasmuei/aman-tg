import { describe, it, expect } from "vitest";
import { filterMerchantsByQuery, type SearchableMerchant } from "./searchFilters";

const m = (over: Partial<SearchableMerchant> = {}): SearchableMerchant => ({
  id: "x",
  name: "Warung Kak Siti",
  description: "Home food",
  subcategory: "nasi",
  popular_items: [{ id: "i1", name: "Nasi Lemak", price: 6 }],
  ...over,
});

describe("filterMerchantsByQuery", () => {
  it("returns empty on empty query", () => {
    expect(filterMerchantsByQuery([m()], "")).toEqual([]);
  });

  it("matches name case-insensitively", () => {
    expect(filterMerchantsByQuery([m()], "kak").length).toBe(1);
  });

  it("matches popular items", () => {
    expect(filterMerchantsByQuery([m()], "nasi lemak").length).toBe(1);
  });

  it("does not match unrelated query", () => {
    expect(filterMerchantsByQuery([m()], "pizza")).toEqual([]);
  });
});
