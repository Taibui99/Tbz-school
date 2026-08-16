"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CheckSquare, Search, Square, Trash2, X } from "lucide-react";
import { TypeIcon } from "@/components/resource/type-icon";
import { FavoriteButton } from "@/components/resource/favorite-button";
import { MoveResourceSelect } from "@/components/resource/move-resource-select";
import { RestoreButton } from "@/components/resource/restore-button";
import { CopyResourceButton } from "@/components/resource/copy-button";
import {
  DeleteResourceDialog,
  EditResourceDialog,
  TYPE_LABELS,
  VISIBILITY_LABELS,
} from "@/components/resource/resource-dialogs";
import {
  bulkDeleteResourceAction,
  bulkMoveResourceAction,
} from "@/lib/resource/actions";
import type { ResourceType } from "@/lib/resource/validate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export type ResourceListItem = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  visibility: string;
  lifecycle_state: string;
  external_url: string | null;
  deleted_at: string | null;
  created_at: string | null;
  updated_at: string | null;
  tags: { id: string; name: string }[];
  favorite: boolean;
};

function lifecycleLabel(state: string): string {
  switch (state) {
    case "ready":
      return "Sẵn sàng";
    case "draft":
      return "Chờ tải lên";
    case "uploading":
      return "Đang tải lên";
    case "processing":
      return "Đang xử lý";
    case "failed":
      return "Lỗi";
    default:
      return state;
  }
}

function selectClass(): string {
  return "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";
}

type SortKey = "title" | "type" | "created" | "updated";

