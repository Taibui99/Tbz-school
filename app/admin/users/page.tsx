import type { Metadata } from "next";
import { listAdminUsers } from "@/lib/admin/data";
import { UserActionsButton } from "@/components/admin/user-actions-button";

export const metadata: Metadata = {
  title: "Quản trị · Người dùng",
};

export default async function AdminUsersPage() {
  const users = await listAdminUsers();

  return (
    <div className="glass-panel overflow-x-auto rounded-2xl">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="px-4 py-3 font-medium">Người dùng</th>
            <th className="px-4 py-3 font-medium">Email</th>
            <th className="px-4 py-3 font-medium">Trạng thái</th>
            <th className="px-4 py-3 font-medium">Thao tác</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {users.map((user) => (
            <tr key={user.id}>
              <td className="max-w-[200px] truncate px-4 py-3">
                {user.fullName ?? "—"}
              </td>
              <td className="max-w-[240px] truncate px-4 py-3 text-muted-foreground">
                {user.email ?? "—"}
              </td>
              <td className="px-4 py-3">
                {user.suspendedAt ? (
                  <span className="rounded-full bg-destructive/10 px-2.5 py-0.5 text-xs font-medium text-destructive">
                    Bị khóa
                  </span>
                ) : (
                  <span className="rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                    Hoạt động
                  </span>
                )}
              </td>
              <td className="px-4 py-3">
                <UserActionsButton
                  userId={user.id}
                  email={user.email}
                  suspended={Boolean(user.suspendedAt)}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
