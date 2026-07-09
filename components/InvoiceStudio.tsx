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
import {
  invoiceTotal,
  money,
  type Invoice,
  type InvoiceItem,
} from "@/lib/invoices/types";
import { saveBlob } from "@/lib/exporters/download";
import { FileDown, Loader2, Plus, Trash2 } from "lucide-react";

const CURRENCIES = ["USD", "GBP", "EUR", "PHP", "AUD"];
const STATUS_NEXT: Record<Invoice["status"], Invoice["status"]> = {
  draft: "sent",
  sent: "paid",
  paid: "draft",
};
const STATUS_COLOR: Record<Invoice["status"], string> = {
  draft: "text-fog border-line",
  sent: "text-amber border-amber/40",
  paid: "text-mint border-mint/40",
};

function today(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().slice(0, 10);
}

function emptyInvoice(from: Invoice["from"]): Invoice {
  return {
    number: `INV-${today().replace(/-/g, "")}-01`,
    from,
    client: { name: "", email: "", address: "" },
    items: [{ description: "", qty: 1, rate: 0 }],
    currency: "USD",
    taxPct: 0,
    issued: today(),
    due: today(14),
    notes: "Payment within 14 days. Thank you for your business.",
    status: "draft",
  };
}

export default function InvoiceStudio() {
  const [from, setFrom] = useState<Invoice["from"]>({ name: "", email: "", address: "" });
  const [inv, setInv] = useState<Invoice>(() => emptyInvoice({ name: "", email: "", address: "" }));
  const [list, setList] = useState<(Invoice & { id: string })[]>([]);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("va-invoice-from");
    if (stored) {
      const parsed = JSON.parse(stored) as Invoice["from"];
      setFrom(parsed);
      setInv((v) => ({ ...v, from: parsed }));
    }
  }, []);

  useEffect(() => {
    const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
    return onSnapshot(q, (snap) => {
      setList(
        snap.docs.map((d) => ({ id: d.id, ...(d.data() as Invoice) }))
      );
    });
  }, []);

  function updateFrom(patch: Partial<Invoice["from"]>) {
    const next = { ...from, ...patch };
    setFrom(next);
    setInv((v) => ({ ...v, from: next }));
    localStorage.setItem("va-invoice-from", JSON.stringify(next));
  }

  function updateItem(i: number, patch: Partial<InvoiceItem>) {
    setInv((v) => ({
      ...v,
      items: v.items.map((it, j) => (j === i ? { ...it, ...patch } : it)),
    }));
  }

  async function save() {
    if (!inv.client.name.trim() || saving) return;
    setSaving(true);
    try {
      await addDoc(collection(db, "invoices"), {
        ...inv,
        createdAt: serverTimestamp(),
      });
      setInv(emptyInvoice(from));
    } finally {
      setSaving(false);
    }
  }

  async function download(invoice: Invoice, key: string) {
    if (downloading) return;
    setDownloading(key);
    try {
      const { invoicePdfBlob } = await import("@/lib/exporters/pdf");
      saveBlob(await invoicePdfBlob(invoice), `${invoice.number}.pdf`);
    } finally {
      setDownloading(null);
    }
  }

  async function cycleStatus(item: Invoice & { id: string }) {
    await updateDoc(doc(db, "invoices", item.id), { status: STATUS_NEXT[item.status] });
  }

  async function remove(id: string) {
    await deleteDoc(doc(db, "invoices", id));
  }

  const inputCls =
    "rounded-md border border-line bg-ink px-3 py-2 text-sm text-paper placeholder:text-fog/50 focus:border-pulse focus:outline-none";

  return (
    <div className="space-y-8">
      {/* Your business */}
      <div className="card p-4">
        <p className="label-mono mb-3">your business (remembered on this device)</p>
        <div className="grid gap-3 md:grid-cols-3">
          <input className={inputCls} placeholder="Business name" value={from.name} onChange={(e) => updateFrom({ name: e.target.value })} />
          <input className={inputCls} placeholder="Email" value={from.email} onChange={(e) => updateFrom({ email: e.target.value })} />
          <input className={inputCls} placeholder="Address / city" value={from.address} onChange={(e) => updateFrom({ address: e.target.value })} />
        </div>
      </div>

      {/* New invoice */}
      <div className="card p-4 space-y-4">
        <p className="label-mono">new invoice</p>
        <div className="grid gap-3 md:grid-cols-4">
          <input className={inputCls} placeholder="Invoice #" value={inv.number} onChange={(e) => setInv({ ...inv, number: e.target.value })} />
          <select className={inputCls} value={inv.currency} onChange={(e) => setInv({ ...inv, currency: e.target.value })}>
            {CURRENCIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <label className="flex items-center gap-2 text-xs text-fog">
            issued
            <input type="date" className={`${inputCls} flex-1`} value={inv.issued} onChange={(e) => setInv({ ...inv, issued: e.target.value })} />
          </label>
          <label className="flex items-center gap-2 text-xs text-fog">
            due
            <input type="date" className={`${inputCls} flex-1`} value={inv.due} onChange={(e) => setInv({ ...inv, due: e.target.value })} />
          </label>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <input className={inputCls} placeholder="Client name" value={inv.client.name} onChange={(e) => setInv({ ...inv, client: { ...inv.client, name: e.target.value } })} />
          <input className={inputCls} placeholder="Client email" value={inv.client.email} onChange={(e) => setInv({ ...inv, client: { ...inv.client, email: e.target.value } })} />
          <input className={inputCls} placeholder="Client address" value={inv.client.address} onChange={(e) => setInv({ ...inv, client: { ...inv.client, address: e.target.value } })} />
        </div>

        {/* Line items */}
        <div className="space-y-2">
          {inv.items.map((it, i) => (
            <div key={i} className="flex gap-2">
              <input className={`${inputCls} flex-1`} placeholder="Description — e.g. Dedicated VA, 40 hrs" value={it.description} onChange={(e) => updateItem(i, { description: e.target.value })} />
              <input type="number" min={0} className={`${inputCls} w-20`} placeholder="Qty" value={it.qty} onChange={(e) => updateItem(i, { qty: Number(e.target.value) })} />
              <input type="number" min={0} step="0.01" className={`${inputCls} w-28`} placeholder="Rate" value={it.rate} onChange={(e) => updateItem(i, { rate: Number(e.target.value) })} />
              <button
                onClick={() => setInv({ ...inv, items: inv.items.filter((_, j) => j !== i) })}
                disabled={inv.items.length === 1}
                className="rounded-md border border-line px-3 text-fog hover:text-amber disabled:opacity-30"
                aria-label="Remove line"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          <button
            onClick={() => setInv({ ...inv, items: [...inv.items, { description: "", qty: 1, rate: 0 }] })}
            className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-1.5 text-xs text-fog hover:text-paper"
          >
            <Plus size={13} /> line item
          </button>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <label className="flex items-center gap-2 text-xs text-fog">
            tax %
            <input type="number" min={0} className={`${inputCls} w-24`} value={inv.taxPct} onChange={(e) => setInv({ ...inv, taxPct: Number(e.target.value) })} />
          </label>
          <input className={inputCls} placeholder="Notes / payment terms" value={inv.notes} onChange={(e) => setInv({ ...inv, notes: e.target.value })} />
        </div>

        <div className="flex items-center justify-between border-t border-line pt-4">
          <p className="font-display text-lg font-bold">
            Total <span className="text-mint">{money(invoiceTotal(inv), inv.currency)}</span>
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => download(inv, "draft")}
              disabled={!!downloading}
              className="inline-flex items-center gap-2 rounded-md border border-line px-4 py-2 text-sm text-fog hover:text-paper disabled:opacity-60"
            >
              {downloading === "draft" ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
              PDF
            </button>
            <button
              onClick={save}
              disabled={saving || !inv.client.name.trim()}
              className="inline-flex items-center gap-2 rounded-md bg-pulse px-5 py-2 text-sm font-medium text-ink hover:opacity-90 disabled:opacity-40"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              Save invoice
            </button>
          </div>
        </div>
      </div>

      {/* Saved invoices */}
      <div>
        <h2 className="font-display text-lg font-bold mb-3">Saved invoices</h2>
        {list.length === 0 ? (
          <p className="text-sm text-fog">Nothing saved yet — your invoices will appear here.</p>
        ) : (
          <div className="space-y-2">
            {list.map((item) => (
              <div key={item.id} className="card flex flex-wrap items-center gap-3 p-3 text-sm">
                <span className="font-mono text-xs text-pulse w-40 truncate">{item.number}</span>
                <span className="flex-1 truncate">{item.client.name}</span>
                <span className="font-mono text-xs text-fog">{item.due}</span>
                <span className="font-medium text-mint">{money(invoiceTotal(item), item.currency)}</span>
                <button
                  onClick={() => cycleStatus(item)}
                  title="Click to change status"
                  className={`rounded-full border px-3 py-0.5 font-mono text-[10px] uppercase tracking-widest ${STATUS_COLOR[item.status]}`}
                >
                  {item.status}
                </button>
                <button
                  onClick={() => download(item, item.id)}
                  disabled={!!downloading}
                  className="text-fog hover:text-paper disabled:opacity-40"
                  aria-label="Download PDF"
                >
                  {downloading === item.id ? <Loader2 size={15} className="animate-spin" /> : <FileDown size={15} />}
                </button>
                <button onClick={() => remove(item.id)} className="text-fog hover:text-amber" aria-label="Delete">
                  <Trash2 size={15} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
