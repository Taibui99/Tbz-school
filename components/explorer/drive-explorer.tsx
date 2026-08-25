"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronRight,
  FileText,
  Folder,
  FolderInput,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildFolderTree,
  ancestorsOf,
  subtreeIdsFromPaths,
  type FlatFolder,
} from "@/lib/folders/tree";
import {
  createFolderAction,
  moveFolderAction,
  renameFolderAction,
  setResourceFolderAction,
  trashFolderAction,
} from "@/lib/folders/actions";
import { deleteResourceAction } from "@/lib/resource/actions";
import { renameResourceNodeAction } from "@/lib/explorer/actions";
import { finalizeUploadAction, quickUploadSessionAction } from "@/lib/upload/actions";
import { formatBytes, putWithProgress, sha256Hex } from "@/lib/upload/client-upload";
import { MAX_FILE_SIZE_BYTES, resourceTypeFromFileName } from "@/lib/upload/validate";
import { TypeIcon } from "@/components/resource/type-icon";
import { FolderPicker } from "@/components/explorer/folder-picker";

const UPLOAD_ACCEPT =
  ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.svg,.mp4,.webm,.mov,.mp3,.wav,.ogg,.txt,.md,.csv";

export type DriveFolder = FlatFolder & { path: string };

export type DriveFile = {
  id: string;
  folderId: string | null;
  title: string;
  type: string;
  visibility: string;
  lifecycleState: string;
  youtubeId: string | null;
  externalUrl: string | null;
  sizeBytes?: number | null;
  createdAt?: string | null;
};

type NodeKind = "folder" | "file";

type CtxState = {
  x: number;
  y: number;
  kind: NodeKind;
  id: string;
};

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

function visibilityLabel(v: string): string {
  switch (v) {
    case "public":
      return "Công khai";
    case "unlisted":
      return "Có liên kết";
    case "shared":
      return "Đã chia sẻ";
    default:
      return "Riêng tư";
  }
}

