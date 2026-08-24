import type { Metadata } from "next";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "@/components/auth/login-form";

export const metadata: Metadata = {
  title: "Đăng nhập",
  description: "Đăng nhập vào Tbz cloud.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect?: string; error?: string }>;
}) {
  const { redirect: redirectTo, error } = await searchParams;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Đăng nhập</CardTitle>
        <CardDescription>
          Chào mừng quay lại — tiếp tục với tài liệu của bạn.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm
          redirectTo={redirectTo}
          invalidLink={error === "invalid-link"}
          suspended={error === "suspended"}
        />
      </CardContent>
    </Card>
  );
}