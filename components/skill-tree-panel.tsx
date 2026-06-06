"use client";

import { ChevronRight } from "lucide-react";
import { zhDomain } from "@/lib/i18n";

export type SkillTreeNode = {
  id: string;
  parentId: string | null;
  name: string;
  domain: string;
  currentLevel: number;
  targetLevel: number;
  evidenceRequired: string[];
  evidenceCount: number;
};

function NodeView({
  node,
  childrenByParent,
  depth = 0
}: {
  node: SkillTreeNode;
  childrenByParent: Map<string | null, SkillTreeNode[]>;
  depth?: number;
}) {
  const children = childrenByParent.get(node.id) ?? [];
  const progress = Math.min(100, (node.currentLevel / Math.max(1, node.targetLevel)) * 100);

  return (
    <details open={depth < 1} className="group rounded border border-white/10 bg-white/[0.03]">
      <summary className="flex cursor-pointer list-none items-center gap-3 px-3 py-3">
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground transition group-open:rotate-90" />
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium text-white">{node.name}</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="text-[11px] text-primary">{zhDomain(node.domain)}</span>
            <span className="font-mono text-[11px] text-muted-foreground">
              {node.currentLevel.toFixed(1)} / {node.targetLevel.toFixed(1)}
            </span>
            <span className="font-mono text-[11px] text-muted-foreground">
              证据 {node.evidenceCount}
            </span>
          </div>
        </div>
      </summary>
      <div className="px-3 pb-3">
        <div className="h-1.5 overflow-hidden rounded bg-white/10">
          <div className="h-full rounded bg-primary" style={{ width: `${progress}%` }} />
        </div>
        <ul className="mt-3 grid gap-1 text-xs text-muted-foreground">
          {node.evidenceRequired.slice(0, 3).map((item) => (
            <li key={item} className="truncate">
              {item}
            </li>
          ))}
        </ul>
        {children.length > 0 ? (
          <div className="mt-3 grid gap-2 pl-3">
            {children.map((child) => (
              <NodeView
                key={child.id}
                node={child}
                childrenByParent={childrenByParent}
                depth={depth + 1}
              />
            ))}
          </div>
        ) : null}
      </div>
    </details>
  );
}

export function SkillTreePanel({ skills }: { skills: SkillTreeNode[] }) {
  const childrenByParent = new Map<string | null, SkillTreeNode[]>();
  for (const skill of skills) {
    const list = childrenByParent.get(skill.parentId) ?? [];
    list.push(skill);
    childrenByParent.set(skill.parentId, list);
  }

  const roots = childrenByParent.get(null) ?? [];

  return (
    <div className="grid gap-2">
      {roots.map((root) => (
        <NodeView key={root.id} node={root} childrenByParent={childrenByParent} />
      ))}
    </div>
  );
}
