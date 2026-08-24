import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Baloo_2, Be_Vietnam_Pro, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { BackdropGlow } from "@/components/layout/backdrop-glow";
import { ToastProvider } from "@/components/ui/toast";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-sans",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const baloo = Baloo_2({
  variable: "--font-heading",
  subsets: ["latin", "vietnamese"],
  weight: ["500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: {
    default: "Tbz cloud",
    template: "%s · Tbz cloud",
  },
  description:
    "Nền tảng lưu trữ, tổ chức và tương tác tài liệu học tập: Workspace → Collection → Lesson → Resource.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="vi"
      className={`${beVietnamPro.variable} ${geistMono.variable} ${baloo.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        <ToastProvider>
          <BackdropGlow />
          <SiteHeader />
          <main className="relative flex-1">{children}</main>
          <SiteFooter />
        </ToastProvider>
      </body>
    </html>
  );
}
