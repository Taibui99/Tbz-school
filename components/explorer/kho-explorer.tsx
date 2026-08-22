"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Check,
  ChevronRight,
  Folder,
  FolderOpen,
  Library,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { CreateWorkspaceDialog } from "@/components/workspace/workspace-dialogs";
import {
  createCollectionNodeAction,
  createLessonNodeAction,
  deleteCollectionNodeAction,
  deleteLessonNodeAction,
  deleteWorkspaceNodeAction,
  renameCollectionNodeAction,
  renameLessonNodeAction,
  renameWorkspaceNodeAction,
} from "@/lib/explorer/actions";
import { deleteResourceAction } from "@/lib/resource/actions";
import { finalizeUploadAction, quickUploadSessionAction } from "@/lib/upload/actions";
import { formatBytes, putWithProgress, sha256Hex } from "@/lib/upload/client-upload";
import { MAX_FILE_SIZE_BYTES, resourceTypeFromFileName } from "@/lib/upload/validate";
import {
  expandedIdsForSelection,
  selectionToQuery,
  type ExplorerCollection,
  type ExplorerFile,
  type ExplorerLesson,
  type ExplorerSelection,
  type ExplorerWorkspace,
} from "./types";
import { TypeIcon } from "@/components/resource/type-icon";

const UPLOAD_ACCEPT =
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.svg,.mp4,.webm,.mov,.mp3,.wav,.ogg,.txt,.md,.csv";

type QueueStatus =
  | "queued"
  | "preparing"
  | "uploading"
  | "verifying"
  | "done"
  | "error";

type QueueItem = {
  key: string;
  name: string;
  size: number;
  file: File;
  status: QueueStatus;
  progress: number;
  error?: string;
};

type DeleteTarget =
  | { kind: "workspace"; id: string; name: string }
  | { kind: "collection"; id: string; name: string; workspaceId: string }
  | { kind: "lesson"; id: string; name: string; workspaceId: string }
  | { kind: "file"; id: string; name: string; workspaceId: string };

let tempCounter = 0;

