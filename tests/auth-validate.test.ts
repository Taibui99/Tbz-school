import { describe, expect, it } from "vitest";
import {
  MIN_PASSWORD_LENGTH,
  validateCredentials,
  validateEmail,
  validateFullName,
  validatePassword,
} from "@/lib/auth/validate";

describe("validateEmail", () => {
  it("chấp nhận email hợp lệ", () => {
    expect(validateEmail("hocsinh@example.com")).toBeNull();
    expect(validateEmail("  hocsinh@example.com  ")).toBeNull();
  });

  it("từ chối email rỗng", () => {
    expect(validateEmail("")).not.toBeNull();
    expect(validateEmail("   ")).not.toBeNull();
  });

  it("từ chối email sai định dạng", () => {
    expect(validateEmail("abc")).not.toBeNull();
    expect(validateEmail("abc@")).not.toBeNull();
    expect(validateEmail("@example.com")).not.toBeNull();
    expect(validateEmail("abc@example")).not.toBeNull();
  });
});

describe("validatePassword", () => {
  it("chấp nhận mật khẩu đủ dài", () => {
    expect(validatePassword("a".repeat(MIN_PASSWORD_LENGTH))).toBeNull();
  });

  it("từ chối mật khẩu rỗng", () => {
    expect(validatePassword("")).not.toBeNull();
  });

  it("từ chối mật khẩu quá ngắn", () => {
    expect(validatePassword("abc")).not.toBeNull();
    expect(validatePassword("a".repeat(MIN_PASSWORD_LENGTH - 1))).not.toBeNull();
  });
});

describe("validateFullName", () => {
  it("chấp nhận họ tên hợp lệ", () => {
    expect(validateFullName("Nguyễn Văn A")).toBeNull();
  });

  it("từ chối họ tên rỗng", () => {
    expect(validateFullName("")).not.toBeNull();
    expect(validateFullName("   ")).not.toBeNull();
  });

  it("từ chối họ tên quá dài", () => {
    expect(validateFullName("a".repeat(101))).not.toBeNull();
  });
});

describe("validateCredentials", () => {
  it("trả về rỗng khi tất cả hợp lệ", () => {
    expect(
      validateCredentials({
        email: "hocsinh@example.com",
        password: "matkhau123",
        fullName: "Nguyễn Văn A",
      }),
    ).toEqual({});
  });

  it("gom lỗi nhiều trường", () => {
    const errors = validateCredentials({
      email: "sai-dinh-dang",
      password: "123",
      fullName: "",
    });
    expect(errors.email).toBeDefined();
    expect(errors.password).toBeDefined();
    expect(errors.fullName).toBeDefined();
  });

  it("bỏ qua fullName khi không truyền", () => {
    const errors = validateCredentials({
      email: "hocsinh@example.com",
      password: "matkhau123",
    });
    expect(errors.fullName).toBeUndefined();
  });
});