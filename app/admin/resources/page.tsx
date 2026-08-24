import type { Metadata } from "next";
import Link from "next/link";
import { listAdminResources } from "@/lib/admin/data";
import { ResourceHideButton } from "@/components/admin/admin-action-buttons";

export const metadata: Metadata = {
  title: "Quản trị · Tài liệu",
};

const VISIBILITY_LABELS: Record<string, string> = {
  private: "Riêng tư",
  unlisted: "Ẩn theo liên kết",
  public: "Công khai",
  shared: "Chia sẻ",
};

export default async function AdminResourcesPage() {
  const resources = await listAdminResources();

  return (
    <div className="glass-panel overflow-x-auto rounded-2xl">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">Tài liệu</th>
            <th className="px-4 py-3 font-medium">Hiển thị</th>
            <th className="px-4 py-3 font-medium">Trạng thái</th>
            <th className="px-4 py-3 font-medium">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {resources.map((resource) => (
            <tr key={resource.id}>
              <td className="max-w-[280px] truncate px-4 py-3">
                <Link
                  href={`/thu-vien/${resource.id}`}
                  className="hover:text-primary hover:underline"
                >
                  {resource.title}
                </Link>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {VISIBILITY_LABELS[resource.visibility] ?? resource.visibility}
              </td>
              <td className="px-4 py-3">
                {resource.hiddenAt ? (
                  <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
                    Đang ẩn
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Bình thường
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <ResourceHideButton
                  resourceId={resource.id}
                  hidden={Boolean(resource.hiddenAt)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