export function KhoExplorer({
  workspaces,
  selection,
}: {
  workspaces: ExplorerWorkspace[];
  selection: ExplorerSelection;
}) {
  const router = useRouter();
  const [tree, setTree] = useState<ExplorerWorkspace[]>(workspaces);
  const [selected, setSelected] = useState<ExplorerSelection>(selection);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(expandedIdsForSelection(selection)),
  );
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [, startTransition] = useTransition();

  // Đồng bộ state local với dữ liệu mới từ server sau router.refresh()/điều hướng
  // (pattern "adjust state when props change" — setState trong render, không dùng effect).
  const [prevServer, setPrevServer] = useState({ workspaces, selection });
  if (prevServer.workspaces !== workspaces || prevServer.selection !== selection) {
    setPrevServer({ workspaces, selection });
    setTree(workspaces);
    setSelected(selection);
  }

  const navigate = useCallback(
    (next: ExplorerSelection) => {
      setSelected(next);
      setExpanded((prev) => {
        const merged = new Set(prev);
        for (const id of expandedIdsForSelection(next)) merged.add(id);
        return merged;
      });
      startTransition(() => {
        router.replace(`/kho${selectionToQuery(next)}`, { scroll: false });
      });
    },
    [router],
  );

  // ---------- Mutations ----------

  async function handleCreateChild(
    parent:
      | { kind: "workspace"; workspaceId: string }
      | { kind: "collection"; workspaceId: string; collectionId: string },
  ) {
    const tempId = `temp-${++tempCounter}`;
    if (parent.kind === "workspace") {
      setTree((prev) =>
        prev.map((ws) =>
          ws.id === parent.workspaceId
            ? {
                ...ws,
                collections: [
                  ...ws.collections,
                  { kind: "collection", id: tempId, workspaceId: ws.id, name: "", lessons: [] },
                ],
              }
            : ws,
        ),
      );
      setExpanded((prev) => new Set(prev).add(parent.workspaceId));
    } else {
      setTree((prev) =>
        prev.map((ws) =>
          ws.id === parent.workspaceId
            ? {
                ...ws,
                collections: ws.collections.map((col) =>
                  col.id === parent.collectionId
                    ? {
                        ...col,
                        lessons: [
                          ...col.lessons,
                          {
                            kind: "lesson",
                            id: tempId,
                            workspaceId: ws.id,
                            collectionId: col.id,
                            name: "",
                            files: [],
                          },
                        ],
                      }
                    : col,
                ),
              }
            : ws,
        ),
      );
      setExpanded((prev) => new Set(prev).add(parent.collectionId));
    }
    setRenamingId(tempId);

    const formData = new FormData();
    formData.set("workspaceId", parent.workspaceId);
    if (parent.kind === "collection") {
      formData.set("collectionId", parent.collectionId);
    }
    const result = parent.kind === "workspace"
      ? await createCollectionNodeAction(formData)
      : await createLessonNodeAction(formData);

    if (result.error || !result.id) {
      removeTempNode(tempId);
      setRenamingId(null);
      return;
    }

    const realId = result.id;
    const swapId = (id: string) => (id === tempId ? realId : id);

    setTree((prev) =>
      prev.map((ws) => ({
        ...ws,
        collections: ws.collections.map((col) => ({
          ...col,
          id: swapId(col.id),
          lessons: col.lessons.map((les) => ({
            ...les,
            id: swapId(les.id),
            collectionId: swapId(les.collectionId),
          })),
        })),
      })),
    );
    setRenamingId(realId);

    if (parent.kind === "workspace") {
      navigate({ w: parent.workspaceId, c: realId });
    } else {
      navigate({ w: parent.workspaceId, c: parent.collectionId, l: realId });
    }
  }

  const removeTempNode = useCallback((tempId: string) => {
    setTree((prev) =>
      prev.map((ws) => ({
        ...ws,
        collections: ws.collections
          .filter((col) => col.id !== tempId)
          .map((col) => ({
            ...col,
            lessons: col.lessons.filter((les) => les.id !== tempId),
          })),
      })),
    );
    setSelected((prev) => ({
      w: prev.w,
      c: prev.c === tempId ? undefined : prev.c,
      l: prev.l === tempId ? undefined : prev.l,
    }));
  }, []);

  async function handleRename(kind: string, id: string, name: string) {
    const formData = new FormData();
    formData.set("id", id);
    formData.set("name", name);
    const wsId = findWorkspaceIdOf(tree, id);
    if (kind !== "workspace" && wsId) formData.set("workspaceId", wsId);

    const action =
      kind === "workspace"
        ? renameWorkspaceNodeAction
        : kind === "collection"
          ? renameCollectionNodeAction
          : renameLessonNodeAction;
    const result = await action(formData);
    if (result.error || !result.name) return;

    setTree((prev) =>
      prev.map((ws) =>
        ws.id === id
          ? { ...ws, name: result.name! }
          : {
              ...ws,
              collections: ws.collections.map((col) =>
                col.id === id
                  ? { ...col, name: result.name! }
                  : {
                      ...col,
                      lessons: col.lessons.map((les) =>
                        les.id === id ? { ...les, name: result.name! } : les,
                      ),
                    },
              ),
            },
      ),
    );
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleteTarget(null);

    const formData = new FormData();
    formData.set("id", target.id);
    if (target.kind !== "workspace") {
      formData.set("workspaceId", target.workspaceId);
    }
    const action =
      target.kind === "workspace"
        ? deleteWorkspaceNodeAction
        : target.kind === "collection"
          ? deleteCollectionNodeAction
          : target.kind === "lesson"
            ? deleteLessonNodeAction
            : deleteResourceAction;
    await action(formData);

    if (target.kind === "file") {
      setTree((prev) =>
        prev.map((ws) => ({
          ...ws,
          collections: ws.collections.map((col) => ({
            ...col,
            lessons: col.lessons.map((les) =>
              les.files.some((file) => file.id === target.id)
                ? {
                    ...les,
                    files: les.files.filter((file) => file.id !== target.id),
                  }
                : les,
            ),
          })),
        })),
      );
      return;
    }

    let parentCollectionId: string | undefined;
    if (target.kind === "lesson") {
      for (const ws of tree) {
        for (const col of ws.collections) {
          if (col.lessons.some((les) => les.id === target.id)) {
            parentCollectionId = col.id;
            break;
          }
        }
      }
    }

    const prevSelection = selected;
    let next: ExplorerSelection = prevSelection;
    if (target.kind === "workspace" && prevSelection.w === target.id) {
      next = {};
    } else if (
      target.kind === "collection" &&
      prevSelection.c === target.id
    ) {
      next = { w: prevSelection.w };
    } else if (target.kind === "lesson" && prevSelection.l === target.id) {
      next = { w: prevSelection.w, c: parentCollectionId };
    }

    if (target.kind === "workspace") {
      setTree((prev) => prev.filter((ws) => ws.id !== target.id));
    } else if (target.kind === "collection") {
      setTree((prev) =>
        prev.map((ws) =>
          ws.id === target.workspaceId
            ? {
                ...ws,
                collections: ws.collections.filter((col) => col.id !== target.id),
              }
            : ws,
        ),
      );
    } else {
      setTree((prev) =>
        prev.map((ws) =>
          ws.id === target.workspaceId
            ? {
                ...ws,
                collections: ws.collections.map((col) =>
                  col.id === parentCollectionId
                    ? {
                        ...col,
                        lessons: col.lessons.filter((les) => les.id !== target.id),
                      }
                    : col,
                ),
              }
            : ws,
        ),
      );
    }

    setSelected(next);
    startTransition(() => {
      router.replace(`/kho${selectionToQuery(next)}`, { scroll: false });
    });
  }

  // ---------- Upload queue ----------

  const enqueueFiles = useCallback(
    (files: File[]) => {
      if (!selected.w) return;
      const items: QueueItem[] = files.map((file) => {
        const key = `${file.name}-${file.size}-${Date.now()}-${Math.random()}`;
        if (!resourceTypeFromFileName(file.name)) {
          return {
            key,
            name: file.name,
            size: file.size,
            file,
            status: "error" as const,
            progress: 0,
            error: "Loại tệp không hỗ trợ.",
          };
        }
        if (!isVideoName(file.name) && file.size > MAX_FILE_SIZE_BYTES) {
          return {
            key,
            name: file.name,
            size: file.size,
            file,
            status: "error" as const,
            progress: 0,
            error: `Tệp quá lớn (tối đa ${Math.round(MAX_FILE_SIZE_BYTES / 1024 / 1024)} MB).`,
          };
        }
        return {
          key,
          name: file.name,
          size: file.size,
          file,
          status: "queued" as const,
          progress: 0,
        };
      });
      if (items.length > 0) setQueue((prev) => [...prev, ...items]);
    },
    [selected.w],
  );

  const updateItem = useCallback((key: string, patch: Partial<QueueItem>) => {
    setQueue((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...patch } : item)),
    );
  }, []);

  const busyRef = useRef(false);
  const syncedRef = useRef(true);

  useEffect(() => {
    if (busyRef.current) return;
    const next = queue.find((item) => item.status === "queued");
    if (!next) return;
    busyRef.current = true;
    syncedRef.current = false;
    void uploadOne(next, selected, updateItem, setTree).finally(() => {
      busyRef.current = false;
    });
  }, [queue, selected, updateItem]);

  useEffect(() => {
    if (syncedRef.current || queue.length === 0) return;
    const settled = queue.every(
      (item) => item.status === "done" || item.status === "error",
    );
    if (!settled) return;
    syncedRef.current = true;
    startTransition(() => {
      router.replace(`/kho${selectionToQuery(selected)}`, { scroll: false });
    });
  }, [queue, selected, router]);

  // ---------- Render ----------

  return (
    <div className="flex gap-6">
      <aside className="hidden w-72 shrink-0 md:block">
        <div className="sticky top-16 max-h-[calc(100vh-5rem)] overflow-y-auto glass-panel rounded-2xl p-2">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
              Kho của tôi
            </span>
            <CreateWorkspaceDialog />
          </div>
          {tree.length === 0 && (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">
              Chưa có workspace nào.
            </p>
          )}
          <ul className="flex flex-col gap-0.5">
            {tree.map((ws) => (
              <TreeNodes
                key={ws.id}
                workspace={ws}
                depth={0}
                selected={selected}
                expanded={expanded}
                renamingId={renamingId}
                onToggle={toggleExpanded}
                onSelect={navigate}
                onRenameStart={setRenamingId}
                onRenameSave={handleRename}
                onRenameCancel={() => setRenamingId(null)}
                onCreateChild={handleCreateChild}
                onDelete={setDeleteTarget}
              />
            ))}
          </ul>
        </div>
      </aside>

      <section className="relative min-w-0 flex-1">
        <ContentPane
          tree={tree}
          selected={selected}
          renamingId={renamingId}
          onNavigate={navigate}
          onRenameStart={setRenamingId}
          onRenameSave={handleRename}
          onRenameCancel={() => setRenamingId(null)}
          onCreateChild={handleCreateChild}
          onDelete={setDeleteTarget}
          onPickFiles={(files) => {
            enqueueFiles(files);
          }}
          dropEnabled={Boolean(selected.w)}
          dragging={dragging}
          setDragging={setDragging}
        />

        {queue.length > 0 && (
          <UploadQueuePanel
            items={queue}
            onDismiss={(key) =>
              setQueue((prev) => prev.filter((item) => item.key !== key))
            }
            onClearDone={() =>
              setQueue((prev) =>
                prev.filter(
                  (item) => item.status !== "done" && item.status !== "error",
                ),
              )
            }
          />
        )}

        {dragging && (
          <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center rounded-xl border-2 border-dashed border-primary bg-primary/5 backdrop-blur-[1px] animate-in fade-in duration-150">
            <div className="flex flex-col items-center gap-2 text-primary">
              <UploadCloud className="size-10" aria-hidden="true" />
              <p className="text-sm font-medium">Thả tệp để tải lên</p>
            </div>
          </div>
        )}
      </section>

      <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Xóa {deleteTargetLabel(deleteTarget)}?</DialogTitle>
            <DialogDescription>{deleteTargetDescription(deleteTarget)}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Hủy
            </Button>
            <Button variant="destructive" onClick={() => void confirmDelete()}>
              <Trash2 aria-hidden="true" />
              Xóa
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );

  function toggleExpanded(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
}