export function ResourceList({
  resources,
  deletedResources,
  workspaceId,
  collectionId,
  lessonId,
  lessons,
}: {
  resources: ResourceListItem[];
  deletedResources: ResourceListItem[];
  workspaceId: string;
  collectionId: string;
  lessonId: string;
  lessons: { id: string; name: string }[];
}) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("created");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const allIds = useMemo(
    () => new Set([...resources, ...deletedResources].map((r) => r.id)),
    [resources, deletedResources],
  );

  const [knownIds, setKnownIds] = useState(allIds);
  if (knownIds !== allIds) {
    setKnownIds(allIds);
    setSelected(
      (prev) => new Set([...prev].filter((id) => allIds.has(id))),
    );
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = resources.filter((r) => {
      if (typeFilter !== "all" && r.type !== typeFilter) return false;
      if (visibilityFilter !== "all" && r.visibility !== visibilityFilter) {
        return false;
      }
      if (q.length === 0) return true;
      const tagHit = r.tags.some((t) => t.name.toLowerCase().includes(q));
      return (
        r.title.toLowerCase().includes(q) ||
        (TYPE_LABELS[r.type] ?? r.type).toLowerCase().includes(q) ||
        tagHit
      );
    });
    const dir = sortDir === "asc" ? 1 : -1;
    return [...list].sort((a, b) => {
      if (sortKey === "type") {
        return (a.type.localeCompare(b.type) || a.title.localeCompare(b.title)) * dir;
      }
      if (sortKey === "updated" || sortKey === "created") {
        const av = sortKey === "updated" ? a.updated_at : a.created_at;
        const bv = sortKey === "updated" ? b.updated_at : b.created_at;
        return (av ?? "").localeCompare(bv ?? "") * dir;
      }
      return a.title.localeCompare(b.title) * dir;
    });
  }, [resources, query, typeFilter, visibilityFilter, sortKey, sortDir]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allActiveSelected =
    visible.length > 0 && visible.every((r) => selected.has(r.id));

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (allActiveSelected) {
        visible.forEach((r) => next.delete(r.id));
      } else {
        visible.forEach((r) => next.add(r.id));
      }
      return next;
    });
  };

  const runBulkDelete = async () => {
    if (selected.size === 0) return;
    const fd = new FormData();
    selected.forEach((id) => fd.append("id", id));
    await bulkDeleteResourceAction(fd);
    setSelected(new Set());
  };

  const runBulkMove = async (targetLessonId: string) => {
    if (selected.size === 0 || !targetLessonId) return;
    const fd = new FormData();
    selected.forEach((id) => fd.append("id", id));
    fd.set("targetLessonId", targetLessonId);
    await bulkMoveResourceAction(fd);
    setSelected(new Set());
  };

  function Card({
    item,
    isDeleted,
  }: {
    item: ResourceListItem;
    isDeleted: boolean;
  }) {
    const checked = selected.has(item.id);
    return (
      <li className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
        <input
          type="checkbox"
          aria-label={`Chọn ${item.title}`}
          checked={checked}
          onChange={() => toggle(item.id)}
          disabled={isDeleted}
          className="size-4 shrink-0 accent-[var(--primary)]"
        />
        <TypeIcon type={item.type} className="size-5 shrink-0" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={`/kho/${workspaceId}/${collectionId}/${lessonId}/${item.id}`}
              className={`truncate font-medium hover:underline ${
                isDeleted ? "text-muted-foreground line-through" : ""
              }`}
            >
              {item.title}
            </Link>
            {!isDeleted && (
              <FavoriteButton
                resourceId={item.id}
                initialFavorite={item.favorite}
              />
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {TYPE_LABELS[item.type] ?? item.type} ·{" "}
            {VISIBILITY_LABELS[item.visibility] ?? item.visibility} ·{" "}
            {lifecycleLabel(item.lifecycle_state)}
          </p>
          {item.tags.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {item.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full bg-accent/40 px-2 py-0.5 text-xs text-accent-foreground"
                >
                  #{tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {!isDeleted && (
            <>
              <MoveResourceSelect
                resourceId={item.id}
                workspaceId={workspaceId}
                currentLessonId={lessonId}
                lessons={lessons}
              />
              <CopyResourceButton resourceId={item.id} />
              <EditResourceDialog
                resource={{
                  id: item.id,
                  title: item.title,
                  description: item.description,
                  type: item.type as ResourceType,
                  visibility: item.visibility,
                  externalUrl: item.external_url,
                }}
                workspaceId={workspaceId}
                collectionId={collectionId}
                lessonId={lessonId}
              />
              <DeleteResourceDialog resource={item} />
            </>
          )}
          {isDeleted && <RestoreButton resourceId={item.id} />}
        </div>
      </li>
    );
  }

  return (
    <div className="mt-8">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-56 flex-1">
          <Search
            aria-hidden="true"
            className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tìm theo tên, loại, thẻ…"
            aria-label="Tìm tài liệu"
            className="pl-8"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className={selectClass()}
          aria-label="Lọc theo loại"
        >
          <option value="all">Mọi loại</option>
          {Object.entries(TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={visibilityFilter}
          onChange={(e) => setVisibilityFilter(e.target.value)}
          className={selectClass()}
          aria-label="Lọc theo chế độ hiển thị"
        >
          <option value="all">Mọi chế độ</option>
          {Object.entries(VISIBILITY_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select
          value={sortKey}
          onChange={(e) => setSortKey(e.target.value as SortKey)}
          className={selectClass()}
          aria-label="Sắp xếp theo"
        >
          <option value="created">Ngày tạo</option>
          <option value="updated">Cập nhật</option>
          <option value="title">Tên</option>
          <option value="type">Loại</option>
        </select>
        <Button
          variant="outline"
          size="icon-sm"
          aria-label={sortDir === "asc" ? "Đang tăng dần" : "Đang giảm dần"}
          onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
        >
          {sortDir === "asc" ? "↑" : "↓"}
        </Button>
      </div>

      {selected.size > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-2">
          <span className="text-sm font-medium">
            Đã chọn {selected.size}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSelected(new Set())}
          >
            <X aria-hidden="true" />
            Bỏ chọn
          </Button>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  void runBulkMove(e.target.value);
                  e.target.value = "";
                }
              }}
              className={selectClass()}
              aria-label="Di chuyển các tài liệu đã chọn"
            >
              <option value="" disabled>
                Di chuyển đến…
              </option>
              {lessons
                .filter((lesson) => lesson.id !== lessonId)
                .map((lesson) => (
                  <option key={lesson.id} value={lesson.id}>
                    {lesson.name}
                  </option>
                ))}
            </select>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => void runBulkDelete()}
            >
              <Trash2 aria-hidden="true" />
              Xóa đã chọn
            </Button>
          </div>
        </div>
      )}

      {resources.length === 0 ? (
        <div className="mt-10 flex flex-col items-center gap-4 rounded-xl border border-dashed border-border py-16 text-center">
          <TypeIcon type="pdf" className="size-10" />
          <div>
            <p className="font-medium">Chưa có tài liệu</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Thêm liên kết ngoài hoặc tạo tài liệu để chuẩn bị tải tệp lên.
            </p>
          </div>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleAll}
            aria-label={allActiveSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
          >
            {allActiveSelected ? (
              <CheckSquare aria-hidden="true" />
            ) : (
              <Square aria-hidden="true" />
            )}
            {allActiveSelected ? "Bỏ chọn tất cả" : "Chọn tất cả"}
          </Button>
          <span>
            {visible.length}/{resources.length} tài liệu
          </span>
        </div>
      )}

      {resources.length > 0 && visible.length === 0 && (
        <p className="mt-6 text-sm text-muted-foreground">
          Không có tài liệu nào khớp bộ lọc.
        </p>
      )}

      {visible.length > 0 && (
        <ul className="mt-3 flex flex-col gap-3">
          {visible.map((item) => (
            <Card key={item.id} item={item} isDeleted={false} />
          ))}
        </ul>
      )}

      {deletedResources.length > 0 && (
        <section className="mt-10">
          <h2 className="text-sm font-medium text-muted-foreground">
            Đã xóa ({deletedResources.length})
          </h2>
          <ul className="mt-3 flex flex-col gap-3">
            {deletedResources.map((item) => (
              <Card key={item.id} item={item} isDeleted={true} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}