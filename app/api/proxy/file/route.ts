import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const key = req.nextUrl.searchParams.get("key");
  if (!key) {
    return NextResponse.json({ error: "Missing key" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from("files")
    .createSignedUrl(key, 3600);

  if (error || !data?.signedUrl) {
    return NextResponse.json({ error: "Cannot resolve file" }, { status: 404 });
  }

  const upstream = await fetch(data.signedUrl);
  if (!upstream.ok) {
    return NextResponse.json({ error: "Upstream error" }, { status: 502 });
  }

  const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Content-Disposition", "inline");
  headers.set("Cache-Control", "private, max-age=3600");

  return new NextResponse(upstream.body, { status: 200, headers });
}
