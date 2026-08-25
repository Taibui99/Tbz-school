export type FlatFolder = {
  id: string;
  parentId: string | null;
  name: string;
};

export type FolderNode = FlatFolder & {
  children: FolderNode[];
};

export function buildFolderTree(flat: FlatFolder[]): FolderNode[] {
  const byId = new Map<string, FolderNode>();
  for (const row of flat) {
    byId.set(row.id, { ...row, children: [] });
  }
  const roots: FolderNode[] = [];
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}

export function ancestorsOf(flat: FlatFolder[], folderId: string): string[] {
  const parentById = new Map(flat.map((f) => [f.id, f.parentId]));
  const ids: string[] = [];
  let current = parentById.get(folderId) ?? null;
  while (current) {
    ids.push(current);
    current = parentById.get(current) ?? null;
  }
  return ids;
}

/** Tập id gồm chính node và toàn bộ con cháu — dựa trên materialized path. */
export function subtreeIdsFromPaths(
  paths: { id: string; path: string }[],
  rootId: string,
): Set<string> {
  const rootPath = paths.find((p) => p.id === rootId)?.path;
  if (!rootPath) return new Set([rootId]);
  const prefix = rootPath.endsWith("/") ? rootPath : `${rootPath}/`;
  const result = new Set<string>();
  for (const item of paths) {
    if (item.path === rootPath || item.path.startsWith(prefix)) {
      result.add(item.id);
    }
  }
  return result;
}

export function pathJoin(parentPath: string, id: string): string {
  const base = parentPath.endsWith("/") ? parentPath : `${parentPath}/`;
  return `${base}${id}/`;
}

export function isSubPath(candidate: string, ancestor: string): boolean {
  if (candidate === ancestor) return true;
  const prefix = ancestor.endsWith("/") ? ancestor : `${ancestor}/`;
  return candidate.startsWith(prefix);
}
