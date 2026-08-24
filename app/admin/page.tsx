import type { Metadata } from "next";
import { FileText, Flag, HardDrive, Users } from "lucide-react";
import { getAdminOverview } from "@/lib/admin/data";

export const metadata: Metadata = {
  title: "Quản trị",
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB"];
  let value = bytes / 1024;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit++;
  }
  return `${value.toFixed(1)} ${units[unit]}`;
}

export default async function AdminDashboardPage() {
  const overview = await getAdminOverview();

  const cards = [
    { label: "Người dùng", value: overview.userCount, icon: Users },
    { label: "Tài liệu (ready)", value: overview.resourceCount, icon: FileText },
    {
      label: "Dung lượng đã dùng",
      value: `${formatBytes(overview.bytesUsed)} · ${overview.fileCount} tệp`,
      icon: HardDrive,
    },
    {
      label: "Báo cáo chờ xử lý",
      value: overview.pendingReports,
      icon: Flag,
    },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div
            key={card.label}
            className="glass-panel flex items-center gap-3 rounded-2xl p-4"
          >
            <span className="bg-brand-gradient flex size-10 items-center justify-center rounded-xl text-white">
              <card.icon className="size-5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-xs text-muted-foreground">
                {card.label}
              </p>
              <p className="font-heading truncate text-lg font-bold">
                {card.value}
              </p>
            </div>
          </div>
        ))}
      </div>

      <section className="glass-panel rounded-2xl p-5">
        <h2 className="text-sm font-medium">Nhật ký quản trị gần đây</h2>
        {overview.recentAudit.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">Chưa có hành động nào.</p>
        ) : (
          <ul className="mt-3 divide-y divide-border text-sm">
            {overview.recentAudit.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-center justify-between gap-2 py-2"
              >
                <span className="font-mono text-xs">{entry.action}</span>
                <span className="min-w-0 truncate text-xs text-muted-foreground">
                  {String(
                    (entry.details as Record<string, unknown> | null)?.title ??
                      entry.target_id ??
                      "",
                  )}
                </span>
                <time className="text-xs text-muted-foreground">
                  {new Intl.DateTimeFormat("vi-VN", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(new Date(entry.created_at))}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
