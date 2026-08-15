import { describe, expect, it } from "vitest";
import { cn } from "@/lib/utils";

describe("cn", () => {
  it("ghép các class hợp lệ", () => {
    expect(cn("a", "b")).toBe("a b");
  });

  it("lọc giá trị falsy", () => {
    expect(cn("a", false, undefined, null, "b")).toBe("a b");
  });

  it("giải quyết xung đột class tailwind", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });
});