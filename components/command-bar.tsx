import Link from "next/link";
import { CalendarDays, Command, Plus, Search } from "lucide-react";

type CommandBarProps = {
  title: string;
  subtitle?: string;
  dateLabel?: string;
};

export function CommandBar({ title, subtitle, dateLabel }: CommandBarProps) {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-[#050812]/86 backdrop-blur">
      <div className="flex min-h-16 flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center lg:justify-between lg:px-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em] text-primary">
            <Command className="h-3.5 w-3.5" />
            Life OS 指挥台
          </div>
          <h1 className="mt-1 truncate text-xl font-semibold text-white">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden h-9 min-w-56 items-center gap-2 rounded border border-white/10 bg-white/[0.04] px-3 text-sm text-muted-foreground md:flex">
            <Search className="h-4 w-4" />
            <span className="truncate">搜索资源、技能、计划块</span>
          </div>
          {dateLabel ? (
            <div className="flex h-9 items-center gap-2 rounded border border-white/10 bg-white/[0.04] px-3 font-mono text-xs text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              {dateLabel}
            </div>
          ) : null}
          <Link
            href="/plan/new"
            className="inline-flex h-9 items-center gap-2 rounded bg-primary px-3 text-sm font-medium text-primary-foreground transition hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            生成计划
          </Link>
        </div>
      </div>
    </header>
  );
}
