declare module "pptx-preview" {
  export interface PptxPreviewOptions {
    width?: number;
    height?: number;
  }

  export interface PptxPreviewer {
    preview(buffer: ArrayBuffer): void;
  }

  export function init(
    container: HTMLElement,
    options?: PptxPreviewOptions,
  ): PptxPreviewer;
}
