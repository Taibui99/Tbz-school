import type { ReactNode } from "react";
import { notFound, redirect } from "next/navigation";
import { WorkspaceSidebar } from "@/components/workspace/sidebar";
import { createClient } from "@/lib/supabase/server";

export default async function WorkspaceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dang-nhap");

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (!workspace) notFound();

  const { data: collections } = await supabase
    .from("collections")
    .select("id, name, lessons(id, name)")
    .eq("workspace_id", id)
    .order("position", { ascending: true })
    .order("position", { ascending: true, referencedTable: "lessons" });

  return (
    <div className="mx-auto flex w-full max-w-6xl">
      <WorkspaceSidebar
        workspaceId={id}
        collections={collections ?? []}
      />
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}