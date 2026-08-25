"use client";

import { useMemo } from "react";
import { Folder } from "lucide-react";
import { buildFolderTree, type FlatFolder } from "@/lib/folders/tree";

export type PickerFolder = FlatFolder;

export function FolderPicker({
  folders,
  excludeIds,
  currentId,
  onPick,
}: {
  folders: PickerFolder[];
  excludeIds?: Set<string>;
  currentId?: string | null;
  onPick: (folderId: string | null) => void;
}) {
  const tree = useMemo(() => buildFolderTree(folders), [folders]);

  function Rows({ nodes, depth }: { nodes: PickerFolder[]; depth: number }) {
    return (
      <>
        {nodes.map((node) => {
          if (excludeIds?.has(node.id)) return null;
          const children = folders.filter((f) => f.parentId === node.id);
          const active = node.id === currentId;
          return (
            <div key={node.id}>
              <button
                type="button"
                className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
                  active ? "bg-primary/15 font-medium text-foreground" : "hover:bg-muted"
                }`}
                style={{ paddingLeft: `${depth * 16 + 8}px` }}
                onClick={() => onPick(node.id)}
              >
                <Folder className="size-4 shrink-0 text-amber-400" aria-hidden="true" />
                <span className="min-w-0 truncate">{node.name}</span>
              </button>
              {children.length > 0 && <Rows nodes={children} depth={depth + 1} />}
            </div>
          );
        })}
      </>
    );
  }

  return (
    <div className="max-h-72 overflow-y-auto rounded-xl border border-border p-1.5">
      <button
        type="button"
        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
          currentId === null ? "bg-primary/15 font-medium text-foreground" : "hover:bg-muted"
        }`}
        onClick={() => onPick(null)}
      >
        <Folder className="size-4 shrink-0 text-amber-400" aria-hidden="true" />
        Kho của tôi (gốc)
      </button>
      <Rows nodes={tree} depth={1} />
    </div>
  );
}
