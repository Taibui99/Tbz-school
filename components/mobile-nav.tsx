"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { signOutAction } from "@/lib/auth/actions";

const menuItems = [
  { href: "/tong-quan", label: "Tổng quan" },
  { href: "/kho", label: "Kho của tôi" },
  { href: "/thung-rac", label: "Thùng rác" },
  { href: "/ho-so", label: "Hồ sơ" },
];

export function MobileNav() {
  return (
    <div className="lg:hidden">
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Mở menu"
            />
          }
        >
          <Menu className="size-5" aria-hidden="true" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={8} className="w-48">
          {menuItems.map((item) => (
            <DropdownMenuItem key={item.href} render={<Link href={item.href} />}>
              {item.label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem>
            <form action={signOutAction} className="w-full">
              <button type="submit" className="w-full text-left">
                Đăng xuất
              </button>
            </form>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
