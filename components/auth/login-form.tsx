"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction } from "@/lib/auth/actions";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({
  redirectTo,
  invalidLink,
}: {
  redirectTo?: string;
  invalidLink?: boolean;
}) {
  const [state, formAction, pending] = useActionState(signInAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="redirect" value={redirectTo ?? "/"} />

      {invalidLink && (
        <Alert variant="destructive">
          <AlertTitle>Liên kết không hợp lệ</AlertTitle>
          <AlertDescription>
            Liên kết xác nhận không hợp lệ hoặc đã hết hạn. Hãy đăng nhập để tiếp
            tục.
          </AlertDescription>
        </Alert>
      )}
      {state.error && (
        <Alert variant="destructive">
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        {state.fieldErrors?.email && (
          <p className="text-xs text-destructive">{state.fieldErrors.email}</p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Mật khẩu</Label>
          <Link
            href="/quen-mat-khau"
            className="text-xs text-muted-foreground underline-offset-4 hover:underline"
          >
            Quên mật khẩu?
          </Link>
        </div>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state.fieldErrors?.password)}
        />
        {state.fieldErrors?.password && (
          <p className="text-xs text-destructive">
            {state.fieldErrors.password}
          </p>
        )}
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Đang xử lý..." : "Đăng nhập"}
      </Button>

      <p className="text-center text-sm text-muted-foreground">
        Chưa có tài khoản?{" "}
        <Link
          href="/dang-ky"
          className="text-primary underline-offset-4 hover:underline"
        >
          Đăng ký ngay
        </Link>
      </p>
    </form>
  );
}