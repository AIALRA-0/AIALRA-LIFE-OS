import { ReactNode } from "react";
import { CommandBar } from "@/components/command-bar";
import { SidebarNav } from "@/components/sidebar-nav";

type AppShellProps = {
  title: string;
  subtitle?: string;
  dateLabel?: string;
  children: ReactNode;
  rightPanel?: ReactNode;
};

export function AppShell({ title, subtitle, dateLabel, children, rightPanel }: AppShellProps) {
  return (
    <div className="wiki-grid min-h-svh">
      <div className="flex min-h-svh">
        <SidebarNav />
        <div className="min-w-0 flex-1">
          <CommandBar title={title} subtitle={subtitle} dateLabel={dateLabel} />
          <div className="grid min-h-[calc(100svh-4rem)] grid-cols-1 xl:grid-cols-[minmax(0,1fr)_21rem]">
            <main className="min-w-0 px-4 py-5 lg:px-6">{children}</main>
            <aside className="border-t border-white/10 bg-black/18 px-4 py-5 backdrop-blur xl:border-l xl:border-t-0 xl:px-5">
              {rightPanel ?? (
                <div className="text-sm text-muted-foreground">
                  右侧上下文未加载。
                </div>
              )}
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
