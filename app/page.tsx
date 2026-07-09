import Link from "next/link";

const MODULES = [
  { href: "/suggestions", title: "Suggestions", desc: "Captions, SEO packs, ICP profiles — generated on-device.", status: "live" },
  { href: "/documents", title: "Documents", desc: "Word, PowerPoint, PDF exports built client-side.", status: "scaffold" },
  { href: "/invoices", title: "Invoices", desc: "Branded PDF invoices from Firestore records.", status: "scaffold" },
  { href: "/social", title: "Social", desc: "Metricool-style calendar, scheduling and analytics.", status: "scaffold" },
  { href: "/prospects", title: "Prospects", desc: "LinkedIn target lists and market rates from local scrapers.", status: "scaffold" },
];

export default function Home() {
  return (
    <div>
      <p className="label-mono">operator console</p>
      <h1 className="font-display text-3xl font-bold mt-2">
        Your AI runs here.<br />
        <span className="text-pulse">Not on someone else&apos;s meter.</span>
      </h1>
      <p className="mt-3 max-w-lg text-sm text-fog">
        Every generation happens inside this browser tab via WebGPU. Firebase stores the
        records, Vercel serves the shell — nothing else is billed, ever.
      </p>
      <div className="mt-8 grid gap-3 md:grid-cols-2">
        {MODULES.map((m) => (
          <Link key={m.href} href={m.href} className="card p-5 hover:border-pulse/60 transition-colors">
            <div className="flex items-center justify-between">
              <p className="font-display font-bold">{m.title}</p>
              <span className={`font-mono text-[10px] uppercase tracking-widest ${m.status === "live" ? "text-mint" : "text-fog"}`}>
                {m.status}
              </span>
            </div>
            <p className="mt-1 text-sm text-fog">{m.desc}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
