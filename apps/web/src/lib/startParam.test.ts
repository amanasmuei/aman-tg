import { describe, it, expect } from "vitest";
import { parseStartParam } from "./startParam";

describe("parseStartParam", () => {
  it("returns null for empty / missing input", () => {
    expect(parseStartParam("")).toBeNull();
    expect(parseStartParam(undefined)).toBeNull();
  });

  it("parses agent_<id>", () => {
    expect(parseStartParam("agent_coding")).toEqual({
      kind: "agent",
      id: "coding",
    });
  });

  it("parses kedai_<id>", () => {
    expect(parseStartParam("kedai_warung-siti")).toEqual({
      kind: "kedai",
      id: "warung-siti",
    });
  });

  it("ignores ref_* (handled server-side for attribution)", () => {
    expect(parseStartParam("ref_123456")).toEqual({ kind: "ref" });
  });

  it("returns null for unknown prefixes", () => {
    expect(parseStartParam("garbage")).toBeNull();
    expect(parseStartParam("foo_bar")).toBeNull();
  });

  it("rejects empty payload after prefix", () => {
    expect(parseStartParam("agent_")).toBeNull();
    expect(parseStartParam("kedai_")).toBeNull();
  });

  it("is case-sensitive on prefix (matches Telegram's casing)", () => {
    expect(parseStartParam("Agent_coding")).toBeNull();
  });
});
