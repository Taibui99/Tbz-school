"use client";

import { useActionState, useState } from "react";
import { Check, Copy, Link2, ShieldX, UserPlus } from "lucide-react";
import {
  ensureShareLinkAction,
  grantShareAction,
  revokeGrantAction,
  revokeShareLinkAction,
} from "@/lib/resource/share-actions";
import type { ActionResult } from "@/lib/workspace/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

export interface ShareGrant {
  id: string;
  grantedTo: string;
  permissionLevel: string;
  name: string | null;
}

type ShareLinkState = ActionResult & { token?: string };

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          /* ignore clipboard errors */
        }
      }}
    >
      {copied ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
      {copied ? "Đã sao chép" : "Sao chép"}
    </Button>
  );
}

export function SharePanel({
  resourceId,
  linkToken,
  grants,
}: {
  resourceId: string;
  linkToken: string | null;
  grants: ShareGrant[];
}) {
  const [token, setToken] = useState<string | null>(linkToken);
  const [grantList, setGrantList] = useState<ShareGrant[]>(grants);

  const [linkState, linkAction, linkPending] = useActionState(
    ensureShareLinkAction,
    {} as ShareLinkState,
  );
  const [grantState, grantAction, grantPending] = useActionState(
    grantShareAction,
    {} as ActionResult,
  );

  const [prevLinkState, setPrevLinkState] = useState(linkState);
  if (linkState !== prevLinkState) {
    setPrevLinkState(linkState);
    if (linkState?.token) setToken(linkState.token);
  }

  const shareUrl = token ? `${window.location.origin}/x/${token}` : null;

  return (
    <section className="glass-panel rounded-2xl p-4">
      <h2 className="flex items-center gap-2 text-sm font-medium">
        <Link2 aria-hidden="true" className="size-4 text-muted-foreground" />
        Chia sẻ
      </h2>

      <div className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium">Liên kết chia sẻ</p>
          {token && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={async () => {
                const fd = new FormData();
                fd.set("resourceId", resourceId);
                await revokeShareLinkAction(fd);
                setToken(null);
              }}
            >
              <ShieldX aria-hidden="true" />
              Thu hồi
            </Button>
          )}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Ai có liên kết đều có thể xem tài liệu này (chế độ &quot;Ẩn theo
          liên kết&quot;).
        </p>
        {shareUrl ? (
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Input
              readOnly
              value={shareUrl}
              className="h-9 max-w-md font-mono text-xs"
            />
            <CopyButton value={shareUrl} />
          </div>
        ) : (
          <form action={linkAction} className="mt-2 flex items-center gap-2">
            <input type="hidden" name="resourceId" value={resourceId} />
            <Button type="submit" variant="outline" size="sm" disabled={linkPending}>
              Tạo liên kết chia sẻ
            </Button>
          </form>
        )}
        {linkState?.error && (
          <Alert variant="destructive" className="mt-2 py-2">
            <AlertDescription>{linkState.error}</AlertDescription>
          </Alert>
        )}
        {linkState?.success && (
          <Alert className="mt-2 py-2">
            <AlertDescription>{linkState.success}</AlertDescription>
          </Alert>
        )}
      </div>

      <div className="mt-5 border-t border-border pt-4">
        <p className="text-sm font-medium">Chia sẻ cho người dùng</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Thêm người dùng bằng email của họ trên TBZ School (quyền xem hoặc
          chỉnh sửa).
        </p>
        <form action={grantAction} className="mt-3 flex flex-wrap items-end gap-2">
          <input type="hidden" name="resourceId" value={resourceId} />
          <div className="min-w-0 flex-1">
            <Label htmlFor={`grant-email-${resourceId}`} className="sr-only">
              Email người dùng
            </Label>
            <Input
              id={`grant-email-${resourceId}`}
              name="email"
              type="email"
              placeholder="email@example.com"
              className="h-9"
              required
            />
          </div>
          <Label htmlFor={`grant-level-${resourceId}`} className="sr-only">
            Quyền
          </Label>
          <select
            id={`grant-level-${resourceId}`}
            name="permissionLevel"
            defaultValue="viewer"
            className="h-9 rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <option value="viewer">Xem</option>
            <option value="editor">Chỉnh sửa</option>
          </select>
          <Button type="submit" size="sm" disabled={grantPending}>
            <UserPlus aria-hidden="true" />
            Thêm
          </Button>
        </form>
        {grantState?.error && (
          <Alert variant="destructive" className="mt-2 py-2">
            <AlertDescription>{grantState.error}</AlertDescription>
          </Alert>
        )}
        {grantState?.success && (
          <Alert className="mt-2 py-2">
            <AlertDescription>{grantState.success}</AlertDescription>
          </Alert>
        )}

        {grantList.length > 0 && (
          <ul className="mt-3 space-y-2">
            {grantList.map((grant) => (
              <li
                key={grant.id}
                className="flex items-center justify-between gap-2 rounded-lg border border-border px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate">
                  {grant.name ?? "Người dùng"}
                  <span className="ml-2 text-xs text-muted-foreground">
                    {grant.permissionLevel === "editor"
                      ? "Chỉnh sửa"
                      : "Xem"}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    const fd = new FormData();
                    fd.set("shareId", grant.id);
                    fd.set("resourceId", resourceId);
                    await revokeGrantAction(fd);
                    setGrantList((prev) =>
                      prev.filter((g) => g.id !== grant.id),
                    );
                  }}
                >
                  <ShieldX aria-hidden="true" />
                  Thu hồi
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        Thay đổi chế độ hiển thị (Riêng tư / Ẩn theo liên kết / Công khai /
        Chia sẻ) bằng nút chỉnh sửa.
      </p>
    </section>
  );
}