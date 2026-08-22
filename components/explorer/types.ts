export type ExplorerFile = {
  id: string;
  title: string;
  type: string;
  visibility: string;
  lifecycleState: string;
  youtubeId: string | null;
  externalUrl: string | null;
  sizeBytes?: number | null;
  createdAt?: string | null;
};

export type ExplorerLesson = {
  kind: "lesson";
  id: string;
  workspaceId: string;
  collectionId: string;
  name: string;
  files: ExplorerFile[];
};

export type ExplorerCollection = {
  kind: "collection";
  id: string;
  workspaceId: string;
  name: string;
  lessons: ExplorerLesson[];
};

export type ExplorerWorkspace = {
  kind: "workspace";
  id: string;
  name: string;
  collections: ExplorerCollection[];
};

export type ExplorerSelection = { w?: string; c?: string; l?: string };

export function selectionToQuery(selection: ExplorerSelection): string {
  const params = new URLSearchParams();
  if (selection.w) params.set("w", selection.w);
  if (selection.c) params.set("c", selection.c);
  if (selection.l) params.set("l", selection.l);
  const query = params.toString();
  return query ? `?${query}` : "";
}

export function expandedIdsForSelection(
  selection: ExplorerSelection,
): string[] {
  const ids: string[] = [];
  if (selection.l && selection.c) ids.push(selection.c);
  if (selection.w) ids.push(selection.w);
  return ids;
}
