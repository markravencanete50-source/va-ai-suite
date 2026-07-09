"use client";

import { useState } from "react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { generateJSON } from "@/lib/webllm/engine";
import { DOC_PROMPTS, type DocResult, type DocType } from "@/lib/webllm/docPrompts";
import { saveBlob, slugify } from "@/lib/exporters/download";
import { Check, FileDown, Loader2, Presentation, Save, FileText } from "lucide-react";

export default function DocumentStudio() {
  const [type, setType] = useState<DocType>("proposal");
  const [brief, setBrief] = useState("");
  const [status, setStatus] = useState<"idle" | "loading-model" | "generating" | "done" | "error">("idle");
  const [progress, setProgress] = useState("");
  const [doc, setDoc] = useState<DocResult | null>(null);
  const [saved, setSaved] = useState(false);
  const [exporting, setExporting] = useState<"docx" | "pptx" | "pdf" | null>(null);
  const [error, setError] = useState("");

  async function run() {
    if (!brief.trim()) return;
    setStatus("loading-model");
    setDoc(null);
    setSaved(false);
    setError("");
    try {
      const prompt = DOC_PROMPTS[type];
      const data = await generateJSON<DocResult>(
        prompt.system,
        prompt.user(brief),
        (r) => {
          setProgress(r.text);
          if (r.progress >= 1) setStatus("generating");
        },
        2400
      );
      setStatus("generating");
      setDoc(data);
      setStatus("done");
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Generation failed. Please try again.");
      setStatus("error");
    }
  }

  async function save() {
    if (!doc) return;
    await addDoc(collection(db, "documents"), {
      type,
      brief,
      doc,
      createdAt: serverTimestamp(),
    });
    setSaved(true);
  }

  async function exportAs(format: "docx" | "pptx" | "pdf") {
    if (!doc || exporting) return;
    setExporting(format);
    try {
      const base = slugify(doc.title);
      if (format === "docx") {
        const { docxBlob } = await import("@/lib/exporters/docx");
        saveBlob(await docxBlob(doc), `${base}.docx`);
      } else if (format === "pptx") {
        const { pptxFile } = await import("@/lib/exporters/pptx");
        await pptxFile(doc, `${base}.pptx`);
      } else {
        const { docPdfBlob } = await import("@/lib/exporters/pdf");
        saveBlob(await docPdfBlob(doc), `${base}.pdf`);
      }
    } catch (e) {
      console.error(e);
      setError("Export failed — see the browser console for details.");
    } finally {
      setExporting(null);
    }
  }

  const busy = status === "loading-model" || status === "generating";

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2">
        {(Object.keys(DOC_PROMPTS) as DocType[]).map((t) => (
          <button
            key={t}
            onClick={() => setType(t)}
            className={`rounded-md border px-4 py-2 text-sm transition-colors ${
              type === t
                ? "border-pulse bg-pulse/15 text-pulse"
                : "border-line text-fog hover:text-paper"
            }`}
          >
            {DOC_PROMPTS[t].label}
          </button>
        ))}
      </div>

      <div className="card p-4">
        <label className="label-mono block mb-2">document brief</label>
        <textarea
          value={brief}
          onChange={(e) => setBrief(e.target.value)}
          rows={4}
          placeholder="e.g. Proposal for a Leeds lettings agency: 2 dedicated VAs covering tenant enquiries, viewings coordination and portal listings, £9/hr, 4-week pilot then rolling monthly."
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
              ? "Drafting…"
              : "Draft document"}
          </button>
          {status === "loading-model" && (
            <p className="font-mono text-xs text-fog truncate max-w-md">{progress}</p>
          )}
        </div>
        {error && <p className="mt-2 text-xs text-amber">{error}</p>}
      </div>

      {doc && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-display text-lg font-bold">Preview</h2>
            <div className="flex flex-wrap gap-2">
              <ExportButton
                icon={FileText}
                label=".docx"
                busy={exporting === "docx"}
                onClick={() => exportAs("docx")}
              />
              <ExportButton
                icon={Presentation}
                label=".pptx"
                busy={exporting === "pptx"}
                onClick={() => exportAs("pptx")}
              />
              <ExportButton
                icon={FileDown}
                label=".pdf"
                busy={exporting === "pdf"}
                onClick={() => exportAs("pdf")}
              />
              <button
                onClick={save}
                disabled={saved}
                className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-1.5 text-sm text-fog hover:text-paper disabled:opacity-60"
              >
                {saved ? <Check size={14} className="text-mint" /> : <Save size={14} />}
                {saved ? "Saved" : "Save"}
              </button>
            </div>
          </div>

          <div className="card p-6 space-y-5">
            <div>
              <h3 className="font-display text-xl font-bold">{doc.title}</h3>
              <p className="mt-1 text-sm text-fog">{doc.subtitle}</p>
            </div>
            {doc.sections?.map((s, i) => (
              <div key={i} className="border-t border-line pt-4">
                <p className="font-display font-bold text-pulse">{s.heading}</p>
                <p className="mt-1 text-sm whitespace-pre-wrap">{s.body}</p>
                {s.bullets?.length > 0 && (
                  <ul className="mt-2 space-y-1 text-sm text-fog">
                    {s.bullets.map((b, j) => (
                      <li key={j}>— {b}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ExportButton({
  icon: Icon,
  label,
  busy,
  onClick,
}: {
  icon: typeof FileDown;
  label: string;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-1.5 text-sm text-fog hover:text-paper disabled:opacity-60"
    >
      {busy ? <Loader2 size={14} className="animate-spin" /> : <Icon size={14} />}
      {label}
    </button>
  );
}
