import type { Metadata } from "next";
import Link from "next/link";
import { Inbox } from "lucide-react";
import { listPendingReports } from "@/lib/admin/data";
import { ReportResolveButtons } from "@/components/admin/admin-action-buttons";

export const metadata: Metadata = {
  title: "Quản trị · Báo cáo",
};

const CATEGORY_LABELS: Record<string, string> = {
  copyright: "Bản quyền",
  spam: "Spam",
  inappropriate: "Không phù hợp",
  other: "Khác",
};

export default async function AdminReportsPage() {
  const reports = await listPendingReports();

  if (reports.length === 0) {
    return (
      <div className="glass-panel flex flex-col items-center gap-2 rounded-2xl py-16 text-center">
        <Inbox className="size-8 text-muted-foreground" aria-hidden="true" />
        <p className="font-medium">Không có báo cáo chờ xử lý</p>
        <p className="text-sm text-muted-foreground">
          Các báo cáo vi phạm từ người dùng sẽ xuất hiện tại đây.
        </p>
      </div>
    );
  }

  return (
    <ul className="flex flex-col gap-3">
      {reports.map((report) => (
        <li key={report.id} className="glass-panel rounded-2xl p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-sm font-medium">
                {CATEGORY_LABELS[report.category ?? "other"] ?? "Khác"}
                {report.resourceId && (
                  <>
                    {" · "}
                    <Link
                      href={`/thu-vien/${report.resourceId}`}
                      className="text-primary underline underline-offset-2"
                    >
                      xem tài liệu
                    </Link>
                  </>
                )}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                Báo cáo bởi {report.reporterEmail ?? "?"} ·{" "}
                {new Intl.DateTimeFormat("vi-VN", {
                  dateStyle: "short",
                  timeStyle: "short",
                }).format(new Date(report.createdAt))}
              </p>
            </div>
          </div>
          <p className="mt-2 rounded-xl bg-muted/60 p-3 text-sm">
            {report.reason}
          </p>
          <div className="mt-3">
            <ReportResolveButtons reportId={report.id} />
          </div>
        </li>
      ))}
    </ul>
  );
}
