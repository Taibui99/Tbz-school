import { describe, expect, it } from "vitest";
import {
  validateDescription,
  validateResourceForm,
  validateTags,
  validateTitle,
  validateUrl,
} from "@/lib/resource/validate";

describe("validateTitle", () => {
  it("accepts a valid title", () => {
    expect(validateTitle("Đề cương ôn tập HKI")).toBeNull();
  });

  it("rejects empty/whitespace title", () => {
    expect(validateTitle("")).toBe("Vui lòng nhập tiêu đề.");
    expect(validateTitle("   ")).toBe("Vui lòng nhập tiêu đề.");
  });

  it("rejects overlong title", () => {
    expect(validateTitle("a".repeat(201))).toBe(
      "Tiêu đề quá dài (tối đa 200 ký tự).",
    );
  });

  it("trims whitespace", () => {
    expect(validateTitle("  Bài 1  ")).toBeNull();
  });
});

describe("validateDescription", () => {
  it("accepts empty description", () => {
    expect(validateDescription("")).toBeNull();
  });

  it("rejects overlong description", () => {
    expect(validateDescription("a".repeat(1001))).toBe(
      "Mô tả quá dài (tối đa 1000 ký tự).",
    );
  });
});

describe("validateUrl", () => {
  it("accepts http and https urls", () => {
    expect(validateUrl("https://sachmem.vn/loai/giai-bai-tap")).toBeNull();
    expect(validateUrl("http://example.com/a?b=1")).toBeNull();
  });

  it("rejects empty url", () => {
    expect(validateUrl("")).toBe("Vui lòng nhập đường dẫn.");
  });

  it("rejects malformed url", () => {
    expect(validateUrl("không phải url")).toBe("Đường dẫn không hợp lệ.");
  });

  it("rejects non-http protocols", () => {
    expect(validateUrl("file:///etc/passwd")).toBe(
      "Đường dẫn phải bắt đầu bằng http:// hoặc https://.",
    );
    expect(validateUrl("javascript:alert(1)")).toBe(
      "Đường dẫn phải bắt đầu bằng http:// hoặc https://.",
    );
  });

  it("rejects overlong url", () => {
    expect(validateUrl(`https://x.com/${"a".repeat(2100)}`)).toBe(
      "Đường dẫn quá dài (tối đa 2048 ký tự).",
    );
  });
});

describe("validateTags", () => {
  it("accepts valid tag ids", () => {
    expect(validateTags(["a".repeat(36), "b".repeat(36)])).toBeNull();
  });

  it("rejects more than 12 unique tags", () => {
    const ids = Array.from({ length: 13 }, (_, i) => `id-${i}`);
    expect(validateTags(ids)).toBe("Mỗi tài liệu tối đa 12 thẻ.");
  });

  it("rejects empty tag ids", () => {
    expect(validateTags(["  "])).toBe("Thẻ không hợp lệ.");
  });

  it("rejects overlong tag ids", () => {
    expect(validateTags(["a".repeat(37)])).toBe("Thẻ không hợp lệ.");
  });
});

describe("validateResourceForm", () => {
  it("accepts a valid pdf resource", () => {
    const errors = validateResourceForm({
      title: "Bài 1",
      type: "pdf",
      visibility: "private",
    });
    expect(errors).toEqual({});
  });

  it("rejects missing title and invalid type", () => {
    const errors = validateResourceForm({
      title: "",
      type: "exe",
      visibility: "private",
    });
    expect(errors.title).toBe("Vui lòng nhập tiêu đề.");
    expect(errors.type).toBe("Loại tài liệu không hợp lệ.");
  });

  it("requires url for url type", () => {
    const errors = validateResourceForm({
      title: "Link",
      type: "url",
      visibility: "unlisted",
      url: "",
    });
    expect(errors.url).toBe("Vui lòng nhập đường dẫn.");
  });

  it("accepts url type with valid url", () => {
    const errors = validateResourceForm({
      title: "Link",
      type: "url",
      visibility: "unlisted",
      url: "https://example.com",
    });
    expect(errors).toEqual({});
  });
});