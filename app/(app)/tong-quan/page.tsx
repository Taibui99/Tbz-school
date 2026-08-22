import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  Activity,
  Clock3,
  FileText,
  FolderOpen,
  Star,
} from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageHeader } from "@/components/layout/page-header";
import { SpotlightCard } from "@/components/layout/spotlight-card";
import { TypeIcon } from "@/components/resource/type-icon";
import { ContinueViewing } from "@/components/resource/continue-viewing";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Tổng quan",
  description: "Bảng điều khiển và lịch sử hoạt động của bạn trên TBZ School.",
};

const ACTION_LABELS: Record<string, string> = {
  open: "Đã mở",
  create: "Đã tạo",
  update: "Đã chỉnh sửa",
  upload: "Đã tải lên",
  delete: "Đã xóa",
  restore: "Đã khôi phục",
  favorite: "Đã thích",
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/dang-nhap");

  const [
    { count: resourceCount },
    { count: favoriteCount },
    { count: openCount },
    { data: favoriteRows },
    { data: openRows },
    { data: activityRows },
    { data: workspaceRows },
  ] = await Promise.all([
    supabase
      .from("resources")
      .select("id", { count: "exact", head: true })
      .eq("owner_id", user.id)
      .is("deleted_at", null),
    supabase
      .from("favorites")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
    supabase
      .from("activity_logs")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("action", "open"),
    supabase
      .from("favorites")
      .select(
        "created_at, resources(id, title, type, owner_id, deleted_at, workspace_id, lesson_id, lessons(collection_id))",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("activity_logs")
      .select("resource_id, created_at, metadata, resources(title, type, deleted_at)")
      .eq("user_id", user.id)
      .eq("action", "open")
      .order("created_at", { ascending: false })
      .limit(12),
    supabase
      .from("activity_logs")
      .select("id, action, resource_id, metadata, created_at, resources(title, type, deleted_at)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10),
    supabase
      .from("workspaces")
      .select("id, name")
      .eq("owner_id", user.id)
      .is("deleted_at", null)
      .limit(4),
  ]);

  const favorites = (favoriteRows ?? [])
    .map((entry) => {
      const resource = Array.isArray(entry.resources)
        ? entry.resources[0]
        : entry.resources;
      if (!resource || resource.deleted_at !== null) return null;
      const lessons = resource.lessons as
        | { collection_id?: string | null }[]
        | { collection_id?: string | null }
        | null;
      const collectionId = Array.isArray(lessons)
        ? lessons[0]?.collection_id ?? null
        : lessons?.collection_id ?? null;
      return {
        id: resource.id,
        title: resource.title,
        type: resource.type,
        ownerId: resource.owner_id,
        workspaceId: resource.workspace_id,
        collectionId,
        lessonId: resource.lesson_id,
        createdAt: entry.created_at,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .filter(
      (item) =>
        item.workspaceId && item.collectionId && item.lessonId,
    );

  const seen = new Set<string>();
  const recentOpens = (openRows ?? [])
    .filter((entry) => {
      const resource = Array.isArray(entry.resources)
        ? entry.resources[0]
        : entry.resources;
      if (!resource || resource.deleted_at !== null) return false;
      if (seen.has(entry.resource_id)) return false;
      seen.add(entry.resource_id);
      return true;
    })
    .map((entry) => ({
      resourceId: entry.resource_id,
      createdAt: entry.created_at,
      meta: (entry.metadata ?? {}) as {
        workspace_id?: string;
        collection_id?: string;
        lesson_id?: string;
      },
      resource: Array.isArray(entry.resources)
        ? entry.resources[0]!
        : entry.resources,
    }))
    .filter((entry) => entry.meta.workspace_id && entry.meta.collection_id && entry.meta.lesson_id)
    .slice(0, 8);

  const stats = [
    {
      label: "Tài liệu",
      value: resourceCount ?? 0,
      icon: FileText,
    },
    { label: "Yêu thích", value: favoriteCount ?? 0, icon: Star },
    {
      label: "Đã mở",
      value: openCount ?? 0,
      icon: Clock3,
    },
    {
      label: "Workspace",
      value: workspaceRows?.length ?? 0,
      icon: FolderOpen,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <Breadcrumbs items={[{ label: "Tổng quan" }]} />

      <div className="mt-4">
        <PageHeader
          title="Tổng quan"
          description="Tài liệu gần đây, mục yêu thích và hoạt động của bạn."
        />
      </div>

      <div className="-mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <SpotlightCard
            key={stat.label}
            className="glass-panel flex items-center gap-3.5 rounded-2xl p-4 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[var(--shadow-lift)]"
          >
            <span className="bg-brand-gradient flex size-10 shrink-0 items-center justify-center rounded-xl text-white">
              <stat.icon aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="font-heading text-2xl font-bold leading-none">{stat.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </SpotlightCard>
        ))}
      </div>

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Activity aria-hidden="true" className="size-4" />
          Tiếp tục xem
        </h2>
        <div className="mt-3">
          <ContinueViewing />
        </div>
      </section>

      {favorites.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Star aria-hidden="true" className="size-4" />
            Yêu thích gần đây
          </h2>
          <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {favorites.map((item) => {
              const href =
                item.ownerId === user.id
                  ? `/kho/${item.workspaceId}/${item.collectionId}/${item.lessonId}/${item.id}`
                  : `/thu-vien/${item.id}`;
              return (
                <li key={item.id}>
                  <Link
                    href={href}
                    className="flex items-center gap-3 glass-panel rounded-2xl px-4 py-3 transition-colors hover:border-primary/40"
                  >
                    <TypeIcon type={item.type} className="size-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-sm font-medium">
                      {item.title}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDate(item.createdAt)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {recentOpens.length > 0 && (
        <section className="mt-8">
          <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Clock3 aria-hidden="true" className="size-4" />
            Đã mở gần đây
          </h2>
          <ul className="mt-3 flex flex-col gap-2">
            {recentOpens.map((entry) => (
              <li key={entry.resourceId}>
                <Link
                  href={`/kho/${entry.meta.workspace_id}/${entry.meta.collection_id}/${entry.meta.lesson_id}/${entry.resourceId}`}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 text-sm transition-colors hover:border-primary/40"
                >
                  <TypeIcon type={entry.resource.type} className="size-4 shrink-0" />
                  <span className="truncate font-medium">{entry.resource.title}</span>
                  <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                    {formatDate(entry.createdAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-8">
        <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Activity aria-hidden="true" className="size-4" />
          Hoạt động gần đây
        </h2>
        {!activityRows || activityRows.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            Chưa có hoạt động nào.
          </p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {activityRows.map((entry) => {
              const resource = Array.isArray(entry.resources)
                ? entry.resources[0]
                : entry.resources;
              const label = ACTION_LABELS[entry.action] ?? entry.action;
              return (
                <li
                  key={entry.id}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 text-sm"
                >
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs">
                    {label}
                  </span>
                  <span className="min-w-0 flex-1 truncate">
                    {resource ? resource.title : "Tài liệu đã bị xóa"}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(entry.created_at)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}