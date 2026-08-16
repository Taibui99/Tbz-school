import type { Metadata } from "next";
import Link from "next/link";
import { FolderTree, GraduationCap, Search } from "lucide-react";
import { TypeIcon } from "@/components/resource/type-icon";
import { TYPE_LABELS } from "@/components/resource/resource-dialogs";
import { getOwnersByIds } from "@/lib/resource/public";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export const metadata: Metadata = {
  title: "Tìm kiếm",
  description: "Tìm kiếm tài liệu, bộ sưu tập và bài học trên TBZ School.",
};

const PAGE_SIZE = 10;

interface SearchParams {
  q?: string;
  type?: string;
  tag?: string;
  scope?: string;
  sort?: string;
  page?: string;
}

function formatDate(value: string | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q, type, tag, scope, sort, page } = await searchParams;
  const query = (q ?? "").trim();
  const pageNum = Math.max(1, Number.parseInt(page ?? "1", 10) || 1);
  const offset = (pageNum - 1) * PAGE_SIZE;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: allTags } = await supabase
    .from("tags")
    .select("id, name")
    .order("name");

  const sortBy = sort === "updated" ? "updated_at" : sort === "title" ? "title" : "created_at";
  const sortAsc = sort === "title";

  let resourceQuery = supabase
    .from("resources")
    .select(
      "id, title, type, visibility, created_at, updated_at, owner_id, workspace_id, lesson_id, lessons(collection_id), resource_tags(tag_id, tags(name))",
    )
    .is("deleted_at", null)
    .order(sortBy, { ascending: sortAsc });

  let countQuery = supabase
    .from("resources")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);

  if (query) {
    resourceQuery = resourceQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
    countQuery = countQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%`);
  }
  if (type) {
    resourceQuery = resourceQuery.eq("type", type);
    countQuery = countQuery.eq("type", type);
  }
  if (tag) {
    resourceQuery = resourceQuery.eq("resource_tags.tags.name", tag);
    countQuery = countQuery.eq("resource_tags.tags.name", tag);
  }
  if (scope === "mine" && user) {
    resourceQuery = resourceQuery.eq("owner_id", user.id);
    countQuery = countQuery.eq("owner_id", user.id);
  } else if (scope === "public") {
    resourceQuery = resourceQuery.eq("visibility", "public");
    countQuery = countQuery.eq("visibility", "public");
  }

  const { data: rows } = await resourceQuery.range(offset, offset + PAGE_SIZE - 1);
  const { count } = await countQuery;
  const total = count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const ownerIds = Array.from(
    new Set((rows ?? []).map((row) => row.owner_id)),
  );
  const owners = await getOwnersByIds(ownerIds);
  const ownerById = new Map(owners.map((o) => [o.id, o]));

  let collections: { id: string; name: string; workspace_id: string; workspaces: { name: string } | { name: string }[] | null }[] = [];
  let lessons: { id: string; name: string; collection_id: string; collections: { name: string; workspace_id: string } | { name: string; workspace_id: string }[] | null }[] = [];
  let matchedTags: { id: string; name: string }[] = [];

  if (query) {
    const [{ data: c }, { data: l }, { data: t }] = await Promise.all([
      supabase
        .from("collections")
        .select("id, name, workspace_id, workspaces(name)")
        .is("deleted_at", null)
        .ilike("name", `%${query}%`)
        .order("name")
        .limit(5),
      supabase
        .from("lessons")
        .select("id, name, collection_id, collections(name, workspace_id)")
        .is("deleted_at", null)
        .ilike("name", `%${query}%`)
        .order("name")
        .limit(5),
      supabase
        .from("tags")
        .select("id, name")
        .ilike("name", `%${query}%`)
        .order("name")
        .limit(5),
    ]);
    collections = (c ?? []) as typeof collections;
    lessons = (l ?? []) as typeof lessons;
    matchedTags = t ?? [];
  }

  function filterParams(overrides: Partial<SearchParams>): string {
    const params = new URLSearchParams();
    if (overrides.q ?? q) params.set("q", overrides.q ?? q!);
    if (overrides.type ?? type) params.set("type", overrides.type ?? type!);
    if (overrides.tag ?? tag) params.set("tag", overrides.tag ?? tag!);
    if (overrides.scope ?? scope) params.set("scope", overrides.scope ?? scope!);
    if (overrides.sort ?? sort) params.set("sort", overrides.sort ?? sort!);
    if (overrides.page) params.set("page", overrides.page);
    return params.toString();
  }

  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-10">
      <h1 className="text-2xl font-semibold tracking-tight">Tìm kiếm</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tìm trong tài liệu, bộ sưu tập, bài học và thẻ của bạn (và tài liệu
        công khai).
      </p>

      <form action="/tim-kiem" method="get" className="mt-6 flex flex-wrap items-end gap-2">
        <div className="min-w-0 flex-1">
          <Input
            name="q"
            type="search"
            defaultValue={q ?? ""}
            placeholder="Nhập từ khóa…"
            className="h-9"
          />
        </div>
        <select
          name="scope"
          defaultValue={scope ?? ""}
          className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Toàn bộ</option>
          <option value="mine">Của tôi</option>
          <option value="public">Công khai</option>
        </select>
        <select
          name="type"
          defaultValue={type ?? ""}
          className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
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
          className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Mọi thẻ</option>
          {(allTags ?? []).map((t) => (
            <option key={t.id} value={t.name}>
              {t.name}
            </option>
          ))}
        </select>
        <select
          name="sort"
          defaultValue={sort ?? ""}
          className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="">Mới nhất</option>
          <option value="updated">Cập nhật gần đây</option>
          <option value="title">Theo tên</option>
        </select>
        <Button type="submit" size="sm">
          <Search aria-hidden="true" />
          Tìm
        </Button>
      </form>

      {query && (
        <div className="mt-6 space-y-8">
          {matchedTags.length > 0 && (
            <section>
              <h2 className="text-sm font-medium text-muted-foreground">Thẻ phù hợp</h2>
              <div className="mt-2 flex flex-wrap gap-2">
                {matchedTags.map((t) => (
                  <Link
                    key={t.id}
                    href={`/tim-kiem?q=${encodeURIComponent(t.name)}&tag=${encodeURIComponent(t.name)}`}
                    className="rounded-full bg-muted px-3 py-1 text-sm hover:bg-primary/10"
                  >
                    #{t.name}
                  </Link>
                ))}
              </div>
            </section>
          )}

          {collections.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <FolderTree aria-hidden="true" className="size-4" />
                Bộ sưu tập
              </h2>
              <ul className="mt-2 flex flex-col gap-2">
                {collections.map((c) => {
                  const ws = Array.isArray(c.workspaces) ? c.workspaces[0] : c.workspaces;
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/kho/${c.workspace_id}/${c.id}`}
                        className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 text-sm transition-colors hover:border-primary/40"
                      >
                        <FolderTree aria-hidden="true" className="size-4 text-muted-foreground" />
                        <span className="truncate font-medium">{c.name}</span>
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                          {ws?.name ?? ""}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {lessons.length > 0 && (
            <section>
              <h2 className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <GraduationCap aria-hidden="true" className="size-4" />
                Bài học
              </h2>
              <ul className="mt-2 flex flex-col gap-2">
                {lessons.map((lesson) => {
                  const col = Array.isArray(lesson.collections)
                    ? lesson.collections[0]
                    : lesson.collections;
                  if (!col?.workspace_id) return null;
                  return (
                    <li key={lesson.id}>
                      <Link
                        href={`/kho/${col.workspace_id}/${lesson.collection_id}/${lesson.id}`}
                        className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 text-sm transition-colors hover:border-primary/40"
                      >
                        <GraduationCap aria-hidden="true" className="size-4 text-muted-foreground" />
                        <span className="truncate font-medium">{lesson.name}</span>
                        <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                          {col.name}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      )}

      <h2 className="mt-8 text-sm font-medium text-muted-foreground">Tài liệu</h2>
      {!rows || rows.length === 0 ? (
        <div className="mt-4 rounded-xl border border-dashed border-border py-16 text-center">
          <p className="font-medium">Không tìm thấy tài liệu phù hợp</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Thử thay đổi từ khóa hoặc bỏ bớt bộ lọc.
          </p>
        </div>
      ) : (
        <ul className="mt-4 flex flex-col gap-2">
          {rows.map((row) => {
            const lessons = row.lessons as
              | { collection_id?: string | null }[]
              | { collection_id?: string | null }
              | null;
            const collectionId = Array.isArray(lessons)
              ? lessons[0]?.collection_id
              : lessons?.collection_id;
            const href =
              row.workspace_id && row.lesson_id && collectionId
                ? `/kho/${row.workspace_id}/${collectionId}/${row.lesson_id}/${row.id}`
                : `/thu-vien/${row.id}`;
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
              <li key={row.id}>
                <Link
                  href={href}
                  className="flex items-center gap-3 rounded-lg border border-border bg-card px-4 py-2.5 transition-colors hover:border-primary/40"
                >
                  <TypeIcon type={row.type} className="size-4 shrink-0" />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {row.title}
                  </span>
                  <span className="hidden shrink-0 text-xs text-muted-foreground sm:inline">
                    {ownerById.get(row.owner_id)?.full_name ?? ""}
                    {tags.length > 0 && ` · ${tags.slice(0, 2).join(", ")}`}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDate(row.created_at)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}

      {totalPages > 1 && (
        <nav className="mt-8 flex items-center justify-center gap-3">
          {pageNum > 1 && (
            <Link
              href={`/tim-kiem?${filterParams({ page: String(pageNum - 1) })}`}
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
              href={`/tim-kiem?${filterParams({ page: String(pageNum + 1) })}`}
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