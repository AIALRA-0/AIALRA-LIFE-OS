import { AppShell } from "@/components/app-shell";
import { ReviewSummaryCard } from "@/components/review-summary-card";
import { requirePageUser } from "@/lib/page-auth";
import { dateOnly } from "@/lib/utils/time";

export const dynamic = "force-dynamic";

export default async function DailyReviewPage() {
  await requirePageUser();

  return (
    <AppShell
      title="日结复盘"
      subtitle="晚上生成执行审计、技能证据更新和明日重点。"
      dateLabel={dateOnly()}
      rightPanel={
        <div className="rounded border border-white/10 bg-white/[0.035] p-4">
          <h2 className="text-sm font-semibold text-white">复盘范围</h2>
          <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
            <li>完成率和未完成项。</li>
            <li>能量、专注、冲动、过载信号。</li>
            <li>产出物证据是否挂到技能节点。</li>
            <li>不推迟睡觉的明日重点。</li>
          </ul>
        </div>
      }
    >
      <ReviewSummaryCard />
    </AppShell>
  );
}
