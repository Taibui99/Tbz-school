import { describe, expect, it } from "vitest";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_USER_QUOTA_BYTES,
  computeQuotaAfter,
  extensionOf,
  isSupportedExtension,
  isUploadSessionStale,
  resourceTypeFromFileName,
  validateUploadFile,
} from "@/lib/upload/validate";

describe("extensionOf", () => {
  it("lấy phần mở rộng viết thường", () => {
    expect(extensionOf("De cuong.PDF")).toBe("pdf");
  });

  it("trả chuỗi rỗng khi không có mở rộng", () => {
    expect(extensionOf("khongduoi")).toBe("");
  });

  it("trả chuỗi rỗng khi kết thúc bằng dấu chấm", () => {
    expect(extensionOf("file.")).toBe("");
  });
});

describe("resourceTypeFromFileName", () => {
  it("ánh xạ pdf → pdf", () => {
    expect(resourceTypeFromFileName("a.pdf")).toBe("pdf");
  });

  it("ánh xạ jpg → image", () => {
    expect(resourceTypeFromFileName("anh.jpg")).toBe("image");
  });

  it("trả null cho loại không hỗ trợ", () => {
    expect(resourceTypeFromFileName("a.exe")).toBeNull();
  });
});

describe("isSupportedExtension", () => {
  it("chấp nhận .pdf", () => {
    expect(isSupportedExtension("pdf")).toBe(true);
  });

  it("chấp nhận .PDF (không phân biệt hoa thường)", () => {
    expect(isSupportedExtension("PDF")).toBe(true);
  });

  it("từ chối .exe", () => {
    expect(isSupportedExtension("exe")).toBe(false);
  });
});

describe("validateUploadFile", () => {
  it("hợp lệ với pdf nhỏ", () => {
    expect(
      validateUploadFile({ fileName: "de-cuong.pdf", sizeBytes: 1024 }),
    ).toEqual({});
  });

  it("báo thiếu tên tệp", () => {
    expect(validateUploadFile({ fileName: "", sizeBytes: 10 }).fileName).toContain(
      "chọn tệp",
    );
  });

  it("báo loại không hỗ trợ", () => {
    expect(validateUploadFile({ fileName: "virus.exe", sizeBytes: 10 }).fileName)
      .toContain("không hỗ trợ");
  });

  it("báo kích thước vượt giới hạn", () => {
    const errors = validateUploadFile({
      fileName: "big.pdf",
      sizeBytes: MAX_FILE_SIZE_BYTES + 1,
    });
    expect(errors.sizeBytes).toContain("quá lớn");
  });

  it("báo kích thước không hợp lệ (0)", () => {
    expect(validateUploadFile({ fileName: "a.pdf", sizeBytes: 0 }).sizeBytes)
      .toContain("không hợp lệ");
  });
});

describe("computeQuotaAfter", () => {
  it("cho phép khi trong hạn mức", () => {
    const result = computeQuotaAfter(10, 20, 100);
    expect(result.allowed).toBe(true);
    expect(result.usedAfter).toBe(30);
  });

  it("chặn khi vượt hạn mức", () => {
    const result = computeQuotaAfter(90, 20, 100);
    expect(result.allowed).toBe(false);
  });

  it("dùng quota mặc định 1 GB", () => {
    expect(computeQuotaAfter(0, MAX_USER_QUOTA_BYTES).allowed).toBe(true);
    expect(computeQuotaAfter(0, MAX_USER_QUOTA_BYTES + 1).allowed).toBe(false);
  });
});

describe("isUploadSessionStale", () => {
  const now = 1_700_000_000_000;

  it("trả true khi phiên quá hạn", () => {
    expect(isUploadSessionStale(new Date(now - 21 * 60 * 1000), now)).toBe(true);
  });

  it("trả false khi phiên còn hạn", () => {
    expect(isUploadSessionStale(new Date(now - 5 * 60 * 1000), now)).toBe(false);
  });

  it("nhận chuỗi ISO", () => {
    expect(isUploadSessionStale(new Date(now - 21 * 60 * 1000).toISOString(), now)).toBe(
      true,
    );
  });

  it("trả false khi ngày không hợp lệ", () => {
    expect(isUploadSessionStale("không-phải-ngày", now)).toBe(false);
  });
});