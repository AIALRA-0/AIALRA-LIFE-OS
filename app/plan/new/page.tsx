import { AppShell } from "@/components/app-shell";
import { DailyInputForm } from "@/components/daily-input-form";
import { RiskFlagBadge } from "@/components/risk-flag-badge";
import { requirePageUser } from "@/lib/page-auth";
import { dateOnly } from "@/lib/utils/time";

export const dynamic = "force-dynamic";

export default async function NewPlanPage() {
  await requirePageUser();

  return (
    <AppShell
      title="生成计划"
      subtitle="输入今天必须做的事、临时事项、身体状态、精神状态和研究需求。"
      dateLabel={dateOnly()}
      rightPanel={
        <div className="space-y-4">
          <RiskFlagBadge level="normal" label="计划护栏" />
          <div className="rounded border border-white/10 bg-white/[0.035] p-4">
            <h2 className="text-sm font-semibold text-white">不可破坏规则</h2>
            <ul className="mt-3 grid gap-2 text-sm text-muted-foreground">
              <li>20:00 睡觉是硬边界。</li>
              <li>03:00 起床是当天起点。</li>
              <li>支线扩张前，芯片/EDA 必须有可见产出。</li>
              <li>AI Agent 只能加速主线，不能吞掉主线。</li>
              <li>低能量会生成低强度 rescue plan。</li>
            </ul>
          </div>
        </div>
      }
    >
      <section className="rounded border border-white/10 bg-white/[0.035] p-5">
        <DailyInputForm />
      </section>
    </AppShell>
  );
}
