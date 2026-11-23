import { getAccount, sessionClient } from "@/features/auth/supabase-server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const key = searchParams.get("key");
  if (!key || !/^[0-9a-f-]{36}\/[0-9a-f-]{36}$/.test(key)) {
    return new Response(null, { status: 404 });
  }

  const [account, client] = await Promise.all([getAccount(), sessionClient()]);
  if (!account || !client) return new Response(null, { status: 404 });

  const filename = searchParams.get("download")?.slice(0, 255);
  const { data, error } = await client.storage.from("chat-attachments")
    .createSignedUrl(key, 60, { download: filename || false });
  if (error || !data) return new Response(null, { status: 404 });

  return new Response(null, {
    status: 302,
    headers: { Location: data.signedUrl, "Cache-Control": "private, no-store" },
  });
}
