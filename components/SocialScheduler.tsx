"use client";

import { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { CalendarClock, Check, Loader2, Send, Trash2 } from "lucide-react";

const PLATFORMS = ["LinkedIn", "Facebook", "Instagram", "X"] as const;
type Platform = (typeof PLATFORMS)[number];

interface Post {
  id: string;
  platform: Platform;
  text: string;
  scheduledAt: Timestamp;
  status: "scheduled" | "published" | "failed";
  publishedAt?: Timestamp;
}

function defaultTime() {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  d.setHours(9, 0, 0, 0);
  // datetime-local wants local time without timezone
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function SocialScheduler() {
  const [platform, setPlatform] = useState<Platform>("LinkedIn");
  const [text, setText] = useState("");
  const [when, setWhen] = useState(defaultTime);
  const [posts, setPosts] = useState<Post[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("scheduledAt", "asc"));
    return onSnapshot(q, (snap) => {
      setPosts(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Post, "id">) })));
    });
  }, []);

  async function schedule() {
    if (!text.trim() || saving) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "posts"), {
        platform,
        text,
        scheduledAt: Timestamp.fromDate(new Date(when)),
        status: "scheduled",
        createdAt: serverTimestamp(),
      });
      setText("");
    } finally {
      setSaving(false);
    }
  }

  async function markPublished(id: string) {
    await updateDoc(doc(db, "posts", id), {
      status: "published",
      publishedAt: Timestamp.now(),
    });
  }

  async function remove(id: string) {
    await deleteDoc(doc(db, "posts", id));
  }

  const upcoming = posts.filter((p) => p.status === "scheduled");
  const history = posts.filter((p) => p.status !== "scheduled").reverse();

  const inputCls =
    "rounded-md border border-line bg-ink px-3 py-2 text-sm text-paper placeholder:text-fog/50 focus:border-pulse focus:outline-none";

  return (
    <div className="space-y-8">
      {/* Composer */}
      <div className="card p-4 space-y-3">
        <p className="label-mono">compose</p>
        <div className="flex flex-wrap gap-2">
          {PLATFORMS.map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`rounded-md border px-4 py-1.5 text-sm transition-colors ${
                platform === p
                  ? "border-pulse bg-pulse/15 text-pulse"
                  : "border-line text-fog hover:text-paper"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={4}
          placeholder="Post copy — tip: generate captions in the Suggestions module and paste them here."
          className={`${inputCls} w-full resize-none`}
        />
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-fog">
            <CalendarClock size={14} />
            <input
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
              className={inputCls}
            />
          </label>
          <button
            onClick={schedule}
            disabled={saving || !text.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-pulse px-5 py-2 text-sm font-medium text-ink hover:opacity-90 disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            Schedule
          </button>
          <span className="font-mono text-[11px] text-fog">
            {text.length} chars{platform === "X" && text.length > 280 ? " — over X limit" : ""}
          </span>
        </div>
      </div>

      {/* Queue */}
      <div>
        <h2 className="font-display text-lg font-bold mb-3">
          Queue <span className="text-fog font-body text-sm">({upcoming.length} scheduled)</span>
        </h2>
        {upcoming.length === 0 ? (
          <p className="text-sm text-fog">Nothing queued. Scheduled posts appear here until the daily publisher picks them up.</p>
        ) : (
          <div className="space-y-2">
            {upcoming.map((p) => (
              <PostRow key={p.id} post={p} onPublish={markPublished} onDelete={remove} />
            ))}
          </div>
        )}
        <p className="mt-3 text-xs text-fog">
          The publisher cron runs daily at 09:00 UTC and pushes due posts to your Make.com webhook
          (set <span className="font-mono text-pulse">MAKE_WEBHOOK_URL</span> in Vercel). Without a
          webhook it leaves posts queued — use the ✓ button after posting manually.
        </p>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <h2 className="font-display text-lg font-bold mb-3">History</h2>
          <div className="space-y-2">
            {history.map((p) => (
              <PostRow key={p.id} post={p} onDelete={remove} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PostRow({
  post,
  onPublish,
  onDelete,
}: {
  post: Post;
  onPublish?: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const date = post.scheduledAt?.toDate();
  return (
    <div className="card flex items-start gap-3 p-3 text-sm">
      <span className="label-mono w-20 shrink-0 pt-0.5">{post.platform}</span>
      <p className="flex-1 whitespace-pre-wrap">{post.text}</p>
      <span className="font-mono text-xs text-fog shrink-0 pt-0.5">
        {date ? date.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—"}
      </span>
      <span
        className={`shrink-0 rounded-full border px-2.5 py-0.5 font-mono text-[10px] uppercase tracking-widest ${
          post.status === "published"
            ? "border-mint/40 text-mint"
            : post.status === "failed"
            ? "border-amber/40 text-amber"
            : "border-line text-fog"
        }`}
      >
        {post.status}
      </span>
      {post.status === "scheduled" && onPublish && (
        <button
          onClick={() => onPublish(post.id)}
          className="shrink-0 text-fog hover:text-mint"
          title="Mark as published"
        >
          <Check size={15} />
        </button>
      )}
      <button onClick={() => onDelete(post.id)} className="shrink-0 text-fog hover:text-amber" aria-label="Delete">
        <Trash2 size={15} />
      </button>
    </div>
  );
}
