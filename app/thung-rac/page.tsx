import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { TrashManager } from "@/components/trash/trash-manager";

export const metadata: Metadata = {
  title: "Thùng rác",
  description: "Quản lý tài liệu đã xóa.",
};

export default async function TrashPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dang-nhap");

  const { data: items } = await supabase
    .from("resources")
    .select("id, title, type, deleted_at, size_bytes")
    .eq("owner_id", user.id)
    .not("deleted_at", "is", null)
    .order("deleted_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10">
      <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <Trash2 aria-hidden="true" className="size-6" />
        Thùng rác
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tài liệu đã xóa được giữ ở đây để khôi phục khi cần.
      </p>

      <div className="mt-6">
        <TrashManager
          items={(items ?? []).map((item) => ({
            id: item.id,
            title: item.title,
            type: item.type,
            deleted_at: item.deleted_at,
            size_bytes: item.size_bytes,
          }))}
          canEmpty={(items?.length ?? 0) > 0}
        />
      </div>
    </div>
  );
}