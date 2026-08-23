"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  Check,
  ChevronRight,
  Eye,
  Folder,
  FolderInput,
  FolderOpen,
  Info,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator as DropdownSep,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  ExplorerMoveDialog,
  FileInfoDialog,
} from "@/components/explorer/dialogs";
import { VISIBILITY_LABELS } from "@/components/resource/resource-dialogs";
import { CreateWorkspaceDialog } from "@/components/workspace/workspace-dialogs";
import {
  createCollectionNodeAction,
  createLessonNodeAction,
  deleteCollectionNodeAction,
  deleteLessonNodeAction,
  deleteWorkspaceNodeAction,
  moveCollectionNodeAction,
  moveLessonNodeAction,
  renameCollectionNodeAction,
  renameLessonNodeAction,
  renameResourceNodeAction,
  renameWorkspaceNodeAction,
  setResourceVisibilityAction,
} from "@/lib/explorer/actions";
import {
  bulkMoveResourceAction,
  deleteResourceAction,
} from "@/lib/resource/actions";
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

type TreeDragItem =
  | { kind: "collection"; id: string; workspaceId: string }
  | { kind: "lesson"; id: string; workspaceId: string; collectionId: string };

type MoveTarget =
  | { mode: "collection"; id: string; currentW: string }
  | { mode: "lesson"; id: string; currentC: string }
  | {
      mode: "file";
      id: string;
      currentW: string;
      currentC: string;
      currentL: string;
    };