// ---------- Helpers ----------

function isVideoName(name: string): boolean {
  return /\.(mp4|webm|mov)$/i.test(name);
}

function findWorkspaceIdOf(
  tree: ExplorerWorkspace[],
  nodeId: string,
): string | null {
  for (const ws of tree) {
    if (ws.id === nodeId) return ws.id;
    for (const col of ws.collections) {
      if (col.id === nodeId) return ws.id;
      if (col.lessons.some((les) => les.id === nodeId)) return ws.id;
    }
  }
  return null;
}

async function uploadOne(
  item: QueueItem,
  selected: ExplorerSelection,
  updateItem: (key: string, patch: Partial<QueueItem>) => void,
  setTree: React.Dispatch<React.SetStateAction<ExplorerWorkspace[]>>,
) {
  const file = item.file;
  updateItem(item.key, { status: "preparing" });

  const formData = new FormData();
  formData.set("workspaceId", selected.w ?? "");
  formData.set("collectionId", selected.c ?? "");
  formData.set("lessonId", selected.l ?? "");
  formData.set("fileName", file.name);
  formData.set("sizeBytes", String(file.size));

  let session: Awaited<ReturnType<typeof quickUploadSessionAction>>;
  try {
    session = await quickUploadSessionAction(formData);
  } catch {
    updateItem(item.key, { status: "error", error: "Không tạo được phiên tải lên." });
    return;
  }
  if (session.error || !session.uploadUrl || !session.key || !session.resourceId) {
    updateItem(item.key, {
      status: "error",
      error: session.error ?? "Không tạo được phiên tải lên.",
    });
    return;
  }

  const isYoutube = session.video === true;
  const contentType =
    isYoutube && session.mime ? session.mime : file.type || guessMimeType(file.name);

  updateItem(item.key, { status: "uploading" });
  const putResult = await putWithProgress(
    session.uploadUrl,
    file,
    contentType,
    (percent) => updateItem(item.key, { progress: percent }),
  );

  updateItem(item.key, { status: "verifying" });
  const finalForm = new FormData();
  finalForm.set("resourceId", session.resourceId);
  finalForm.set("key", session.key);
  finalForm.set("sizeBytes", String(file.size));
  finalForm.set("mime", contentType);

  if (isYoutube) {
    finalForm.set("uploadUrl", session.uploadUrl);
  } else {
    if (!putResult.ok) {
      updateItem(item.key, {
        status: "error",
        error:
          putResult.status > 0
            ? `Tải lên thất bại (HTTP ${putResult.status}).`
            : "Tải lên thất bại — kiểm tra kết nối và thử lại.",
      });
      return;
    }
    finalForm.set("sha256", await sha256Hex(await file.arrayBuffer()));
  }

  const result = await finalizeUploadAction(finalForm);
  if (result.error) {
    updateItem(item.key, { status: "error", error: result.error });
    return;
  }

  const explorerFile: ExplorerFile = {
    id: session.resourceId,
    title: titleFromName(file.name),
    type: resourceTypeFromFileName(file.name) ?? "text",
    visibility: "private",
    lifecycleState: "ready",
    youtubeId: null,
    externalUrl: null,
  };
  const lessonId = session.lessonId;
  if (lessonId) {
    setTree((prev) =>
      prev.map((ws) => ({
        ...ws,
        collections: ws.collections.map((col) => ({
          ...col,
          lessons: col.lessons.map((les) =>
            les.id === lessonId
              ? { ...les, files: [...les.files, explorerFile] }
              : les,
          ),
        })),
      })),
    );
  }
  updateItem(item.key, { status: "done", progress: 100 });
}

