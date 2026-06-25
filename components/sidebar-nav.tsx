"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Bot,
  Brain,
  CalendarPlus,
  Route,
  Gauge,
  Library,
  Settings,
  Sparkles,
  TreePine
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/dashboard", label: "总览", icon: Gauge },
  { href: "/plan/new", label: "生成计划", icon: CalendarPlus },
  { href: "/plan/today", label: "今日执行", icon: Activity },
  { href: "/routes/current", label: "今日路线", icon: Route },
  { href: "/review/daily", label: "日结复盘", icon: Brain },
  { href: "/resources", label: "资源库", icon: Library },
  { href: "/skills", label: "技能树", icon: TreePine },
  { href: "/agents", label: "Agent日志", icon: Bot },
  { href: "/settings", label: "设置", icon: Settings }
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-svh w-64 shrink-0 border-r border-white/10 bg-black/24 px-3 py-4 backdrop-blur xl:block">
      <Link href="/dashboard" className="mb-5 flex items-center gap-3 px-2">
        <span className="grid h-9 w-9 place-items-center rounded border border-primary/30 bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </span>
        <span>
          <span className="block text-sm font-semibold tracking-wide text-white">
            Aialra Life OS
          </span>
          <span className="block font-mono text-[11px] text-muted-foreground">
            03:00 / 20:00
          </span>
        </span>
      </Link>

      <nav className="space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-10 items-center gap-3 rounded px-3 text-sm text-muted-foreground transition",
                "hover:bg-white/[0.06] hover:text-white",
                active && "bg-primary/10 text-primary shadow-[inset_2px_0_0_hsl(var(--primary))]"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
