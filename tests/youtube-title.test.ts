import { describe, expect, it } from "vitest";
import { buildYoutubeVideoTitle } from "@/lib/youtube/title";

describe("buildYoutubeVideoTitle", () => {
  it("định dạng [Tên | TBZ School | tên file]", () => {
    expect(
      buildYoutubeVideoTitle({
        fullName: "Nguyễn Văn A",
        originalFilename: "bai giang ham so.mp4",
      }),
    ).toBe("[Nguyễn Văn A | TBZ School | bai giang ham so.mp4]");
  });

  it("fallback tên file sang tên tài liệu khi thiếu original_filename", () => {
    expect(
      buildYoutubeVideoTitle({
        fullName: "A",
        originalFilename: "",
        fallbackTitle: "Hàm số",
      }),
    ).toBe("[A | TBZ School | Hàm số]");
  });

  it("dùng 'User' khi thiếu họ tên", () => {
    expect(
      buildYoutubeVideoTitle({
        fullName: "",
        originalFilename: "video.mp4",
      }),
    ).toBe("[User | TBZ School | video.mp4]");
  });

  it("dùng 'Video' khi thiếu mọi thông tin", () => {
    expect(buildYoutubeVideoTitle({})).toBe("[User | TBZ School | Video]");
  });

  it("cắt tối đa 100 ký tự", () => {
    const result = buildYoutubeVideoTitle({
      fullName: "Rất rất rất dài".repeat(5),
      originalFilename: "file thật sự rất rất rất dài.mp4",
    });
    expect(result.length).toBeLessThanOrEqual(100);
    expect(result.startsWith("[")).toBe(true);
  });
});
