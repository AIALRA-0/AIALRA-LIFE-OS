import { Dumbbell, HeartPulse } from "lucide-react";
import { getBodyActivationTemplate } from "@/lib/body/activation-template";
import { evaluateBodySafety, type BodySafetyInput } from "@/lib/body/safety-rules";
import { getMovementTemplateForDate } from "@/lib/body/movement-template";

export function BodyRoutesPanel({
  date,
  safetyInput = {}
}: {
  date: Date;
  safetyInput?: BodySafetyInput;
}) {
  const activation = getBodyActivationTemplate();
  const movement = getMovementTemplateForDate(date);
  const safety = evaluateBodySafety(safetyInput);

  return (
    <div className="space-y-4">
      <section className="rounded border border-white/10 bg-white/[0.035] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <HeartPulse className="h-4 w-4 text-success" />
          03:30 身体激活
        </div>
        <div className="grid gap-2">
          {activation.structure.map((item) => (
            <div key={`${item.start}-${item.end}`} className="flex items-center justify-between gap-3 text-xs">
              <span className="font-mono text-muted-foreground">{item.start}-{item.end}</span>
              <span className="text-right text-slate-200">{item.segment}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded border border-white/10 bg-white/[0.035] p-4">
        <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
          <Dumbbell className="h-4 w-4 text-primary" />
          07:00 运动训练
        </div>
        <div className="text-sm font-medium text-white">
          {safety.rescueMode ? "Rescue Mode" : movement?.theme ?? "恢复训练"}
        </div>
        <ul className="mt-2 grid gap-1 text-xs text-muted-foreground">
          {(safety.rescueMode ? safety.movementPlan : movement?.structure ?? []).map((item) => (
            <li key={item}>- {item}</li>
          ))}
        </ul>
        {safety.reasons.length ? (
          <p className="mt-3 text-xs text-warning">{safety.reasons.join("；")}</p>
        ) : null}
      </section>
    </div>
  );
}
