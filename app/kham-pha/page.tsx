import type { Metadata } from "next";
import Link from "next/link";
import { Search } from "lucide-react";
import { TypeIcon } from "@/components/resource/type-icon";
import { PageHeader } from "@/components/layout/page-header";
import { TYPE_LABELS } from "@/components/resource/resource-dialogs";
import { getOwnersByIds } from "@/lib/resource/public";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Khám phá",
  description: "Khám phá tài liệu học tập công khai trên TBZ School.",
};

const PAGE_SIZE = 12;

interface SearchParams {
  q?: string;
  type?: string;
  tag?: string;
  page?: string;
}

function formatDate(value: string | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export default async function ExplorePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q, type, tag, page } = await searchParams;
  const pageNum = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const offset = (pageNum - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const { data: allTags } = await supabase
    .from("tags")
    .select("id, name")
    .order("name");

  let query = supabase
    .from("resources")
    .select(
      "id, title, type, visibility, created_at, owner_id, resource_tags(tag_id, tags(name))",
    )
    .eq("visibility", "public")
    .eq("lifecycle_state", "ready")
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  let countQuery = supabase
    .from("resources")
    .select("id", { count: "exact", head: true })
    .eq("visibility", "public")
    .eq("lifecycle_state", "ready")
    .is("deleted_at", null);

  if (q) {
    query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
    countQuery = countQuery.or(`title.ilike.%${q}%,description.ilike.%${q}%`);
  }
  if (type) {
    query = query.eq("type", type);
    countQuery = countQuery.eq("type", type);
  }
  if (tag) {
    query = query.eq("resource_tags.tags.name", tag);
    countQuery = countQuery.eq("resource_tags.tags.name", tag);
  }

  const { data: rows } = await query.range(offset, offset + PAGE_SIZE - 1);
  const { count } = await countQuery;

  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const ownerIds = Array.from(
    new Set((rows ?? []).map((row) => row.owner_id)),
  );
  const owners = await getOwnersByIds(ownerIds);
  const ownerById = new Map(owners.map((o) => [o.id, o]));

  const currentUrl = (query: string) =>
    `/kham-pha${query ? `?${query}` : ""}`;

  function filterParams(overrides: Partial<SearchParams>): string {
    const params = new URLSearchParams();
    if (overrides.q ?? q) params.set("q", overrides.q ?? q!);
    if (overrides.type ?? type) params.set("type", overrides.type ?? type!);
    if (overrides.tag ?? tag) params.set("tag", overrides.tag ?? tag!);
    if (overrides.page) params.set("page", overrides.page);
    return params.toString();
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <PageHeader
        title="Khám phá"
        description="Tài liệu học tập công khai từ cộng đồng TBZ School."
      />

      <form
        action="/kham-pha"
        method="get"
        className="glass-panel flex flex-wrap items-end gap-2 rounded-2xl p-4"
      >
        <div className="min-w-0 flex-1">
          <Input
            name="q"
            type="search"
            defaultValue={q ?? ""}
            placeholder="Tìm theo tiêu đề hoặc mô tả…"
            className="h-9"
          />
        </div>
        <select
          name="type"
          defaultValue={type ?? ""}
          className="h-9 rounded-xl border border-input bg-card/60 px-3 backdrop-blur text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Mọi loại</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          name="tag"
          defaultValue={tag ?? ""}
          className="h-9 rounded-xl border border-input bg-card/60 px-3 backdrop-blur text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Mọi thẻ</option>
          {(allTags ?? []).map((t) => (
            <option key={t.id} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
        <Button type="submit" size="sm">
          <Search aria-hidden="true" />
          Tìm
        </Button>
      </form>

      {!rows || rows.length === 0 ? (
        <div className="mt-10 rounded-xl border border-dashed border-border py-16 text-center">
          <p className="font-medium">Không có tài liệu phù hợp</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Thử bỏ bớt bộ lọc để xem thêm kết quả.
          </p>
        </div>
      ) : (
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((row) => {
            const tags = (row.resource_tags ?? [])
              .map((rt) => {
                const t = rt.tags as
                  | { name?: string | null }[]
                  | { name?: string | null }
                  | null;
                return Array.isArray(t) ? t[0]?.name : t?.name;
              })
              .filter((name): name is string => Boolean(name));
            return (
              <Link
                key={row.id}
                href={`/thu-vien/${row.id}`}
                className="group flex flex-col gap-3 glass-panel rounded-2xl p-5 transition-colors hover:border-primary/40"
              >
                <div className="flex items-center gap-3">
                  <TypeIcon type={row.type} className="size-6 shrink-0" />
                  <h2 className="min-w-0 truncate font-medium group-hover:text-primary">
                    {row.title}
                  </h2>
                </div>
                <div className="text-xs text-muted-foreground">
                  {ownerById.get(row.owner_id)?.full_name ?? "Người dùng TBZ"}
                  {" · "}
                  {formatDate(row.created_at)}
                </div>
                {tags.filter(Boolean).length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags
                      .filter(Boolean)
                      .slice(0, 3)
                      .map((name) => (
                        <span
                          key={name}
                          className="rounded-full bg-muted px-2 py-0.5 text-xs"
                        >
                          {name}
                        </span>
                      ))}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-3">
          {pageNum > 1 && (
            <Link
              href={currentUrl(filterParams({ page: String(pageNum - 1) }))}
              className="text-sm text-muted-foreground underline underline-offset-2"
            >
              Trang trước
            </Link>
          )}
          <span className="text-sm text-muted-foreground">
            Trang {pageNum} / {totalPages}
          </span>
          {pageNum < totalPages && (
            <Link
              href={currentUrl(filterParams({ page: String(pageNum + 1) }))}
              className="text-sm text-muted-foreground underline underline-offset-2"
            >
              Trang sau
            </Link>
          )}
        </nav>
      )}
    </div>
  );
}