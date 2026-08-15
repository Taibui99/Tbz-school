export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json({
    status: "ok",
    service: "tbz-school",
    timestamp: new Date().toISOString(),
  });
}