type MenuItemDef = {
  label: string;
  icon?: React.ReactNode;
  destructive?: boolean;
  disabled?: boolean;
  checked?: boolean;
  onSelect?: () => void;
  children?: MenuItemDef[];
};

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
  const [renamingFileId, setRenamingFileId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget | null>(null);
  const [infoFile, setInfoFile] = useState<ExplorerFile | null>(null);
  const [moveTarget, setMoveTarget] = useState<MoveTarget | null>(null);
  const [treeDrag, setTreeDrag] = useState<TreeDragItem | null>(null);
  const [treeDropId, setTreeDropId] = useState<string | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [dragging, setDragging] = useState(false);
  const [, startTransition] = useTransition();
  const pushToast = useToast();

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

  // Ghi nhớ trạng thái mở/đóng các node trên cây giữa các phiên (localStorage).
  // Đọc bất đồng bộ (setTimeout 0) để tránh setState đồng bộ trong effect.
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem("kho-expanded-ids");
        if (!raw) return;
        const ids: unknown = JSON.parse(raw);
        if (!Array.isArray(ids)) return;
        setExpanded((prev) => {
          const next = new Set(prev);
          for (const id of ids) {
            if (typeof id === "string") next.add(id);
          }
          return next;
        });
      } catch {}
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "kho-expanded-ids",
        JSON.stringify([...expanded]),
      );
    } catch {}
  }, [expanded]);

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
      pushToast({
        title: "Không tạo được thư mục",
        description: result.error ?? undefined,
        variant: "error",
      });
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
    if (result.error) {
      pushToast({
        title: "Đổi tên thất bại",
        description: result.error,
        variant: "error",
      });
      return;
    }
    if (!result.name) return;

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
    const result = await action(formData);
    if (result.error) {
      pushToast({
        title: "Xóa thất bại",
        description: result.error,
        variant: "error",
      });
    } else {
      pushToast({ title: `Đã xóa ${deleteTargetLabel(target)}` });
    }

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

  // ---------- File ops (rename / visibility / info) ----------

  function mapFiles(
    prev: ExplorerWorkspace[],
    fileId: string,
    patch: (file: ExplorerFile) => ExplorerFile,
  ): ExplorerWorkspace[] {
    return prev.map((ws) => ({
      ...ws,
      collections: ws.collections.map((col) => ({
        ...col,
        lessons: col.lessons.map((les) => ({
          ...les,
          files: les.files.map((file) =>
            file.id === fileId ? patch(file) : file,
          ),
        })),
      })),
    }));
  }

  async function handleRenameFile(fileId: string, title: string) {
    setRenamingFileId(null);
    const snapshot = tree;
    setTree((prev) => mapFiles(prev, fileId, (file) => ({ ...file, title })));

    const formData = new FormData();
    formData.set("id", fileId);
    formData.set("name", title);
    const result = await renameResourceNodeAction(formData);
    if (result.error) {
      setTree(snapshot);
      pushToast({
        title: "Đổi tên thất bại",
        description: result.error,
        variant: "error",
      });
      return;
    }
    pushToast({ title: "Đã đổi tên tài liệu" });
  }

  async function handleSetVisibility(fileId: string, visibility: string) {
    const snapshot = tree;
    setTree((prev) =>
      mapFiles(prev, fileId, (file) => ({ ...file, visibility })),
    );

    const formData = new FormData();
    formData.set("id", fileId);
    formData.set("visibility", visibility);
    const result = await setResourceVisibilityAction(formData);
    if (result.error) {
      setTree(snapshot);
      pushToast({
        title: "Không đổi được quyền xem",
        description: result.error,
        variant: "error",
      });
      return;
    }
    pushToast({
      title: `Quyền xem: ${VISIBILITY_LABELS[visibility] ?? visibility}`,
    });
  }

  // ---------- Move (dialog) ----------

  function openMoveFor(kind: "collection" | "lesson" | "file", id: string) {
    for (const ws of tree) {
      for (const col of ws.collections) {
        if (kind === "collection" && col.id === id) {
          setMoveTarget({ mode: "collection", id, currentW: ws.id });
          return;
        }
        for (const les of col.lessons) {
          if (kind === "lesson" && les.id === id) {
            setMoveTarget({ mode: "lesson", id, currentC: col.id });
            return;
          }
          for (const file of les.files) {
            if (file.id === id && kind === "file") {
              setMoveTarget({
                mode: "file",
                id,
                currentW: ws.id,
                currentC: col.id,
                currentL: les.id,
              });
              return;
            }
          }
        }
      }
    }
  }

  async function handleMoveConfirm(selection: {
    workspaceId?: string;
    collectionId?: string;
    lessonId?: string;
  }) {
    const target = moveTarget;
    if (!target) return;
    setMoveTarget(null);

    const snapshot = tree;

    if (target.mode === "collection") {
      if (!selection.workspaceId) return;
      setTree((prev) => {
        const dragged = prev
          .flatMap((ws) => ws.collections)
          .find((col) => col.id === target.id);
        if (!dragged) return prev;
        return prev
          .map((ws) => ({
            ...ws,
            collections: ws.collections.filter((col) => col.id !== target.id),
          }))
          .map((ws) =>
            ws.id === selection.workspaceId
              ? { ...ws, collections: [...ws.collections, dragged] }
              : ws,
          );
      });
      const formData = new FormData();
      formData.set("collectionId", target.id);
      formData.set("targetWorkspaceId", selection.workspaceId);
      const result = await moveCollectionNodeAction(formData);
      if (result.error) {
        setTree(snapshot);
        pushToast({
          title: "Di chuyển thất bại",
          description: result.error,
          variant: "error",
        });
        return;
      }
      setExpanded((prev) => new Set(prev).add(selection.workspaceId!));
      pushToast({ title: "Đã di chuyển bộ sưu tập" });
      return;
    }

    if (target.mode === "lesson") {
      if (!selection.collectionId) return;
      setTree((prev) => {
        let dragged: ExplorerLesson | undefined;
        const removed = prev.map((ws) => ({
          ...ws,
          collections: ws.collections.map((col) => {
            const found = col.lessons.find((les) => les.id === target.id);
            if (found) dragged = found;
            return {
              ...col,
              lessons: col.lessons.filter((les) => les.id !== target.id),
            };
          }),
        }));
        if (!dragged) return prev;
        const lesson = dragged;
        return removed.map((ws) => ({
          ...ws,
          collections: ws.collections.map((col) =>
            col.id === selection.collectionId
              ? { ...col, lessons: [...col.lessons, lesson] }
              : col,
          ),
        }));
      });
      const formData = new FormData();
      formData.set("lessonId", target.id);
      formData.set("targetCollectionId", selection.collectionId);
      const result = await moveLessonNodeAction(formData);
      if (result.error) {
        setTree(snapshot);
        pushToast({
          title: "Di chuyển thất bại",
          description: result.error,
          variant: "error",
        });
        return;
      }
      setExpanded((prev) => new Set(prev).add(selection.collectionId!));
      pushToast({ title: "Đã di chuyển bài học" });
      return;
    }

    // mode === "file"
    if (!selection.lessonId) return;
    setTree((prev) => {
      let moved: ExplorerFile | undefined;
      const removed = prev.map((ws) => ({
        ...ws,
        collections: ws.collections.map((col) => ({
          ...col,
          lessons: col.lessons.map((les) => {
            const found = les.files.find((file) => file.id === target.id);
            if (found) moved = found;
            return {
              ...les,
              files: les.files.filter((file) => file.id !== target.id),
            };
          }),
        })),
      }));
      if (!moved) return prev;
      const file = moved;
      return removed.map((ws) => ({
        ...ws,
        collections: ws.collections.map((col) => ({
          ...col,
          lessons: col.lessons.map((les) =>
            les.id === selection.lessonId
              ? { ...les, files: [...les.files, file] }
              : les,
          ),
        })),
      }));
    });
    const formData = new FormData();
    formData.set("id", target.id);
    formData.set("targetLessonId", selection.lessonId);
    const result = await bulkMoveResourceAction(formData);
    if (result.error) {
      setTree(snapshot);
      pushToast({
        title: "Di chuyển thất bại",
        description: result.error,
        variant: "error",
      });
      return;
    }
    pushToast({ title: "Đã di chuyển tài liệu" });
  }

  // ---------- Tree drag & drop ----------

  async function moveCollectionDirect(
    collectionId: string,
    targetWorkspaceId: string,
  ) {
    const snapshot = tree;
    setTree((prev) => {
      const dragged = prev
        .flatMap((ws) => ws.collections)
        .find((col) => col.id === collectionId);
      if (!dragged) return prev;
      return prev
        .map((ws) => ({
          ...ws,
          collections: ws.collections.filter((col) => col.id !== collectionId),
        }))
        .map((ws) =>
          ws.id === targetWorkspaceId
            ? { ...ws, collections: [...ws.collections, dragged] }
            : ws,
        );
    });

    const formData = new FormData();
    formData.set("collectionId", collectionId);
    formData.set("targetWorkspaceId", targetWorkspaceId);
    const result = await moveCollectionNodeAction(formData);
    if (result.error) {
      setTree(snapshot);
      pushToast({
        title: "Di chuyển thất bại",
        description: result.error,
        variant: "error",
      });
      return;
    }
    setExpanded((prev) => new Set(prev).add(targetWorkspaceId));
    pushToast({ title: "Đã chuyển bộ sưu tập sang workspace khác" });
  }

  async function moveLessonDirect(lessonId: string, targetCollectionId: string) {
    const snapshot = tree;
    setTree((prev) => {
      let dragged: ExplorerLesson | undefined;
      const removed = prev.map((ws) => ({
        ...ws,
        collections: ws.collections.map((col) => {
          const found = col.lessons.find((les) => les.id === lessonId);
          if (found) dragged = found;
          return {
            ...col,
            lessons: col.lessons.filter((les) => les.id !== lessonId),
          };
        }),
      }));
      if (!dragged) return prev;
      const lesson = dragged;
      return removed.map((ws) => ({
        ...ws,
        collections: ws.collections.map((col) =>
          col.id === targetCollectionId
            ? { ...col, lessons: [...col.lessons, lesson] }
            : col,
        ),
      }));
    });

    const formData = new FormData();
    formData.set("lessonId", lessonId);
    formData.set("targetCollectionId", targetCollectionId);
    const result = await moveLessonNodeAction(formData);
    if (result.error) {
      setTree(snapshot);
      pushToast({
        title: "Di chuyển thất bại",
        description: result.error,
        variant: "error",
      });
      return;
    }
    setExpanded((prev) => new Set(prev).add(targetCollectionId));
    pushToast({ title: "Đã chuyển bài học sang bộ sưu tập khác" });
  }

  async function handleTreeDrop(target: { kind: string; id: string }) {
    const drag = treeDrag;
    setTreeDrag(null);
    setTreeDropId(null);
    if (!drag) return;

    if (target.kind === "workspace") {
      if (
        drag.kind !== "collection" ||
        drag.workspaceId === target.id ||
        drag.id === target.id
      ) {
        return;
      }
      await moveCollectionDirect(drag.id, target.id);
      return;
    }

    if (
      drag.kind !== "lesson" ||
      drag.collectionId === target.id ||
      drag.id === target.id
    ) {
      return;
    }
    await moveLessonDirect(drag.id, target.id);
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
                onMoveNode={openMoveFor}
                dnd={{
                  drag: treeDrag,
                  dropId: treeDropId,
                  onDragStart: setTreeDrag,
                  onDragEnd: () => {
                    setTreeDrag(null);
                    setTreeDropId(null);
                  },
                  setHover: setTreeDropId,
                  onDrop: handleTreeDrop,
                }}
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
          onMoveNode={openMoveFor}
          renamingFileId={renamingFileId}
          onFileRenameStart={setRenamingFileId}
          onFileRenameSave={handleRenameFile}
          onFileRenameCancel={() => setRenamingFileId(null)}
          onVisibility={(fileId, visibility) =>
            void handleSetVisibility(fileId, visibility)
          }
          onInfo={setInfoFile}
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

      <ExplorerMoveDialog
        open={moveTarget !== null}
        mode={moveTarget?.mode ?? "file"}
        tree={tree}
        current={
          moveTarget?.mode === "file"
            ? { w: moveTarget.currentW, c: moveTarget.currentC, l: moveTarget.currentL }
            : moveTarget?.mode === "collection"
              ? { w: moveTarget.currentW }
              : { c: moveTarget?.currentC }
        }
        onOpenChange={(open) => !open && setMoveTarget(null)}
        onConfirm={handleMoveConfirm}
      />

      <FileInfoDialog file={infoFile} onClose={() => setInfoFile(null)} />
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

  // Video đi thẳng YouTube nên bỏ qua dedup; tệp thường tính hash trước
  // để server phát hiện trùng và tái sử dụng object đã có.
  const isVideoUpload = isVideoName(file.name);
  if (!isVideoUpload) {
    try {
      formData.set("sha256", await sha256Hex(await file.arrayBuffer()));
    } catch {}
  }

  let session: Awaited<ReturnType<typeof quickUploadSessionAction>>;
  try {
    session = await quickUploadSessionAction(formData);
  } catch {
    updateItem(item.key, { status: "error", error: "Không tạo được phiên tải lên." });
    return;
  }
  if (session.error || !session.resourceId) {
    updateItem(item.key, {
      status: "error",
      error: session.error ?? "Không tạo được phiên tải lên.",
    });
    return;
  }

  // Trùng lặp: server tái sử dụng object có sẵn — không cần PUT/finalize.
  if (session.duplicate) {
    const dupLessonId = session.lessonId;
    const explorerFile: ExplorerFile = {
      id: session.resourceId,
      title: titleFromName(file.name),
      type: resourceTypeFromFileName(file.name) ?? "text",
      visibility: "private",
      lifecycleState: "ready",
      youtubeId: null,
      externalUrl: null,
      sizeBytes: file.size,
    };
    if (dupLessonId) {
      setTree((prev) =>
        prev.map((ws) => ({
          ...ws,
          collections: ws.collections.map((col) => ({
            ...col,
            lessons: col.lessons.map((les) =>
              les.id === dupLessonId
                ? { ...les, files: [...les.files, explorerFile] }
                : les,
            ),
          })),
        })),
      );
    }
    updateItem(item.key, { status: "done", progress: 100 });
    return;
  }

  if (!session.uploadUrl || !session.key) {
    updateItem(item.key, {
      status: "error",
      error: "Không tạo được phiên tải lên.",
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

type TreeDnd = {
  drag: TreeDragItem | null;
  dropId: string | null;
  onDragStart: (item: TreeDragItem) => void;
  onDragEnd: () => void;
  setHover: (id: string | null) => void;
  onDrop: (target: { kind: string; id: string }) => void;
};

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
  onMoveNode: (kind: "collection" | "lesson", id: string) => void;
  dnd: TreeDnd;
};

function TreeNodes({
  workspace,
  depth,
  ...handlers
}: { workspace: ExplorerWorkspace; depth: number } & TreeHandlers) {
  const isOpen = handlers.expanded.has(workspace.id);
  const isActive = handlers.selected.w === workspace.id && !handlers.selected.c;
  const dropActive =
    handlers.dnd.dropId === workspace.id &&
    handlers.dnd.drag?.kind === "collection" &&
    handlers.dnd.drag.workspaceId !== workspace.id;

  const menuItems: MenuItemDef[] = [
    {
      label: "Thêm bộ sưu tập",
      icon: <Plus aria-hidden="true" />,
      onSelect: () =>
        handlers.onCreateChild({ kind: "workspace", workspaceId: workspace.id }),
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
  ];

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
        onRenameSave={(name) =>
          handlers.onRenameSave("workspace", workspace.id, name)
        }
        onRenameCancel={handlers.onRenameCancel}
        menu={<NodeMenu items={menuItems} />}
        contextItems={menuItems}
        badge={String(workspace.collections.length)}
        dropActive={dropActive}
        onDragOver={(event) => {
          const drag = handlers.dnd.drag;
          if (!drag || drag.kind !== "collection") return;
          event.preventDefault();
          if (handlers.dnd.dropId !== workspace.id) {
            handlers.dnd.setHover(workspace.id);
          }
        }}
        onDropRow={(event) => {
          event.preventDefault();
          const drag = handlers.dnd.drag;
          if (
            drag &&
            drag.kind === "collection" &&
            drag.workspaceId !== workspace.id
          ) {
            handlers.dnd.onDrop({ kind: "workspace", id: workspace.id });
          } else {
            handlers.dnd.setHover(null);
          }
        }}
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
  const dropActive =
    handlers.dnd.dropId === collection.id &&
    handlers.dnd.drag?.kind === "lesson" &&
    handlers.dnd.drag.collectionId !== collection.id;

  const menuItems: MenuItemDef[] = [
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
      label: "Di chuyển…",
      icon: <FolderInput aria-hidden="true" />,
      onSelect: () => handlers.onMoveNode("collection", collection.id),
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
  ];

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
        onRenameSave={(name) =>
          handlers.onRenameSave("collection", collection.id, name)
        }
        onRenameCancel={handlers.onRenameCancel}
        menu={<NodeMenu items={menuItems} />}
        contextItems={menuItems}
        badge={String(collection.lessons.length)}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          handlers.dnd.onDragStart({
            kind: "collection",
            id: collection.id,
            workspaceId: collection.workspaceId,
          });
        }}
        onDragEnd={handlers.dnd.onDragEnd}
        dropActive={dropActive}
        onDragOver={(event) => {
          const drag = handlers.dnd.drag;
          if (!drag || drag.kind !== "lesson") return;
          event.preventDefault();
          if (handlers.dnd.dropId !== collection.id) {
            handlers.dnd.setHover(collection.id);
          }
        }}
        onDropRow={(event) => {
          event.preventDefault();
          const drag = handlers.dnd.drag;
          if (
            drag &&
            drag.kind === "lesson" &&
            drag.collectionId !== collection.id
          ) {
            handlers.dnd.onDrop({ kind: "collection", id: collection.id });
          } else {
            handlers.dnd.setHover(null);
          }
        }}
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

  const menuItems: MenuItemDef[] = [
    {
      label: "Đổi tên",
      icon: <Pencil aria-hidden="true" />,
      onSelect: () => handlers.onRenameStart(lesson.id),
    },
    {
      label: "Di chuyển…",
      icon: <FolderInput aria-hidden="true" />,
      onSelect: () => handlers.onMoveNode("lesson", lesson.id),
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
  ];

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
        menu={<NodeMenu items={menuItems} />}
        contextItems={menuItems}
        badge={String(lesson.files.length)}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          handlers.dnd.onDragStart({
            kind: "lesson",
            id: lesson.id,
            workspaceId: lesson.workspaceId,
            collectionId: lesson.collectionId,
          });
        }}
        onDragEnd={handlers.dnd.onDragEnd}
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
  badge,
  contextItems,
  draggable,
  onDragStart,
  onDragEnd,
  dropActive,
  onDragOver,
  onDropRow,
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
  badge?: string;
  contextItems?: MenuItemDef[];
  draggable?: boolean;
  onDragStart?: (event: React.DragEvent) => void;
  onDragEnd?: () => void;
  dropActive?: boolean;
  onDragOver?: (event: React.DragEvent) => void;
  onDropRow?: (event: React.DragEvent) => void;
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

  const rowClassName = `group flex items-center gap-0.5 rounded-md pr-1 transition-colors hover:bg-muted ${
    active ? "bg-muted font-medium" : ""
  } ${dropActive ? "bg-primary/10 ring-2 ring-primary/60" : ""}`;
  const rowStyle = { paddingLeft: `${depth * 14}px` };

  const rowInner = (
    <>
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
      {badge != null && badge !== "" ? (
        <span className="shrink-0 pr-0.5 text-[11px] tabular-nums text-muted-foreground">
          {badge}
        </span>
      ) : null}
      <span className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        {menu}
      </span>
    </>
  );

  const rowProps = {
    style: rowStyle,
    draggable: draggable || undefined,
    onDragStart,
    onDragEnd,
    onDragOver,
    onDrop: onDropRow,
  };

  if (!contextItems) {
    return (
      <div className={rowClassName} {...rowProps}>
        {rowInner}
      </div>
    );
  }

  return (
    <ContextMenu>
      <ContextMenuTrigger render={<div className={rowClassName} {...rowProps} />}>
        {rowInner}
      </ContextMenuTrigger>
      <ContextMenuContent>{renderContextItems(contextItems)}</ContextMenuContent>
    </ContextMenu>
  );
}

function renderDropdownItems(items: MenuItemDef[]): React.ReactNode {
  return items.map((item) =>
    item.children && item.children.length > 0 ? (
      <DropdownMenuSub key={item.label}>
        <DropdownMenuSubTrigger>
          {item.icon}
          {item.label}
        </DropdownMenuSubTrigger>
        <DropdownMenuSubContent>
          {renderDropdownItems(item.children)}
        </DropdownMenuSubContent>
      </DropdownMenuSub>
    ) : (
      <DropdownMenuItem
        key={item.label}
        variant={item.destructive ? "destructive" : "default"}
        disabled={item.disabled}
        onClick={() => item.onSelect?.()}
      >
        {item.icon}
        {item.label}
        {item.checked ? <Check className="ml-auto size-3.5" /> : null}
      </DropdownMenuItem>
    ),
  );
}

function renderContextItems(items: MenuItemDef[]): React.ReactNode {
  return items.map((item) => (
    <ContextMenuItem
      key={item.label}
      variant={item.destructive ? "destructive" : "default"}
      disabled={item.disabled}
      onClick={() => item.onSelect?.()}
    >
      {item.icon}
      {item.label}
      {item.checked ? <Check className="ml-auto size-3.5" /> : null}
    </ContextMenuItem>
  ));
}

function NodeMenu({ items }: { items: MenuItemDef[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon-xs" aria-label="Tùy chọn" />}>
        <MoreVertical aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44">
        {items.some((item) => item.children) ? (
          <>
            {renderDropdownItems(items.filter((item) => !item.destructive))}
            <DropdownSep />
            {renderDropdownItems(items.filter((item) => item.destructive))}
          </>
        ) : (
          renderDropdownItems(items)
        )}
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
  onMoveNode,
  renamingFileId,
  onFileRenameStart,
  onFileRenameSave,
  onFileRenameCancel,
  onVisibility,
  onInfo,
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
  onMoveNode: (kind: "collection" | "lesson" | "file", id: string) => void;
  renamingFileId: string | null;
  onFileRenameStart: (fileId: string) => void;
  onFileRenameSave: (fileId: string, title: string) => Promise<void>;
  onFileRenameCancel: () => void;
  onVisibility: (fileId: string, visibility: string) => void;
  onInfo: (file: ExplorerFile) => void;
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
                  label: "Di chuyển…",
                  icon: <FolderInput aria-hidden="true" />,
                  onSelect: () => onMoveNode("collection", id),
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
                  label: "Di chuyển…",
                  icon: <FolderInput aria-hidden="true" />,
                  onSelect: () => onMoveNode("lesson", id),
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
          renamingId={renamingFileId}
          onRenameStart={onFileRenameStart}
          onRenameSave={onFileRenameSave}
          onRenameCancel={onFileRenameCancel}
          onVisibility={onVisibility}
          onInfo={onInfo}
          onMove={(fileId) => onMoveNode("file", fileId)}
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

const VISIBILITY_OPTIONS = ["private", "unlisted", "public"] as const;

const VISIBILITY_ICON_CLASS: Record<string, string> = {
  private: "text-muted-foreground",
  unlisted: "text-amber-500",
  public: "text-emerald-500",
  shared: "text-sky-500",
};

function FileList({
  files,
  href,
  renamingId,
  onRenameStart,
  onRenameSave,
  onRenameCancel,
  onVisibility,
  onInfo,
  onMove,
  onDelete,
}: {
  files: ExplorerFile[];
  href: (fileId: string) => string;
  renamingId: string | null;
  onRenameStart: (fileId: string) => void;
  onRenameSave: (fileId: string, title: string) => Promise<void>;
  onRenameCancel: () => void;
  onVisibility: (fileId: string, visibility: string) => void;
  onInfo: (file: ExplorerFile) => void;
  onMove: (fileId: string) => void;
  onDelete: (file: ExplorerFile) => void;
}) {
  if (files.length === 0) {
    return (
      <EmptyHint text="Bài học chưa có tài liệu — kéo thả tệp vào đây hoặc bấm “Tải tệp lên”." />
    );
  }

  function menuFor(file: ExplorerFile): MenuItemDef[] {
    return [
      {
        label: "Mở tài liệu",
        icon: <BookOpen aria-hidden="true" />,
        onSelect: () => {
          window.location.href = href(file.id);
        },
      },
      {
        label: "Đổi tên",
        icon: <Pencil aria-hidden="true" />,
        onSelect: () => onRenameStart(file.id),
      },
      {
        label: "Quyền xem",
        icon: <Eye aria-hidden="true" />,
        children: VISIBILITY_OPTIONS.map((option) => ({
          label: VISIBILITY_LABELS[option] ?? option,
          checked: file.visibility === option,
          onSelect: () => onVisibility(file.id, option),
        })),
      },
      {
        label: "Di chuyển…",
        icon: <FolderInput aria-hidden="true" />,
        onSelect: () => onMove(file.id),
      },
      {
        label: "Thông tin",
        icon: <Info aria-hidden="true" />,
        onSelect: () => onInfo(file),
      },
      {
        label: "Xóa (vào thùng rác)",
        icon: <Trash2 aria-hidden="true" />,
        destructive: true,
        onSelect: () => onDelete(file),
      },
    ];
  }

  return (
    <ul className="flex flex-col p-2">
      {files.map((file) => {
        const items = menuFor(file);
        const renaming = renamingId === file.id;
        return (
          <li key={file.id}>
            <ContextMenu>
              <ContextMenuTrigger
                render={
                  <div className="group flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors animate-in fade-in slide-in-from-bottom-1 duration-300 hover:bg-muted" />
                }
              >
                <TypeIcon type={file.type} className="size-5 shrink-0" />
                {renaming ? (
                  <div className="min-w-0 flex-1">
                    <InlineNameInput
                      initial={file.title}
                      busy={false}
                      onSave={(title) => onRenameSave(file.id, title)}
                      onCancel={onRenameCancel}
                    />
                  </div>
                ) : (
                  <Link
                    href={href(file.id)}
                    onClick={(event) => event.stopPropagation()}
                    className="min-w-0 flex-1 truncate text-sm hover:underline"
                  >
                    {file.title}
                  </Link>
                )}
                <span className="hidden shrink-0 text-xs tabular-nums text-muted-foreground sm:block">
                  {typeof file.sizeBytes === "number"
                    ? formatBytes(file.sizeBytes)
                    : ""}
                </span>
                <Eye
                  aria-hidden="true"
                  className={`size-4 shrink-0 ${
                    VISIBILITY_ICON_CLASS[file.visibility] ?? "text-muted-foreground"
                  }`}
                />
                <span
                  className={`shrink-0 ${
                    renaming ? "opacity-100" : "opacity-0 transition-opacity group-hover:opacity-100"
                  }`}
                >
                  <NodeMenu items={items} />
                </span>
              </ContextMenuTrigger>
              {!renaming ? (
                <ContextMenuContent>{renderContextItems(items)}</ContextMenuContent>
              ) : null}
            </ContextMenu>
          </li>
        );
      })}
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
