import { AlertTriangle, CheckCircle2, Flame, Zap } from "lucide-react";
import { zhRisk } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type RiskFlagBadgeProps = {
  level?: "normal" | "fatigue" | "high_urge" | "overloaded" | "recovery" | string;
  label?: string;
};

export function RiskFlagBadge({ level = "normal", label }: RiskFlagBadgeProps) {
  const config =
    level === "normal"
      ? {
          icon: CheckCircle2,
          className: "border-success/30 bg-success/10 text-success",
          text: "正常"
        }
      : level === "fatigue" || level === "recovery"
        ? {
            icon: Zap,
            className: "border-warning/30 bg-warning/10 text-warning",
            text: zhRisk(level)
          }
        : level === "high_urge"
          ? {
              icon: Flame,
              className: "border-danger/30 bg-danger/10 text-danger",
              text: "高冲动风险"
            }
          : {
              icon: AlertTriangle,
              className: "border-danger/30 bg-danger/10 text-danger",
              text: zhRisk(level)
            };

  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex h-7 items-center gap-1.5 rounded border px-2 text-xs font-medium",
        config.className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label ?? config.text}
    </span>
  );
}