export function DriveExplorer({
  folders,
  files,
  initialFolderId,
}: {
  folders: DriveFolder[];
  files: DriveFile[];
  initialFolderId: string | null;
}) {
  const router = useRouter();
  const pushToast = useToast();

  const [currentId, setCurrentId] = useState<string | null>(initialFolderId);
  const [expanded, setExpanded] = useState<Set<string>>(
    () => new Set(initialFolderId ? ancestorsOf(folders, initialFolderId) : []),
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<{ kind: NodeKind; id: string } | null>(
    null,
  );
  const [query, setQuery] = useState("");
  const [ctx, setCtx] = useState<CtxState | null>(null);
  const [moveNode, setMoveNode] = useState<{ kind: NodeKind; id: string } | null>(
    null,
  );
  const [deleteNode, setDeleteNode] = useState<{
    kind: NodeKind;
    id: string;
    name: string;
  } | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [osDragging, setOsDragging] = useState(false);

  const [queue, setQueue] = useState<QueueItem[]>([]);
  const queueRef = useRef(queue);
  queueRef.current = queue;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, startBusy] = useState(false);

  const folderById = useMemo(
    () => new Map(folders.map((f) => [f.id, f])),
    [folders],
  );
  const fileById = useMemo(() => new Map(files.map((f) => [f.id, f])), [files]);
  const tree = useMemo(() => buildFolderTree(folders), [folders]);

  const breadcrumbs = useMemo(() => {
    const chain: DriveFolder[] = [];
    let cursor = currentId ? folderById.get(currentId) : undefined;
    while (cursor) {
      chain.unshift(cursor);
      cursor = cursor.parentId ? folderById.get(cursor.parentId) : undefined;
    }
    return chain;
  }, [currentId, folderById]);

  const subFolders = useMemo(
    () =>
      folders
        .filter((f) => (f.parentId ?? null) === (currentId ?? null))
        .sort((a, b) => a.name.localeCompare(b.name, "vi")),
    [folders, currentId],
  );

  const levelFiles = useMemo(
    () =>
      files
        .filter((f) => (f.folderId ?? null) === (currentId ?? null))
        .sort((a, b) => a.title.localeCompare(b.title, "vi")),
    [files, currentId],
  );

  const filteredFolders = query.trim()
    ? subFolders.filter((f) =>
        f.name.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : subFolders;
  const filteredFiles = query.trim()
    ? levelFiles.filter((f) =>
        f.title.toLowerCase().includes(query.trim().toLowerCase()),
      )
    : levelFiles;

  const syncUrl = useCallback((folderId: string | null) => {
    const url = folderId ? `/kho?f=${encodeURIComponent(folderId)}` : "/kho";
    window.history.replaceState(null, "", url);
  }, []);

  const navigate = useCallback(
    (folderId: string | null) => {
      setCurrentId(folderId);
      setSelectedId(null);
      setQuery("");
      syncUrl(folderId);
      if (folderId) {
        setExpanded((prev) => new Set(prev).add(folderId));
      }
    },
    [syncUrl],
  );

  // ---------- Mutations ----------

  async function runCreateFolder(parentId: string | null) {
    startBusy(true);
    const fd = new FormData();
    if (parentId) fd.set("parentId", parentId);
    const result = await createFolderAction(fd);
    startBusy(false);
    if (result.error) {
      pushToast({ title: "Không tạo được thư mục", description: result.error, variant: "error" });
      return;
    }
    if (parentId) {
      setExpanded((prev) => new Set(prev).add(parentId));
    }
    navigate(parentId);
    if (result.id) {
      setSelectedId(result.id);
      // Đổi tên ngay sau khi router.refresh() kịp nạp thư mục mới.
      setTimeout(() => setRenaming({ kind: "folder", id: result.id! }), 60);
    }
    router.refresh();
  }

  async function runRename(kind: NodeKind, id: string, name: string) {
    if (!name.trim()) return;
    const fd = new FormData();
    fd.set("id", id);
    fd.set("name", name.trim());
    const result =
      kind === "folder"
        ? await renameFolderAction(fd)
        : await renameResourceNodeAction(fd);
    if (result.error) {
      pushToast({ title: "Đổi tên thất bại", description: result.error, variant: "error" });
    }
    router.refresh();
  }

  async function runTrash(node: { kind: NodeKind; id: string; name: string }) {
    startBusy(true);
    const fd = new FormData();
    fd.set("id", node.id);
    const result =
      node.kind === "folder"
        ? await trashFolderAction(fd)
        : await deleteResourceAction(fd);
    startBusy(false);
    if (result.error) {
      pushToast({ title: "Xóa thất bại", description: result.error, variant: "error" });
      return;
    }
    pushToast({
      title: node.kind === "folder" ? "Đã xóa thư mục" : "Đã xóa tài liệu",
      description: `"${node.name}" đã chuyển vào Thùng rác và có thể khôi phục.`,
      variant: "success",
    });
    setDeleteNode(null);
    router.refresh();
  }

  async function runMove(targetFolderId: string | null) {
    if (!moveNode) return;
    startBusy(true);
    const fd = new FormData();
    if (moveNode.kind === "folder") {
      fd.set("id", moveNode.id);
      if (targetFolderId) fd.set("targetParentId", targetFolderId);
      const result = await moveFolderAction(fd);
      startBusy(false);
      if (result.error) {
        pushToast({ title: "Di chuyển thất bại", description: result.error, variant: "error" });
        return;
      }
    } else {
      fd.set("resourceId", moveNode.id);
      if (targetFolderId) fd.set("targetFolderId", targetFolderId);
      const result = await setResourceFolderAction(fd);
      startBusy(false);
      if (result.error) {
        pushToast({ title: "Di chuyển thất bại", description: result.error, variant: "error" });
        return;
      }
    }
    pushToast({ title: "Đã di chuyển", variant: "success" });
    setMoveNode(null);
    router.refresh();
  }

  // ---------- Drag & drop ----------

  function handleInternalDrop(targetFolderId: string | null) {
    const sourceId = dragId;
    setDragId(null);
    setDropTargetId(null);
    if (!sourceId) return;
    const isFolder = folderById.has(sourceId);
    if (isFolder && targetFolderId === sourceId) return;
    if (!isFolder && targetFolderId === currentId) return;

    void (async () => {
      startBusy(true);
      const fd = new FormData();
      if (isFolder) {
        fd.set("id", sourceId);
        if (targetFolderId) fd.set("targetParentId", targetFolderId);
        const result = await moveFolderAction(fd);
        startBusy(false);
        if (result.error) {
          pushToast({ title: "Di chuyển thất bại", description: result.error, variant: "error" });
          return;
        }
        if (targetFolderId) setExpanded((prev) => new Set(prev).add(targetFolderId));
      } else {
        fd.set("resourceId", sourceId);
        if (targetFolderId) fd.set("targetFolderId", targetFolderId);
        const result = await setResourceFolderAction(fd);
        startBusy(false);
        if (result.error) {
          pushToast({ title: "Di chuyển thất bại", description: result.error, variant: "error" });
          return;
        }
      }
      router.refresh();
    })();
  }

  // ---------- Upload ----------

  function enqueueFiles(list: FileList | File[]) {
    const arr = Array.from(list);
    if (arr.length === 0) return;
    const newItems: QueueItem[] = arr.map((file) => ({
      key: `${file.name}-${file.size}-${Date.now()}-${Math.random()}`,
      name: file.name,
      size: file.size,
      file,
      status: "queued",
      progress: 0,
    }));
    setQueue((prev) => [...prev, ...newItems]);
    for (const item of newItems) {
      void processUpload(item);
    }
  }

  async function processUpload(item: QueueItem) {
    const update = (patch: Partial<QueueItem>) =>
      setQueue((prev) =>
        prev.map((q) => (q.key === item.key ? { ...q, ...patch } : q)),
      );

    const type = resourceTypeFromFileName(item.name);
    if (!type || type === "url") {
      update({
        status: "error",
        error: "Loại tệp không hỗ trợ.",
      });
      return;
    }
    if (
      type !== "video" &&
      item.size > MAX_FILE_SIZE_BYTES
    ) {
      update({ status: "error", error: "Tệp vượt giới hạn kích thước." });
      return;
    }

    update({ status: "preparing" });
    const fd = new FormData();
    fd.set("fileName", item.name);
    fd.set("sizeBytes", String(item.size));
    if (currentId) fd.set("folderId", currentId);
    try {
      fd.set("sha256", await sha256Hex(await item.file.arrayBuffer()));
    } catch {
      // bỏ qua hash — vẫn upload được
    }

    const session = await quickUploadSessionAction(fd);
    if (session.error || !session.uploadUrl || !session.resourceId) {
      update({ status: "error", error: session.error ?? "Không tạo được phiên tải lên." });
      return;
    }
    const resourceId = session.resourceId;

    if (session.duplicate) {
      update({ status: "done", progress: 100 });
      pushToast({
        title: "Đã thêm tài liệu",
        description: `${item.name} đã có trong kho — tái sử dụng bản cũ.`,
        variant: "success",
      });
      router.refresh();
      return;
    }

    update({ status: "uploading" });
    try {
      await putWithProgress(session.uploadUrl, item.file, "application/octet-stream", (progress) =>
        update({ progress }),
      );
    } catch {
      update({ status: "error", error: "Tải lên bị gián đoạn." });
      return;
    }

    update({ status: "verifying" });
    const verifyFd = new FormData();
    verifyFd.set("resourceId", resourceId);
    verifyFd.set("key", session.key ?? "");
    verifyFd.set("sizeBytes", String(item.size));
    try {
      verifyFd.set("sha256", await sha256Hex(await item.file.arrayBuffer()));
    } catch {
      // bỏ qua hash
    }
    const finalize = await finalizeUploadAction(verifyFd);
    if (finalize.error) {
      update({ status: "error", error: finalize.error });
      return;
    }
    update({ status: "done", progress: 100 });
    router.refresh();
  }

  // ---------- Keyboard (Windows-style) ----------

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        !selectedId ||
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement ||
        ctx ||
        moveNode ||
        deleteNode
      ) {
        return;
      }
      const kind: NodeKind = folderById.has(selectedId) ? "folder" : "file";
      if (event.key === "F2") {
        event.preventDefault();
        setRenaming({ kind, id: selectedId });
      } else if (event.key === "Delete") {
        event.preventDefault();
        const name =
          kind === "folder"
            ? folderById.get(selectedId)?.name
            : fileById.get(selectedId)?.title;
        if (name) setDeleteNode({ kind, id: selectedId, name });
      } else if (event.key === "Enter") {
        event.preventDefault();
        if (kind === "folder") navigate(selectedId);
        else router.push(`/tai-lieu/${selectedId}`);
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedId, ctx, moveNode, deleteNode, folderById, fileById, navigate, router]);

  useEffect(() => {
    if (!ctx) return;
    const close = () => setCtx(null);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCtx(null);
    };
    window.addEventListener("click", close);
    window.addEventListener("scroll", close, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("click", close);
      window.removeEventListener("scroll", close, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [ctx]);

  // ---------- Render helpers ----------

  function openCtx(event: React.MouseEvent, kind: NodeKind, id: string) {
    event.preventDefault();
    event.stopPropagation();
    setSelectedId(id);
    setCtx({ x: event.clientX, y: event.clientY, kind, id });
  }

  function ctxItems(state: CtxState) {
    const items: {
      label: string;
      icon: React.ReactNode;
      danger?: boolean;
      onSelect: () => void;
    }[] = [];

    if (state.kind === "folder") {
      items.push({
        label: "Mở",
        icon: <Folder className="size-4" aria-hidden="true" />,
        onSelect: () => navigate(state.id),
      });
    } else {
      items.push({
        label: "Mở để xem",
        icon: <FileText className="size-4" aria-hidden="true" />,
        onSelect: () => router.push(`/tai-lieu/${state.id}`),
      });
    }
    items.push({
      label: "Đổi tên (F2)",
      icon: <Pencil className="size-4" aria-hidden="true" />,
      onSelect: () => setRenaming({ kind: state.kind, id: state.id }),
    });
    items.push({
      label: "Di chuyển tới…",
      icon: <FolderInput className="size-4" aria-hidden="true" />,
      onSelect: () => setMoveNode({ kind: state.kind, id: state.id }),
    });
    items.push({
      label: "Chuyển vào thùng rác",
      icon: <Trash2 className="size-4" aria-hidden="true" />,
      danger: true,
      onSelect: () => {
        const name =
          state.kind === "folder"
            ? folderById.get(state.id)?.name
            : fileById.get(state.id)?.title;
        setDeleteNode({ kind: state.kind, id: state.id, name: name ?? "" });
      },
    });
    return items;
  }

  function renderRenameInput(kind: NodeKind, id: string, initial: string) {
    return (
      <input
        autoFocus
        defaultValue={initial}
        className="w-full rounded-lg border border-ring bg-background px-2 py-1 text-sm outline-none"
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={(event) => {
          event.stopPropagation();
          if (event.key === "Enter") {
            void runRename(kind, id, event.currentTarget.value);
            setRenaming(null);
          } else if (event.key === "Escape") {
            setRenaming(null);
          }
        }}
        onBlur={(event) => {
          void runRename(kind, id, event.currentTarget.value);
          setRenaming(null);
        }}
      />
    );
  }

  const dropProps = (targetFolderId: string) => ({
    onDragOver: (event: React.DragEvent) => {
      if (!dragId || dragId === targetFolderId) return;
      event.preventDefault();
      setDropTargetId(targetFolderId);
    },
    onDragLeave: () => setDropTargetId((prev) => (prev === targetFolderId ? null : prev)),
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      event.stopPropagation();
      handleInternalDrop(targetFolderId);
    },
  });

  // ---------- Tree ----------

  function TreeRows({ nodes }: { nodes: { id: string; name: string }[] }) {
    return (
      <>
        {nodes.map((node) => {
          const isOpen = expanded.has(node.id);
          const isActive = currentId === node.id;
          const childFolders = folders
            .filter((f) => f.parentId === node.id)
            .sort((a, b) => a.name.localeCompare(b.name, "vi"));
          const isDropping = dropTargetId === node.id;
          return (
            <div key={node.id}>
              <div
                role="treeitem"
                aria-expanded={childFolders.length > 0 ? isOpen : undefined}
                aria-selected={isActive}
                tabIndex={0}
                className={`flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm outline-none transition-colors ${
                  isActive
                    ? "bg-primary/15 font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                } ${isDropping ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""}`}
                onClick={() => navigate(node.id)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") navigate(node.id);
                }}
                onContextMenu={(event) => openCtx(event, "folder", node.id)}
                draggable={!renaming}
                onDragStart={() => setDragId(node.id)}
                onDragEnd={() => {
                  setDragId(null);
                  setDropTargetId(null);
                }}
                {...dropProps(node.id)}
              >
                <button
                  type="button"
                  aria-label={isOpen ? "Thu gọn" : "Mở rộng"}
                  className={`flex size-4 shrink-0 items-center justify-center rounded transition-transform ${
                    isOpen ? "rotate-90" : ""
                  } ${childFolders.length === 0 ? "invisible" : ""}`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setExpanded((prev) => {
                      const next = new Set(prev);
                      if (next.has(node.id)) next.delete(node.id);
                      else next.add(node.id);
                      return next;
                    });
                  }}
                >
                  <ChevronRight className="size-3.5" aria-hidden="true" />
                </button>
                <Folder
                  className="size-4 shrink-0 text-amber-400"
                  aria-hidden="true"
                />
                <span className="min-w-0 flex-1 truncate">
                  {renaming?.kind === "folder" && renaming.id === node.id ? (
                    renderRenameInput("folder", node.id, node.name)
                  ) : (
                    node.name
                  )}
                </span>
              </div>
              {isOpen && childFolders.length > 0 && (
                <div className="ml-4 border-l border-border pl-2">
                  <TreeRows nodes={childFolders} />
                </div>
              )}
            </div>
          );
        })}
      </>
    );
  }

  // ---------- Grid card ----------

  function Card({
    kind,
    id,
    name,
    meta,
    icon,
  }: {
    kind: NodeKind;
    id: string;
    name: string;
    meta: string;
    icon: React.ReactNode;
  }) {
    const isSelected = selectedId === id;
    const isDropping = dropTargetId === id;
    return (
      <div
        role="button"
        tabIndex={0}
        aria-label={name}
        className={`group relative flex min-w-0 cursor-pointer flex-col gap-2 rounded-2xl border bg-card/60 p-4 outline-none backdrop-blur transition-colors ${
          isSelected
            ? "border-primary/60 bg-primary/10"
            : "border-border/70 hover:border-primary/40"
        } ${isDropping ? "ring-2 ring-primary" : ""}`}
        onClick={() => setSelectedId(id)}
        onDoubleClick={() => {
          if (kind === "folder") navigate(id);
          else router.push(`/tai-lieu/${id}`);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            if (kind === "folder") navigate(id);
            else router.push(`/tai-lieu/${id}`);
          }
        }}
        onContextMenu={(event) => openCtx(event, kind, id)}
        draggable={!renaming}
        onDragStart={() => setDragId(id)}
        onDragEnd={() => {
          setDragId(null);
          setDropTargetId(null);
        }}
        {...(kind === "folder" ? dropProps(id) : {})}
      >
        <span className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Tuỳ chọn"
            onClick={(event) => {
              event.stopPropagation();
              const rect = event.currentTarget.getBoundingClientRect();
              setSelectedId(id);
              setCtx({ x: rect.left, y: rect.bottom + 4, kind, id });
            }}
          >
            <MoreVertical aria-hidden="true" />
          </Button>
        </span>
        {icon}
        <span className="min-w-0 break-words text-sm font-medium leading-snug">
          {renaming?.kind === kind && renaming.id === id ? (
            renderRenameInput(kind, id, name)
          ) : (
            name
          )}
        </span>
        <span className="text-xs text-muted-foreground">{meta}</span>
      </div>
    );
  }

  const activeCount = queue.filter((q) => q.status !== "done" && q.status !== "error").length;

  return (
    <div
      className="flex gap-6"
      onDragOver={(event) => {
        if (event.dataTransfer.types.includes("Files")) {
          event.preventDefault();
          setOsDragging(true);
        }
      }}
      onDragLeave={(event) => {
        if (event.currentTarget === event.target) setOsDragging(false);
      }}
      onDrop={(event) => {
        if (event.dataTransfer.files.length > 0) {
          event.preventDefault();
          enqueueFiles(event.dataTransfer.files);
        }
        setOsDragging(false);
      }}
    >
      {/* ---- Cây thư mục ---- */}
      <aside className="hidden w-72 shrink-0 md:block">
        <div className="glass-panel sticky top-16 max-h-[calc(100vh-5rem)] overflow-y-auto rounded-2xl p-2">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Thư mục của tôi
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label="Tạo thư mục"
              disabled={busy}
              onClick={() => void runCreateFolder(currentId)}
            >
              <Plus aria-hidden="true" />
            </Button>
          </div>

          <div
            role="tree"
            aria-label="Cây thư mục"
            className={`mt-1 rounded-xl px-1 py-1 transition-colors ${
              dropTargetId === "__root__" && dragId ? "bg-primary/10 ring-2 ring-primary" : ""
            }`}
            onDragOver={(event) => {
              if (!dragId) return;
              event.preventDefault();
              setDropTargetId("__root__");
            }}
            onDrop={(event) => {
              event.preventDefault();
              handleInternalDrop(null);
            }}
          >
            <div
              role="treeitem"
              tabIndex={0}
              aria-selected={currentId === null}
              className={`flex w-full cursor-pointer items-center gap-1.5 rounded-lg px-2 py-1.5 text-sm outline-none ${
                currentId === null
                  ? "bg-primary/15 font-medium text-foreground"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
              }`}
              onClick={() => navigate(null)}
              onKeyDown={(event) => {
                if (event.key === "Enter") navigate(null);
              }}
            >
              <Folder className="size-4 shrink-0 text-amber-400" aria-hidden="true" />
              Kho của tôi
            </div>
            <TreeRows nodes={tree} />
          </div>

          <Link
            href="/thung-rac"
            className="mt-3 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-muted/60 hover:text-foreground"
          >
            <Trash2 className="size-4 shrink-0" aria-hidden="true" />
            Thùng rác
          </Link>
        </div>
      </aside>

      {/* ---- Khung nội dung ---- */}
      <section className="min-w-0 flex-1">
        <nav
          aria-label="Breadcrumb"
          className="flex min-h-9 flex-wrap items-center gap-1 text-sm"
        >
          <button
            type="button"
            className={`rounded-lg px-2 py-1 ${
              currentId === null
                ? "font-medium text-foreground"
                : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
            }`}
            onClick={() => navigate(null)}
          >
            Kho của tôi
          </button>
          {breadcrumbs.map((crumb, index) => {
            const last = index === breadcrumbs.length - 1;
            return (
              <span key={crumb.id} className="flex items-center gap-1">
                <ChevronRight className="size-3.5 text-muted-foreground/60" aria-hidden="true" />
                <button
                  type="button"
                  className={`rounded-lg px-2 py-1 ${
                    last
                      ? "font-medium text-foreground"
                      : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                  }`}
                  onClick={() => navigate(crumb.id)}
                >
                  {crumb.name}
                </button>
              </span>
            );
          })}
        </nav>

        <div className="mb-4 mt-3 flex flex-wrap items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={UPLOAD_ACCEPT}
            className="hidden"
            onChange={(event) => {
              if (event.target.files) enqueueFiles(event.target.files);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            size="sm"
            disabled={activeCount > 0}
            onClick={() => fileInputRef.current?.click()}
          >
            {activeCount > 0 ? (
              <Loader2 className="animate-spin" aria-hidden="true" />
            ) : (
              <UploadCloud aria-hidden="true" />
            )}
            {activeCount > 0 ? `Đang tải ${activeCount} tệp…` : "Tải tệp lên"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void runCreateFolder(currentId)}
          >
            <Plus aria-hidden="true" />
            Tạo thư mục
          </Button>
          <span className="ml-auto" />
          <label className="relative">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Tìm trong thư mục này…"
              className="h-8 w-52 pl-8"
            />
          </label>
        </div>

        {(osDragging || queue.length > 0) && (
          <div className="mb-4 space-y-1.5 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-3">
            {osDragging && queue.length === 0 && (
              <p className="px-1 text-sm text-muted-foreground">
                Thả tệp vào đây để tải lên “
                {currentId ? folderById.get(currentId)?.name : "Kho của tôi"}”.
              </p>
            )}
            {queue.slice(-6).map((item) => (
              <div key={item.key} className="flex items-center gap-2 text-xs">
                {item.status === "done" ? (
                  <CheckCircle2 className="size-3.5 text-emerald-500" aria-hidden="true" />
                ) : item.status === "error" ? (
                  <X className="size-3.5 text-destructive" aria-hidden="true" />
                ) : (
                  <Loader2 className="size-3.5 animate-spin text-primary" aria-hidden="true" />
                )}
                <span className="min-w-0 flex-1 truncate">{item.name}</span>
                <span className="shrink-0 text-muted-foreground">
                  {formatBytes(item.size)}
                </span>
                <span className="w-24 shrink-0 text-right text-muted-foreground">
                  {item.status === "error"
                    ? item.error
                    : item.status === "done"
                      ? "Hoàn tất"
                      : `${Math.round(item.progress)}%`}
                </span>
                <button
                  type="button"
                  aria-label="Ẩn"
                  className="text-muted-foreground hover:text-foreground"
                  onClick={() =>
                    setQueue((prev) => prev.filter((q) => q.key !== item.key))
                  }
                >
                  <X className="size-3.5" aria-hidden="true" />
                </button>
              </div>
            ))}
          </div>
        )}

        {filteredFolders.length === 0 && filteredFiles.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border py-16 text-center">
            <p className="font-medium">
              {query.trim()
                ? "Không tìm thấy mục nào."
                : "Thư mục này đang trống"}
            </p>
            {!query.trim() && (
              <p className="mt-1 text-sm text-muted-foreground">
                Kéo tệp từ máy vào đây, hoặc dùng “Tải tệp lên” / “Tạo thư mục”.
              </p>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(170px,1fr))] gap-3 pb-10">
            {filteredFolders.map((folder) => (
              <Card
                key={folder.id}
                kind="folder"
                id={folder.id}
                name={folder.name}
                meta={`${folders.filter((f) => f.parentId === folder.id).length} thư mục · ${files.filter((f) => f.folderId === folder.id).length} tệp`}
                icon={
                  <Folder
                    className="size-9 text-amber-400"
                    aria-hidden="true"
                  />
                }
              />
            ))}
            {filteredFiles.map((file) => (
              <Card
                key={file.id}
                kind="file"
                id={file.id}
                name={file.title}
                meta={`${visibilityLabel(file.visibility)}${
                  file.sizeBytes ? ` · ${formatBytes(file.sizeBytes)}` : ""
                }`}
                icon={<TypeIcon type={file.type} className="size-9" />}
              />
            ))}
          </div>
        )}

        <p className="pb-4 text-xs text-muted-foreground md:hidden">
          💡 Trên điện thoại: dùng thanh địa chỉ ở trên để điều hướng giữa các thư mục.
        </p>
      </section>

      {/* ---- Menu chuột phải ---- */}
      {ctx && (
        <div
          role="menu"
          className="fixed z-50 min-w-48 rounded-xl border border-border bg-popover p-1 shadow-xl"
          style={{
            left: Math.min(ctx.x, window.innerWidth - 200),
            top: Math.min(ctx.y, window.innerHeight - 220),
          }}
          onClick={(event) => event.stopPropagation()}
        >
          {ctxItems(ctx).map((item) => (
            <button
              key={item.label}
              type="button"
              role="menuitem"
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                item.danger
                  ? "text-destructive hover:bg-destructive/10"
                  : "hover:bg-muted"
              }`}
              onClick={() => {
                setCtx(null);
                item.onSelect();
              }}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      )}

      {/* ---- Dialog di chuyển ---- */}
      <Dialog open={moveNode !== null} onOpenChange={(o) => !o && setMoveNode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Di chuyển tới…</DialogTitle>
            <DialogDescription>
              Chọn thư mục đích cho{" "}
              {moveNode?.kind === "folder"
                ? `“${folderById.get(moveNode.id)?.name}”`
                : `“${fileById.get(moveNode?.id ?? "")?.title}”`}
              .
            </DialogDescription>
          </DialogHeader>
          <FolderPicker
            folders={folders}
            excludeIds={
              moveNode?.kind === "folder"
                ? subtreeIdsFromPaths(folders, moveNode.id)
                : undefined
            }
            onPick={(target) => void runMove(target)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setMoveNode(null)}>
              Hủy
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ---- Dialog xác nhận xóa ---- */}
      <Dialog
        open={deleteNode !== null}
        onOpenChange={(o) => !o && setDeleteNode(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {deleteNode?.kind === "folder" ? "Xóa thư mục?" : "Xóa tài liệu?"}
            </DialogTitle>
            <DialogDescription>
              “{deleteNode?.name}” sẽ chuyển vào thùng rác và có thể khôi phục
              sau.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteNode(null)}>
              Hủy
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => deleteNode && void runTrash(deleteNode)}
            >
              {busy ? (
                <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              ) : (
                <Trash2 aria-hidden="true" />
              )}
              {busy ? "Đang xử lý…" : "Xóa"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
