"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signInAction } from "@/lib/auth/actions";
import { GoogleSignInButton } from "@/components/auth/google-sign-in-button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function LoginForm({
  redirectTo,
  invalidLink,
  suspended,
}: {
  redirectTo?: string;
  invalidLink?: boolean;
  suspended?: boolean;
}) {
  const [state, formAction, pending] = useActionState(signInAction, {});

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="redirect" value={redirectTo ?? "/"} />

      {suspended && (
        <Alert variant="destructive">
          <AlertTitle>Tài khoản đã bị khóa</AlertTitle>
          <AlertDescription>
            Tài khoản của bạn đã bị quản trị viên khóa. Liên hệ hỗ trợ nếu bạn
            cho rằng đây là nhầm lẫn.
          </AlertDescription>
        </Alert>
      )}
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
        <GoogleSignInButton redirectTo={redirectTo} />
        <div className="flex items-center gap-3 py-1 text-xs text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          hoặc
          <span className="h-px flex-1 bg-border" />
        </div>
      </div>

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