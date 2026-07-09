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
  updateDoc,
} from "firebase/firestore";
import { db } from "@/lib/firebase/client";
import { Loader2, Plus, Trash2 } from "lucide-react";

const STATUSES = ["new", "contacted", "replied", "client"] as const;
type Status = (typeof STATUSES)[number];

const STATUS_COLOR: Record<Status, string> = {
  new: "text-fog border-line",
  contacted: "text-pulse border-pulse/40",
  replied: "text-amber border-amber/40",
  client: "text-mint border-mint/40",
};

interface Prospect {
  id: string;
  name: string;
  title: string;
  company: string;
  source: string;
  notes: string;
  status: Status;
}

const EMPTY = { name: "", title: "", company: "", source: "", notes: "" };

// Typical offshore VA market rates — reference for pitching (update as the market moves).
const RATES = [
  { role: "General admin VA", ph: "$4–7/hr", client: "$9–14/hr" },
  { role: "Cold caller / ISA", ph: "$5–8/hr", client: "$10–16/hr" },
  { role: "Social media VA", ph: "$5–8/hr", client: "$10–15/hr" },
  { role: "Bookkeeping VA", ph: "$6–10/hr", client: "$12–20/hr" },
  { role: "Executive assistant", ph: "$7–12/hr", client: "$14–25/hr" },
];

export default function ProspectBoard() {
  const [form, setForm] = useState(EMPTY);
  const [rows, setRows] = useState<Prospect[]>([]);
  const [filter, setFilter] = useState<Status | "all">("all");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const q = query(collection(db, "prospects"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setRows(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<Prospect, "id">) })));
    });
  }, []);

  async function add() {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "prospects"), {
        ...form,
        status: "new",
        createdAt: serverTimestamp(),
      });
      setForm(EMPTY);
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, status: Status) {
    await updateDoc(doc(db, "prospects", id), { status });
  }

  async function remove(id: string) {
    await deleteDoc(doc(db, "prospects", id));
  }

  const visible = filter === "all" ? rows : rows.filter((r) => r.status === filter);
  const counts = STATUSES.map((s) => ({ s, n: rows.filter((r) => r.status === s).length }));

  const inputCls =
    "rounded-md border border-line bg-ink px-3 py-2 text-sm text-paper placeholder:text-fog/50 focus:border-pulse focus:outline-none";

  return (
    <div className="space-y-8">
      {/* Add */}
      <div className="card p-4 space-y-3">
        <p className="label-mono">add prospect</p>
        <div className="grid gap-3 md:grid-cols-4">
          <input className={inputCls} placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <input className={inputCls} placeholder="Job title" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <input className={inputCls} placeholder="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          <input className={inputCls} placeholder="Source — e.g. LinkedIn group" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })} />
        </div>
        <div className="flex gap-3">
          <input className={`${inputCls} flex-1`} placeholder="Notes / pitch angle" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <button
            onClick={add}
            disabled={saving || !form.name.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-pulse px-5 py-2 text-sm font-medium text-ink hover:opacity-90 disabled:opacity-40"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Add
          </button>
        </div>
        <p className="text-xs text-fog">
          Bulk import: run <span className="font-mono text-pulse">node scripts/import-prospects.mjs your-list.csv</span> on
          your PC (columns: name,title,company,source,notes).
        </p>
      </div>

      {/* Pipeline */}
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="font-display text-lg font-bold mr-2">Pipeline</h2>
          <FilterChip label={`all ${rows.length}`} active={filter === "all"} onClick={() => setFilter("all")} />
          {counts.map(({ s, n }) => (
            <FilterChip key={s} label={`${s} ${n}`} active={filter === s} onClick={() => setFilter(s)} />
          ))}
        </div>
        {visible.length === 0 ? (
          <p className="text-sm text-fog">No prospects here yet.</p>
        ) : (
          <div className="space-y-2">
            {visible.map((r) => (
              <div key={r.id} className="card flex flex-wrap items-center gap-3 p-3 text-sm">
                <div className="w-44 min-w-0">
                  <p className="truncate font-medium">{r.name}</p>
                  <p className="truncate text-xs text-fog">{r.title}</p>
                </div>
                <span className="w-36 truncate text-fog">{r.company}</span>
                <span className="w-32 truncate font-mono text-xs text-fog">{r.source}</span>
                <span className="flex-1 min-w-40 truncate text-fog">{r.notes}</span>
                <select
                  value={r.status}
                  onChange={(e) => setStatus(r.id, e.target.value as Status)}
                  className={`rounded-full border bg-ink px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest ${STATUS_COLOR[r.status]}`}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <button onClick={() => remove(r.id)} className="text-fog hover:text-amber" aria-label="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Market rates */}
      <div>
        <h2 className="font-display text-lg font-bold mb-3">Market rates — quick reference</h2>
        <div className="card overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left">
                <th className="label-mono p-3 font-normal">role</th>
                <th className="label-mono p-3 font-normal">typical PH pay</th>
                <th className="label-mono p-3 font-normal">typical client rate</th>
              </tr>
            </thead>
            <tbody>
              {RATES.map((r) => (
                <tr key={r.role} className="border-b border-line/50 last:border-0">
                  <td className="p-3">{r.role}</td>
                  <td className="p-3 font-mono text-xs text-fog">{r.ph}</td>
                  <td className="p-3 font-mono text-xs text-mint">{r.client}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function FilterChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-widest transition-colors ${
        active ? "border-pulse bg-pulse/15 text-pulse" : "border-line text-fog hover:text-paper"
      }`}
    >
      {label}
    </button>
  );
}
