import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Vercel Cron hits this daily at 09:00 UTC (see vercel.json).
// Finds Firestore `posts` due for publishing and pushes each one to MAKE_WEBHOOK_URL
// (a Make.com/Zapier webhook that routes to the actual platform). Posts are marked
// "published" only after the webhook accepts them; without a webhook they stay queued
// so nothing is silently lost.

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const FIRESTORE = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

interface FirestoreDoc {
  name: string;
  fields?: {
    platform?: { stringValue?: string };
    text?: { stringValue?: string };
    status?: { stringValue?: string };
    scheduledAt?: { timestampValue?: string };
  };
}

async function findDuePosts(nowIso: string): Promise<FirestoreDoc[]> {
  // Range filter on a single field only — avoids needing a composite index.
  // Status is filtered in code below.
  const res = await fetch(`${FIRESTORE}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "posts" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "scheduledAt" },
            op: "LESS_THAN_OR_EQUAL",
            value: { timestampValue: nowIso },
          },
        },
        limit: 50,
      },
    }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Firestore query failed: ${res.status} ${await res.text()}`);
  const rows: { document?: FirestoreDoc }[] = await res.json();
  return rows
    .map((r) => r.document)
    .filter((d): d is FirestoreDoc => !!d)
    .filter((d) => d.fields?.status?.stringValue === "scheduled");
}

async function setStatus(docName: string, status: "published" | "failed", nowIso: string) {
  const url = `https://firestore.googleapis.com/v1/${docName}?updateMask.fieldPaths=status&updateMask.fieldPaths=publishedAt`;
  await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      fields: {
        status: { stringValue: status },
        publishedAt: { timestampValue: nowIso },
      },
    }),
  });
}

export async function GET(req: Request) {
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const webhook = process.env.MAKE_WEBHOOK_URL;
  const nowIso = new Date().toISOString();

  try {
    const due = await findDuePosts(nowIso);

    if (!webhook) {
      // No delivery channel configured — leave posts queued rather than faking success.
      return NextResponse.json({ ok: true, due: due.length, published: 0, skipped: due.length, reason: "MAKE_WEBHOOK_URL not set" });
    }

    let published = 0;
    let failed = 0;
    for (const post of due) {
      try {
        const res = await fetch(webhook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            platform: post.fields?.platform?.stringValue ?? "",
            text: post.fields?.text?.stringValue ?? "",
            scheduledAt: post.fields?.scheduledAt?.timestampValue ?? "",
          }),
        });
        if (!res.ok) throw new Error(`webhook ${res.status}`);
        await setStatus(post.name, "published", nowIso);
        published++;
      } catch (e) {
        console.error("publish failed for", post.name, e);
        await setStatus(post.name, "failed", nowIso);
        failed++;
      }
    }

    return NextResponse.json({ ok: true, due: due.length, published, failed });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ ok: false, error: String(e) }, { status: 500 });
  }
}
