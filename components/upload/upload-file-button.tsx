"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, RotateCcw, UploadCloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  cancelUploadAction,
  createUploadSessionAction,
  finalizeUploadAction,
} from "@/lib/upload/actions";
import {
  createVersionUploadSessionAction,
  finalizeVersionUploadAction,
} from "@/lib/resource/version-actions";
import { MAX_FILE_SIZE_BYTES } from "@/lib/upload/validate";

type UploadStatus = "idle" | "creating" | "uploading" | "verifying" | "done" | "error";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function UploadFileButton({
  resourceId,
  mode = "initial",
  resourceType,
}: {
  resourceId: string;
  mode?: "initial" | "version";
  resourceType?: string;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const fileRef = useRef<File | null>(null);

  const isVideo = resourceType === "video";

  const [status, setStatus] = useState<UploadStatus>("idle");
  const [message, setMessage] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileSize, setFileSize] = useState(0);
  const [progress, setProgress] = useState(0);

  const busy = status === "creating" || status === "uploading" || status === "verifying";

  async function handleFile(file: File) {
    fileRef.current = file;
    setFileName(file.name);
    setFileSize(file.size);
    setMessage("");
    setProgress(0);

    if (!isVideo && file.size > MAX_FILE_SIZE_BYTES) {
      setStatus("error");
      setMessage(
        `Tệp quá lớn (tối đa ${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)} MB).`,
      );
      return;
    }

    setStatus("creating");

    let session: {
      uploadUrl?: string;
      key?: string;
      video?: boolean;
      mime?: string;
      error?: string;
    };
    try {
      const formData = new FormData();
      formData.set("resourceId", resourceId);
      formData.set("fileName", file.name);
      formData.set("sizeBytes", String(file.size));
      session =
        mode === "version"
          ? await createVersionUploadSessionAction(formData)
          : await createUploadSessionAction(formData);
    } catch {
      setStatus("error");
      setMessage("Không tạo được phiên tải lên.");
      return;
    }

    if (session.error || !session.uploadUrl || !session.key) {
      setStatus("error");
      setMessage(session.error ?? "Không tạo được phiên tải lên.");
      return;
    }

    const isYoutubeUpload = session.video === true;
    const uploadContentType =
      isYoutubeUpload && session.mime
        ? session.mime
        : file.type || "application/octet-stream";

    setStatus("uploading");
    const putResult = await putWithProgress(
      session.uploadUrl,
      file,
      uploadContentType,
    );
    if (!putResult.ok) {
      setStatus("error");
      setMessage(
        putResult.status > 0
          ? `Tải lên thất bại (HTTP ${putResult.status}).`
          : "Tải lên thất bại — hãy kiểm tra kết nối và thử lại.",
      );
      return;
    }

    setStatus("verifying");
    try {
      let videoId: string | undefined;
      if (isYoutubeUpload) {
        try {
          const parsed = JSON.parse(putResult.body || "{}");
          videoId = parsed?.id;
        } catch {
          videoId = undefined;
        }
        if (!videoId) {
          setStatus("error");
          setMessage("Không nhận được video ID từ YouTube.");
          return;
        }
      }

      const sha256 = await sha256Hex(await file.arrayBuffer());
      const finalForm = new FormData();
      finalForm.set("resourceId", resourceId);
      finalForm.set("key", session.key);
      finalForm.set("sizeBytes", String(file.size));
      finalForm.set("mime", file.type || "");
      if (isYoutubeUpload) {
        if (videoId) finalForm.set("videoId", videoId);
      } else {
        finalForm.set("sha256", sha256);
      }

      const result =
        mode === "version"
          ? await finalizeVersionUploadAction(
              (finalForm.set("fileName", file.name), finalForm),
            )
          : await finalizeUploadAction(finalForm);
      if (result.error) {
        setStatus("error");
        setMessage(result.error);
        return;
      }
      setStatus("done");
      setMessage(
        mode === "version"
          ? "Đã tải phiên bản mới."
          : isYoutubeUpload
            ? "Video đã được đăng lên kênh TBZ School (unlisted)."
            : "Đã tải tệp lên.",
      );
      router.refresh();
    } catch {
      setStatus("error");
      setMessage("Xác minh tệp thất bại — hãy thử lại.");
    }
  }

  function putWithProgress(
    url: string,
    file: File,
    contentType: string,
  ): Promise<{ ok: boolean; status: number; body: string }> {
    return new Promise((resolve) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", url);
      xhr.setRequestHeader("Content-Type", contentType);
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          setProgress(Math.round((event.loaded / event.total) * 100));
        }
      };
      xhr.onload = () =>
        resolve({
          ok: xhr.status >= 200 && xhr.status < 300,
          status: xhr.status,
          body: xhr.responseText,
        });
      xhr.onerror = () => resolve({ ok: false, status: 0, body: "" });
      xhr.onabort = () => resolve({ ok: false, status: 0, body: "" });
      xhrRef.current = xhr;
      xhr.send(file);
    });
  }

  async function cancelUpload() {
    xhrRef.current?.abort();
    xhrRef.current = null;
    try {
      const formData = new FormData();
      formData.set("resourceId", resourceId);
      await cancelUploadAction(formData);
    } catch {
      // Bỏ qua — resource đã được reset ở server nếu có thể.
    }
    setStatus("idle");
    setFileName("");
    setFileSize(0);
    setProgress(0);
    setMessage("");
    fileRef.current = null;
  }

  function retry() {
    if (fileRef.current) void handleFile(fileRef.current);
    else reset();
  }

  function reset() {
    setStatus("idle");
    setFileName("");
    setFileSize(0);
    setProgress(0);
    setMessage("");
    setStatus("idle");
    fileRef.current = null;
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void handleFile(file);
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        disabled={busy}
        onChange={onFileChange}
      />

      {status === "uploading" && (
        <div role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
          <p className="truncate text-sm">
            <span className="font-medium">{fileName}</span>{" "}
            <span className="text-muted-foreground">
              {formatBytes(fileSize)} · {progress}%
            </span>
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {status === "idle" && (
        <div className="flex flex-col items-start gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => inputRef.current?.click()}
          >
            <UploadCloud aria-hidden="true" />
            {mode === "version" ? "Tải phiên bản mới" : "Tải tệp lên"}
          </Button>
          <p className="text-xs text-muted-foreground">
            {isVideo
              ? "Video được đăng trực tiếp lên kênh TBZ School (unlisted) — không giới hạn dung lượng."
              : `Tối đa ${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)} MB mỗi tệp.`}
          </p>
        </div>
      )}

      {status === "creating" && (
        <Button type="button" variant="outline" disabled>
          <Loader2 aria-hidden="true" className="animate-spin" />
          Đang chuẩn bị…
        </Button>
      )}

      {status === "verifying" && (
        <Button type="button" variant="outline" disabled>
          <Loader2 aria-hidden="true" className="animate-spin" />
          Đang xác minh…
        </Button>
      )}

      {status === "done" && (
        <div className="flex items-center gap-2 text-sm">
          <Check aria-hidden="true" className="size-4 text-emerald-600" />
          <span className="font-medium">{fileName}</span>
          <span className="text-muted-foreground">đã tải lên.</span>
        </div>
      )}

      {status === "error" && (
        <div className="flex flex-col gap-2">
          <p role="alert" className="text-sm text-destructive">
            {message}
          </p>
          <div className="flex items-center gap-2">
            <Button type="button" variant="secondary" size="sm" onClick={retry}>
              <RotateCcw aria-hidden="true" />
              Thử lại
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                reset();
              }}
            >
              Bỏ qua
            </Button>
          </div>
        </div>
      )}

      {status === "uploading" && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit"
          onClick={cancelUpload}
        >
          <X aria-hidden="true" />
          Hủy tải lên
        </Button>
      )}
    </div>
  );
}