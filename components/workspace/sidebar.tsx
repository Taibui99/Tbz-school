"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BookOpen, FolderTree, Library } from "lucide-react";
import { cn } from "@/lib/utils";

export type SidebarCollection = {
  id: string;
  name: string;
  lessons: { id: string; name: string }[];
};

export function WorkspaceSidebar({
  workspaceId,
  collections,
}: {
  workspaceId: string;
  collections: SidebarCollection[];
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 border-r border-border md:block">
      <nav aria-label="Cấu trúc workspace" className="sticky top-14 max-h-[calc(100vh-3.5rem)] overflow-y-auto p-3">
        <Link
          href={`/kho/${workspaceId}`}
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm font-medium transition-colors hover:bg-muted",
            pathname === `/kho/${workspaceId}` && "bg-muted",
          )}
        >
          <Library className="size-4 text-muted-foreground" aria-hidden="true" />
          Tổng quan
        </Link>

        {collections.length === 0 ? (
          <p className="mt-2 px-2 text-xs text-muted-foreground">
            Chưa có bộ sưu tập.
          </p>
        ) : (
          <ul className="mt-2 flex flex-col gap-3">
            {collections.map((collection) => {
              const collectionPath = `/kho/${workspaceId}/${collection.id}`;
              const isCollectionActive = pathname === collectionPath;

              return (
                <li key={collection.id}>
                  <Link
                    href={collectionPath}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-muted",
                      isCollectionActive && "bg-muted font-medium",
                    )}
                  >
                    <FolderTree
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <span className="truncate">{collection.name}</span>
                  </Link>
                  {collection.lessons.length > 0 && (
                    <ul className="mt-0.5 flex flex-col gap-0.5 border-l border-border pl-3">
                      {collection.lessons.map((lesson) => {
                        const lessonPath = `${collectionPath}/${lesson.id}`;
                        const isLessonActive = pathname === lessonPath;

                        return (
                          <li key={lesson.id}>
                            <Link
                              href={lessonPath}
                              className={cn(
                                "flex items-center gap-2 rounded-md px-2 py-1 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
                                isLessonActive && "bg-muted font-medium text-foreground",
                              )}
                            >
                              <BookOpen
                                className="size-3.5 shrink-0"
                                aria-hidden="true"
                              />
                              <span className="truncate">{lesson.name}</span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </nav>
    </aside>
  );
}