"use client";

import { useActionState, useRef, useState, useTransition } from "react";
import { Camera, LogOut, Upload } from "lucide-react";
import {
  signOutAction,
  updateAvatarAction,
  updateProfileAction,
} from "@/lib/auth/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif"];

function AvatarUpload({
  userId,
  avatarUrl,
}: {
  userId: string;
  avatarUrl: string | null;
}) {
  const [uploading, startUpload] = useTransition();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploaded, setUploaded] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(file: File) {
    setUploadError(null);
    setUploaded(false);

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUploadError("Chỉ chấp nhận file ảnh (JPEG, PNG, WebP, GIF).");
      return;
    }
    if (file.size > MAX_AVATAR_SIZE) {
      setUploadError("Ảnh vượt quá 2 MB.");
      return;
    }

    startUpload(async () => {
      const supabase = createClient();
      const extension = file.name.split(".").pop() ?? "png";
      const path = `${userId}/${Date.now()}-avatar.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (uploadError) {
        setUploadError(uploadError.message);
        return;
      }

      const avatarForm = new FormData();
      avatarForm.set("avatarPath", path);
      const result = await updateAvatarAction(avatarForm);
      if (result.error) {
        setUploadError(result.error);
        return;
      }
      setUploaded(true);
    });
  }

  return (
    <div className="flex items-center gap-4">
      <div className="relative size-16 shrink-0">
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt="Ảnh đại diện"
            className="size-16 rounded-full object-cover ring-1 ring-border"
          />
        ) : (
          <div
            className="flex size-16 items-center justify-center rounded-full bg-muted text-muted-foreground"
            aria-hidden="true"
          >
            <Camera className="size-6" />
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES.join(",")}
          className="hidden"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
        >
          <Upload aria-hidden="true" />
          {uploading ? "Đang tải lên..." : "Chọn ảnh mới"}
        </Button>
        {uploadError && (
          <p className="text-xs text-destructive">{uploadError}</p>
        )}
        {uploaded && (
          <p className="text-xs text-muted-foreground">
            Đã cập nhật ảnh đại diện.
          </p>
        )}
      </div>
    </div>
  );
}

function ProfileInfo({
  email,
  fullName,
}: {
  email: string;
  fullName: string;
}) {
  const [state, formAction, pending] = useActionState(updateProfileAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {state.error && (
        <Alert variant="destructive">
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state.success && (
        <Alert>
          <AlertTitle>Thành công</AlertTitle>
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={email} disabled />
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="fullName">Họ tên</Label>
        <Input
          id="fullName"
          name="fullName"
          type="text"
          autoComplete="name"
          defaultValue={fullName}
          required
          aria-invalid={Boolean(state.fieldErrors?.fullName)}
        />
        {state.fieldErrors?.fullName && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.fullName}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Đang lưu..." : "Lưu thay đổi"}
        </Button>
        <Button
          type="submit"
          variant="outline"
          formAction={signOutAction}
          formNoValidate
        >
          <LogOut aria-hidden="true" />
          Đăng xuất
        </Button>
      </div>
    </form>
  );
}

export { AvatarUpload, ProfileInfo };