function guessMimeType(name: string): string {
  const ext = name.slice(name.lastIndexOf(".") + 1).toLowerCase();
  const map: Record<string, string> = {
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    gif: "image/gif",
    webp: "image/webp",
    svg: "image/svg+xml",
    mp4: "video/mp4",
    webm: "video/webm",
    mov: "video/quicktime",
    mp3: "audio/mpeg",
    wav: "audio/wav",
    ogg: "audio/ogg",
    txt: "text/plain",
    md: "text/markdown",
    csv: "text/csv",
  };
  return map[ext] ?? "application/octet-stream";
}

function titleFromName(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  const base = dot > 0 ? fileName.slice(0, dot) : fileName;
  return base.trim() || "Tài liệu không tên";
}

function deleteTargetLabel(target: DeleteTarget | null): string {
  switch (target?.kind) {
    case "workspace":
      return "workspace";
    case "collection":
      return "bộ sưu tập";
    case "lesson":
      return "bài học";
    case "file":
      return "tài liệu";
    default:
      return "";
  }
}

function deleteTargetDescription(target: DeleteTarget | null): string {
  switch (target?.kind) {
    case "workspace":
      return `Toàn bộ bộ sưu tập, bài học và tài liệu trong "${target.name}" sẽ bị xóa vĩnh viễn.`;
    case "collection":
      return `Các bài học và tài liệu trong bộ sưu tập "${target.name}" sẽ bị xóa vĩnh viễn.`;
    case "lesson":
      return `Tài liệu trong bài học "${target.name}" sẽ bị xóa vĩnh viễn.`;
    case "file":
      return `"${target.name}" sẽ chuyển vào thùng rác và có thể khôi phục sau.`;
    default:
      return "";
  }
}

// ---------- Tree ----------

type TreeHandlers = {
  selected: ExplorerSelection;
  expanded: Set<string>;
  renamingId: string | null;
  onToggle: (id: string) => void;
  onSelect: (selection: ExplorerSelection) => void;
  onRenameStart: (id: string) => void;
  onRenameSave: (kind: string, id: string, name: string) => Promise<void>;
  onRenameCancel: () => void;
  onCreateChild: (
    parent:
      | { kind: "workspace"; workspaceId: string }
      | { kind: "collection"; workspaceId: string; collectionId: string },
  ) => void;
  onDelete: (target: DeleteTarget) => void;
};

