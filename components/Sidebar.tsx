"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sparkles,
  FileText,
  Receipt,
  CalendarClock,
  Users,
  LayoutDashboard,
} from "lucide-react";

const NAV = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/suggestions", label: "Suggestions", icon: Sparkles },
  { href: "/documents", label: "Documents", icon: FileText },
  { href: "/invoices", label: "Invoices", icon: Receipt },
  { href: "/social", label: "Social", icon: CalendarClock },
  { href: "/prospects", label: "Prospects", icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="w-56 shrink-0 border-r border-line bg-panel/40 px-4 py-8 hidden md:flex md:flex-col">
      <div className="mb-10 px-2">
        <p className="font-display text-lg font-bold text-paper leading-none">
          VA<span className="text-pulse">·</span>AI
        </p>
        <p className="label-mono mt-2">suite / on-device</p>
      </div>
      <nav className="flex flex-col gap-1">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${
                active
                  ? "bg-pulse/15 text-pulse"
                  : "text-fog hover:text-paper hover:bg-line/40"
              }`}
            >
              <Icon size={16} strokeWidth={1.8} />
              {label}
            </Link>
          );
        })}
      </nav>
      <p className="label-mono mt-auto px-2">model runs in your browser</p>
    </aside>
  );
}
