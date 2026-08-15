import { describe, expect, it } from "vitest";
import {
  validateDescription,
  validateFormFields,
  validateName,
} from "@/lib/workspace/validate";

describe("validateName", () => {
  it("chấp nhận tên hợp lệ", () => {
    expect(validateName("Toán học")).toBeNull();
    expect(validateName("  Vật lý  ")).toBeNull();
  });

  it("từ chối tên rỗng", () => {
    expect(validateName("")).not.toBeNull();
    expect(validateName("   ")).not.toBeNull();
  });

  it("từ chối tên quá dài", () => {
    expect(validateName("a".repeat(101))).not.toBeNull();
    expect(validateName("a".repeat(100))).toBeNull();
  });
});

describe("validateDescription", () => {
  it("chấp nhận mô tả rỗng hoặc hợp lệ", () => {
    expect(validateDescription("")).toBeNull();
    expect(validateDescription("Mô tả ngắn")).toBeNull();
    expect(validateDescription("a".repeat(500))).toBeNull();
  });

  it("từ chối mô tả quá dài", () => {
    expect(validateDescription("a".repeat(501))).not.toBeNull();
  });
});

describe("validateFormFields", () => {
  it("trả về rỗng khi hợp lệ", () => {
    expect(validateFormFields({ name: "Toán", description: "Mô tả" })).toEqual({});
  });

  it("gom lỗi name + description", () => {
    const errors = validateFormFields({
      name: "",
      description: "a".repeat(501),
    });
    expect(errors.name).toBeDefined();
    expect(errors.description).toBeDefined();
  });

  it("bỏ qua description khi không truyền", () => {
    const errors = validateFormFields({ name: "Toán" });
    expect(errors.description).toBeUndefined();
  });
});