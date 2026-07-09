import { NextResponse } from "next/server";

// Vercel Cron hits this every 5 minutes (see vercel.json).
// Next step: query Firestore `posts` where status == "scheduled" && scheduledAt <= now,
// publish via platform APIs (lift provider patterns from gitroomhq/postiz-app),
// then mark status "published".
export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, published: 0 });
}
