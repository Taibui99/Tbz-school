import { describe, expect, it } from "vitest";
import {
  resourceTypeFromFileName,
  titleFromFileName,
} from "@/lib/upload/validate";

describe("titleFromFileName", () => {
  it("strips the extension", () => {
    expect(titleFromFileName("bai giang chuong 1.pdf")).toBe(
      "bai giang chuong 1",
    );
  });

  it("trims and collapses whitespace", () => {
    expect(titleFromFileName("  tai   lieu  .docx")).toBe("tai lieu");
  });

  it("keeps names without extension", () => {
    expect(titleFromFileName("README")).toBe("README");
  });

  it("keeps dotfiles intact", () => {
    expect(titleFromFileName(".gitignore")).toBe(".gitignore");
  });

  it("falls back when only an extension is given", () => {
    expect(titleFromFileName("   .pdf")).toBe("Tài liệu không tên");
  });
});

describe("resourceTypeFromFileName", () => {
  it("detects type case-insensitively", () => {
    expect(resourceTypeFromFileName("slide.PPTX")).toBe("pptx");
    expect(resourceTypeFromFileName("video.MP4")).toBe("video");
  });

  it("returns null for unsupported or missing extensions", () => {
    expect(resourceTypeFromFileName("archive.zip")).toBeNull();
    expect(resourceTypeFromFileName("noext")).toBeNull();
  });
});