function TreeNodes({
  workspace,
  depth,
  ...handlers
}: { workspace: ExplorerWorkspace; depth: number } & TreeHandlers) {
  const isOpen = handlers.expanded.has(workspace.id);
  const isActive = handlers.selected.w === workspace.id && !handlers.selected.c;
  return (
    <li>
      <TreeRow
        icon={<Library className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
        label={workspace.name}
        depth={depth}
        active={isActive}
        open={isOpen}
        hasChildren={workspace.collections.length > 0}
        renaming={handlers.renamingId === workspace.id}
        onToggle={() => handlers.onToggle(workspace.id)}
        onSelect={() => handlers.onSelect({ w: workspace.id })}
        onRenameSave={(name) => handlers.onRenameSave("workspace", workspace.id, name)}
        onRenameCancel={handlers.onRenameCancel}
        menu={
          <NodeMenu
            items={[
              {
                label: "Thêm bộ sưu tập",
                icon: <Plus aria-hidden="true" />,
                onSelect: () => handlers.onCreateChild({ kind: "workspace", workspaceId: workspace.id }),
              },
              {
                label: "Đổi tên",
                icon: <Pencil aria-hidden="true" />,
                onSelect: () => handlers.onRenameStart(workspace.id),
              },
              {
                label: "Xóa workspace",
                icon: <Trash2 aria-hidden="true" />,
                destructive: true,
                onSelect: () =>
                  handlers.onDelete({ kind: "workspace", id: workspace.id, name: workspace.name }),
              },
            ]}
          />
        }
      />
      {isOpen &&
        workspace.collections.map((col) => (
          <CollectionNodes key={col.id} collection={col} depth={depth + 1} {...handlers} />
        ))}
    </li>
  );
}

function CollectionNodes({
  collection,
  depth,
  ...handlers
}: { collection: ExplorerCollection; depth: number } & TreeHandlers) {
  const isOpen = handlers.expanded.has(collection.id);
  const isActive =
    handlers.selected.c === collection.id && !handlers.selected.l;
  return (
    <li>
      <TreeRow
        icon={
          isOpen ? (
            <FolderOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          ) : (
            <Folder className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          )
        }
        label={collection.name}
        depth={depth}
        active={isActive}
        open={isOpen}
        hasChildren={collection.lessons.length > 0}
        renaming={handlers.renamingId === collection.id}
        onToggle={() => handlers.onToggle(collection.id)}
        onSelect={() =>
          handlers.onSelect({ w: collection.workspaceId, c: collection.id })
        }
        onRenameSave={(name) => handlers.onRenameSave("collection", collection.id, name)}
        onRenameCancel={handlers.onRenameCancel}
        menu={
          <NodeMenu
            items={[
              {
                label: "Thêm bài học",
                icon: <Plus aria-hidden="true" />,
                onSelect: () =>
                  handlers.onCreateChild({
                    kind: "collection",
                    workspaceId: collection.workspaceId,
                    collectionId: collection.id,
                  }),
              },
              {
                label: "Đổi tên",
                icon: <Pencil aria-hidden="true" />,
                onSelect: () => handlers.onRenameStart(collection.id),
              },
              {
                label: "Xóa bộ sưu tập",
                icon: <Trash2 aria-hidden="true" />,
                destructive: true,
                onSelect: () =>
                  handlers.onDelete({
                    kind: "collection",
                    id: collection.id,
                    name: collection.name,
                    workspaceId: collection.workspaceId,
                  }),
              },
            ]}
          />
        }
      />
      {isOpen &&
        collection.lessons.map((lesson) => (
          <LessonRow key={lesson.id} lesson={lesson} depth={depth + 1} {...handlers} />
        ))}
    </li>
  );
}

function LessonRow({
  lesson,
  depth,
  ...handlers
}: { lesson: ExplorerLesson; depth: number } & TreeHandlers) {
  const isActive = handlers.selected.l === lesson.id;
  return (
    <li>
      <TreeRow
        icon={<BookOpen className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />}
        label={lesson.name}
        depth={depth}
        active={isActive}
        open={false}
        hasChildren={false}
        renaming={handlers.renamingId === lesson.id}
        onToggle={() => undefined}
        onSelect={() =>
          handlers.onSelect({
            w: lesson.workspaceId,
            c: lesson.collectionId,
            l: lesson.id,
          })
        }
        onRenameSave={(name) => handlers.onRenameSave("lesson", lesson.id, name)}
        onRenameCancel={handlers.onRenameCancel}
        menu={
          <NodeMenu
            items={[
              {
                label: "Đổi tên",
                icon: <Pencil aria-hidden="true" />,
                onSelect: () => handlers.onRenameStart(lesson.id),
              },
              {
                label: "Xóa bài học",
                icon: <Trash2 aria-hidden="true" />,
                destructive: true,
                onSelect: () =>
                  handlers.onDelete({
                    kind: "lesson",
                    id: lesson.id,
                    name: lesson.name,
                    workspaceId: lesson.workspaceId,
                  }),
              },
            ]}
          />
        }
      />
    </li>
  );
}

function TreeRow({
  icon,
  label,
  depth,
  active,
  open,
  hasChildren,
  renaming,
  onToggle,
  onSelect,
  onRenameSave,
  onRenameCancel,
  menu,
}: {
  icon: React.ReactNode;
  label: string;
  depth: number;
  active: boolean;
  open: boolean;
  hasChildren: boolean;
  renaming: boolean;
  onToggle: () => void;
  onSelect: () => void;
  onRenameSave: (name: string) => Promise<void>;
  onRenameCancel: () => void;
  menu: React.ReactNode;
}) {
  const [busy, setBusy] = useState(false);

  if (renaming) {
    return (
      <div className="px-1 py-0.5" style={{ paddingLeft: `${depth * 14 + 4}px` }}>
        <InlineNameInput
          initial={label}
          busy={busy}
          onSave={async (name) => {
            setBusy(true);
            await onRenameSave(name);
            setBusy(false);
            onRenameCancel();
          }}
          onCancel={onRenameCancel}
        />
      </div>
    );
  }

  return (
    <div
      className={`group flex items-center gap-0.5 rounded-md pr-1 transition-colors hover:bg-muted ${
        active ? "bg-muted font-medium" : ""
      }`}
      style={{ paddingLeft: `${depth * 14}px` }}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-1.5 rounded-md px-1.5 py-1.5 text-left text-sm"
      >
        {hasChildren ? (
          <ChevronRight
            aria-hidden="true"
            onClick={(event) => {
              event.stopPropagation();
              onToggle();
            }}
            className={`size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ${
              open ? "rotate-90" : ""
            }`}
          />
        ) : (
          <span className="size-3.5 shrink-0" />
        )}
        {icon}
        <span className="truncate">{label}</span>
      </button>
      <span className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        {menu}
      </span>
    </div>
  );
}

function NodeMenu({
  items,
}: {
  items: {
    label: string;
    icon?: React.ReactNode;
    destructive?: boolean;
    onSelect: () => void;
  }[];
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Tùy chọn" />}>
        <MoreVertical aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            variant={item.destructive ? "destructive" : "default"}
            onClick={() => item.onSelect()}
          >
            {item.icon}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function InlineNameInput({
  initial,
  busy,
  onSave,
  onCancel,
}: {
  initial: string;
  busy: boolean;
  onSave: (name: string) => void | Promise<void>;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(initial);
  const submittedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    inputRef.current?.select();
  }, []);

  function submit() {
    if (submittedRef.current) return;
    const trimmed = value.trim();
    if (!trimmed) {
      onCancel();
      return;
    }
    if (trimmed === initial.trim()) {
      onCancel();
      return;
    }
    submittedRef.current = true;
    void onSave(trimmed);
  }

  return (
    <Input
      ref={inputRef}
      value={value}
      disabled={busy}
      onChange={(event) => setValue(event.target.value)}
      onBlur={submit}
      onKeyDown={(event) => {
        if (event.key === "Enter") submit();
        if (event.key === "Escape") onCancel();
      }}
      aria-label="Tên thư mục"
      maxLength={100}
      className="h-7 py-1 text-sm"
    />
  );
}

// ---------- Content pane ----------

function ContentPane({
  tree,
  selected,
  renamingId,
  onNavigate,
  onRenameStart,
  onRenameSave,
  onRenameCancel,
  onCreateChild,
  onDelete,
  onPickFiles,
  dropEnabled,
  dragging,
  setDragging,
}: {
  tree: ExplorerWorkspace[];
  selected: ExplorerSelection;
  renamingId: string | null;
  onNavigate: (selection: ExplorerSelection) => void;
  onRenameStart: (id: string) => void;
  onRenameSave: (kind: string, id: string, name: string) => Promise<void>;
  onRenameCancel: () => void;
  onCreateChild: (
    parent:
      | { kind: "workspace"; workspaceId: string }
      | { kind: "collection"; workspaceId: string; collectionId: string },
  ) => void;
  onDelete: (target: DeleteTarget) => void;
  onPickFiles: (files: File[]) => void;
  dropEnabled: boolean;
  dragging: boolean;
  setDragging: (dragging: boolean) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const workspace = tree.find((item) => item.id === selected.w);
  const collection = workspace?.collections.find(
    (item) => item.id === selected.c,
  );
  const lesson = collection?.lessons.find((item) => item.id === selected.l);
  const dragDepthRef = useRef(0);

  const crumbs: { label: string; selection?: ExplorerSelection }[] = [
    { label: "Kho của tôi", selection: {} },
  ];
  if (workspace) {
    crumbs.push({ label: workspace.name, selection: { w: workspace.id } });
  }
  if (collection) {
    crumbs.push({
      label: collection.name,
      selection: { w: workspace!.id, c: collection.id },
    });
  }
  if (lesson) {
    crumbs.push({
      label: lesson.name,
      selection: {
        w: workspace!.id,
        c: collection!.id,
        l: lesson.id,
      },
    });
  }

  return (
    <div
      className={
        dragging
          ? "rounded-xl border border-dashed border-primary/60 bg-primary/5 ring-2 ring-primary/30 transition-colors"
          : "glass-panel rounded-2xl transition-colors"
      }
      onDragEnter={(event) => {
        if (!dropEnabled) return;
        event.preventDefault();
        dragDepthRef.current += 1;
        setDragging(true);
      }}
      onDragOver={(event) => {
        if (!dropEnabled) return;
        event.preventDefault();
      }}
      onDragLeave={() => {
        dragDepthRef.current -= 1;
        if (dragDepthRef.current <= 0) {
          dragDepthRef.current = 0;
          setDragging(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepthRef.current = 0;
        setDragging(false);
        if (!dropEnabled) return;
        const files = Array.from(event.dataTransfer.files ?? []);
        if (files.length > 0) onPickFiles(files);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={UPLOAD_ACCEPT}
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          if (files.length > 0) onPickFiles(files);
        }}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-4">
        <nav aria-label="Breadcrumb" className="min-w-0">
          <ol className="flex min-w-0 items-center gap-1 text-sm">
            {crumbs.map((crumb, index) => (
              <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-1">
                {index > 0 && (
                  <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" aria-hidden="true" />
                )}
                {crumb.selection ? (
                  <button
                    type="button"
                    onClick={() => onNavigate(crumb.selection!)}
                    className={`truncate rounded px-1 py-0.5 transition-colors hover:bg-muted ${
                      index === crumbs.length - 1 ? "font-semibold" : "text-muted-foreground"
                    }`}
                  >
                    {crumb.label}
                  </button>
                ) : (
                  <span className="truncate">{crumb.label}</span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="flex items-center gap-2">
          {workspace && !collection && (
            <Button size="sm" onClick={() => onCreateChild({ kind: "workspace", workspaceId: workspace.id })}>
              <Plus aria-hidden="true" />
              Tạo thư mục
            </Button>
          )}
          {collection && !lesson && (
            <Button
              size="sm"
              onClick={() =>
                onCreateChild({
                  kind: "collection",
                  workspaceId: workspace!.id,
                  collectionId: collection.id,
                })
              }
            >
              <Plus aria-hidden="true" />
              Tạo thư mục
            </Button>
          )}
          {selected.w && (
            <Button size="sm" variant="outline" onClick={() => inputRef.current?.click()}>
              <UploadCloud aria-hidden="true" />
              Tải tệp lên
            </Button>
          )}
        </div>
      </div>

      {!workspace && <WorkspaceGrid tree={tree} onNavigate={onNavigate} />}

      {workspace && !collection && (
        <FolderGrid
          emptyText="Chưa có bộ sưu tập nào."
          folders={workspace.collections.map((col) => ({
            id: col.id,
            name: col.name,
            count: `${col.lessons.length} bài học`,
          }))}
          renamingId={renamingId}
          onOpen={(id) => onNavigate({ w: workspace.id, c: id })}
          onRenameSave={(id, name) => onRenameSave("collection", id, name)}
          onRenameCancel={onRenameCancel}
          menu={(id) => (
            <NodeMenu
              items={[
                {
                  label: "Đổi tên",
                  icon: <Pencil aria-hidden="true" />,
                  onSelect: () => onRenameStart(id),
                },
                {
                  label: "Xóa bộ sưu tập",
                  icon: <Trash2 aria-hidden="true" />,
                  destructive: true,
                  onSelect: () => {
                    const col = workspace.collections.find((item) => item.id === id);
                    if (col) {
                      onDelete({
                        kind: "collection",
                        id: col.id,
                        name: col.name,
                        workspaceId: workspace.id,
                      });
                    }
                  },
                },
              ]}
            />
          )}
        />
      )}

      {collection && !lesson && (
        <FolderGrid
          emptyText="Chưa có bài học nào."
          folders={collection.lessons.map((les) => ({
            id: les.id,
            name: les.name,
            count: `${les.files.length} tài liệu`,
          }))}
          renamingId={renamingId}
          onOpen={(id) => onNavigate({ w: workspace!.id, c: collection.id, l: id })}
          onRenameSave={(id, name) => onRenameSave("lesson", id, name)}
          onRenameCancel={onRenameCancel}
          menu={(id) => (
            <NodeMenu
              items={[
                {
                  label: "Đổi tên",
                  icon: <Pencil aria-hidden="true" />,
                  onSelect: () => onRenameStart(id),
                },
                {
                  label: "Xóa bài học",
                  icon: <Trash2 aria-hidden="true" />,
                  destructive: true,
                  onSelect: () => {
                    const les = collection.lessons.find((item) => item.id === id);
                    if (les) {
                      onDelete({
                        kind: "lesson",
                        id: les.id,
                        name: les.name,
                        workspaceId: workspace!.id,
                      });
                    }
                  },
                },
              ]}
            />
          )}
        />
      )}

      {lesson && (
        <FileList
          files={lesson.files}
          href={(fileId) =>
            `/kho/${workspace!.id}/${collection!.id}/${lesson.id}/${fileId}`
          }
          onDelete={(file) =>
            onDelete({
              kind: "file",
              id: file.id,
              name: file.title,
              workspaceId: workspace!.id,
            })
          }
        />
      )}
    </div>
  );
}

function WorkspaceGrid({
  tree,
  onNavigate,
}: {
  tree: ExplorerWorkspace[];
  onNavigate: (selection: ExplorerSelection) => void;
}) {
  if (tree.length === 0) {
    return (
      <EmptyHint text="Chưa có workspace nào — tạo workspace đầu tiên ở góc trên bên trái." />
    );
  }
  return (
    <ul className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
      {tree.map((ws) => (
        <li key={ws.id}>
          <button
            type="button"
            onClick={() => onNavigate({ w: ws.id })}
            className="group flex w-full items-center gap-3 rounded-lg border border-border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm animate-in fade-in slide-in-from-bottom-1 duration-300"
          >
            <Library className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{ws.name}</span>
              <span className="block text-xs text-muted-foreground">
                {ws.collections.length} bộ sưu tập
              </span>
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function FolderGrid({
  folders,
  emptyText,
  renamingId,
  onOpen,
  onRenameSave,
  onRenameCancel,
  menu,
}: {
  folders: { id: string; name: string; count: string }[];
  emptyText: string;
  renamingId: string | null;
  onOpen: (id: string) => void;
  onRenameSave: (id: string, name: string) => Promise<void>;
  onRenameCancel: () => void;
  menu: (id: string) => React.ReactNode;
}) {
  if (folders.length === 0) {
    return <EmptyHint text={emptyText} />;
  }
  return (
    <ul className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
      {folders.map((folder) => (
        <li key={folder.id} className="animate-in fade-in slide-in-from-bottom-1 duration-300">
          {renamingId === folder.id ? (
            <div className="p-3">
              <InlineNameInput
                initial={folder.name}
                busy={false}
                onSave={(name) => onRenameSave(folder.id, name)}
                onCancel={onRenameCancel}
              />
            </div>
          ) : (
            <div className="group flex items-center gap-2 rounded-lg border border-border p-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm">
              <button
                type="button"
                onClick={() => onOpen(folder.id)}
                className="flex min-w-0 flex-1 items-center gap-3 text-left"
              >
                <Folder className="size-5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium">{folder.name}</span>
                  <span className="block text-xs text-muted-foreground">{folder.count}</span>
                </span>
              </button>
              {menu(folder.id)}
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

function FileList({
  files,
  href,
  onDelete,
}: {
  files: ExplorerFile[];
  href: (fileId: string) => string;
  onDelete: (file: ExplorerFile) => void;
}) {
  if (files.length === 0) {
    return (
      <EmptyHint text="Bài học chưa có tài liệu — kéo thả tệp vào đây hoặc bấm “Tải tệp lên”." />
    );
  }
  return (
    <ul className="flex flex-col p-2">
      {files.map((file) => (
        <li
          key={file.id}
          className="group flex items-center gap-3 rounded-lg px-2 py-2 transition-colors animate-in fade-in slide-in-from-bottom-1 duration-300 hover:bg-muted"
        >
          <TypeIcon type={file.type} className="size-5 shrink-0" />
          <Link
            href={href(file.id)}
            className="min-w-0 flex-1 truncate text-sm hover:underline"
          >
            {file.title}
          </Link>
          <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
            {file.lifecycleState === "ready" ? "Sẵn sàng" : file.lifecycleState}
          </span>
          <span className="opacity-0 transition-opacity group-hover:opacity-100">
            <NodeMenu
              items={[
                {
                  label: "Mở tài liệu",
                  icon: <BookOpen aria-hidden="true" />,
                  onSelect: () => {
                    window.location.href = href(file.id);
                  },
                },
                {
                  label: "Xóa (vào thùng rác)",
                  icon: <Trash2 aria-hidden="true" />,
                  destructive: true,
                  onSelect: () => onDelete(file),
                },
              ]}
            />
          </span>
        </li>
      ))}
    </ul>
  );
}

function EmptyHint({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-16 text-center animate-in fade-in duration-300">
      <FolderOpen className="size-10 text-muted-foreground" aria-hidden="true" />
      <p className="text-sm text-muted-foreground">{text}</p>
    </div>
  );
}

function UploadQueuePanel({
  items,
  onDismiss,
  onClearDone,
}: {
  items: QueueItem[];
  onDismiss: (key: string) => void;
  onClearDone: () => void;
}) {
  const finished = items.every(
    (item) => item.status === "done" || item.status === "error",
  );
  return (
    <div className="fixed right-4 bottom-4 z-40 w-80 overflow-hidden rounded-xl border border-border bg-popover shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <span className="text-xs font-semibold text-muted-foreground uppercase">
          Đang tải lên
        </span>
        {finished && (
          <Button variant="ghost" size="xs" onClick={onClearDone}>
            Dọn dẹp
          </Button>
        )}
      </div>
      <ul className="max-h-64 flex-col gap-2 overflow-y-auto p-3">
        {items.map((item) => (
          <li key={item.key} className="flex-col gap-1 animate-in fade-in slide-in-from-bottom-1 duration-200">
            <div className="flex items-center gap-2">
              {item.status === "done" ? (
                <Check className="size-4 shrink-0 text-emerald-600" aria-hidden="true" />
              ) : item.status === "error" ? (
                <X className="size-4 shrink-0 text-destructive" aria-hidden="true" />
              ) : (
                <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden="true" />
              )}
              <span className="min-w-0 flex-1 truncate text-sm">{item.name}</span>
              {(item.status === "done" || item.status === "error") && (
                <button
                  type="button"
                  onClick={() => onDismiss(item.key)}
                  aria-label="Ẩn"
                  className="text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              )}
            </div>
            {item.status === "uploading" && (
              <div className="ml-6 h-1 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-200"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
            )}
            <p className="ml-6 text-xs text-muted-foreground">
              {item.status === "error"
                ? item.error
                : item.status === "done"
                  ? `Đã tải lên · ${formatBytes(item.size)}`
                  : item.status === "uploading"
                    ? `${item.progress}% · ${formatBytes(item.size)}`
                    : QUEUE_LABELS[item.status]}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

const QUEUE_LABELS: Record<string, string> = {
  queued: "Đang chờ…",
  preparing: "Đang chuẩn bị…",
  uploading: "",
  verifying: "Đang xác minh…",
  done: "",
  error: "",
};
