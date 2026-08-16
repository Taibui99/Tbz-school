"use client";

import { useActionState } from "react";
import { Flag } from "lucide-react";
import { reportResourceAction } from "@/lib/resource/report-actions";
import type { ActionResult } from "@/lib/workspace/actions";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

export function ReportForm({ resourceId }: { resourceId: string }) {
  const [state, action, pending] = useActionState(
    reportResourceAction,
    {} as ActionResult,
  );

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="resourceId" value={resourceId} />
      <div>
        <Label htmlFor={`report-category-${resourceId}`}>Hạng mục</Label>
        <select
          id={`report-category-${resourceId}`}
          name="category"
          defaultValue="inappropriate"
          className="mt-1 h-9 w-full rounded-lg border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
        >
          <option value="copyright">Vi phạm bản quyền</option>
          <option value="spam">Thư rác</option>
          <option value="inappropriate">Nội dung không phù hợp</option>
          <option value="other">Khác</option>
        </select>
      </div>
      <div>
        <Label htmlFor={`report-reason-${resourceId}`}>Lý do</Label>
        <Textarea
          id={`report-reason-${resourceId}`}
          name="reason"
          rows={3}
          placeholder="Mô tả ngắn lý do báo cáo…"
          required
        />
      </div>
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        <Flag aria-hidden="true" />
        Gửi báo cáo
      </Button>
      {state?.error && (
        <Alert variant="destructive" className="py-2">
          <AlertDescription>{state.error}</AlertDescription>
        </Alert>
      )}
      {state?.success && (
        <Alert className="py-2">
          <AlertDescription>{state.success}</AlertDescription>
        </Alert>
      )}
    </form>
  );
}