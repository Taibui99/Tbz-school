import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { FolderOpen, Library } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { CreateWorkspaceDialog } from "@/components/workspace/workspace-dialogs";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Kho của tôi",
  description: "Quản lý workspaces của bạn trên TBZ School.",
};

export default async function WorkspacesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/dang-nhap");

  const { data: workspaces } = await supabase
    .from("workspaces")
    .select("id, name, description, created_at")
    .order("created_at", { ascending: false });

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <Breadcrumbs items={[{ label: "Kho của tôi" }]} />
          <h1 className="mt-3 text-2xl font-semibold tracking-tight">
            Kho của tôi
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Các workspace lưu trữ tài liệu học tập của bạn.
          </p>
        </div>
        <CreateWorkspaceDialog />
      </div>

      {!workspaces || workspaces.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
          <Library className="size-10 text-muted-foreground" aria-hidden="true" />
          <div>
            <p className="font-medium">Chưa có workspace nào</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Tạo workspace đầu tiên để bắt đầu tổ chức tài liệu của bạn.
            </p>
          </div>
          <CreateWorkspaceDialog />
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {workspaces.map((workspace) => (
            <Link
              key={workspace.id}
              href={`/kho/${workspace.id}`}
              className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40"
            >
              <div className="flex items-center gap-2">
                <FolderOpen
                  className="size-5 text-muted-foreground group-hover:text-primary"
                  aria-hidden="true"
                />
                <span className="truncate font-medium">{workspace.name}</span>
              </div>
              <p className="line-clamp-2 min-h-10 text-sm text-muted-foreground">
                {workspace.description || "Chưa có mô tả."}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}