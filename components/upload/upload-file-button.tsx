"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UploadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  cancelUploadAction,
  createUploadSessionAction,
  finalizeUploadAction,
} from "@/lib/upload/actions";

type UploadState = "idle" | "uploading" | "done" | "error";

async function sha256Hex(buffer: ArrayBuffer): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function UploadFileButton({ resourceId }: { resourceId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<UploadState>("idle");
  const [message, setMessage] = useState<string>("");
  const [fileName, setFileName] = useState<string>("");
  const [isPending, startTransition] = useTransition();

  const busy = status === "uploading" || isPending;

  async function handleFile(file: File) {
    setStatus("uploading");
    setFileName(file.name);
    setMessage("");

    let session: { uploadUrl?: string; key?: string; error?: string };
    try {
      const formData = new FormData();
      formData.set("resourceId", resourceId);
      formData.set("fileName", file.name);
      formData.set("sizeBytes", String(file.size));
      session = await createUploadSessionAction(formData);
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

    let uploadOk = false;
    try {
      const response = await fetch(session.uploadUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type || "application/octet-stream" },
      });
      uploadOk = response.ok;
    } catch {
      uploadOk = false;
    }

    if (!uploadOk) {
      await cancelUpload(session.key);
      return;
    }

    try {
      const sha256 = await sha256Hex(await file.arrayBuffer());
      const finalForm = new FormData();
      finalForm.set("resourceId", resourceId);
      finalForm.set("key", session.key);
      finalForm.set("sizeBytes", String(file.size));
      finalForm.set("sha256", sha256);
      finalForm.set("mime", file.type || "");

      startTransition(async () => {
        const result = await finalizeUploadAction(finalForm);
        if (result.error) {
          setStatus("error");
          setMessage(result.error);
        } else {
          setStatus("done");
          setMessage("Đã tải tệp lên.");
          router.refresh();
        }
      });
    } catch {
      await cancelUpload(session.key);
    }
  }

  async function cancelUpload(key: string) {
    try {
      const formData = new FormData();
      formData.set("resourceId", resourceId);
      formData.set("key", key);
      await cancelUploadAction(formData);
    } catch {
      // Bỏ qua — resource đã được reset ở server nếu có thể.
    }
    setStatus("error");
    setMessage("Tải lên thất bại — vui lòng thử lại.");
  }

  function onFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) void handleFile(file);
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        disabled={busy}
        onChange={onFileChange}
      />
      <Button
        type="button"
        variant="outline"
        disabled={busy}
        onClick={() => inputRef.current?.click()}
      >
        {busy ? (
          <Loader2 aria-hidden="true" className="animate-spin" />
        ) : (
          <UploadCloud aria-hidden="true" />
        )}
        {status === "uploading"
          ? `Đang tải ${fileName || "tệp"}…`
          : "Tải tệp lên"}
      </Button>
      {message && (
        <p
          role={status === "error" ? "alert" : "status"}
          className={`text-sm ${
            status === "error" ? "text-destructive" : "text-muted-foreground"
          }`}
        >
          {message}
        </p>
      )}
    </div>
  );
}