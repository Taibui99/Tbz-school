import { describe, expect, it } from "vitest";
import { shouldDeleteObject } from "@/lib/resource/trash";

describe("shouldDeleteObject", () => {
  it("deletes when no other resource or file references the object", () => {
    expect(shouldDeleteObject(0, 0)).toBe(true);
  });

  it("keeps the object when another resource still references it", () => {
    expect(shouldDeleteObject(1, 0)).toBe(false);
  });

  it("keeps the object when another resource file references it", () => {
    expect(shouldDeleteObject(0, 1)).toBe(false);
  });

  it("keeps the object when both kinds of references exist", () => {
    expect(shouldDeleteObject(2, 3)).toBe(false);
  });

  it("handles negative counts defensively as no references", () => {
    expect(shouldDeleteObject(-1, -1)).toBe(true);
  });
});