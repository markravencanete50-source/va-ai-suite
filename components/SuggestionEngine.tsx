"use client";

import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { generateJSON } from "@/lib/webllm/engine";
import {
  PROMPTS,
  type SuggestionType,
  type CaptionResult,
  type SeoResult,
  type IcpResult,
} from "@/lib/webllm/prompts";
import { Loader2, Save, Check } from "lucide-react";

type AnyResult = CaptionResult | SeoResult | IcpResult;

export default function SuggestionEngine() {
  const [type, setType] = useState<SuggestionType>("captions");
  const [brief, setBrief] = useState("");
  const [status, setStatus] = useState<"idle" | "loading-model" | "generating" | "done" | "error">("idle");
  const [progress, setProgress] = useState("");
  const [result, setResult] = useState<AnyResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    if (!brief.trim()) return;
    setStatus("loading-model");
    setResult(null);
    setSaved(false);
    setError("");
    try {
      const prompt = PROMPTS[type];
      const data = await generateJSON<AnyResult>(
        prompt.system,
        prompt.user(brief),
        (r) => {
          setProgress(r.text);
          if (r.progress >= 1) setStatus("generating");
        }
      );
      setStatus("generating");
      setResult(data);
      setStatus("done");
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Generation failed. Please try again.");
      setStatus("error");
    }
  }

  async function save() {
    if (!result) return;
    await addDoc(collection(db, "suggestions"), {
      type,
      brief,
      result,
      createdAt: serverTimestamp(),
    });
    setSaved(true);
  }

  const busy = status === "loading-model" || status === "generating";

  return (
    <div className="space-y-6">
      {/* Type selector */}
      <div className="flex gap-2">
        {(Object.keys(PROMPTS) as SuggestionType[]).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded-md border px-4 py-2 text-sm transition-colors ${
              type === t
                ? "border-pulse bg-pulse/15 text-pulse"
                : "border-line text-fog hover:text-paper"
            }`}
          >
            {PROMPTS[t].label}
          </button>
        ))}
      </div>

      {/* Brief input */}
      <div className="card p-4">
        <label className="label-mono block mb-2">service brief</label>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={4}
          placeholder="e.g. Offshore VA staffing for US real estate agencies — cold call handling, CRM updates, listing coordination. Target: brokers with 10–50 agents."
          className="w-full resize-none rounded-md border border-line bg-ink px-3 py-2 text-sm text-paper placeholder:text-fog/50 focus:border-pulse focus:outline-none"
        />
        <div className="mt-3 flex items-center gap-4">
          <button
            onClick={run}
            disabled={busy || !brief.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-pulse px-5 py-2 text-sm font-medium text-ink transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {status === "loading-model"
              ? "Loading model…"
              : status === "generating"
              ? "Generating…"
              : "Generate"}
          </button>
          {status === "loading-model" && (
            <p className="font-mono text-xs text-fog truncate max-w-md">{progress}</p>
          )}
        </div>
        {status === "loading-model" && (
          <p className="mt-2 text-xs text-fog">
            First run downloads the model (~1.8GB) and caches it in your browser. Every run after
            this is instant and free.
          </p>
        )}
        {error && <p className="mt-2 text-xs text-amber">{error}</p>}
      </div>

      {/* Results */}
      {result && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg font-bold">Output</h2>
            <button
              onClick={save}
              disabled={saved}
              className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-1.5 text-sm text-fog hover:text-paper disabled:opacity-60"
            >
              {saved ? <Check size={14} className="text-mint" /> : <Save size={14} />}
              {saved ? "Saved to Firestore" : "Save"}
            </button>
          </div>
          <ResultView type={type} result={result} />
        </div>
      )}
    </div>
  );
}

function ResultView({ type, result }: { type: SuggestionType; result: AnyResult }) {
  if (type === "captions") {
    const r = result as CaptionResult;
    return (
      <div className="grid gap-3 md:grid-cols-2">
        {r.captions?.map((c, i) => (
          <div key={i} className="card p-4">
            <div className="flex items-center justify-between">
              <span className="label-mono">{c.platform}</span>
              <span className="font-mono text-xs text-mint">{c.best_time}</span>
            </div>
            <p className="mt-2 text-sm whitespace-pre-wrap">{c.text}</p>
            <p className="mt-2 font-mono text-xs text-pulse">
              {c.hashtags?.map((h) => (h.startsWith("#") ? h : `#${h}`)).join(" ")}
            </p>
          </div>
        ))}
      </div>
    );
  }
  if (type === "seo") {
    const r = result as SeoResult;
    return (
      <div className="card p-5 space-y-4 text-sm">
        <Row label="primary keyword" value={r.primary_keyword} accent />
        <Row label="secondary" value={r.secondary_keywords?.join(" · ")} />
        <div>
          <p className="label-mono mb-1">title options</p>
          <ul className="space-y-1">
            {r.title_options?.map((t, i) => (
              <li key={i}>— {t}</li>
            ))}
          </ul>
        </div>
        <Row label="meta description" value={r.meta_description} />
        <div>
          <p className="label-mono mb-1">content ideas</p>
          <ul className="space-y-1">
            {r.content_ideas?.map((t, i) => (
              <li key={i}>— {t}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  }
  const r = result as IcpResult;
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {r.segments?.map((s, i) => (
        <div key={i} className="card p-4 text-sm space-y-2">
          <p className="font-display font-bold text-pulse">{s.name}</p>
          <Row label="industry" value={s.industry} />
          <Row label="size" value={s.company_size} />
          <Row label="decision maker" value={s.decision_maker} />
          <div>
            <p className="label-mono">pain points</p>
            <ul className="mt-1 space-y-1">
              {s.pain_points?.map((p, j) => (
                <li key={j}>— {p}</li>
              ))}
            </ul>
          </div>
          <Row label="where to find" value={s.where_to_find} />
          <Row label="pitch angle" value={s.pitch_angle} />
        </div>
      ))}
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value?: string; accent?: boolean }) {
  return (
    <div>
      <p className="label-mono">{label}</p>
      <p className={`mt-0.5 ${accent ? "text-pulse font-medium" : ""}`}>{value}</p>
    </div>
  );
}
